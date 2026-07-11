import { query, queryOne } from '@opsedge360/shared-db';
import * as opsIntel from './ops-intelligence.service';

export type SignalType = 'metric' | 'log' | 'trace' | 'alert' | 'anomaly' | 'change';

export interface CollectedSignal {
  signalType: SignalType;
  sourceId: string;
  title: string;
  severity: string;
  serviceName: string | null;
  weight: number;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

function severityRank(s: string): number {
  switch ((s || '').toLowerCase()) {
    case 'critical':
    case 'fatal':
    case 'error':
      return 4;
    case 'high':
    case 'warning':
      return 3;
    case 'medium':
    case 'info':
      return 2;
    default:
      return 1;
  }
}

function maxSeverity(a: string, b: string): string {
  return severityRank(a) >= severityRank(b) ? a : b;
}

function affinityKey(s: CollectedSignal): string {
  if (s.serviceName) return `svc:${s.serviceName.toLowerCase()}`;
  const host = String(s.metadata.host ?? s.metadata.instance ?? '');
  if (host) return `host:${host.toLowerCase()}`;
  return `type:${s.signalType}`;
}

/** Normalize DB/driver dates to ISO timestamptz strings Postgres accepts. */
function asIso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'number' && Number.isFinite(v)) return new Date(v).toISOString();
  const d = new Date(String(v ?? ''));
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return new Date().toISOString();
}

/**
 * Collect multi-signal window: metrics, logs, traces, alerts, anomalies, changes.
 */
export async function collectSignals(
  tenantId: string,
  windowMinutes = 30,
): Promise<{ signals: CollectedSignal[]; counts: Record<string, number> }> {
  const w = Math.min(Math.max(windowMinutes, 5), 24 * 60);
  const signals: CollectedSignal[] = [];

  // Alerts
  try {
    const alerts = await query<Record<string, unknown>>(
      `SELECT id, title, severity, labels, fired_at
       FROM alert_events
       WHERE tenant_id = $1 AND fired_at > NOW() - ($2 * INTERVAL '1 minute')
       ORDER BY fired_at DESC LIMIT 100`,
      [tenantId, w],
    );
    for (const a of alerts) {
      const labels = (a.labels ?? {}) as Record<string, unknown>;
      signals.push({
        signalType: 'alert',
        sourceId: String(a.id),
        title: String(a.title),
        severity: String(a.severity ?? 'warning'),
        serviceName: String(labels.service ?? labels.job ?? labels.service_name ?? '') || null,
        weight: 1.2,
        occurredAt: asIso(a.fired_at),
        metadata: { labels },
      });
    }
  } catch {
    /* table optional in some envs */
  }

  // Anomalies
  try {
    const anomalies = await query<Record<string, unknown>>(
      `SELECT id, anomaly_type, metric_name, severity, ci_id, detected_at, deviation_sigma
       FROM anomalies
       WHERE tenant_id = $1 AND detected_at > NOW() - ($2 * INTERVAL '1 minute')
       ORDER BY detected_at DESC LIMIT 100`,
      [tenantId, w],
    );
    for (const a of anomalies) {
      signals.push({
        signalType: 'anomaly',
        sourceId: String(a.id),
        title: `${a.anomaly_type}${a.metric_name ? `: ${a.metric_name}` : ''}`,
        severity: String(a.severity ?? 'warning'),
        serviceName: a.metric_name ? String(a.metric_name).split('_')[0] : null,
        weight: 1.4,
        occurredAt: asIso(a.detected_at),
        metadata: { ciId: a.ci_id, sigma: a.deviation_sigma, metric: a.metric_name },
      });
    }
  } catch {
    /* */
  }

  // Metrics — high recent sample volume per name as pressure signal
  try {
    const metrics = await query<Record<string, unknown>>(
      `SELECT name, COUNT(*)::text as cnt, MAX(value)::text as max_v, MAX(recorded_at) as last_at
       FROM prometheus_samples
       WHERE tenant_id = $1 AND recorded_at > NOW() - ($2 * INTERVAL '1 minute')
       GROUP BY name
       HAVING COUNT(*) >= 3
       ORDER BY COUNT(*) DESC
       LIMIT 30`,
      [tenantId, w],
    );
    for (const m of metrics) {
      signals.push({
        signalType: 'metric',
        sourceId: `metric:${m.name}`,
        title: `Metric activity: ${m.name}`,
        severity: Number(m.max_v) > 90 ? 'warning' : 'info',
        serviceName: String(m.name).includes('_') ? String(m.name).split('_')[0] : null,
        weight: 0.6,
        occurredAt: asIso(m.last_at),
        metadata: { samples: Number(m.cnt), max: Number(m.max_v) },
      });
    }
  } catch {
    /* */
  }

  // Logs — error/warn bursts by service
  try {
    const logs = await query<Record<string, unknown>>(
      `SELECT COALESCE(service_name, 'unknown') as service_name,
              COUNT(*)::text as cnt,
              COUNT(*) FILTER (WHERE UPPER(COALESCE(severity,'')) IN ('ERROR','FATAL','CRITICAL','WARN','WARNING'))::text as bad,
              MAX(recorded_at) as last_at
       FROM otlp_logs
       WHERE tenant_id = $1 AND recorded_at > NOW() - ($2 * INTERVAL '1 minute')
       GROUP BY COALESCE(service_name, 'unknown')
       HAVING COUNT(*) FILTER (WHERE UPPER(COALESCE(severity,'')) IN ('ERROR','FATAL','CRITICAL','WARN','WARNING')) > 0
       ORDER BY COUNT(*) FILTER (WHERE UPPER(COALESCE(severity,'')) IN ('ERROR','FATAL','CRITICAL','WARN','WARNING')) DESC
       LIMIT 40`,
      [tenantId, w],
    );
    for (const l of logs) {
      const bad = Number(l.bad);
      signals.push({
        signalType: 'log',
        sourceId: `log:${l.service_name}`,
        title: `Log errors/warns on ${l.service_name} (${bad})`,
        severity: bad >= 20 ? 'critical' : bad >= 5 ? 'high' : 'warning',
        serviceName: String(l.service_name),
        weight: 1.1,
        occurredAt: asIso(l.last_at),
        metadata: { total: Number(l.cnt), bad },
      });
    }
  } catch {
    /* */
  }

  // Traces — error spans by service
  try {
    const traces = await query<Record<string, unknown>>(
      `SELECT COALESCE(service_name, 'unknown') as service_name,
              COUNT(*)::text as cnt,
              COUNT(*) FILTER (WHERE status_code IN ('ERROR','STATUS_CODE_ERROR','2'))::text as errors,
              COALESCE(AVG(duration_ms),0)::text as avg_ms,
              MAX(recorded_at) as last_at
       FROM otlp_spans
       WHERE tenant_id = $1 AND recorded_at > NOW() - ($2 * INTERVAL '1 minute')
       GROUP BY COALESCE(service_name, 'unknown')
       HAVING COUNT(*) FILTER (WHERE status_code IN ('ERROR','STATUS_CODE_ERROR','2')) > 0
          OR AVG(duration_ms) > 1000
       ORDER BY COUNT(*) FILTER (WHERE status_code IN ('ERROR','STATUS_CODE_ERROR','2')) DESC
       LIMIT 40`,
      [tenantId, w],
    );
    for (const t of traces) {
      const errors = Number(t.errors);
      const avgMs = Number(t.avg_ms);
      signals.push({
        signalType: 'trace',
        sourceId: `trace:${t.service_name}`,
        title: `Trace pressure on ${t.service_name} (errors=${errors}, avg=${Math.round(avgMs)}ms)`,
        severity: errors >= 10 ? 'critical' : errors > 0 || avgMs > 2000 ? 'high' : 'warning',
        serviceName: String(t.service_name),
        weight: 1.3,
        occurredAt: asIso(t.last_at),
        metadata: { spans: Number(t.cnt), errors, avgMs },
      });
    }
  } catch {
    /* */
  }

  // Changes — configuration_history / drift_events
  try {
    const changes = await query<Record<string, unknown>>(
      `SELECT id, ci_id, change_type, created_at
       FROM configuration_history
       WHERE tenant_id = $1 AND created_at > NOW() - ($2 * INTERVAL '1 minute')
       ORDER BY created_at DESC LIMIT 50`,
      [tenantId, w],
    );
    for (const c of changes) {
      signals.push({
        signalType: 'change',
        sourceId: String(c.id),
        title: `Config change: ${c.change_type}`,
        severity: 'info',
        serviceName: null,
        weight: 1.0,
        occurredAt: asIso(c.created_at),
        metadata: { ciId: c.ci_id, changeType: c.change_type },
      });
    }
  } catch {
    /* history may not exist */
  }

  try {
    const drifts = await query<Record<string, unknown>>(
      `SELECT id, ci_id, drift_type, severity, detected_at
       FROM drift_events
       WHERE tenant_id = $1 AND detected_at > NOW() - ($2 * INTERVAL '1 minute')
       ORDER BY detected_at DESC LIMIT 50`,
      [tenantId, w],
    );
    for (const d of drifts) {
      signals.push({
        signalType: 'change',
        sourceId: String(d.id),
        title: `Drift: ${d.drift_type}`,
        severity: String(d.severity ?? 'warning'),
        serviceName: null,
        weight: 1.15,
        occurredAt: asIso(d.detected_at),
        metadata: { ciId: d.ci_id, driftType: d.drift_type },
      });
    }
  } catch {
    /* */
  }

  const counts = {
    metric: signals.filter((s) => s.signalType === 'metric').length,
    log: signals.filter((s) => s.signalType === 'log').length,
    trace: signals.filter((s) => s.signalType === 'trace').length,
    alert: signals.filter((s) => s.signalType === 'alert').length,
    anomaly: signals.filter((s) => s.signalType === 'anomaly').length,
    change: signals.filter((s) => s.signalType === 'change').length,
    total: signals.length,
  };

  await query(
    `INSERT INTO aiops_signal_snapshots
      (tenant_id, window_minutes, metrics_count, logs_count, traces_count, alerts_count, anomalies_count, changes_count, payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      tenantId,
      w,
      counts.metric,
      counts.log,
      counts.trace,
      counts.alert,
      counts.anomaly,
      counts.change,
      JSON.stringify({ counts }),
    ],
  ).catch(() => undefined);

  return { signals, counts };
}

export async function runMultiSignalCorrelation(
  tenantId: string,
  opts: { windowMinutes?: number; minSignals?: number } = {},
) {
  const windowMinutes = opts.windowMinutes ?? 30;
  const minSignals = opts.minSignals ?? 2;
  const { signals, counts } = await collectSignals(tenantId, windowMinutes);

  const buckets = new Map<string, CollectedSignal[]>();
  for (const s of signals) {
    const key = affinityKey(s);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(s);
  }

  const created: Array<Record<string, unknown>> = [];
  const hourKey = new Date().toISOString().slice(0, 13);

  for (const [affinity, members] of buckets) {
    const types = [...new Set(members.map((m) => m.signalType))];
    // Prefer multi-type clusters; allow single-type if dense
    if (members.length < minSignals && types.length < 2) continue;
    if (types.length < 2 && members.length < 3) continue;

    const score =
      members.reduce((sum, m) => sum + m.weight * severityRank(m.severity), 0) + types.length * 2;
    let severity = 'info';
    for (const m of members) severity = maxSeverity(severity, m.severity);

    const primaryService =
      members.find((m) => m.serviceName)?.serviceName ??
      (affinity.startsWith('svc:') ? affinity.slice(4) : null);

    let primaryCiId: string | null = null;
    const ciHint = members.find((m) => m.metadata.ciId)?.metadata.ciId;
    if (ciHint) primaryCiId = String(ciHint);
    else if (primaryService) {
      const ci = await queryOne<{ id: string }>(
        `SELECT id FROM configuration_items
         WHERE tenant_id = $1 AND (
           LOWER(name) = LOWER($2) OR attributes->>'service_name' = $2 OR external_id = $2
           OR external_id = $3
         ) LIMIT 1`,
        [tenantId, primaryService, `svc:${primaryService}`],
      );
      primaryCiId = ci?.id ?? null;
    }

    const title = primaryService
      ? `Multi-signal correlation: ${primaryService} (${types.join('+')})`
      : `Multi-signal correlation: ${affinity} (${types.join('+')})`;

    const corrKey = `ms:${affinity}:${hourKey}`;
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM aiops_correlation_events
       WHERE tenant_id = $1 AND correlation_key = $2 AND status = 'open' LIMIT 1`,
      [tenantId, corrKey],
    );
    if (existing) {
      created.push({ id: existing.id, created: false, affinity, score, signalTypes: types });
      continue;
    }

    // Optionally create/link ops incident when multi-type
    let relatedIncidentId: string | null = null;
    if (types.length >= 2) {
      try {
        const corr = await opsIntel.correlate(tenantId, { windowMinutes });
        relatedIncidentId = (corr.incidents[0]?.id as string) ?? null;
      } catch {
        /* optional */
      }
    }

    const summary = [
      `${members.length} signals across ${types.join(', ')}`,
      primaryService ? `primary service ${primaryService}` : null,
      `score ${Math.round(score * 10) / 10}`,
    ]
      .filter(Boolean)
      .join(' · ');

    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO aiops_correlation_events
        (tenant_id, correlation_key, title, severity, signals, related_incident_id, status,
         window_minutes, score, signal_types, primary_service, primary_ci_id, summary, evidence)
       VALUES ($1,$2,$3,$4,$5,$6,'open',$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        tenantId,
        corrKey,
        title.slice(0, 500),
        severity,
        JSON.stringify({ ...counts, clusterSize: members.length, types }),
        relatedIncidentId,
        windowMinutes,
        score,
        types,
        primaryService,
        primaryCiId,
        summary,
        JSON.stringify({ affinity, sample: members.slice(0, 10) }),
      ],
    );

    for (const m of members) {
      await query(
        `INSERT INTO aiops_correlation_members
          (tenant_id, correlation_id, signal_type, source_id, title, severity, service_name, weight, occurred_at, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          tenantId,
          row!.id,
          m.signalType,
          m.sourceId,
          m.title,
          m.severity,
          m.serviceName,
          m.weight,
          m.occurredAt,
          JSON.stringify(m.metadata),
        ],
      );
    }

    created.push({
      id: row!.id,
      created: true,
      title: row!.title,
      severity: row!.severity,
      score,
      signalTypes: types,
      primaryService,
      primaryCiId,
      memberCount: members.length,
      relatedIncidentId,
    });
  }

  // Sort by score desc
  created.sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));

  return {
    windowMinutes,
    signalCounts: counts,
    clustersCreated: created.filter((c) => c.created).length,
    clusters: created,
  };
}

export async function getCorrelationDetail(tenantId: string, id: string) {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM aiops_correlation_events WHERE tenant_id = $1 AND id = $2`,
    [tenantId, id],
  );
  if (!row) return null;
  const members = await query(
    `SELECT * FROM aiops_correlation_members WHERE tenant_id = $1 AND correlation_id = $2
     ORDER BY weight DESC, occurred_at DESC`,
    [tenantId, id],
  );
  return {
    id: row.id,
    title: row.title,
    severity: row.severity,
    status: row.status,
    score: row.score,
    signalTypes: row.signal_types,
    primaryService: row.primary_service,
    primaryCiId: row.primary_ci_id,
    summary: row.summary,
    signals: row.signals,
    evidence: row.evidence,
    relatedIncidentId: row.related_incident_id,
    windowMinutes: row.window_minutes,
    createdAt: row.created_at,
    members,
  };
}

export async function listDetailedCorrelations(tenantId: string, limit = 50) {
  return query(
    `SELECT id, title, severity, status, score, signal_types, primary_service, summary, created_at
     FROM aiops_correlation_events
     WHERE tenant_id = $1
     ORDER BY score DESC NULLS LAST, created_at DESC
     LIMIT $2`,
    [tenantId, Math.min(limit, 200)],
  );
}

export async function latestSignalSnapshot(tenantId: string) {
  return queryOne(
    `SELECT * FROM aiops_signal_snapshots WHERE tenant_id = $1 ORDER BY collected_at DESC LIMIT 1`,
    [tenantId],
  );
}
