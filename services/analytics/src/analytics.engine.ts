import { query, queryOne } from '@opsedge360/shared-db';
import type { PredictiveForecast, IncidentPrediction } from '@opsedge360/shared-types';

interface ForecastRow {
  id: string;
  forecast_type: string;
  metric_name: string;
  ci_id: string | null;
  horizon_days: number;
  forecast_points: Array<{ day: number; value: number }>;
  confidence_low: Array<{ day: number; value: number }>;
  confidence_high: Array<{ day: number; value: number }>;
  business_impact: Record<string, unknown>;
  generated_at: string;
}

interface PredictionRow {
  id: string;
  ci_id: string | null;
  incident_type: string;
  probability_pct: number;
  predicted_window_start: string;
  predicted_window_end: string;
  revenue_at_risk: string | null;
  affected_transactions: string[] | null;
  root_cause_hypothesis: string | null;
  confidence_pct: number | null;
  status: string;
  created_at: string;
}

function mapForecast(r: ForecastRow): PredictiveForecast {
  return {
    id: r.id,
    forecastType: r.forecast_type,
    metricName: r.metric_name,
    ciId: r.ci_id ?? undefined,
    horizonDays: r.horizon_days,
    forecastPoints: r.forecast_points,
    confidenceLow: r.confidence_low,
    confidenceHigh: r.confidence_high,
    businessImpact: r.business_impact,
    generatedAt: r.generated_at,
  };
}

function mapPrediction(r: PredictionRow): IncidentPrediction {
  return {
    id: r.id,
    ciId: r.ci_id ?? undefined,
    incidentType: r.incident_type,
    probabilityPct: r.probability_pct,
    predictedWindowStart: r.predicted_window_start,
    predictedWindowEnd: r.predicted_window_end,
    revenueAtRisk: r.revenue_at_risk ? Number(r.revenue_at_risk) : undefined,
    affectedTransactions: r.affected_transactions ?? [],
    rootCauseHypothesis: r.root_cause_hypothesis ?? undefined,
    confidencePct: r.confidence_pct ?? undefined,
    status: r.status,
    createdAt: r.created_at,
  };
}

export async function listForecasts(tenantId: string, type?: string): Promise<PredictiveForecast[]> {
  const conditions = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  if (type) {
    conditions.push('forecast_type = $2');
    params.push(type);
  }
  const rows = await query<ForecastRow>(
    `SELECT * FROM predictive_forecasts WHERE ${conditions.join(' AND ')} ORDER BY generated_at DESC LIMIT 20`,
    params,
  );
  return rows.map(mapForecast);
}

export async function listIncidentPredictions(tenantId: string): Promise<IncidentPrediction[]> {
  const rows = await query<PredictionRow>(
    `SELECT * FROM incident_predictions WHERE tenant_id = $1 AND status = 'active' ORDER BY probability_pct DESC`,
    [tenantId],
  );
  return rows.map(mapPrediction);
}

export async function getAnalyticsSummary(tenantId: string) {
  const forecasts = await listForecasts(tenantId);
  const predictions = await listIncidentPredictions(tenantId);
  const totalRevenueAtRisk = predictions.reduce((s, p) => s + (p.revenueAtRisk ?? 0), 0);
  const highRisk = predictions.filter((p) => p.probabilityPct >= 70).length;

  return {
    forecastCount: forecasts.length,
    activePredictions: predictions.length,
    highRiskPredictions: highRisk,
    totalRevenueAtRisk,
    modelVersion: 'prophet-lite-v1',
    lastGenerated: forecasts[0]?.generatedAt ?? new Date().toISOString(),
  };
}

/** Generate 7-day forecasts from CMDB health + transaction volume heuristics */
export async function generateForecasts(tenantId: string, metrics?: string[]) {
  const cis = await query<{ id: string; name: string; ci_type: string; health_score: number }>(
    `SELECT id, name, ci_type, health_score FROM configuration_items WHERE tenant_id = $1 AND status = 'active' LIMIT 10`,
    [tenantId],
  );

  const targetMetrics = metrics ?? ['cpu.utilization.pct', 'db.connection.pool.utilization', 'api.latency.p99'];
  const generated: PredictiveForecast[] = [];

  for (const metric of targetMetrics) {
    const ci = cis.find((c) =>
      metric.includes('db') ? c.ci_type === 'database' : metric.includes('api') ? c.ci_type === 'api' || c.name.includes('api') : true,
    ) ?? cis[0];

    if (!ci) continue;

    const base = Math.max(40, 100 - ci.health_score);
    const points: Array<{ day: number; value: number }> = [];
    const low: Array<{ day: number; value: number }> = [];
    const high: Array<{ day: number; value: number }> = [];

    for (let d = 1; d <= 7; d++) {
      const trend = base + d * (2 + Math.random() * 3);
      const v = Math.min(99, Math.round(trend));
      points.push({ day: d, value: v });
      low.push({ day: d, value: Math.max(0, v - 5) });
      high.push({ day: d, value: Math.min(100, v + 6) });
    }

    const revenueAtRisk = Math.round((points[6].value - 70) * 15000);
    const row = await queryOne<ForecastRow>(
      `INSERT INTO predictive_forecasts (tenant_id, forecast_type, metric_name, ci_id, horizon_days, forecast_points, confidence_low, confidence_high, business_impact)
       VALUES ($1, $2, $3, $4, 7, $5, $6, $7, $8) RETURNING *`,
      [
        tenantId,
        metric.includes('latency') || metric.includes('pool') ? 'incident' : 'capacity',
        metric,
        ci.id,
        JSON.stringify(points),
        JSON.stringify(low),
        JSON.stringify(high),
        JSON.stringify({ revenueAtRisk: Math.max(0, revenueAtRisk), slaBreachProbability: points[6].value / 100 }),
      ],
    );
    if (row) generated.push(mapForecast(row));
  }

  // Refresh incident predictions for high-risk forecasts
  for (const f of generated) {
    const peak = f.forecastPoints[f.forecastPoints.length - 1]?.value ?? 0;
    if (peak >= 80 && f.ciId) {
      await query(
        `INSERT INTO incident_predictions (tenant_id, ci_id, incident_type, probability_pct, predicted_window_start, predicted_window_end, revenue_at_risk, root_cause_hypothesis, confidence_pct)
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 day', NOW() + INTERVAL '5 days', $5, $6, $7)`,
        [
          tenantId,
          f.ciId,
          f.metricName.includes('pool') ? 'connection_pool_exhaustion' : 'capacity_saturation',
          Math.min(95, peak),
          f.businessImpact.revenueAtRisk ?? 0,
          `Forecast model predicts ${f.metricName} reaching ${peak}% within 7 days`,
          Math.round(peak * 0.9),
        ],
      );
    }
  }

  return { generated, count: generated.length };
}
