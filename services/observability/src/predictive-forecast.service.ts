import { query, queryOne } from '@opsedge360/shared-db';

const MODEL_EWMA = 'ewma-v1';
const MODEL_CAPACITY = 'capacity-v1';

interface SeriesPoint {
  t: string;
  v: number;
}

function parsePoints(raw: string): SeriesPoint[] {
  try {
    const arr = JSON.parse(raw) as Array<{ t: string; v: number }>;
    return arr
      .map((p) => ({ t: String(p.t), v: Number(p.v) }))
      .filter((p) => Number.isFinite(p.v))
      .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());
  } catch {
    return [];
  }
}

function linearFit(values: number[]): { slope: number; intercept: number; rmse: number } {
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX || 1;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * i;
    const e = values[i] - pred;
    sse += e * e;
  }
  const rmse = Math.sqrt(sse / Math.max(n, 1));
  return { slope, intercept, rmse };
}

function ewmaSeries(values: number[], alpha = 0.3): number[] {
  if (values.length === 0) return [];
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(alpha * values[i] + (1 - alpha) * out[i - 1]);
  }
  return out;
}

function looksLikeCapacityMetric(name: string): boolean {
  const n = name.toLowerCase();
  return /cpu|mem|memory|disk|util|usage|saturation|load|queue|heap|fs_|inode|capacity|pct|percent|ratio/.test(
    n,
  );
}

function defaultCapacityThreshold(name: string, values: number[]): number {
  if (looksLikeCapacityMetric(name)) {
    const max = Math.max(...values);
    // utilization-style metrics often 0–100
    if (max <= 100.5) return 90;
    if (max <= 1.05) return 0.9;
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const { rmse } = linearFit(values);
  return mean + Math.max(rmse * 3, Math.abs(mean) * 0.2, 1);
}

async function loadMetricSeries(
  tenantId: string,
  lookbackHours: number,
): Promise<Array<{ name: string; points: SeriesPoint[] }>> {
  const series = await query<{ name: string; points: string }>(
    `SELECT name,
      json_agg(json_build_object('t', recorded_at, 'v', value) ORDER BY recorded_at)::text as points
     FROM (
       SELECT name, recorded_at, value
       FROM prometheus_samples
       WHERE tenant_id = $1 AND recorded_at > NOW() - ($2 * INTERVAL '1 hour')
       ORDER BY recorded_at DESC
       LIMIT 5000
     ) s
     GROUP BY name
     HAVING COUNT(*) >= 8
     LIMIT 40`,
    [tenantId, lookbackHours],
  );

  let rows = series;
  if (rows.length === 0) {
    rows = await query(
      `SELECT name,
        json_agg(json_build_object('t', recorded_at, 'v', value) ORDER BY recorded_at)::text as points
       FROM (
         SELECT name, recorded_at, value
         FROM otlp_metrics
         WHERE tenant_id = $1 AND recorded_at > NOW() - ($2 * INTERVAL '1 hour')
         ORDER BY recorded_at DESC
         LIMIT 5000
       ) s
       GROUP BY name
       HAVING COUNT(*) >= 8
       LIMIT 40`,
      [tenantId, lookbackHours],
    );
  }

  return rows
    .map((r) => ({ name: r.name, points: parsePoints(r.points) }))
    .filter((r) => r.points.length >= 8);
}

/**
 * EWMA + residual-band anomalies and leading breach predictions.
 */
export async function scanPredictiveAnomalies(
  tenantId: string,
  opts: { lookbackHours?: number; horizonHours?: number; sigmaThreshold?: number } = {},
) {
  const lookbackHours = Math.min(Math.max(opts.lookbackHours ?? 6, 1), 72);
  const horizonHours = Math.min(Math.max(opts.horizonHours ?? 24, 1), 168);
  const sigmaThreshold = opts.sigmaThreshold ?? 2.5;
  const series = await loadMetricSeries(tenantId, lookbackHours);

  let anomaliesCreated = 0;
  let baselinesUpdated = 0;
  const created: Array<Record<string, unknown>> = [];

  for (const s of series) {
    const values = s.points.map((p) => p.v);
    const ewma = ewmaSeries(values, 0.3);
    const last = values[values.length - 1];
    const ewmaLast = ewma[ewma.length - 1];
    const residuals = values.map((v, i) => v - ewma[i]);
    const meanRes = residuals.reduce((a, b) => a + b, 0) / residuals.length;
    const varRes =
      residuals.reduce((a, b) => a + (b - meanRes) ** 2, 0) / Math.max(residuals.length - 1, 1);
    const rmse = Math.sqrt(Math.max(varRes, 0));
    const { slope, intercept } = linearFit(values);

    await query(
      `INSERT INTO metric_baselines
        (tenant_id, metric_name, window_minutes, mean_value, stddev_value, sample_count,
         ewma_value, residual_rmse, method, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ewma_v1',NOW())
       ON CONFLICT (tenant_id, metric_name, window_minutes)
       DO UPDATE SET mean_value = EXCLUDED.mean_value, stddev_value = EXCLUDED.stddev_value,
         sample_count = EXCLUDED.sample_count, ewma_value = EXCLUDED.ewma_value,
         residual_rmse = EXCLUDED.residual_rmse, method = EXCLUDED.method, updated_at = NOW()`,
      [
        tenantId,
        s.name,
        lookbackHours * 60,
        ewmaLast,
        rmse,
        values.length,
        ewmaLast,
        rmse,
      ],
    );
    baselinesUpdated += 1;

    // Retrospective EWMA band breach
    if (rmse > 0) {
      const sigma = Math.abs(last - ewmaLast) / rmse;
      if (sigma >= sigmaThreshold) {
        const severity = sigma >= 4 ? 'critical' : sigma >= 3 ? 'high' : 'warning';
        const row = await queryOne<Record<string, unknown>>(
          `INSERT INTO anomalies
            (tenant_id, anomaly_type, metric_name, baseline_value, observed_value, deviation_sigma,
             severity, status, source, model_version, metadata)
           VALUES ($1,'ewma_deviation',$2,$3,$4,$5,$6,'open','predictive_scan',$7,$8)
           RETURNING *`,
          [
            tenantId,
            s.name,
            ewmaLast,
            last,
            Math.round(sigma * 100) / 100,
            severity,
            MODEL_EWMA,
            JSON.stringify({ method: 'ewma', lookbackHours }),
          ],
        );
        if (row) {
          anomaliesCreated += 1;
          created.push({ id: row.id, type: 'ewma_deviation', metric: s.name, sigma, severity });
        }
      }
    }

    // Leading: project until capacity-like threshold
    const threshold = defaultCapacityThreshold(s.name, values);
    if (slope > 0) {
      const stepHours = Math.max(
        (new Date(s.points[s.points.length - 1].t).getTime() -
          new Date(s.points[0].t).getTime()) /
          Math.max(values.length - 1, 1) /
          3600000,
        0.05,
      );
      let breachHour: number | null = null;
      for (let h = 1; h <= horizonHours; h++) {
        const pred = intercept + slope * (values.length - 1 + h / stepHours);
        if (pred >= threshold) {
          breachHour = h;
          break;
        }
      }
      if (breachHour != null) {
        const expectedAt = new Date(Date.now() + breachHour * 3600000).toISOString();
        const severity = breachHour <= 6 ? 'critical' : breachHour <= 24 ? 'high' : 'warning';
        const row = await queryOne<Record<string, unknown>>(
          `INSERT INTO anomalies
            (tenant_id, anomaly_type, metric_name, baseline_value, observed_value, deviation_sigma,
             severity, status, source, model_version, expected_at, prediction_horizon_hours, metadata)
           VALUES ($1,'predictive_breach',$2,$3,$4,$5,$6,'open','predictive_scan',$7,$8,$9,$10)
           RETURNING *`,
          [
            tenantId,
            s.name,
            ewmaLast,
            last,
            Math.round(((threshold - last) / Math.max(rmse, 1e-6)) * 100) / 100,
            severity,
            MODEL_EWMA,
            expectedAt,
            breachHour,
            JSON.stringify({ threshold, slope, breachHour, lookbackHours }),
          ],
        );
        if (row) {
          anomaliesCreated += 1;
          created.push({
            id: row.id,
            type: 'predictive_breach',
            metric: s.name,
            expectedAt,
            threshold,
            severity,
          });
        }
      }
    }
  }

  return {
    modelVersion: MODEL_EWMA,
    lookbackHours,
    horizonHours,
    scanned: series.length,
    anomaliesCreated,
    baselinesUpdated,
    anomalies: created,
  };
}

/**
 * Capacity forecasts with confidence bands + optional incident_predictions.
 */
export async function generateCapacityForecasts(
  tenantId: string,
  opts: { horizonHours?: number; lookbackHours?: number; capacityOnly?: boolean } = {},
) {
  const horizonHours = Math.min(Math.max(opts.horizonHours ?? 168, 24), 168); // default 7d
  const lookbackHours = Math.min(Math.max(opts.lookbackHours ?? 24, 6), 168);
  const capacityOnly = opts.capacityOnly !== false;
  const series = await loadMetricSeries(tenantId, lookbackHours);
  const targets = capacityOnly
    ? series.filter((s) => looksLikeCapacityMetric(s.name) || linearFit(s.points.map((p) => p.v)).slope > 0)
    : series;

  const forecasts: Array<Record<string, unknown>> = [];
  let breachesPredicted = 0;
  let anomaliesCreated = 0;

  for (const s of targets.slice(0, 25)) {
    const values = s.points.map((p) => p.v);
    const { slope, intercept, rmse } = linearFit(values);
    const threshold = defaultCapacityThreshold(s.name, values);
    const last = values[values.length - 1];
    const stepHours = Math.max(
      (new Date(s.points[s.points.length - 1].t).getTime() - new Date(s.points[0].t).getTime()) /
        Math.max(values.length - 1, 1) /
        3600000,
      0.05,
    );

    const forecastPoints: Array<{ hour: number; value: number }> = [];
    const confidenceLow: Array<{ hour: number; value: number }> = [];
    const confidenceHigh: Array<{ hour: number; value: number }> = [];
    let breachEta: string | null = null;
    let breachHour: number | null = null;

    // Emit up to 28 points across the horizon (every 6h for 7d)
    const step = Math.max(1, Math.floor(horizonHours / 28));
    for (let h = step; h <= horizonHours; h += step) {
      const pred = intercept + slope * (values.length - 1 + h / stepHours);
      const rounded = Math.round(pred * 1000) / 1000;
      const band = Math.max(rmse * 1.96, Math.abs(rounded) * 0.05);
      forecastPoints.push({ hour: h, value: rounded });
      confidenceLow.push({ hour: h, value: Math.round((rounded - band) * 1000) / 1000 });
      confidenceHigh.push({ hour: h, value: Math.round((rounded + band) * 1000) / 1000 });
      if (breachHour == null && rounded >= threshold) {
        breachHour = h;
        breachEta = new Date(Date.now() + h * 3600000).toISOString();
      }
    }

    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO predictive_forecasts
        (tenant_id, forecast_type, metric_name, horizon_days, forecast_points,
         confidence_low, confidence_high, model_version, business_impact, source,
         capacity_threshold, breach_eta, residual_rmse, lookback_hours)
       VALUES ($1,'capacity',$2,$3,$4,$5,$6,$7,$8,'ops_intelligence',$9,$10,$11,$12)
       RETURNING *`,
      [
        tenantId,
        s.name,
        Math.ceil(horizonHours / 24),
        JSON.stringify(forecastPoints),
        JSON.stringify(confidenceLow),
        JSON.stringify(confidenceHigh),
        MODEL_CAPACITY,
        JSON.stringify({
          trend: slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable',
          lastValue: last,
          slope: Math.round(slope * 1e6) / 1e6,
          threshold,
          breachHour,
        }),
        threshold,
        breachEta,
        Math.round(rmse * 1000) / 1000,
        lookbackHours,
      ],
    );

    if (row) {
      forecasts.push({
        id: row.id,
        metricName: s.name,
        modelVersion: MODEL_CAPACITY,
        threshold,
        breachEta,
        residualRmse: rmse,
        forecastPoints,
        confidenceLow,
        confidenceHigh,
      });
    }

    if (breachEta && breachHour != null && breachHour <= horizonHours) {
      breachesPredicted += 1;
      const probability = Math.min(
        95,
        Math.max(40, Math.round(70 + (24 - Math.min(breachHour, 24)))),
      );
      await query(
        `INSERT INTO incident_predictions
          (tenant_id, incident_type, probability_pct, predicted_window_start, predicted_window_end,
           root_cause_hypothesis, confidence_pct, status)
         VALUES ($1,'capacity_breach',$2,$3,$4,$5,$6,'active')`,
        [
          tenantId,
          probability,
          breachEta,
          new Date(new Date(breachEta).getTime() + 6 * 3600000).toISOString(),
          `Metric ${s.name} projected to breach capacity threshold ${threshold} in ~${breachHour}h (${MODEL_CAPACITY})`,
          Math.min(90, probability),
        ],
      );

      const anom = await queryOne(
        `INSERT INTO anomalies
          (tenant_id, anomaly_type, metric_name, baseline_value, observed_value, deviation_sigma,
           severity, status, source, model_version, expected_at, prediction_horizon_hours, metadata)
         VALUES ($1,'capacity_breach',$2,$3,$4,$5,$6,'open','capacity_forecast',$7,$8,$9,$10)
         RETURNING id`,
        [
          tenantId,
          s.name,
          last,
          threshold,
          Math.round(((threshold - last) / Math.max(rmse, 1e-6)) * 100) / 100,
          breachHour <= 12 ? 'critical' : breachHour <= 48 ? 'high' : 'warning',
          MODEL_CAPACITY,
          breachEta,
          breachHour,
          JSON.stringify({ threshold, forecastId: row?.id }),
        ],
      );
      if (anom) anomaliesCreated += 1;
    }
  }

  const run = await queryOne<Record<string, unknown>>(
    `INSERT INTO capacity_forecast_runs
      (tenant_id, horizon_hours, metrics_scanned, forecasts_created, breaches_predicted,
       anomalies_created, model_version, summary)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      tenantId,
      horizonHours,
      targets.length,
      forecasts.length,
      breachesPredicted,
      anomaliesCreated,
      MODEL_CAPACITY,
      JSON.stringify({ lookbackHours, capacityOnly }),
    ],
  );

  return {
    modelVersion: MODEL_CAPACITY,
    horizonHours,
    lookbackHours,
    runId: run?.id,
    generated: forecasts.length,
    breachesPredicted,
    anomaliesCreated,
    forecasts,
  };
}

export async function listCapacityRuns(tenantId: string, limit = 20) {
  return query(
    `SELECT * FROM capacity_forecast_runs
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [tenantId, Math.min(limit, 100)],
  );
}

export async function listIncidentPredictions(tenantId: string, limit = 50) {
  return query(
    `SELECT * FROM incident_predictions
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [tenantId, Math.min(limit, 200)],
  );
}

export async function listCapacityForecasts(tenantId: string, limit = 50) {
  return query(
    `SELECT * FROM predictive_forecasts
     WHERE tenant_id = $1 AND forecast_type = 'capacity'
     ORDER BY generated_at DESC
     LIMIT $2`,
    [tenantId, Math.min(limit, 200)],
  );
}
