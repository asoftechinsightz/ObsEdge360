import type {
  ObserveAdapterCapabilities,
  ObserveAdapterHealth,
  ObserveLogHit,
  ObserveMetricPoint,
  ObserveTopology,
  ObserveTraceDetail,
  ObserveTraceSummary,
} from './observe.types';

/**
 * ObserveAdapter SPI — engines plug in here.
 * UI and gateway contracts never bind directly to external monitoring products.
 */
export interface ObserveAdapter {
  readonly id: string;
  /** Customer-safe label only (e.g. "Unified Observability") */
  readonly displayName: string;
  health(tenantId: string): Promise<ObserveAdapterHealth>;
  capabilities(): ObserveAdapterCapabilities;
  getTelemetrySummary(tenantId: string): Promise<{
    metricsLastHour: number;
    logsLastHour: number;
    spansLastHour: number;
    services: number;
  }>;
  searchLogs(
    tenantId: string,
    opts: { q?: string; severity?: string; service?: string; hours?: number; limit?: number },
  ): Promise<{ items: ObserveLogHit[]; total: number }>;
  listMetrics(
    tenantId: string,
    opts?: { service?: string; hours?: number; limit?: number },
  ): Promise<ObserveMetricPoint[]>;
  listTraces(tenantId: string, opts?: { hours?: number; limit?: number }): Promise<ObserveTraceSummary[]>;
  getTrace(tenantId: string, traceId: string): Promise<ObserveTraceDetail | null>;
  getServiceTopology(tenantId: string, hours?: number): Promise<ObserveTopology>;
}
