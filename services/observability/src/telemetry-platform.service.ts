import { query, queryOne } from '@opsedge360/shared-db';

export type TelemetrySignal = 'metrics' | 'logs' | 'traces';

export interface QualityResult {
  ok: boolean;
  reason?: string;
  accepted: number;
  rejected: number;
}

function statsEnabled(): boolean {
  return process.env.TELEMETRY_STATS !== 'false';
}

function qualityGateStrict(): boolean {
  return process.env.TELEMETRY_QUALITY_GATE !== 'false';
}

function windowStart(d = new Date()): Date {
  const x = new Date(d);
  x.setUTCMinutes(0, 0, 0);
  return x;
}

export async function recordIngestStats(
  tenantId: string,
  signal: TelemetrySignal,
  accepted: number,
  rejected: number,
  bytesIn = 0,
): Promise<void> {
  if (!statsEnabled()) return;
  const ws = windowStart().toISOString();
  await query(
    `INSERT INTO telemetry_ingest_stats (tenant_id, signal, window_start, accepted, rejected, bytes_in)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (tenant_id, signal, window_start)
     DO UPDATE SET
       accepted = telemetry_ingest_stats.accepted + EXCLUDED.accepted,
       rejected = telemetry_ingest_stats.rejected + EXCLUDED.rejected,
       bytes_in = telemetry_ingest_stats.bytes_in + EXCLUDED.bytes_in`,
    [tenantId, signal, ws, accepted, rejected, bytesIn],
  ).catch(() => undefined);
}

export async function recordQualityEvent(
  tenantId: string,
  signal: TelemetrySignal,
  reason: string,
  sample: Record<string, unknown> = {},
): Promise<void> {
  await query(
    `INSERT INTO telemetry_quality_events (tenant_id, signal, reason, sample)
     VALUES ($1,$2,$3,$4)`,
    [tenantId, signal, reason, JSON.stringify(sample)],
  ).catch(() => undefined);
}

/** Lightweight OTLP JSON shape checks before extract/persist. */
export function validateOtlpPayload(signal: TelemetrySignal, body: unknown): QualityResult {
  if (body == null || typeof body !== 'object') {
    return { ok: false, reason: 'payload_not_object', accepted: 0, rejected: 1 };
  }
  const obj = body as Record<string, unknown>;

  if (signal === 'metrics') {
    const rms = obj.resourceMetrics ?? obj.resource_metrics;
    if (!Array.isArray(rms) && !Array.isArray(obj.metrics)) {
      // allow flat metric arrays used by some agents
      if (!Array.isArray(body)) {
        return { ok: false, reason: 'metrics_shape_invalid', accepted: 0, rejected: 1 };
      }
    }
    return { ok: true, accepted: 1, rejected: 0 };
  }

  if (signal === 'logs') {
    const rls = obj.resourceLogs ?? obj.resource_logs;
    if (!Array.isArray(rls) && !Array.isArray(obj.logs)) {
      if (!Array.isArray(body)) {
        return { ok: false, reason: 'logs_shape_invalid', accepted: 0, rejected: 1 };
      }
    }
    return { ok: true, accepted: 1, rejected: 0 };
  }

  const rts = obj.resourceSpans ?? obj.resource_spans;
  if (!Array.isArray(rts) && !Array.isArray(obj.spans)) {
    if (!Array.isArray(body)) {
      return { ok: false, reason: 'traces_shape_invalid', accepted: 0, rejected: 1 };
    }
  }
  return { ok: true, accepted: 1, rejected: 0 };
}

export async function gateOtlpIngest(
  tenantId: string,
  signal: TelemetrySignal,
  body: unknown,
  bytesIn = 0,
): Promise<{ allow: boolean; reason?: string }> {
  const q = validateOtlpPayload(signal, body);
  if (q.ok) {
    await recordIngestStats(tenantId, signal, q.accepted, 0, bytesIn);
    return { allow: true };
  }
  await recordQualityEvent(tenantId, signal, q.reason ?? 'invalid', {
    keys: body && typeof body === 'object' ? Object.keys(body as object).slice(0, 12) : [],
  });
  await recordIngestStats(tenantId, signal, 0, q.rejected, bytesIn);
  if (!qualityGateStrict()) return { allow: true, reason: q.reason };
  return { allow: false, reason: q.reason };
}

export async function registerCollector(
  tenantId: string,
  input: { name: string; collectorType?: string; endpoint?: string; version?: string; metadata?: Record<string, unknown> },
) {
  if (!input.name?.trim()) throw new Error('name required');
  return queryOne(
    `INSERT INTO telemetry_collectors (tenant_id, name, collector_type, endpoint, version, metadata, last_heartbeat_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW())
     ON CONFLICT (tenant_id, name) DO UPDATE SET
       collector_type = EXCLUDED.collector_type,
       endpoint = COALESCE(EXCLUDED.endpoint, telemetry_collectors.endpoint),
       version = COALESCE(EXCLUDED.version, telemetry_collectors.version),
       metadata = EXCLUDED.metadata,
       status = 'active',
       last_heartbeat_at = NOW()
     RETURNING *`,
    [
      tenantId,
      input.name.trim(),
      input.collectorType ?? 'otelcol',
      input.endpoint ?? null,
      input.version ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}

export async function listCollectors(tenantId: string) {
  return query(
    `SELECT * FROM telemetry_collectors WHERE tenant_id = $1 ORDER BY name`,
    [tenantId],
  );
}

export async function heartbeatCollector(tenantId: string, id: string, version?: string) {
  const row = await queryOne(
    `UPDATE telemetry_collectors
     SET last_heartbeat_at = NOW(),
         version = COALESCE($3, version),
         status = 'active'
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [id, tenantId, version ?? null],
  );
  if (!row) throw new Error('Collector not found');
  return row;
}

export async function telemetryHealth(tenantId: string) {
  const collectors = await queryOne<{ c: string; stale: string }>(
    `SELECT
       COUNT(*)::text AS c,
       COUNT(*) FILTER (WHERE last_heartbeat_at IS NULL OR last_heartbeat_at < NOW() - INTERVAL '10 minutes')::text AS stale
     FROM telemetry_collectors WHERE tenant_id = $1 AND status = 'active'`,
    [tenantId],
  ).catch(() => ({ c: '0', stale: '0' }));

  const stats = await query(
    `SELECT signal,
            SUM(accepted)::text AS accepted,
            SUM(rejected)::text AS rejected
     FROM telemetry_ingest_stats
     WHERE tenant_id = $1 AND window_start > NOW() - INTERVAL '24 hours'
     GROUP BY signal`,
    [tenantId],
  ).catch(() => []);

  const quality = await queryOne<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM telemetry_quality_events
     WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
    [tenantId],
  ).catch(() => ({ c: '0' }));

  return {
    ok: true,
    collectors: Number(collectors?.c ?? 0),
    staleCollectors: Number(collectors?.stale ?? 0),
    ingestLast24h: stats,
    qualityEventsLast24h: Number(quality?.c ?? 0),
    qualityGate: qualityGateStrict(),
    statsEnabled: statsEnabled(),
  };
}

export async function listIngestStats(tenantId: string, hours = 24) {
  return query(
    `SELECT signal, window_start, accepted, rejected, bytes_in
     FROM telemetry_ingest_stats
     WHERE tenant_id = $1 AND window_start > NOW() - ($2::text || ' hours')::interval
     ORDER BY window_start DESC
     LIMIT 500`,
    [tenantId, String(hours)],
  );
}

export async function listQualityEvents(tenantId: string, limit = 50) {
  return query(
    `SELECT id, signal, reason, sample, created_at
     FROM telemetry_quality_events
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [tenantId, limit],
  );
}

export async function upsertRetentionPolicy(
  tenantId: string | null,
  signal: string,
  retentionDays: number,
  enabled = true,
) {
  if (tenantId) {
    const updated = await queryOne(
      `UPDATE telemetry_retention_policies
       SET retention_days = $3, enabled = $4
       WHERE tenant_id = $1 AND signal = $2
       RETURNING *`,
      [tenantId, signal, retentionDays, enabled],
    );
    if (updated) return updated;
    return queryOne(
      `INSERT INTO telemetry_retention_policies (tenant_id, signal, retention_days, enabled)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [tenantId, signal, retentionDays, enabled],
    );
  }
  const updated = await queryOne(
    `UPDATE telemetry_retention_policies
     SET retention_days = $2, enabled = $3
     WHERE tenant_id IS NULL AND signal = $1
     RETURNING *`,
    [signal, retentionDays, enabled],
  );
  if (updated) return updated;
  return queryOne(
    `INSERT INTO telemetry_retention_policies (tenant_id, signal, retention_days, enabled)
     VALUES (NULL,$1,$2,$3) RETURNING *`,
    [signal, retentionDays, enabled],
  );
}

export async function listRetentionPolicies(tenantId: string) {
  return query(
    `SELECT * FROM telemetry_retention_policies
     WHERE tenant_id IS NULL OR tenant_id = $1
     ORDER BY tenant_id NULLS FIRST, signal`,
    [tenantId],
  );
}

export async function applyRetention(tenantId: string): Promise<Record<string, number>> {
  const policies = await listRetentionPolicies(tenantId);
  const deleted: Record<string, number> = { metrics: 0, logs: 0, traces: 0 };
  for (const p of policies as Array<{ signal: string; retention_days: number; enabled: boolean; tenant_id: string | null }>) {
    if (!p.enabled) continue;
    const days = Number(p.retention_days);
    if (p.signal === 'metrics' || p.signal === 'all') {
      const r = await queryOne<{ c: string }>(
        `WITH d AS (
           DELETE FROM otlp_metrics WHERE tenant_id = $1 AND recorded_at < NOW() - ($2 || ' days')::interval
           RETURNING 1
         ) SELECT COUNT(*)::text AS c FROM d`,
        [tenantId, String(days)],
      ).catch(() => ({ c: '0' }));
      deleted.metrics += Number(r?.c ?? 0);
    }
    if (p.signal === 'logs' || p.signal === 'all') {
      const r = await queryOne<{ c: string }>(
        `WITH d AS (
           DELETE FROM otlp_logs WHERE tenant_id = $1 AND recorded_at < NOW() - ($2 || ' days')::interval
           RETURNING 1
         ) SELECT COUNT(*)::text AS c FROM d`,
        [tenantId, String(days)],
      ).catch(() => ({ c: '0' }));
      deleted.logs += Number(r?.c ?? 0);
    }
    if (p.signal === 'traces' || p.signal === 'all') {
      const r = await queryOne<{ c: string }>(
        `WITH d AS (
           DELETE FROM otlp_spans WHERE tenant_id = $1 AND recorded_at < NOW() - ($2 || ' days')::interval
           RETURNING 1
         ) SELECT COUNT(*)::text AS c FROM d`,
        [tenantId, String(days)],
      ).catch(() => ({ c: '0' }));
      deleted.traces += Number(r?.c ?? 0);
    }
  }
  return deleted;
}
