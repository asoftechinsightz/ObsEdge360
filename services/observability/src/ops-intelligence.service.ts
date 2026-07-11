import { query, queryOne } from '@opsedge360/shared-db';
import { EventBus, TOPICS, createEvent } from '@opsedge360/event-bus';
import * as remControl from './remediation-control.service';

let bus: EventBus | null = null;
function getBus() {
  if (!bus) bus = new EventBus('ops-intelligence');
  return bus;
}

async function emitSignal(
  tenantId: string,
  signalType: string,
  severity: string,
  title: string,
  payload: Record<string, unknown> = {},
  refId?: string,
) {
  await query(
    `INSERT INTO ops_intelligence_signals (tenant_id, signal_type, severity, ref_id, title, payload)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [tenantId, signalType, severity, refId ?? null, title, JSON.stringify(payload)],
  );
  try {
    const b = getBus();
    await b.connect();
    await b.publish(
      TOPICS.OPS_SIGNAL,
      createEvent('ops_intelligence.signal', tenantId, { signalType, severity, title, payload, refId }),
    );
  } catch {
    /* soft */
  }
}

function severityRank(s: string): number {
  switch ((s || '').toLowerCase()) {
    case 'critical':
      return 4;
    case 'high':
    case 'error':
      return 3;
    case 'warning':
    case 'medium':
      return 2;
    default:
      return 1;
  }
}

function maxSeverity(a: string, b: string): string {
  return severityRank(a) >= severityRank(b) ? a : b;
}

export async function getHealth(tenantId: string) {
  const row = await queryOne<{
    open_incidents: string;
    open_anomalies: string;
    pending_rca: string;
    pending_remediation: string;
    forecasts_24h: string;
    signals_24h: string;
  }>(
    `SELECT
      (SELECT COUNT(*) FROM ops_incidents WHERE tenant_id = $1 AND status = 'open') as open_incidents,
      (SELECT COUNT(*) FROM anomalies WHERE tenant_id = $1 AND status = 'open') as open_anomalies,
      (SELECT COUNT(*) FROM rca_sessions WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '24 hours') as pending_rca,
      (SELECT COUNT(*) FROM ops_remediation_requests WHERE tenant_id = $1 AND status = 'pending') as pending_remediation,
      (SELECT COUNT(*) FROM predictive_forecasts WHERE tenant_id = $1 AND generated_at > NOW() - INTERVAL '24 hours') as forecasts_24h,
      (SELECT COUNT(*) FROM ops_intelligence_signals WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '24 hours') as signals_24h`,
    [tenantId],
  );
  return {
    openIncidents: Number(row?.open_incidents ?? 0),
    openAnomalies: Number(row?.open_anomalies ?? 0),
    rcaSessions24h: Number(row?.pending_rca ?? 0),
    pendingRemediation: Number(row?.pending_remediation ?? 0),
    forecasts24h: Number(row?.forecasts_24h ?? 0),
    signals24h: Number(row?.signals_24h ?? 0),
  };
}

/**
 * Correlate recent alert_events + anomalies into ops_incidents.
 */
export async function correlate(
  tenantId: string,
  opts: { windowMinutes?: number } = {},
): Promise<{ incidentsCreated: number; incidents: Array<Record<string, unknown>> }> {
  const windowMinutes = Math.min(Math.max(opts.windowMinutes ?? 60, 5), 24 * 60);
  const alerts = await query<{
    id: string;
    title: string;
    severity: string;
    status: string;
    labels: Record<string, unknown>;
    fired_at: string;
  }>(
    `SELECT id, title, severity, status, labels, fired_at
     FROM alert_events
     WHERE tenant_id = $1 AND fired_at > NOW() - ($2 * INTERVAL '1 minute')
     ORDER BY fired_at DESC
     LIMIT 200`,
    [tenantId, windowMinutes],
  );

  const anomalies = await query<{
    id: string;
    anomaly_type: string;
    metric_name: string | null;
    severity: string;
    ci_id: string | null;
    detected_at: string;
  }>(
    `SELECT id, anomaly_type, metric_name, severity, ci_id, detected_at
     FROM anomalies
     WHERE tenant_id = $1 AND detected_at > NOW() - ($2 * INTERVAL '1 minute') AND status = 'open'
     ORDER BY detected_at DESC
     LIMIT 200`,
    [tenantId, windowMinutes],
  );

  type Member = {
    sourceType: string;
    sourceId: string;
    title: string;
    severity: string;
    weight: number;
    ciHint?: string | null;
  };

  const buckets = new Map<string, { members: Member[]; severity: string; titles: string[] }>();

  for (const a of alerts) {
    const labels = a.labels ?? {};
    const host =
      String(labels.instance ?? labels.host ?? labels.ci ?? labels.service ?? 'unknown').toLowerCase();
    const key = `host:${host}`;
    if (!buckets.has(key)) buckets.set(key, { members: [], severity: 'info', titles: [] });
    const b = buckets.get(key)!;
    b.members.push({
      sourceType: 'alert_event',
      sourceId: a.id,
      title: a.title,
      severity: a.severity,
      weight: 1,
      ciHint: host !== 'unknown' ? host : null,
    });
    b.severity = maxSeverity(b.severity, a.severity);
    b.titles.push(a.title);
  }

  for (const an of anomalies) {
    const key = an.ci_id ? `ci:${an.ci_id}` : `metric:${(an.metric_name ?? an.anomaly_type).toLowerCase()}`;
    if (!buckets.has(key)) buckets.set(key, { members: [], severity: 'info', titles: [] });
    const b = buckets.get(key)!;
    b.members.push({
      sourceType: 'anomaly',
      sourceId: an.id,
      title: `${an.anomaly_type}${an.metric_name ? `: ${an.metric_name}` : ''}`,
      severity: an.severity,
      weight: 1.2,
      ciHint: an.ci_id,
    });
    b.severity = maxSeverity(b.severity, an.severity);
    b.titles.push(an.anomaly_type);
  }

  const created: Array<Record<string, unknown>> = [];
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60_000);

  for (const [corrKey, bucket] of buckets) {
    if (bucket.members.length < 1) continue;

    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM ops_incidents
       WHERE tenant_id = $1 AND correlation_key = $2 AND status = 'open'
         AND created_at > NOW() - ($3 * INTERVAL '1 minute')
       LIMIT 1`,
      [tenantId, corrKey, windowMinutes],
    );
    if (existing) continue;

    const title =
      bucket.titles[0] ??
      `Correlated signals (${bucket.members.length}) — ${corrKey}`;
    const primaryHint = bucket.members.find((m) => m.ciHint)?.ciHint ?? null;
    let primaryCiId: string | null = null;
    if (primaryHint) {
      const ci = await queryOne<{ id: string }>(
        `SELECT id FROM configuration_items
         WHERE tenant_id = $1 AND (
           id::text = $2 OR LOWER(name) = LOWER($2) OR LOWER(external_id) = LOWER($2)
           OR attributes->>'service_name' = $2 OR attributes->>'instance' = $2
         ) LIMIT 1`,
        [tenantId, primaryHint],
      );
      primaryCiId = ci?.id ?? null;
    }

    let blastSummary: Record<string, unknown> = {};
    if (primaryCiId) {
      try {
        const cmdbUrl = process.env.CMDB_URL ?? 'http://localhost:4002';
        const res = await fetch(
          `${cmdbUrl}/twin/blast-radius/${primaryCiId}?depth=2&direction=downstream`,
          { headers: { 'x-tenant-id': tenantId, 'Content-Type': 'application/json' } },
        );
        if (res.ok) {
          const blast = (await res.json()) as Record<string, unknown>;
          blastSummary = {
            affectedCis: blast.affectedCis,
            criticalCount: blast.criticalCount,
            avgHealth: blast.avgHealth,
          };
        }
      } catch {
        /* optional */
      }
    }

    const signalCounts = {
      alerts: bucket.members.filter((m) => m.sourceType === 'alert_event').length,
      anomalies: bucket.members.filter((m) => m.sourceType === 'anomaly').length,
      total: bucket.members.length,
    };

    const incident = await queryOne<Record<string, unknown>>(
      `INSERT INTO ops_incidents
        (tenant_id, title, severity, status, window_start, window_end, primary_ci_id,
         signal_counts, blast_summary, correlation_key)
       VALUES ($1,$2,$3,'open',$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        tenantId,
        title.slice(0, 500),
        bucket.severity,
        windowStart.toISOString(),
        now.toISOString(),
        primaryCiId,
        JSON.stringify(signalCounts),
        JSON.stringify(blastSummary),
        corrKey,
      ],
    );
    if (!incident) continue;

    for (const m of bucket.members) {
      await query(
        `INSERT INTO ops_incident_members
          (tenant_id, incident_id, source_type, source_id, weight, title, severity)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT DO NOTHING`,
        [tenantId, incident.id, m.sourceType, m.sourceId, m.weight, m.title, m.severity],
      );
    }

    if (primaryCiId) {
      await query(
        `INSERT INTO ops_incident_ci_links (tenant_id, incident_id, ci_id, link_reason)
         VALUES ($1,$2,$3,'name_match')
         ON CONFLICT DO NOTHING`,
        [tenantId, incident.id, primaryCiId],
      );
    }

    await emitSignal(tenantId, 'incident_correlated', bucket.severity, title, {
      incidentId: incident.id,
      signalCounts,
      correlationKey: corrKey,
    }, String(incident.id));

    try {
      const b = getBus();
      await b.connect();
      await b.publish(
        TOPICS.INCIDENT_CORRELATED,
        createEvent('incident.correlated', tenantId, { incidentId: incident.id, title, severity: bucket.severity }),
      );
    } catch {
      /* soft */
    }

    created.push(mapIncident(incident));
  }

  return { incidentsCreated: created.length, incidents: created };
}

function mapIncident(row: Record<string, unknown>) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    severity: row.severity,
    status: row.status,
    windowStart: row.window_start,
    windowEnd: row.window_end,
    primaryCiId: row.primary_ci_id,
    signalCounts: row.signal_counts,
    blastSummary: row.blast_summary,
    correlationKey: row.correlation_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listIncidents(
  tenantId: string,
  opts: { status?: string; limit?: number } = {},
) {
  const limit = Math.min(opts.limit ?? 50, 200);
  const rows = opts.status
    ? await query(
        `SELECT * FROM ops_incidents WHERE tenant_id = $1 AND status = $2
         ORDER BY created_at DESC LIMIT $3`,
        [tenantId, opts.status, limit],
      )
    : await query(
        `SELECT * FROM ops_incidents WHERE tenant_id = $1
         ORDER BY created_at DESC LIMIT $2`,
        [tenantId, limit],
      );
  return rows.map((r) => mapIncident(r as Record<string, unknown>));
}

export async function getIncident(tenantId: string, id: string) {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM ops_incidents WHERE tenant_id = $1 AND id = $2`,
    [tenantId, id],
  );
  if (!row) return null;
  const members = await query(
    `SELECT * FROM ops_incident_members WHERE tenant_id = $1 AND incident_id = $2`,
    [tenantId, id],
  );
  const ciLinks = await query(
    `SELECT l.*, c.name as ci_name, c.ci_type
     FROM ops_incident_ci_links l
     LEFT JOIN configuration_items c ON c.id = l.ci_id
     WHERE l.tenant_id = $1 AND l.incident_id = $2`,
    [tenantId, id],
  );
  return {
    ...mapIncident(row),
    members,
    ciLinks,
  };
}

/**
 * Evidence-based RCA — no LLM. Gathers alerts, anomalies, topology neighbors, metrics.
 */
export async function runRca(
  tenantId: string,
  opts: {
    question?: string;
    incidentId?: string;
    ciId?: string;
    createdBy?: string;
  },
): Promise<Record<string, unknown>> {
  const question = opts.question?.trim() || 'What is the most likely root cause?';
  let incident = opts.incidentId ? await getIncident(tenantId, opts.incidentId) : null;
  let ciId = opts.ciId ?? (incident?.primaryCiId as string | null) ?? null;

  const recentAlerts = await query(
    `SELECT id, title, severity, fired_at, labels FROM alert_events
     WHERE tenant_id = $1 AND fired_at > NOW() - INTERVAL '2 hours'
     ORDER BY fired_at DESC LIMIT 20`,
    [tenantId],
  );
  const recentAnomalies = await query(
    `SELECT id, anomaly_type, metric_name, severity, observed_value, baseline_value, deviation_sigma, detected_at
     FROM anomalies WHERE tenant_id = $1 AND detected_at > NOW() - INTERVAL '6 hours'
     ORDER BY detected_at DESC LIMIT 20`,
    [tenantId],
  );
  const openIncidents = await listIncidents(tenantId, { status: 'open', limit: 10 });

  let blast: Record<string, unknown> | null = null;
  let ci: Record<string, unknown> | null = null;
  if (ciId) {
    ci = await queryOne(
      `SELECT id, name, ci_type, health_score, risk_score, status, attributes
       FROM configuration_items WHERE tenant_id = $1 AND id = $2`,
      [tenantId, ciId],
    );
    try {
      const cmdbUrl = process.env.CMDB_URL ?? 'http://localhost:4002';
      const res = await fetch(`${cmdbUrl}/twin/blast-radius/${ciId}?depth=3&direction=both`, {
        headers: { 'x-tenant-id': tenantId },
      });
      if (res.ok) blast = (await res.json()) as Record<string, unknown>;
    } catch {
      /* optional */
    }
  }

  const evidence = {
    question,
    incident,
    ci,
    blast,
    recentAlerts,
    recentAnomalies,
    openIncidents,
    gatheredAt: new Date().toISOString(),
  };

  const hypotheses: Array<{ rank: number; hypothesis: string; confidence: number; supporting: Record<string, unknown> }> = [];

  if (recentAnomalies.length > 0) {
    const top = recentAnomalies[0] as Record<string, unknown>;
    hypotheses.push({
      rank: 1,
      hypothesis: `Metric anomaly on ${top.metric_name ?? top.anomaly_type} (σ=${top.deviation_sigma ?? '?'}) may be driving related alerts.`,
      confidence: Math.min(92, 55 + recentAnomalies.length * 5),
      supporting: { anomalyId: top.id, metric: top.metric_name, sigma: top.deviation_sigma },
    });
  }
  if (recentAlerts.length >= 2) {
    hypotheses.push({
      rank: hypotheses.length + 1,
      hypothesis: `${recentAlerts.length} alerts in the last 2 hours suggest a cascading or shared infrastructure failure.`,
      confidence: Math.min(88, 50 + recentAlerts.length * 4),
      supporting: { alertCount: recentAlerts.length },
    });
  }
  if (blast && Number(blast.affectedCis ?? 0) > 0) {
    hypotheses.push({
      rank: hypotheses.length + 1,
      hypothesis: `Blast-radius analysis shows ${blast.affectedCis} dependent CIs — failure of the primary CI would impact downstream services.`,
      confidence: Math.min(90, 60 + Number(blast.affectedCis) * 2),
      supporting: { blastSummary: { affectedCis: blast.affectedCis, criticalCount: blast.criticalCount } },
    });
  }
  if (ci && Number((ci as { health_score?: number }).health_score ?? 100) < 70) {
    hypotheses.push({
      rank: hypotheses.length + 1,
      hypothesis: `Primary CI health is degraded (${(ci as { health_score: number }).health_score}) — inspect recent configuration drift and discovery changes.`,
      confidence: 70,
      supporting: { ciId, healthScore: (ci as { health_score: number }).health_score },
    });
  }

  const insufficient = hypotheses.length === 0;
  const summary = insufficient
    ? 'Insufficient signal for confident root-cause analysis. Ingest more alerts, anomalies, or select a CI with topology relationships.'
    : hypotheses
        .slice()
        .sort((a, b) => b.confidence - a.confidence)
        .map((h, i) => `${i + 1}. (${h.confidence}%) ${h.hypothesis}`)
        .join('\n');

  const confidencePct = insufficient
    ? 0
    : Math.round(hypotheses.reduce((s, h) => s + h.confidence, 0) / hypotheses.length);

  const session = await queryOne<Record<string, unknown>>(
    `INSERT INTO rca_sessions
      (tenant_id, incident_id, ci_id, question, status, evidence, summary, confidence_pct, created_by)
     VALUES ($1,$2,$3,$4,'completed',$5,$6,$7,$8)
     RETURNING *`,
    [
      tenantId,
      opts.incidentId ?? null,
      ciId,
      question,
      JSON.stringify(evidence),
      summary,
      confidencePct,
      opts.createdBy ?? null,
    ],
  );

  const ranked = hypotheses.sort((a, b) => b.confidence - a.confidence);
  for (let i = 0; i < ranked.length; i++) {
    const h = ranked[i];
    await query(
      `INSERT INTO rca_hypotheses
        (tenant_id, session_id, rank, hypothesis, supporting_evidence, confidence_pct)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [tenantId, session!.id, i + 1, h.hypothesis, JSON.stringify(h.supporting), h.confidence],
    );
  }

  await emitSignal(
    tenantId,
    'rca_completed',
    insufficient ? 'info' : 'warning',
    `RCA: ${question.slice(0, 120)}`,
    { sessionId: session!.id, confidencePct, hypothesisCount: ranked.length },
    String(session!.id),
  );

  try {
    const b = getBus();
    await b.connect();
    await b.publish(
      TOPICS.RCA_COMPLETED,
      createEvent('rca.completed', tenantId, { sessionId: session!.id, confidencePct }),
    );
  } catch {
    /* soft */
  }

  const hyps = await query(
    `SELECT * FROM rca_hypotheses WHERE session_id = $1 ORDER BY rank`,
    [session!.id],
  );

  return {
    id: session!.id,
    question,
    status: 'completed',
    summary,
    confidencePct,
    insufficientSignal: insufficient,
    evidence,
    hypotheses: hyps,
    createdAt: session!.created_at,
  };
}

export async function getRca(tenantId: string, id: string) {
  const session = await queryOne<Record<string, unknown>>(
    `SELECT * FROM rca_sessions WHERE tenant_id = $1 AND id = $2`,
    [tenantId, id],
  );
  if (!session) return null;
  const hypotheses = await query(
    `SELECT * FROM rca_hypotheses WHERE session_id = $1 ORDER BY rank`,
    [id],
  );
  return {
    id: session.id,
    question: session.question,
    status: session.status,
    summary: session.summary,
    confidencePct: session.confidence_pct,
    evidence: session.evidence,
    incidentId: session.incident_id,
    ciId: session.ci_id,
    hypotheses,
    createdAt: session.created_at,
  };
}

export async function scanAnomalies(
  tenantId: string,
  opts: { windowMinutes?: number; sigmaThreshold?: number } = {},
): Promise<{ scanned: number; anomaliesCreated: number; baselinesUpdated: number }> {
  const windowMinutes = Math.min(Math.max(opts.windowMinutes ?? 60, 15), 360);
  const sigmaThreshold = opts.sigmaThreshold ?? 2.5;

  const series = await query<{
    name: string;
    avg: string;
    stddev: string;
    cnt: string;
    latest: string;
  }>(
    `SELECT name,
      AVG(value)::text as avg,
      COALESCE(STDDEV_SAMP(value), 0)::text as stddev,
      COUNT(*)::text as cnt,
      (ARRAY_AGG(value ORDER BY recorded_at DESC))[1]::text as latest
     FROM prometheus_samples
     WHERE tenant_id = $1 AND recorded_at > NOW() - ($2 * INTERVAL '1 minute')
     GROUP BY name
     HAVING COUNT(*) >= 5
     ORDER BY COUNT(*) DESC
     LIMIT 50`,
    [tenantId, windowMinutes],
  );

  // Fallback to otlp_metrics if no prometheus samples
  let rows = series;
  if (rows.length === 0) {
    rows = await query(
      `SELECT name,
        AVG(value)::text as avg,
        COALESCE(STDDEV_SAMP(value), 0)::text as stddev,
        COUNT(*)::text as cnt,
        (ARRAY_AGG(value ORDER BY recorded_at DESC))[1]::text as latest
       FROM otlp_metrics
       WHERE tenant_id = $1 AND recorded_at > NOW() - ($2 * INTERVAL '1 minute')
       GROUP BY name
       HAVING COUNT(*) >= 5
       ORDER BY COUNT(*) DESC
       LIMIT 50`,
      [tenantId, windowMinutes],
    );
  }

  let anomaliesCreated = 0;
  let baselinesUpdated = 0;

  for (const s of rows) {
    const mean = Number(s.avg);
    const stddev = Number(s.stddev);
    const latest = Number(s.latest);
    const cnt = Number(s.cnt);

    await query(
      `INSERT INTO metric_baselines (tenant_id, metric_name, window_minutes, mean_value, stddev_value, sample_count, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (tenant_id, metric_name, window_minutes)
       DO UPDATE SET mean_value = EXCLUDED.mean_value, stddev_value = EXCLUDED.stddev_value,
         sample_count = EXCLUDED.sample_count, updated_at = NOW()`,
      [tenantId, s.name, windowMinutes, mean, stddev, cnt],
    );
    baselinesUpdated += 1;

    if (stddev <= 0) continue;
    const sigma = Math.abs(latest - mean) / stddev;
    if (sigma < sigmaThreshold) continue;

    const severity = sigma >= 4 ? 'critical' : sigma >= 3 ? 'high' : 'warning';
    await query(
      `INSERT INTO anomalies
        (tenant_id, anomaly_type, metric_name, baseline_value, observed_value, deviation_sigma, severity, status, source)
       VALUES ($1,'metric_deviation',$2,$3,$4,$5,$6,'open','ops_scan')`,
      [tenantId, s.name, mean, latest, Math.round(sigma * 100) / 100, severity],
    );
    anomaliesCreated += 1;
    await emitSignal(tenantId, 'anomaly_detected', severity, `Anomaly: ${s.name}`, {
      metric: s.name,
      sigma,
      mean,
      latest,
    });
  }

  return { scanned: rows.length, anomaliesCreated, baselinesUpdated };
}

export async function listAnomalies(tenantId: string, limit = 50) {
  return query(
    `SELECT * FROM anomalies WHERE tenant_id = $1 ORDER BY detected_at DESC LIMIT $2`,
    [tenantId, Math.min(limit, 200)],
  );
}

export async function generateForecasts(
  tenantId: string,
  opts: { horizonHours?: number } = {},
): Promise<{ generated: number; forecasts: Array<Record<string, unknown>> }> {
  const horizonHours = Math.min(Math.max(opts.horizonHours ?? 24, 1), 168);

  const series = await query<{ name: string; points: string }>(
    `SELECT name,
      json_agg(json_build_object('t', recorded_at, 'v', value) ORDER BY recorded_at)::text as points
     FROM (
       SELECT name, recorded_at, value
       FROM prometheus_samples
       WHERE tenant_id = $1 AND recorded_at > NOW() - INTERVAL '6 hours'
       ORDER BY recorded_at DESC
       LIMIT 2000
     ) s
     GROUP BY name
     HAVING COUNT(*) >= 6
     LIMIT 20`,
    [tenantId],
  );

  let rows = series;
  if (rows.length === 0) {
    rows = await query(
      `SELECT name,
        json_agg(json_build_object('t', recorded_at, 'v', value) ORDER BY recorded_at)::text as points
       FROM (
         SELECT name, recorded_at, value
         FROM otlp_metrics
         WHERE tenant_id = $1 AND recorded_at > NOW() - INTERVAL '6 hours'
         ORDER BY recorded_at DESC
         LIMIT 2000
       ) s
       GROUP BY name
       HAVING COUNT(*) >= 6
       LIMIT 20`,
      [tenantId],
    );
  }

  const forecasts: Array<Record<string, unknown>> = [];

  for (const s of rows) {
    const points = JSON.parse(s.points) as Array<{ t: string; v: number }>;
    if (points.length < 3) continue;
    // Simple linear regression on index
    const n = points.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (let i = 0; i < n; i++) {
      const y = Number(points[i].v);
      sumX += i;
      sumY += y;
      sumXY += i * y;
      sumXX += i * i;
    }
    const denom = n * sumXX - sumX * sumX || 1;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    const last = Number(points[n - 1].v);
    const forecastPoints: Array<{ hour: number; value: number }> = [];
    for (let h = 1; h <= Math.min(horizonHours, 24); h++) {
      forecastPoints.push({
        hour: h,
        value: Math.round((intercept + slope * (n - 1 + h)) * 1000) / 1000,
      });
    }
    const trend = slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable';

    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO predictive_forecasts
        (tenant_id, forecast_type, metric_name, horizon_days, forecast_points,
         model_version, business_impact, source)
       VALUES ($1,'trend',$2,$3,$4,'trend-v1',$5,'ops_intelligence')
       RETURNING *`,
      [
        tenantId,
        s.name,
        Math.ceil(horizonHours / 24),
        JSON.stringify(forecastPoints),
        JSON.stringify({ trend, lastValue: last, slope: Math.round(slope * 1e6) / 1e6 }),
      ],
    );
    if (row) {
      forecasts.push({
        id: row.id,
        metricName: s.name,
        modelVersion: 'trend-v1',
        trend,
        forecastPoints,
        generatedAt: row.generated_at,
      });
    }
  }

  if (forecasts.length) {
    await emitSignal(tenantId, 'forecast_generated', 'info', `Generated ${forecasts.length} trend forecasts`, {
      count: forecasts.length,
    });
  }

  return { generated: forecasts.length, forecasts };
}

export async function listForecasts(tenantId: string, limit = 50) {
  return query(
    `SELECT * FROM predictive_forecasts WHERE tenant_id = $1 ORDER BY generated_at DESC LIMIT $2`,
    [tenantId, Math.min(limit, 200)],
  );
}

export async function requestRemediation(
  tenantId: string,
  opts: {
    action: string;
    incidentId?: string;
    riskTier?: string;
    evidence?: string;
    requestedBy?: string;
    executionMode?: string;
    actionKey?: string;
  },
) {
  return remControl.requestRemediation(tenantId, opts);
}

export async function listRemediation(tenantId: string, status?: string) {
  return remControl.listRemediation(tenantId, status);
}

export async function executeRemediationDryRun(
  tenantId: string,
  id: string,
  resolvedBy?: string,
) {
  return remControl.executeRemediation(tenantId, id, resolvedBy);
}

export async function listSignals(tenantId: string, limit = 50) {
  return query(
    `SELECT * FROM ops_intelligence_signals WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [tenantId, Math.min(limit, 200)],
  );
}
