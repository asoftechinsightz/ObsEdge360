/**
 * Fixture-backed ObserveAdapter base.
 * Engine-specific subclasses differ only by internal id — customer DTOs stay identical.
 */
import type { ObserveAdapter } from './observe-adapter';
import type {
  ObserveAdapterCapabilities,
  ObserveAdapterHealth,
  ObserveLogHit,
  ObserveMetricPoint,
  ObserveTopology,
  ObserveTraceDetail,
  ObserveTraceSummary,
} from './observe.types';
import {
  DEMO_LOGS,
  DEMO_METRICS,
  DEMO_TRACE_DETAIL,
  DEMO_TRACES,
  demoTopology,
} from './demo-fixtures';

export abstract class FixtureBackedObserveAdapter implements ObserveAdapter {
  abstract readonly id: string;
  readonly displayName = 'Unified Observability';

  capabilities(): ObserveAdapterCapabilities {
    return { metrics: true, logs: true, traces: true, topology: true, serviceMap: true };
  }

  async health(_tenantId: string): Promise<ObserveAdapterHealth> {
    return {
      ok: true,
      asOf: new Date().toISOString(),
      message: 'Observability pipeline available',
      mode: 'demo',
    };
  }

  async getTelemetrySummary(_tenantId: string) {
    return {
      metricsLastHour: DEMO_METRICS.length * 40,
      logsLastHour: DEMO_LOGS.length * 80,
      spansLastHour: DEMO_TRACES.reduce((s, t) => s + t.spanCount, 0) * 10,
      services: 12,
    };
  }

  async searchLogs(
    _tenantId: string,
    opts: { q?: string; severity?: string; service?: string; hours?: number; limit?: number },
  ): Promise<{ items: ObserveLogHit[]; total: number }> {
    let items = [...DEMO_LOGS];
    if (opts.q) {
      const q = opts.q.toLowerCase();
      items = items.filter((l) => l.body.toLowerCase().includes(q) || l.serviceName.toLowerCase().includes(q));
    }
    if (opts.severity) {
      items = items.filter((l) => l.severity.toLowerCase() === opts.severity!.toLowerCase());
    }
    if (opts.service) {
      items = items.filter((l) => l.serviceName.toLowerCase().includes(opts.service!.toLowerCase()));
    }
    const limit = opts.limit ?? 50;
    return { items: items.slice(0, limit), total: items.length };
  }

  async listMetrics(
    _tenantId: string,
    opts?: { service?: string; hours?: number; limit?: number },
  ): Promise<ObserveMetricPoint[]> {
    let items = [...DEMO_METRICS];
    if (opts?.service) {
      items = items.filter((m) => (m.serviceName || '').toLowerCase().includes(opts.service!.toLowerCase()));
    }
    return items.slice(0, opts?.limit ?? 100);
  }

  async listTraces(_tenantId: string, opts?: { hours?: number; limit?: number }): Promise<ObserveTraceSummary[]> {
    return DEMO_TRACES.slice(0, opts?.limit ?? 50);
  }

  async getTrace(_tenantId: string, traceId: string): Promise<ObserveTraceDetail | null> {
    if (traceId === DEMO_TRACE_DETAIL.traceId) return { ...DEMO_TRACE_DETAIL };
    const hit = DEMO_TRACES.find((t) => t.traceId === traceId);
    if (!hit) return null;
    return {
      traceId,
      source: 'demo',
      spans: [
        {
          spanId: 'demo-root',
          name: 'root',
          serviceName: hit.rootService || hit.services.split(',')[0] || 'service',
          durationMs: hit.durationMs,
          statusCode: hit.errorCount > 0 ? 'ERROR' : 'OK',
        },
      ],
    };
  }

  async getServiceTopology(_tenantId: string, _hours?: number): Promise<ObserveTopology> {
    return demoTopology();
  }
}
