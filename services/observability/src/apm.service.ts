import { query, queryOne } from '@opsedge360/shared-db';

export interface MetricPoint {
  name: string;
  value: number;
  unit?: string;
  labels?: Record<string, string>;
  serviceName?: string;
  timestamp?: string;
}

export interface LogRecord {
  body: string;
  severity?: string;
  serviceName?: string;
  traceId?: string;
  spanId?: string;
  attributes?: Record<string, unknown>;
  timestamp?: string;
}

export interface SpanRecord {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  durationMs: number;
  serviceName?: string;
  statusCode?: string;
  attributes?: Record<string, unknown>;
  timestamp?: string;
}

const MAX_BATCH = 500;

export function extractMetrics(body: unknown): MetricPoint[] {
  if (!body || typeof body !== 'object') return [];
  const b = body as Record<string, unknown>;
  if (Array.isArray(b.metrics)) {
    return (b.metrics as MetricPoint[]).slice(0, MAX_BATCH).map(normalizeMetric);
  }

  const out: MetricPoint[] = [];
  const resourceMetrics = (b.resourceMetrics as Array<Record<string, unknown>>) ?? [];
  for (const rm of resourceMetrics) {
    const resource = (rm.resource as Record<string, unknown>) ?? {};
    const serviceName = attrString(resource, 'service.name') ?? 'unknown';
    const scopeMetrics = (rm.scopeMetrics as Array<Record<string, unknown>>) ?? [];
    for (const sm of scopeMetrics) {
      const metrics = (sm.metrics as Array<Record<string, unknown>>) ?? [];
      for (const m of metrics) {
        const points =
          (m.gauge as { dataPoints?: unknown[] })?.dataPoints ??
          (m.sum as { dataPoints?: unknown[] })?.dataPoints ??
          (m.histogram as { dataPoints?: unknown[] })?.dataPoints ??
          (m.dataPoints as unknown[]) ??
          [];
        const dp = (points[0] as Record<string, unknown>) ?? {};
        out.push({
          name: String(m.name ?? 'unknown'),
          value: Number(dp.asDouble ?? dp.asInt ?? dp.value ?? 0),
          unit: m.unit ? String(m.unit) : undefined,
          serviceName,
          labels: { service: serviceName },
          timestamp: new Date().toISOString(),
        });
        if (out.length >= MAX_BATCH) return out;
      }
    }
  }
  return out;
}

export function extractLogs(body: unknown): LogRecord[] {
  if (!body || typeof body !== 'object') return [];
  const b = body as Record<string, unknown>;
  if (Array.isArray(b.logs)) {
    return (b.logs as LogRecord[]).slice(0, MAX_BATCH).map(normalizeLog);
  }

  const out: LogRecord[] = [];
  const resourceLogs = (b.resourceLogs as Array<Record<string, unknown>>) ?? [];
  for (const rl of resourceLogs) {
    const resource = (rl.resource as Record<string, unknown>) ?? {};
    const serviceName = attrString(resource, 'service.name') ?? 'unknown';
    const scopeLogs = (rl.scopeLogs as Array<Record<string, unknown>>) ?? [];
    for (const sl of scopeLogs) {
      const records = (sl.logRecords as Array<Record<string, unknown>>) ?? [];
      for (const r of records) {
        const bodyVal = r.body;
        const text =
          typeof bodyVal === 'object' && bodyVal
            ? String((bodyVal as Record<string, unknown>).stringValue ?? JSON.stringify(bodyVal))
            : String(bodyVal ?? r.message ?? '');
        out.push({
          body: text.slice(0, 8000),
          severity: String(r.severityText ?? severityFromNumber(r.severityNumber) ?? 'INFO'),
          serviceName,
          traceId: r.traceId ? String(r.traceId) : undefined,
          spanId: r.spanId ? String(r.spanId) : undefined,
          attributes: (r.attributes as Record<string, unknown>) ?? {},
          timestamp: new Date().toISOString(),
        });
        if (out.length >= MAX_BATCH) return out;
      }
    }
  }
  return out;
}

export function extractSpans(body: unknown): SpanRecord[] {
  if (!body || typeof body !== 'object') return [];
  const b = body as Record<string, unknown>;
  if (Array.isArray(b.spans)) {
    return (b.spans as SpanRecord[]).slice(0, MAX_BATCH).map(normalizeSpan);
  }

  const out: SpanRecord[] = [];
  const resourceSpans = (b.resourceSpans as Array<Record<string, unknown>>) ?? [];
  for (const rs of resourceSpans) {
    const resource = (rs.resource as Record<string, unknown>) ?? {};
    const serviceName = attrString(resource, 'service.name') ?? 'unknown';
    const scopeSpans = (rs.scopeSpans as Array<Record<string, unknown>>) ?? [];
    for (const ss of scopeSpans) {
      const spans = (ss.spans as Array<Record<string, unknown>>) ?? [];
      for (const s of spans) {
        const start = Number(s.startTimeUnixNano ?? 0);
        const end = Number(s.endTimeUnixNano ?? 0);
        const durationMs =
          s.durationMs != null
            ? Number(s.durationMs)
            : start && end
              ? (end - start) / 1e6
              : 0;
        const status = (s.status as Record<string, unknown>) ?? {};
        out.push({
          traceId: String(s.traceId ?? ''),
          spanId: String(s.spanId ?? ''),
          parentSpanId: s.parentSpanId ? String(s.parentSpanId) : undefined,
          name: String(s.name ?? 'span').slice(0, 500),
          durationMs: Math.max(0, durationMs),
          serviceName,
          statusCode: String(status.code ?? s.statusCode ?? 'UNSET'),
          attributes: (s.attributes as Record<string, unknown>) ?? {},
          timestamp: new Date().toISOString(),
        });
        if (out.length >= MAX_BATCH) return out;
      }
    }
  }
  return out;
}

function normalizeMetric(m: MetricPoint): MetricPoint {
  return {
    name: String(m.name ?? 'unknown').slice(0, 255),
    value: Number(m.value ?? 0),
    unit: m.unit,
    labels: m.labels ?? {},
    serviceName: m.serviceName ?? m.labels?.service ?? 'unknown',
    timestamp: m.timestamp ?? new Date().toISOString(),
  };
}

function normalizeLog(l: LogRecord): LogRecord {
  return {
    body: String(l.body ?? '').slice(0, 8000),
    severity: String(l.severity ?? 'INFO').toUpperCase(),
    serviceName: l.serviceName ?? 'unknown',
    traceId: l.traceId,
    spanId: l.spanId,
    attributes: l.attributes ?? {},
    timestamp: l.timestamp ?? new Date().toISOString(),
  };
}

function normalizeSpan(s: SpanRecord): SpanRecord {
  return {
    traceId: String(s.traceId ?? ''),
    spanId: String(s.spanId ?? ''),
    parentSpanId: s.parentSpanId,
    name: String(s.name ?? 'span').slice(0, 500),
    durationMs: Math.max(0, Number(s.durationMs ?? 0)),
    serviceName: s.serviceName ?? 'unknown',
    statusCode: s.statusCode ?? 'UNSET',
    attributes: s.attributes ?? {},
    timestamp: s.timestamp ?? new Date().toISOString(),
  };
}

function attrString(resource: Record<string, unknown>, key: string): string | undefined {
  const attrs = (resource.attributes as Array<Record<string, unknown>>) ?? [];
  for (const a of attrs) {
    if (a.key === key) {
      const v = a.value as Record<string, unknown> | undefined;
      return v?.stringValue != null ? String(v.stringValue) : undefined;
    }
  }
  return undefined;
}

function severityFromNumber(n: unknown): string | undefined {
  const v = Number(n);
  if (!v) return undefined;
  if (v >= 17) return 'ERROR';
  if (v >= 13) return 'WARN';
  if (v >= 9) return 'INFO';
  return 'DEBUG';
}

export async function persistMetrics(tenantId: string, metrics: MetricPoint[]): Promise<number> {
  let count = 0;
  for (const m of metrics) {
    await query(
      `INSERT INTO otlp_metrics (tenant_id, name, value, unit, labels, service_name, recorded_at)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7::timestamptz, NOW()))`,
      [
        tenantId,
        m.name,
        m.value,
        m.unit ?? null,
        JSON.stringify(m.labels ?? {}),
        m.serviceName ?? 'unknown',
        m.timestamp ?? null,
      ],
    );
    count += 1;
  }
  return count;
}

export async function persistLogs(tenantId: string, logs: LogRecord[]): Promise<number> {
  let count = 0;
  for (const l of logs) {
    await query(
      `INSERT INTO otlp_logs (tenant_id, body, severity, service_name, trace_id, span_id, attributes, recorded_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::timestamptz, NOW()))`,
      [
        tenantId,
        l.body,
        l.severity ?? 'INFO',
        l.serviceName ?? 'unknown',
        l.traceId ?? null,
        l.spanId ?? null,
        JSON.stringify(l.attributes ?? {}),
        l.timestamp ?? null,
      ],
    );
    count += 1;
  }
  return count;
}

export async function persistSpans(tenantId: string, spans: SpanRecord[]): Promise<number> {
  let count = 0;
  for (const s of spans) {
    if (!s.traceId || !s.spanId) continue;
    await query(
      `INSERT INTO otlp_spans
        (tenant_id, trace_id, span_id, parent_span_id, name, service_name, duration_ms, status_code, attributes, recorded_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10::timestamptz, NOW()))`,
      [
        tenantId,
        s.traceId,
        s.spanId,
        s.parentSpanId ?? null,
        s.name,
        s.serviceName ?? 'unknown',
        s.durationMs,
        s.statusCode ?? 'UNSET',
        JSON.stringify(s.attributes ?? {}),
        s.timestamp ?? null,
      ],
    );
    count += 1;
  }
  return count;
}

export async function getTelemetrySummary(tenantId: string) {
  const row = await queryOne<{ metrics: string; logs: string; spans: string; services: string }>(
    `SELECT
      (SELECT COUNT(*) FROM otlp_metrics WHERE tenant_id = $1 AND recorded_at > NOW() - INTERVAL '1 hour') as metrics,
      (SELECT COUNT(*) FROM otlp_logs WHERE tenant_id = $1 AND recorded_at > NOW() - INTERVAL '1 hour') as logs,
      (SELECT COUNT(*) FROM otlp_spans WHERE tenant_id = $1 AND recorded_at > NOW() - INTERVAL '1 hour') as spans,
      (SELECT COUNT(DISTINCT service_name) FROM otlp_spans WHERE tenant_id = $1 AND recorded_at > NOW() - INTERVAL '1 hour') as services`,
    [tenantId],
  );
  return {
    totalMetrics: Number(row?.metrics ?? 0),
    totalLogs: Number(row?.logs ?? 0),
    totalSpans: Number(row?.spans ?? 0),
    services: Number(row?.services ?? 0),
    window: '1h',
  };
}

export async function buildServiceMap(tenantId: string, hours = 1) {
  const services = await query<{
    service_name: string;
    span_count: string;
    avg_duration: string;
    error_count: string;
  }>(
    `SELECT service_name,
      COUNT(*)::text as span_count,
      COALESCE(AVG(duration_ms), 0)::text as avg_duration,
      COUNT(*) FILTER (WHERE status_code IN ('ERROR', 'STATUS_CODE_ERROR', '2'))::text as error_count
     FROM otlp_spans
     WHERE tenant_id = $1 AND recorded_at > NOW() - ($2 * INTERVAL '1 hour')
     GROUP BY service_name
     ORDER BY COUNT(*) DESC`,
    [tenantId, hours],
  );

  // Edges: parent span in service A, child in service B within same trace
  const edges = await query<{ source: string; target: string; calls: string; avg_duration: string }>(
    `SELECT p.service_name as source, c.service_name as target,
      COUNT(*)::text as calls,
      COALESCE(AVG(c.duration_ms), 0)::text as avg_duration
     FROM otlp_spans c
     JOIN otlp_spans p
       ON p.tenant_id = c.tenant_id
      AND p.trace_id = c.trace_id
      AND p.span_id = c.parent_span_id
     WHERE c.tenant_id = $1
       AND c.recorded_at > NOW() - ($2 * INTERVAL '1 hour')
       AND p.service_name <> c.service_name
     GROUP BY p.service_name, c.service_name
     ORDER BY COUNT(*) DESC
     LIMIT 200`,
    [tenantId, hours],
  );

  const nodes = services.map((s) => ({
    id: s.service_name,
    label: s.service_name,
    spanCount: Number(s.span_count),
    avgDurationMs: Math.round(Number(s.avg_duration) * 10) / 10,
    errorCount: Number(s.error_count),
    errorRate:
      Number(s.span_count) > 0
        ? Math.round((Number(s.error_count) / Number(s.span_count)) * 1000) / 10
        : 0,
  }));

  return {
    nodes,
    edges: edges.map((e) => ({
      source: e.source,
      target: e.target,
      calls: Number(e.calls),
      avgDurationMs: Math.round(Number(e.avg_duration) * 10) / 10,
    })),
    windowHours: hours,
  };
}

export async function searchLogs(
  tenantId: string,
  opts: {
    q?: string;
    severity?: string;
    service?: string;
    traceId?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;
  const conditions = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (opts.q) {
    conditions.push(`body ILIKE $${idx++}`);
    params.push(`%${opts.q}%`);
  }
  if (opts.severity) {
    conditions.push(`severity = $${idx++}`);
    params.push(opts.severity.toUpperCase());
  }
  if (opts.service) {
    conditions.push(`service_name = $${idx++}`);
    params.push(opts.service);
  }
  if (opts.traceId) {
    conditions.push(`trace_id = $${idx++}`);
    params.push(opts.traceId);
  }

  params.push(limit, offset);
  const rows = await query(
    `SELECT id, body, severity, service_name, trace_id, span_id, attributes, recorded_at
     FROM otlp_logs
     WHERE ${conditions.join(' AND ')}
     ORDER BY recorded_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    params,
  );

  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM otlp_logs WHERE ${conditions.join(' AND ')}`,
    params.slice(0, params.length - 2),
  );

  // Optional OpenSearch passthrough when configured
  let opensearchHits: unknown[] | undefined;
  if (process.env.OPENSEARCH_URL && opts.q) {
    try {
      opensearchHits = await searchOpenSearch(tenantId, opts.q, limit);
    } catch (err) {
      console.warn('[apm] OpenSearch search failed:', (err as Error).message);
    }
  }

  return {
    total: Number(countRow?.count ?? rows.length),
    logs: rows.map((r) => ({
      id: r.id,
      body: r.body,
      severity: r.severity,
      serviceName: r.service_name,
      traceId: r.trace_id,
      spanId: r.span_id,
      attributes: r.attributes,
      recordedAt: r.recorded_at,
    })),
    source: opensearchHits ? 'postgres+opensearch' : 'postgres',
    opensearchHits,
  };
}

async function searchOpenSearch(tenantId: string, q: string, size: number): Promise<unknown[]> {
  const url = `${process.env.OPENSEARCH_URL}/opsedge360-logs/_search`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      size,
      query: {
        bool: {
          must: [{ match: { body: q } }],
          filter: [{ term: { tenant_id: tenantId } }],
        },
      },
      sort: [{ recorded_at: 'desc' }],
    }),
  });
  if (!res.ok) throw new Error(`OpenSearch ${res.status}`);
  const data = (await res.json()) as { hits?: { hits?: Array<{ _source: unknown }> } };
  return data.hits?.hits?.map((h) => h._source) ?? [];
}

export async function listTraces(tenantId: string, limit = 20) {
  const rows = await query<{
    trace_id: string;
    services: string;
    span_count: string;
    total_duration: string;
    error_count: string;
    started_at: string;
  }>(
    `SELECT trace_id,
      string_agg(DISTINCT service_name, ', ') as services,
      COUNT(*)::text as span_count,
      COALESCE(MAX(duration_ms), 0)::text as total_duration,
      COUNT(*) FILTER (WHERE status_code IN ('ERROR', 'STATUS_CODE_ERROR', '2'))::text as error_count,
      MIN(recorded_at)::text as started_at
     FROM otlp_spans
     WHERE tenant_id = $1 AND recorded_at > NOW() - INTERVAL '24 hours'
     GROUP BY trace_id
     ORDER BY MIN(recorded_at) DESC
     LIMIT $2`,
    [tenantId, limit],
  );

  return {
    traces: rows.map((r) => ({
      traceId: r.trace_id,
      services: r.services,
      spanCount: Number(r.span_count),
      durationMs: Math.round(Number(r.total_duration) * 10) / 10,
      errorCount: Number(r.error_count),
      startedAt: r.started_at,
    })),
  };
}

export async function getTrace(tenantId: string, traceId: string) {
  const spans = await query(
    `SELECT * FROM otlp_spans WHERE tenant_id = $1 AND trace_id = $2 ORDER BY recorded_at`,
    [tenantId, traceId],
  );
  return {
    traceId,
    spans: spans.map((s) => ({
      spanId: s.span_id,
      parentSpanId: s.parent_span_id,
      name: s.name,
      serviceName: s.service_name,
      durationMs: Number(s.duration_ms),
      statusCode: s.status_code,
      attributes: s.attributes,
      recordedAt: s.recorded_at,
    })),
  };
}
