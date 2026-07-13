import type { ProxyService } from '../proxy.service';
import type { ObserveAdapter } from './observe-adapter';
import { NativeOtelObserveAdapter } from './native-otel.adapter';
import {
  DatadogApiObserveAdapter,
  OpenObserveObserveAdapter,
  SkyWalkingObserveAdapter,
} from './engine-connectors.adapter';

export type ObserveEngineChoice = 'native' | 'demo' | 'skywalking' | 'openobserve' | 'datadog';

/**
 * Selects an ObserveAdapter implementation.
 * UI and public DTOs never see engine choice — only canonical OpsEdge models.
 */
export class ObserveAdapterRegistry {
  private readonly native: NativeOtelObserveAdapter;
  private readonly demo: SkyWalkingObserveAdapter;
  private readonly openObserve: OpenObserveObserveAdapter;
  private readonly datadog: DatadogApiObserveAdapter;

  constructor(proxy: ProxyService) {
    this.native = new NativeOtelObserveAdapter(proxy);
    this.demo = new SkyWalkingObserveAdapter();
    this.openObserve = new OpenObserveObserveAdapter();
    this.datadog = new DatadogApiObserveAdapter();
  }

  resolve(choice?: string | null): ObserveAdapter {
    const key = (choice || process.env.OBSERVE_ENGINE || 'native').toLowerCase().trim() as ObserveEngineChoice;
    switch (key) {
      case 'openobserve':
        return this.openObserve;
      case 'datadog':
        return this.datadog;
      case 'skywalking':
      case 'demo':
        return this.demo;
      case 'native':
      default:
        return this.native;
    }
  }

  /** Customer-safe runtime descriptor — no vendor product names. */
  describe(adapter: ObserveAdapter) {
    return {
      brand: 'OpsEdge360' as const,
      label: adapter.displayName,
      capabilities: adapter.capabilities(),
      swappable: true,
      note: 'Engine selection is an operations concern; product experience remains OpsEdge360 Unified Observability.',
    };
  }

  /** Canonical DTO key sets used by independence tests. */
  static readonly canonicalKeys = {
    logHit: ['id', 'body', 'severity', 'serviceName', 'recordedAt', 'source'],
    metricPoint: ['name', 'value', 'category', 'recordedAt', 'source'],
    traceSummary: ['traceId', 'services', 'spanCount', 'durationMs', 'errorCount', 'startedAt', 'source'],
    topology: ['nodes', 'edges', 'asOf', 'source'],
  };
}
