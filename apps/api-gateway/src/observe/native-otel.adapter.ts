import type { ProxyService } from '../proxy.service';
import type { ObserveAdapter } from './observe-adapter';
import type {
  ObserveAdapterCapabilities,
  ObserveAdapterHealth,
  ObserveHealth,
  ObserveLogHit,
  ObserveMetricPoint,
  ObserveTopology,
  ObserveTraceDetail,
  ObserveTraceSummary,
} from './observe.types';

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
}

function healthFromErrors(errorRate: number, latencyMs: number): ObserveHealth {
  if (errorRate >= 5 || latencyMs >= 2000) return 'critical';
  if (errorRate >= 1 || latencyMs >= 400) return 'degraded';
  return 'healthy';
}

/**
 * Native OTel / Prometheus path already operating in OpsEdge360 observability service.
 * This adapter normalizes responses into canonical DTOs — no vendor UI leakage.
 */
export class NativeOtelObserveAdapter implements ObserveAdapter {
  readonly id = 'native-otel';
  readonly displayName = 'Unified Observability';

  constructor(private readonly proxy: ProxyService) {}

  capabilities(): ObserveAdapterCapabilities {
    return { metrics: true, logs: true, traces: true, topology: true, serviceMap: true };
  }

  async health(tenantId: string): Promise<ObserveAdapterHealth> {
    try {
      const result = await this.proxy.observability('/apm/summary', { tenantId });
      if (result.status >= 200 && result.status < 300) {
        return { ok: true, asOf: new Date().toISOString(), message: 'Observability pipeline reachable', mode: 'live' };
      }
      return {
        ok: false,
        asOf: new Date().toISOString(),
        message: 'Observability data temporarily unavailable',
        mode: 'degraded',
      };
    } catch {
      return {
        ok: false,
        asOf: new Date().toISOString(),
        message: 'Observability data temporarily unavailable',
        mode: 'degraded',
      };
    }
  }

  async getTelemetrySummary(tenantId: string) {
    const result = await this.proxy.observability('/apm/summary', { tenantId });
    const d = asRecord(result.data);
    return {
      metricsLastHour: Number(d.metrics ?? d.metricsLastHour ?? 0),
      logsLastHour: Number(d.logs ?? d.logsLastHour ?? 0),
      spansLastHour: Number(d.spans ?? d.spansLastHour ?? 0),
      services: Number(d.services ?? 0),
    };
  }

  async searchLogs(
    tenantId: string,
    opts: { q?: string; severity?: string; service?: string; hours?: number; limit?: number },
  ): Promise<{ items: ObserveLogHit[]; total: number }> {
    const result = await this.proxy.observability('/apm/logs', {
      tenantId,
      query: {
        ...(opts.q && { q: opts.q }),
        ...(opts.severity && { severity: opts.severity }),
        ...(opts.service && { service: opts.service }),
        ...(opts.hours && { hours: String(opts.hours) }),
        ...(opts.limit && { limit: String(opts.limit) }),
      },
    });
    const d = asRecord(result.data);
    const rows = (Array.isArray(d.items) ? d.items : Array.isArray(d.logs) ? d.logs : []) as Array<
      Record<string, unknown>
    >;
    const items: ObserveLogHit[] = rows.map((r, i) => ({
      id: String(r.id ?? `log-${i}`),
      body: String(r.body ?? ''),
      severity: String(r.severity ?? 'INFO'),
      serviceName: String(r.serviceName ?? r.service_name ?? 'unknown'),
      traceId: r.traceId ? String(r.traceId) : r.trace_id ? String(r.trace_id) : undefined,
      spanId: r.spanId ? String(r.spanId) : r.span_id ? String(r.span_id) : undefined,
      recordedAt: String(r.recordedAt ?? r.recorded_at ?? new Date().toISOString()),
      twinHref: `/twin?name=${encodeURIComponent(String(r.serviceName ?? r.service_name ?? ''))}`,
      source: 'live',
    }));
    return { items, total: Number(d.total ?? items.length) };
  }

  async listMetrics(
    tenantId: string,
    opts?: { service?: string; hours?: number; limit?: number },
  ): Promise<ObserveMetricPoint[]> {
    const result = await this.proxy.observability('/prometheus/samples', {
      tenantId,
      query: {
        ...(opts?.service && { service: opts.service }),
        ...(opts?.hours && { hours: String(opts.hours) }),
        limit: String(opts?.limit ?? 100),
      },
    });
    const d = asRecord(result.data);
    const rows = (Array.isArray(d.items) ? d.items : Array.isArray(d.samples) ? d.samples : []) as Array<
      Record<string, unknown>
    >;
    if (rows.length === 0) {
      // Fall back to APM summary-derived synthetic series from live spans if present
      const map = await this.getServiceTopology(tenantId, opts?.hours ?? 1);
      return map.nodes.slice(0, opts?.limit ?? 20).map((n) => ({
        name: 'service.health.score',
        value: n.health === 'healthy' ? 95 : n.health === 'degraded' ? 75 : 50,
        unit: 'score',
        serviceName: n.label,
        category: 'application' as const,
        recordedAt: map.asOf,
        source: 'live' as const,
      }));
    }
    return rows.map((r) => {
      const name = String(r.name ?? r.metric ?? 'metric');
      const category =
        name.includes('business') || name.includes('revenue') || name.includes('conversion')
          ? ('business' as const)
          : name.includes('system') || name.includes('cpu') || name.includes('mem') || name.includes('k8s')
            ? ('infrastructure' as const)
            : ('application' as const);
      return {
        name,
        value: Number(r.value ?? 0),
        unit: r.unit ? String(r.unit) : undefined,
        serviceName: r.serviceName ? String(r.serviceName) : r.service_name ? String(r.service_name) : undefined,
        labels: (r.labels as Record<string, string>) ?? undefined,
        recordedAt: String(r.recordedAt ?? r.recorded_at ?? new Date().toISOString()),
        category,
        source: 'live' as const,
      };
    });
  }

  async listTraces(tenantId: string, opts?: { hours?: number; limit?: number }): Promise<ObserveTraceSummary[]> {
    const result = await this.proxy.observability('/apm/traces', {
      tenantId,
      query: {
        ...(opts?.hours && { hours: String(opts.hours) }),
        ...(opts?.limit && { limit: String(opts.limit) }),
      },
    });
    const d = asRecord(result.data);
    const rows = (Array.isArray(d.items) ? d.items : Array.isArray(d.traces) ? d.traces : []) as Array<
      Record<string, unknown>
    >;
    return rows.map((r) => ({
      traceId: String(r.traceId ?? r.trace_id ?? ''),
      services: String(r.services ?? ''),
      spanCount: Number(r.spanCount ?? r.span_count ?? 0),
      durationMs: Number(r.durationMs ?? r.duration_ms ?? 0),
      errorCount: Number(r.errorCount ?? r.error_count ?? 0),
      startedAt: String(r.startedAt ?? r.started_at ?? new Date().toISOString()),
      rootService: r.rootService ? String(r.rootService) : undefined,
      twinHref: `/observability/traces?traceId=${encodeURIComponent(String(r.traceId ?? r.trace_id ?? ''))}`,
      source: 'live' as const,
    }));
  }

  async getTrace(tenantId: string, traceId: string): Promise<ObserveTraceDetail | null> {
    const result = await this.proxy.observability(`/apm/traces/${encodeURIComponent(traceId)}`, { tenantId });
    if (result.status >= 400) return null;
    const d = asRecord(result.data);
    const spans = (Array.isArray(d.spans) ? d.spans : []) as Array<Record<string, unknown>>;
    return {
      traceId: String(d.traceId ?? traceId),
      source: 'live',
      spans: spans.map((s) => ({
        spanId: String(s.spanId ?? s.span_id ?? ''),
        parentSpanId: s.parentSpanId
          ? String(s.parentSpanId)
          : s.parent_span_id
            ? String(s.parent_span_id)
            : undefined,
        name: String(s.name ?? ''),
        serviceName: String(s.serviceName ?? s.service_name ?? 'unknown'),
        durationMs: Number(s.durationMs ?? s.duration_ms ?? 0),
        statusCode: String(s.statusCode ?? s.status_code ?? 'OK'),
      })),
    };
  }

  async getServiceTopology(tenantId: string, hours = 1): Promise<ObserveTopology> {
    const result = await this.proxy.observability('/apm/service-map', {
      tenantId,
      query: { hours: String(hours) },
    });
    const d = asRecord(result.data);
    const nodesRaw = (Array.isArray(d.nodes) ? d.nodes : []) as Array<Record<string, unknown>>;
    const edgesRaw = (Array.isArray(d.edges) ? d.edges : []) as Array<Record<string, unknown>>;
    const asOf = new Date().toISOString();
    const nodes = nodesRaw.map((n) => {
      const errorRate = Number(n.errorRate ?? n.error_rate ?? 0);
      const latencyMs = Number(n.avgDurationMs ?? n.avg_duration_ms ?? 0);
      const label = String(n.label ?? n.id ?? 'service');
      const id = String(n.id ?? label);
      return {
        id,
        label,
        kind: 'service',
        health: healthFromErrors(errorRate, latencyMs),
        twinHref: `/twin?workflow=impact&focus=${encodeURIComponent(id)}&name=${encodeURIComponent(label)}`,
      };
    });
    const edges = edgesRaw.map((e) => ({
      source: String(e.source ?? ''),
      target: String(e.target ?? ''),
      calls: Number(e.calls ?? 0),
      avgDurationMs: Number(e.avgDurationMs ?? e.avg_duration_ms ?? 0),
    }));
    return { nodes, edges, asOf, source: 'live' };
  }
}
