/**
 * Multi-vertical demo telemetry fixtures for Unified Observability.
 * Packs: Banking360, Retail360, Cloud Native / Kubernetes, Hybrid Infrastructure.
 * Customer-facing source is always OpsEdge360 — never upstream engine brands.
 */

import type {
  ObserveEntity,
  ObserveHealth,
  ObserveLogHit,
  ObserveMetricPoint,
  ObserveTopology,
  ObserveTraceDetail,
  ObserveTraceSummary,
} from './observe.types';

const now = () => new Date().toISOString();

function twin(id: string, name: string) {
  return `/twin?workflow=impact&focus=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`;
}

function healthFromScore(score: number): ObserveHealth {
  if (score >= 90) return 'healthy';
  if (score >= 70) return 'degraded';
  return 'critical';
}

export const DEMO_APPLICATIONS: ObserveEntity[] = [
  {
    id: 'demo-app-upi',
    name: 'UPI Payments Fabric',
    domain: 'applications',
    kind: 'application',
    health: 'degraded',
    healthScore: 78,
    environment: 'Prod',
    owner: 'Payments SRE',
    latencyMs: 420,
    errorRate: 2.4,
    availability: 98.2,
    businessImpact: '₹180K/hr revenue path at risk',
    twinHref: twin('demo-app-upi', 'UPI Payments Fabric'),
    observeHref: '/observability/applications?focus=demo-app-upi',
    asOf: now(),
    source: 'demo',
    labels: { pack: 'Banking360', journey: 'UPI' },
  },
  {
    id: 'demo-app-cbs',
    name: 'Core Banking Suite',
    domain: 'applications',
    kind: 'application',
    health: 'healthy',
    healthScore: 96,
    environment: 'Prod',
    owner: 'CBS Platform',
    latencyMs: 85,
    errorRate: 0.2,
    availability: 99.97,
    businessImpact: 'Tier-1 ledger healthy',
    twinHref: twin('demo-app-cbs', 'Core Banking Suite'),
    observeHref: '/observability/applications?focus=demo-app-cbs',
    asOf: now(),
    source: 'demo',
    labels: { pack: 'Banking360', journey: 'CBS' },
  },
  {
    id: 'demo-app-checkout',
    name: 'Retail Checkout API',
    domain: 'applications',
    kind: 'application',
    health: 'healthy',
    healthScore: 93,
    environment: 'Prod',
    owner: 'Retail Platform',
    latencyMs: 110,
    errorRate: 0.5,
    availability: 99.9,
    businessImpact: 'Cart conversion path stable',
    twinHref: twin('demo-app-checkout', 'Retail Checkout API'),
    observeHref: '/observability/applications?focus=demo-app-checkout',
    asOf: now(),
    source: 'demo',
    labels: { pack: 'Retail360', journey: 'Checkout' },
  },
  {
    id: 'demo-app-orders',
    name: 'Order Orchestrator',
    domain: 'applications',
    kind: 'application',
    health: 'degraded',
    healthScore: 81,
    environment: 'Prod',
    owner: 'Cloud Native SRE',
    latencyMs: 260,
    errorRate: 1.1,
    availability: 99.4,
    businessImpact: 'Fulfillment backlog risk',
    twinHref: twin('demo-app-orders', 'Order Orchestrator'),
    observeHref: '/observability/applications?focus=demo-app-orders',
    asOf: now(),
    source: 'demo',
    labels: { pack: 'Cloud Native', journey: 'Orders' },
  },
];

export const DEMO_INFRASTRUCTURE: ObserveEntity[] = [
  {
    id: 'demo-host-mum-01',
    name: 'agb-mum-app-01',
    domain: 'infrastructure',
    kind: 'server',
    health: 'healthy',
    healthScore: 94,
    environment: 'Prod',
    owner: 'Infra Ops',
    labels: { os: 'RHEL 9', role: 'app', region: 'ap-south-1', pack: 'Hybrid Infrastructure' },
    twinHref: twin('demo-host-mum-01', 'agb-mum-app-01'),
    observeHref: '/observability/infrastructure?focus=demo-host-mum-01',
    asOf: now(),
    source: 'demo',
  },
  {
    id: 'demo-host-mum-db',
    name: 'agb-mum-db-01',
    domain: 'infrastructure',
    kind: 'server',
    health: 'degraded',
    healthScore: 72,
    environment: 'Prod',
    owner: 'DBA',
    labels: { os: 'RHEL 8', role: 'database', region: 'ap-south-1', pack: 'Hybrid Infrastructure' },
    twinHref: twin('demo-host-mum-db', 'agb-mum-db-01'),
    observeHref: '/observability/infrastructure?focus=demo-host-mum-db',
    asOf: now(),
    source: 'demo',
    businessImpact: 'CBS Oracle host CPU elevated',
  },
  {
    id: 'demo-vm-hyd-dr',
    name: 'agb-hyd-dr-web-02',
    domain: 'infrastructure',
    kind: 'virtual_machine',
    health: 'healthy',
    healthScore: 97,
    environment: 'DR',
    owner: 'Infra Ops',
    labels: { hypervisor: 'VMware', pack: 'Hybrid Infrastructure' },
    twinHref: twin('demo-vm-hyd-dr', 'agb-hyd-dr-web-02'),
    observeHref: '/observability/infrastructure?focus=demo-vm-hyd-dr',
    asOf: now(),
    source: 'demo',
  },
  {
    id: 'demo-cloud-ec2',
    name: 'i-0retail-checkout-a1',
    domain: 'infrastructure',
    kind: 'cloud_instance',
    health: 'healthy',
    healthScore: 91,
    environment: 'Prod',
    owner: 'Cloud Ops',
    labels: { provider: 'aws', instanceType: 'm6i.xlarge', pack: 'Retail360' },
    twinHref: twin('demo-cloud-ec2', 'i-0retail-checkout-a1'),
    observeHref: '/observability/infrastructure?focus=demo-cloud-ec2',
    asOf: now(),
    source: 'demo',
  },
];

export const DEMO_KUBERNETES: ObserveEntity[] = [
  {
    id: 'demo-k8s-mum',
    name: 'eks-mumbai-payments',
    domain: 'kubernetes',
    kind: 'cluster',
    health: 'degraded',
    healthScore: 82,
    environment: 'Prod',
    owner: 'Platform Eng',
    labels: { region: 'ap-south-1', nodes: '24', pack: 'Kubernetes' },
    twinHref: twin('demo-k8s-mum', 'eks-mumbai-payments'),
    observeHref: '/observability/kubernetes?focus=demo-k8s-mum',
    asOf: now(),
    source: 'demo',
    businessImpact: 'UPI pods restarting in payments-ns',
  },
  {
    id: 'demo-k8s-ns-pay',
    name: 'payments-ns',
    domain: 'kubernetes',
    kind: 'namespace',
    health: 'degraded',
    healthScore: 76,
    environment: 'Prod',
    owner: 'Payments SRE',
    labels: { cluster: 'eks-mumbai-payments', pack: 'Kubernetes' },
    twinHref: twin('demo-k8s-ns-pay', 'payments-ns'),
    observeHref: '/observability/kubernetes?focus=demo-k8s-ns-pay',
    asOf: now(),
    source: 'demo',
  },
  {
    id: 'demo-k8s-deploy-upi',
    name: 'upi-gateway',
    domain: 'kubernetes',
    kind: 'deployment',
    health: 'critical',
    healthScore: 58,
    environment: 'Prod',
    owner: 'Payments SRE',
    labels: { namespace: 'payments-ns', replicas: '8/12', pack: 'Kubernetes' },
    twinHref: twin('demo-k8s-deploy-upi', 'upi-gateway'),
    observeHref: '/observability/kubernetes?focus=demo-k8s-deploy-upi',
    asOf: now(),
    source: 'demo',
    businessImpact: 'Desired replicas not ready',
  },
];

export const DEMO_CONTAINERS: ObserveEntity[] = [
  {
    id: 'demo-ctr-upi-a',
    name: 'upi-gateway-7f9c',
    domain: 'containers',
    kind: 'container',
    health: 'critical',
    healthScore: 55,
    environment: 'Prod',
    owner: 'Payments SRE',
    labels: { image: 'upi-gateway:2.14.3', node: 'ip-10-2-14-9', pack: 'Kubernetes' },
    twinHref: twin('demo-ctr-upi-a', 'upi-gateway-7f9c'),
    observeHref: '/observability/containers?focus=demo-ctr-upi-a',
    asOf: now(),
    source: 'demo',
    businessImpact: 'OOMKilled — payment path errors',
  },
  {
    id: 'demo-ctr-checkout',
    name: 'checkout-api-3ab1',
    domain: 'containers',
    kind: 'container',
    health: 'healthy',
    healthScore: 95,
    environment: 'Prod',
    owner: 'Retail Platform',
    labels: { image: 'checkout-api:1.8.0', pack: 'Retail360' },
    twinHref: twin('demo-ctr-checkout', 'checkout-api-3ab1'),
    observeHref: '/observability/containers?focus=demo-ctr-checkout',
    asOf: now(),
    source: 'demo',
  },
];

export const DEMO_DATABASES: ObserveEntity[] = [
  {
    id: 'demo-db-oracle',
    name: 'CBS Oracle RAC',
    domain: 'databases',
    kind: 'database',
    health: 'degraded',
    healthScore: 74,
    environment: 'Prod',
    owner: 'DBA',
    latencyMs: 38,
    availability: 99.95,
    labels: { engine: 'Oracle', pack: 'Banking360' },
    twinHref: twin('demo-db-oracle', 'CBS Oracle RAC'),
    observeHref: '/observability/databases?focus=demo-db-oracle',
    asOf: now(),
    source: 'demo',
    businessImpact: 'Slow queries on settlement batch',
  },
  {
    id: 'demo-db-pg',
    name: 'Payments PostgreSQL',
    domain: 'databases',
    kind: 'database',
    health: 'healthy',
    healthScore: 97,
    environment: 'Prod',
    owner: 'DBA',
    latencyMs: 4,
    availability: 99.99,
    labels: { engine: 'PostgreSQL', pack: 'Banking360' },
    twinHref: twin('demo-db-pg', 'Payments PostgreSQL'),
    observeHref: '/observability/databases?focus=demo-db-pg',
    asOf: now(),
    source: 'demo',
  },
  {
    id: 'demo-db-retail',
    name: 'Retail Orders Aurora',
    domain: 'databases',
    kind: 'database',
    health: 'healthy',
    healthScore: 94,
    environment: 'Prod',
    owner: 'Retail Data',
    latencyMs: 6,
    availability: 99.98,
    labels: { engine: 'Aurora PostgreSQL', pack: 'Retail360' },
    twinHref: twin('demo-db-retail', 'Retail Orders Aurora'),
    observeHref: '/observability/databases?focus=demo-db-retail',
    asOf: now(),
    source: 'demo',
  },
];

const TRACE_ID = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

export const DEMO_LOGS: ObserveLogHit[] = [
  {
    id: 'demo-log-1',
    body: 'UPI gateway: upstream timeout calling settlement-svc after 3000ms',
    severity: 'ERROR',
    serviceName: 'upi-gateway',
    traceId: TRACE_ID,
    recordedAt: now(),
    twinHref: twin('demo-app-upi', 'UPI Payments Fabric'),
    source: 'demo',
  },
  {
    id: 'demo-log-2',
    body: 'Container upi-gateway-7f9c OOMKilled: memory limit 512Mi exceeded',
    severity: 'ERROR',
    serviceName: 'upi-gateway',
    recordedAt: now(),
    twinHref: twin('demo-ctr-upi-a', 'upi-gateway-7f9c'),
    source: 'demo',
  },
  {
    id: 'demo-log-3',
    body: 'Oracle RAC: wait event db file sequential read elevated on settlement batch',
    severity: 'WARN',
    serviceName: 'cbs-oracle',
    recordedAt: now(),
    twinHref: twin('demo-db-oracle', 'CBS Oracle RAC'),
    source: 'demo',
  },
  {
    id: 'demo-log-4',
    body: 'Retail checkout: payment authorization completed in 94ms',
    severity: 'INFO',
    serviceName: 'checkout-api',
    recordedAt: now(),
    twinHref: twin('demo-app-checkout', 'Retail Checkout API'),
    source: 'demo',
  },
  {
    id: 'demo-log-5',
    body: 'Order orchestrator: retry queue depth 184 — backlog forming',
    severity: 'WARN',
    serviceName: 'order-orchestrator',
    recordedAt: now(),
    twinHref: twin('demo-app-orders', 'Order Orchestrator'),
    source: 'demo',
  },
];

export const DEMO_METRICS: ObserveMetricPoint[] = [
  {
    name: 'http.server.duration',
    value: 420,
    unit: 'ms',
    serviceName: 'upi-gateway',
    category: 'application',
    recordedAt: now(),
    source: 'demo',
    labels: { pack: 'Banking360' },
  },
  {
    name: 'http.server.error_rate',
    value: 2.4,
    unit: '%',
    serviceName: 'upi-gateway',
    category: 'application',
    recordedAt: now(),
    source: 'demo',
  },
  {
    name: 'system.cpu.utilization',
    value: 87,
    unit: '%',
    serviceName: 'agb-mum-db-01',
    category: 'infrastructure',
    recordedAt: now(),
    source: 'demo',
  },
  {
    name: 'business.upi.success_rate',
    value: 97.1,
    unit: '%',
    serviceName: 'upi-gateway',
    category: 'business',
    recordedAt: now(),
    source: 'demo',
  },
  {
    name: 'business.checkout.conversion',
    value: 68.4,
    unit: '%',
    serviceName: 'checkout-api',
    category: 'business',
    recordedAt: now(),
    source: 'demo',
    labels: { pack: 'Retail360' },
  },
  {
    name: 'k8s.deployment.available_replicas',
    value: 8,
    unit: 'count',
    serviceName: 'upi-gateway',
    category: 'infrastructure',
    recordedAt: now(),
    source: 'demo',
  },
];

export const DEMO_TRACES: ObserveTraceSummary[] = [
  {
    traceId: TRACE_ID,
    services: 'upi-gateway,settlement-svc,payments-postgres',
    spanCount: 12,
    durationMs: 3120,
    errorCount: 2,
    startedAt: now(),
    rootService: 'upi-gateway',
    twinHref: twin('demo-app-upi', 'UPI Payments Fabric'),
    source: 'demo',
  },
  {
    traceId: 'b2c3d4e5f60718293a4b5c6d7e8f901a',
    services: 'checkout-api,payments-gateway,retail-aurora',
    spanCount: 9,
    durationMs: 188,
    errorCount: 0,
    startedAt: now(),
    rootService: 'checkout-api',
    twinHref: twin('demo-app-checkout', 'Retail Checkout API'),
    source: 'demo',
  },
];

export const DEMO_TRACE_DETAIL: ObserveTraceDetail = {
  traceId: TRACE_ID,
  source: 'demo',
  spans: [
    {
      spanId: 'root0001',
      name: 'POST /upi/collect',
      serviceName: 'upi-gateway',
      durationMs: 3120,
      statusCode: 'ERROR',
    },
    {
      spanId: 'child002',
      parentSpanId: 'root0001',
      name: 'POST /settle',
      serviceName: 'settlement-svc',
      durationMs: 3000,
      statusCode: 'ERROR',
    },
    {
      spanId: 'child003',
      parentSpanId: 'child002',
      name: 'SELECT settlement_batch',
      serviceName: 'payments-postgres',
      durationMs: 12,
      statusCode: 'OK',
    },
  ],
};

export function demoTopology(): ObserveTopology {
  const apps = [...DEMO_APPLICATIONS, ...DEMO_DATABASES, ...DEMO_KUBERNETES.slice(0, 1)];
  const nodes = apps.map((e) => ({
    id: e.id,
    label: e.name,
    kind: e.kind,
    health: e.health,
    twinHref: e.twinHref,
  }));
  const edges = [
    { source: 'demo-app-upi', target: 'demo-db-pg', calls: 4200, avgDurationMs: 8 },
    { source: 'demo-app-upi', target: 'demo-k8s-mum', calls: 8900, avgDurationMs: 12 },
    { source: 'demo-app-cbs', target: 'demo-db-oracle', calls: 12000, avgDurationMs: 18 },
    { source: 'demo-app-checkout', target: 'demo-db-retail', calls: 5400, avgDurationMs: 6 },
    { source: 'demo-app-orders', target: 'demo-app-checkout', calls: 2100, avgDurationMs: 40 },
  ];
  return { nodes, edges, asOf: now(), source: 'demo' };
}

export function domainHealth(entities: ObserveEntity[]): ObserveHealth {
  if (entities.some((e) => e.health === 'critical')) return 'critical';
  if (entities.some((e) => e.health === 'degraded')) return 'degraded';
  if (entities.length === 0) return 'unknown';
  return 'healthy';
}

export function refreshAsOf<T extends { asOf?: string }>(items: T[]): T[] {
  const t = now();
  return items.map((i) => ({ ...i, asOf: t }));
}

export { healthFromScore };
