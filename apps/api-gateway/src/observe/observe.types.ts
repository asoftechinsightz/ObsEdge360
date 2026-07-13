/**
 * Canonical OpsEdge360 observability DTOs.
 * Engines (OTel store, SkyWalking, etc.) map into these — never leak vendor names to UI.
 */

export type ObserveHealth = 'healthy' | 'degraded' | 'critical' | 'unknown';

export type ObserveDomain =
  | 'applications'
  | 'infrastructure'
  | 'kubernetes'
  | 'containers'
  | 'databases'
  | 'logs'
  | 'metrics'
  | 'traces'
  | 'topology';

export interface ObserveEntity {
  id: string;
  name: string;
  domain: ObserveDomain;
  kind: string;
  health: ObserveHealth;
  healthScore: number;
  environment?: string;
  owner?: string;
  latencyMs?: number;
  errorRate?: number;
  availability?: number;
  labels?: Record<string, string>;
  twinHref: string;
  observeHref: string;
  businessImpact?: string;
  asOf: string;
  source: 'live' | 'demo';
}

export interface ObserveLogHit {
  id: string;
  body: string;
  severity: string;
  serviceName: string;
  traceId?: string;
  spanId?: string;
  recordedAt: string;
  twinHref?: string;
  source: 'live' | 'demo';
}

export interface ObserveMetricPoint {
  name: string;
  value: number;
  unit?: string;
  serviceName?: string;
  labels?: Record<string, string>;
  recordedAt: string;
  category: 'infrastructure' | 'application' | 'business';
  source: 'live' | 'demo';
}

export interface ObserveTraceSummary {
  traceId: string;
  services: string;
  spanCount: number;
  durationMs: number;
  errorCount: number;
  startedAt: string;
  rootService?: string;
  twinHref?: string;
  source: 'live' | 'demo';
}

export interface ObserveTraceDetail {
  traceId: string;
  spans: Array<{
    spanId: string;
    parentSpanId?: string;
    name: string;
    serviceName: string;
    durationMs: number;
    statusCode: string;
  }>;
  source: 'live' | 'demo';
}

export interface ObserveTopologyNode {
  id: string;
  label: string;
  kind: string;
  health: ObserveHealth;
  twinHref: string;
}

export interface ObserveTopologyEdge {
  source: string;
  target: string;
  calls?: number;
  avgDurationMs?: number;
}

export interface ObserveTopology {
  nodes: ObserveTopologyNode[];
  edges: ObserveTopologyEdge[];
  asOf: string;
  source: 'live' | 'demo';
}

export interface ObserveOverview {
  asOf: string;
  brand: 'OpsEdge360';
  engineLabel: 'Unified Observability';
  /** Never expose upstream product names */
  domains: Array<{
    id: ObserveDomain;
    label: string;
    href: string;
    count: number;
    health: ObserveHealth;
    summary: string;
  }>;
  telemetry: {
    metricsLastHour: number;
    logsLastHour: number;
    spansLastHour: number;
    services: number;
  };
  narrative: {
    what: string;
    why: string;
    impact: string;
    next: string;
    nextHref: string;
  };
  aiPrompts: string[];
}

export interface ObserveAdapterCapabilities {
  metrics: boolean;
  logs: boolean;
  traces: boolean;
  topology: boolean;
  serviceMap: boolean;
}

export interface ObserveAdapterHealth {
  ok: boolean;
  asOf: string;
  message: string;
  mode: 'live' | 'demo' | 'degraded';
}
