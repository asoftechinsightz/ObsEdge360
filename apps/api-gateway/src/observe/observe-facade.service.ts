import { Injectable, Logger } from '@nestjs/common';
import { query } from '@opsedge360/shared-db';
import { ProxyService } from '../proxy.service';
import type { ObserveAdapter } from './observe-adapter';
import { ObserveAdapterRegistry } from './observe-adapter.registry';
import { NativeOtelObserveAdapter } from './native-otel.adapter';
import { SkyWalkingObserveAdapter } from './engine-connectors.adapter';
import {
  DEMO_APPLICATIONS,
  DEMO_CONTAINERS,
  DEMO_DATABASES,
  DEMO_INFRASTRUCTURE,
  DEMO_KUBERNETES,
  DEMO_LOGS,
  DEMO_METRICS,
  DEMO_TRACES,
  DEMO_TRACE_DETAIL,
  domainHealth,
  demoTopology,
  healthFromScore,
  refreshAsOf,
} from './demo-fixtures';
import type {
  ObserveDomain,
  ObserveEntity,
  ObserveHealth,
  ObserveLogHit,
  ObserveMetricPoint,
  ObserveOverview,
  ObserveTopology,
  ObserveTraceDetail,
  ObserveTraceSummary,
} from './observe.types';

const CI_DOMAIN_MAP: Record<string, { domain: ObserveDomain; kinds: string[] }> = {
  applications: { domain: 'applications', kinds: ['application', 'app', 'service'] },
  infrastructure: {
    domain: 'infrastructure',
    kinds: ['server', 'host', 'virtual_machine', 'vm', 'cloud_resource', 'storage'],
  },
  kubernetes: { domain: 'kubernetes', kinds: ['kubernetes', 'cloud_resource', 'pod', 'namespace'] },
  containers: { domain: 'containers', kinds: ['container', 'pod'] },
  databases: { domain: 'databases', kinds: ['database', 'db'] },
};

@Injectable()
export class ObserveFacadeService {
  private readonly log = new Logger(ObserveFacadeService.name);
  private readonly registry: ObserveAdapterRegistry;
  private readonly native: NativeOtelObserveAdapter;
  private readonly engineSlot: SkyWalkingObserveAdapter;

  constructor(private readonly proxy: ProxyService) {
    this.registry = new ObserveAdapterRegistry(proxy);
    this.native = new NativeOtelObserveAdapter(proxy);
    this.engineSlot = new SkyWalkingObserveAdapter();
  }

  /** Prefer configured engine; enrich with demo when sparse so demos never empty. */
  private primaryAdapter(preferDemo = false): ObserveAdapter {
    if (preferDemo || process.env.OBSERVE_FORCE_DEMO === 'true') {
      return this.registry.resolve('demo');
    }
    return this.registry.resolve();
  }

  /** Customer-safe runtime — proves engines are swappable without UI changes. */
  getRuntimeDescriptor() {
    const adapter = this.primaryAdapter();
    return this.registry.describe(adapter);
  }

  async getOverview(tenantId: string): Promise<ObserveOverview> {
    const adapter = this.primaryAdapter();
    const health = await adapter.health(tenantId);
    let telemetry = await adapter.getTelemetrySummary(tenantId).catch(() => ({
      metricsLastHour: 0,
      logsLastHour: 0,
      spansLastHour: 0,
      services: 0,
    }));

    const sparse =
      telemetry.metricsLastHour + telemetry.logsLastHour + telemetry.spansLastHour < 5 ||
      health.mode !== 'live';
    if (sparse) {
      const demo = await this.engineSlot.getTelemetrySummary(tenantId);
      telemetry = {
        metricsLastHour: Math.max(telemetry.metricsLastHour, demo.metricsLastHour),
        logsLastHour: Math.max(telemetry.logsLastHour, demo.logsLastHour),
        spansLastHour: Math.max(telemetry.spansLastHour, demo.spansLastHour),
        services: Math.max(telemetry.services, demo.services),
      };
    }

    const apps = await this.listEntities(tenantId, 'applications');
    const infra = await this.listEntities(tenantId, 'infrastructure');
    const k8s = await this.listEntities(tenantId, 'kubernetes');
    const containers = await this.listEntities(tenantId, 'containers');
    const databases = await this.listEntities(tenantId, 'databases');
    const logs = await this.searchLogs(tenantId, { limit: 5 });
    const traces = await this.listTraces(tenantId, { limit: 5 });
    const topo = await this.getTopology(tenantId);

    const degraded = [...apps, ...infra, ...k8s, ...containers, ...databases].filter(
      (e) => e.health === 'degraded' || e.health === 'critical',
    );
    const worst = degraded.sort((a, b) => a.healthScore - b.healthScore)[0];

    const domains: ObserveOverview['domains'] = [
      {
        id: 'applications',
        label: 'Applications',
        href: '/observability/applications',
        count: apps.length,
        health: domainHealth(apps),
        summary: `${apps.filter((a) => a.health !== 'healthy').length} need attention`,
      },
      {
        id: 'infrastructure',
        label: 'Infrastructure',
        href: '/observability/infrastructure',
        count: infra.length,
        health: domainHealth(infra),
        summary: 'Servers, VMs, cloud instances, storage',
      },
      {
        id: 'kubernetes',
        label: 'Kubernetes',
        href: '/observability/kubernetes',
        count: k8s.length,
        health: domainHealth(k8s),
        summary: 'Clusters, namespaces, workloads',
      },
      {
        id: 'containers',
        label: 'Containers',
        href: '/observability/containers',
        count: containers.length,
        health: domainHealth(containers),
        summary: 'Container inventory and health',
      },
      {
        id: 'databases',
        label: 'Databases',
        href: '/observability/databases',
        count: databases.length,
        health: domainHealth(databases),
        summary: 'Availability and performance',
      },
      {
        id: 'logs',
        label: 'Logs',
        href: '/observability/logs',
        count: logs.total,
        health: logs.items.some((l) => l.severity === 'ERROR') ? 'degraded' : 'healthy',
        summary: 'Enterprise log explorer',
      },
      {
        id: 'metrics',
        label: 'Metrics',
        href: '/observability/metrics',
        count: telemetry.metricsLastHour,
        health: 'healthy',
        summary: 'Infra, app, and business metrics',
      },
      {
        id: 'traces',
        label: 'Traces',
        href: '/observability/traces',
        count: traces.length,
        health: traces.some((t) => t.errorCount > 0) ? 'degraded' : 'healthy',
        summary: 'Distributed tracing and latency',
      },
      {
        id: 'topology',
        label: 'Topology',
        href: '/observability/topology',
        count: topo.nodes.length,
        health: topo.nodes.some((n) => n.health === 'critical')
          ? 'critical'
          : topo.nodes.some((n) => n.health === 'degraded')
            ? 'degraded'
            : 'healthy',
        summary: 'Dependencies and impact propagation',
      },
    ];

    return {
      asOf: new Date().toISOString(),
      brand: 'OpsEdge360',
      engineLabel: 'Unified Observability',
      domains,
      telemetry,
      narrative: {
        what: worst
          ? `${worst.name} is ${worst.health}`
          : 'Estate observability signals are within operating bands',
        why: worst?.businessImpact || 'No critical observability degradations detected',
        impact: worst?.businessImpact || 'Business services remaining within SLA',
        next: worst ? `Investigate ${worst.name}` : 'Review topology health',
        nextHref: worst?.observeHref || '/observability/topology',
      },
      aiPrompts: [
        'Explain this alert and estimate business impact.',
        'Summarize recent ERROR logs for payment services.',
        'Explain the slowest trace and recommend remediation.',
        'Identify similar incidents to the current degradation.',
        'Generate an executive summary of observability health.',
      ],
    };
  }

  async listEntities(tenantId: string, domain: ObserveDomain): Promise<ObserveEntity[]> {
    const live = await this.loadCmdbEntities(tenantId, domain);
    if (live.length >= 3) return live;
    const demo = this.demoEntities(domain);
    // Prefer live when present, fill with demo for demo readiness
    const ids = new Set(live.map((e) => e.name.toLowerCase()));
    const merged = [...live, ...demo.filter((d) => !ids.has(d.name.toLowerCase()))];
    return refreshAsOf(merged);
  }

  async searchLogs(
    tenantId: string,
    opts: { q?: string; severity?: string; service?: string; hours?: number; limit?: number },
  ): Promise<{ items: ObserveLogHit[]; total: number; source: 'live' | 'demo' | 'mixed' }> {
    const live = await this.native.searchLogs(tenantId, opts).catch(() => ({ items: [], total: 0 }));
    if (live.items.length > 0) {
      return { ...live, source: 'live' };
    }
    const demo = await this.engineSlot.searchLogs(tenantId, opts);
    return { ...demo, source: 'demo' };
  }

  async listMetrics(
    tenantId: string,
    opts?: { service?: string; hours?: number; limit?: number; category?: string },
  ): Promise<{ items: ObserveMetricPoint[]; source: 'live' | 'demo' }> {
    let items = await this.native.listMetrics(tenantId, opts).catch(() => [] as ObserveMetricPoint[]);
    let source: 'live' | 'demo' = 'live';
    if (items.length < 3) {
      const demo = await this.engineSlot.listMetrics(tenantId, opts);
      items = items.length ? [...items, ...demo] : demo;
      source = items.every((i) => i.source === 'demo') ? 'demo' : 'live';
    }
    if (opts?.category) {
      items = items.filter((m) => m.category === opts.category);
    }
    return { items, source };
  }

  async listTraces(
    tenantId: string,
    opts?: { hours?: number; limit?: number },
  ): Promise<ObserveTraceSummary[]> {
    const live = await this.native.listTraces(tenantId, opts).catch(() => [] as ObserveTraceSummary[]);
    if (live.length > 0) return live;
    return this.engineSlot.listTraces(tenantId, opts);
  }

  async getTrace(tenantId: string, traceId: string): Promise<ObserveTraceDetail | null> {
    const live = await this.native.getTrace(tenantId, traceId).catch(() => null);
    if (live) return live;
    return this.engineSlot.getTrace(tenantId, traceId);
  }

  async getTopology(tenantId: string, hours = 1): Promise<ObserveTopology> {
    const live = await this.native.getServiceTopology(tenantId, hours).catch(() => null);
    if (live && live.nodes.length > 0) return live;
    // Try CMDB typed topology
    const cmdb = await this.proxy
      .cmdb('/topology/application', { tenantId })
      .catch(() => ({ status: 500, data: null }));
    const d = cmdb.data && typeof cmdb.data === 'object' ? (cmdb.data as Record<string, unknown>) : {};
    const nodesRaw = (Array.isArray(d.nodes) ? d.nodes : []) as Array<Record<string, unknown>>;
    const edgesRaw = (Array.isArray(d.edges) ? d.edges : []) as Array<Record<string, unknown>>;
    if (nodesRaw.length > 0) {
      return {
        asOf: new Date().toISOString(),
        source: 'live',
        nodes: nodesRaw.map((n) => {
          const id = String(n.id ?? n.ciId ?? '');
          const label = String(n.label ?? n.name ?? id);
          const score = Number(n.healthScore ?? n.health_score ?? 90);
          return {
            id,
            label,
            kind: String(n.kind ?? n.type ?? 'service'),
            health: healthFromScore(score) as ObserveHealth,
            twinHref: `/twin?workflow=impact&focus=${encodeURIComponent(id)}&name=${encodeURIComponent(label)}`,
          };
        }),
        edges: edgesRaw.map((e) => ({
          source: String(e.source ?? e.sourceId ?? ''),
          target: String(e.target ?? e.targetId ?? ''),
          calls: Number(e.calls ?? 0),
          avgDurationMs: Number(e.avgDurationMs ?? 0),
        })),
      };
    }
    return demoTopology();
  }

  async explainContext(
    tenantId: string,
    body: { kind: string; id?: string; name?: string; prompt?: string },
  ): Promise<Record<string, unknown>> {
    const name = body.name || body.id || body.kind || 'entity';
    const aliases = this.serviceAliases(name);
    const token = name.split(/\s+/).find((t) => t.length >= 3)?.toLowerCase() || name.toLowerCase();

    const logBuckets = await Promise.all([
      this.searchLogs(tenantId, { q: token, limit: 10 }),
      ...aliases.map((a) => this.searchLogs(tenantId, { service: a, limit: 8 })),
      this.searchLogs(tenantId, { severity: 'ERROR', limit: 8 }),
    ]);
    const logMap = new Map<string, ObserveLogHit>();
    for (const bucket of logBuckets) {
      for (const item of bucket.items) logMap.set(item.id, item);
    }
    const logs = [...logMap.values()];

    const traces = await this.listTraces(tenantId, { limit: 20 });
    const related = traces.filter((t) => {
      const hay = `${t.services} ${t.rootService || ''}`.toLowerCase();
      return aliases.some((a) => hay.includes(a.toLowerCase())) || hay.includes(token);
    });

    const apps = await this.listEntities(tenantId, 'applications');
    const entity =
      apps.find((a) => a.name.toLowerCase() === name.toLowerCase()) ||
      apps.find((a) => a.name.toLowerCase().includes(token)) ||
      null;

    const evidence: Array<{ type: string; ref: string; detail: string }> = [
      ...logs.slice(0, 4).map((l) => ({ type: 'log', ref: l.id, detail: l.body.slice(0, 160) })),
      ...related.slice(0, 2).map((t) => ({
        type: 'trace',
        ref: t.traceId,
        detail: `${t.durationMs}ms · ${t.errorCount} errors · ${t.services}`,
      })),
    ];
    if (entity) {
      evidence.unshift({
        type: 'entity',
        ref: entity.id,
        detail: `${entity.name} health=${entity.health} score=${entity.healthScore}${entity.businessImpact ? ` · ${entity.businessImpact}` : ''}`,
      });
    }
    if (evidence.length === 0) {
      evidence.push({
        type: 'context',
        ref: 'observe-overview',
        detail: `No correlated telemetry for ${name}; open Logs/Traces explorers and Digital Twin impact.`,
      });
    }

    const errorLogs = logs.filter((l) => l.severity.toUpperCase() === 'ERROR');
    return {
      brand: 'OpsEdge360',
      summary: `Observability investigation for ${name}: ${errorLogs.length} error logs and ${related.length} related traces in the current window.`,
      evidence,
      confidence: related.length || errorLogs.length || entity ? 0.78 : 0.55,
      businessImpact: entity?.businessImpact || 'Mapped via Digital Twin relationships when CI anchors exist',
      affectedServices: Array.from(
        new Set([...(entity ? [entity.name] : []), ...logs.map((l) => l.serviceName), ...aliases]),
      ).slice(0, 8),
      rootCause: related[0]?.errorCount
        ? `Elevated errors on trace ${related[0].traceId}`
        : errorLogs[0]
          ? `Recent ERROR: ${errorLogs[0].body.slice(0, 120)}`
          : entity?.health === 'degraded' || entity?.health === 'critical'
            ? `${entity.name} is ${entity.health}`
            : 'Insufficient error signal — continue correlation',
      recommendedRemediation: [
        'Open Digital Twin impact for the primary service',
        'Inspect slowest ERROR span in Traces',
        'Correlate ERROR logs with recent changes',
      ],
      automationRecommendations: [
        'Propose restart of unhealthy deployment (approval required)',
        'Open incident workspace with evidence pack',
      ],
      twinHref: entity?.twinHref || `/twin?name=${encodeURIComponent(name)}`,
      prompt: body.prompt || `Explain observability state for ${name}`,
    };
  }

  /** Map display names to telemetry service labels (Banking360 / Retail360 demos). */
  private serviceAliases(name: string): string[] {
    const n = name.toLowerCase();
    const aliases = new Set<string>([name]);
    if (n.includes('upi')) aliases.add('upi-gateway');
    if (n.includes('settlement')) aliases.add('settlement-svc');
    if (n.includes('checkout') || n.includes('retail')) aliases.add('checkout-api');
    if (n.includes('order')) aliases.add('order-orchestrator');
    if (n.includes('oracle') || n.includes('cbs')) aliases.add('cbs-oracle');
    if (n.includes('postgres') || n.includes('payment')) aliases.add('payments-postgres');
    // also add compact token forms
    for (const part of name.split(/[\s/_-]+/)) {
      if (part.length >= 3) aliases.add(part);
    }
    return [...aliases];
  }

  /**
   * Seed curated OTLP rows so live explorers populate for Banking360 / Retail360 / K8s demos.
   */
  async seedDemoTelemetry(tenantId: string): Promise<Record<string, unknown>> {
    const traceId = DEMO_TRACE_DETAIL.traceId;
    let metrics = 0;
    let logs = 0;
    let spans = 0;

    for (const m of DEMO_METRICS) {
      await query(
        `INSERT INTO otlp_metrics (tenant_id, name, value, unit, labels, service_name, recorded_at)
         VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6, NOW() - ($7 || ' minutes')::interval)`,
        [
          tenantId,
          m.name,
          m.value,
          m.unit ?? null,
          JSON.stringify({ ...(m.labels || {}), demo: 'sprint2', source: 'opsedge360' }),
          m.serviceName ?? 'unknown',
          String(Math.floor(Math.random() * 40)),
        ],
      ).catch((e) => this.log.warn(`metric seed skip: ${e}`));
      metrics++;
    }

    for (const l of DEMO_LOGS) {
      await query(
        `INSERT INTO otlp_logs (tenant_id, body, severity, service_name, trace_id, span_id, attributes, recorded_at)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::jsonb, NOW() - ($8 || ' minutes')::interval)`,
        [
          tenantId,
          l.body,
          l.severity,
          l.serviceName,
          l.traceId ?? null,
          l.spanId ?? null,
          JSON.stringify({ demo: 'sprint2', pack: 'unified-observability' }),
          String(Math.floor(Math.random() * 30)),
        ],
      ).catch((e) => this.log.warn(`log seed skip: ${e}`));
      logs++;
    }

    for (const span of DEMO_TRACE_DETAIL.spans) {
      await query(
        `INSERT INTO otlp_spans
           (tenant_id, trace_id, span_id, parent_span_id, name, duration_ms, service_name, status_code, attributes, recorded_at)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW() - INTERVAL '5 minutes')
         ON CONFLICT DO NOTHING`,
        [
          tenantId,
          traceId,
          span.spanId,
          span.parentSpanId ?? null,
          span.name,
          span.durationMs,
          span.serviceName,
          span.statusCode,
          JSON.stringify({ demo: 'sprint2' }),
        ],
      ).catch(async () => {
        // Some schemas lack ON CONFLICT target — plain insert
        await query(
          `INSERT INTO otlp_spans
             (tenant_id, trace_id, span_id, parent_span_id, name, duration_ms, service_name, status_code, attributes, recorded_at)
           VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW() - INTERVAL '5 minutes')`,
          [
            tenantId,
            traceId,
            span.spanId,
            span.parentSpanId ?? null,
            span.name,
            span.durationMs,
            span.serviceName,
            span.statusCode,
            JSON.stringify({ demo: 'sprint2' }),
          ],
        ).catch((e) => this.log.warn(`span seed skip: ${e}`));
      });
      spans++;
    }

    // Host metrics for infrastructure panel
    for (const host of DEMO_INFRASTRUCTURE) {
      await query(
        `INSERT INTO host_metrics
           (tenant_id, hostname, cpu_pct, memory_pct, disk_pct, load_1m, network_in_mbps, network_out_mbps, status, labels, recorded_at)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW())`,
        [
          tenantId,
          host.name,
          host.healthScore < 80 ? 87 : 42,
          host.healthScore < 80 ? 78 : 55,
          61,
          1.8,
          120,
          95,
          host.health === 'healthy' ? 'up' : 'degraded',
          JSON.stringify({ demo: 'sprint2', pack: host.labels?.pack || 'Hybrid Infrastructure' }),
        ],
      ).catch(() => undefined);
    }

    this.log.log(`Seeded Sprint 2 demo telemetry for tenant ${tenantId}`);
    return {
      ok: true,
      brand: 'OpsEdge360',
      packs: ['Banking360', 'Retail360', 'Cloud Native', 'Kubernetes', 'Hybrid Infrastructure'],
      seeded: { metrics, logs, spans, traces: DEMO_TRACES.length },
      message: 'Unified Observability demo telemetry loaded',
    };
  }

  private demoEntities(domain: ObserveDomain): ObserveEntity[] {
    switch (domain) {
      case 'applications':
        return DEMO_APPLICATIONS;
      case 'infrastructure':
        return DEMO_INFRASTRUCTURE;
      case 'kubernetes':
        return DEMO_KUBERNETES;
      case 'containers':
        return DEMO_CONTAINERS;
      case 'databases':
        return DEMO_DATABASES;
      default:
        return [];
    }
  }

  private async loadCmdbEntities(tenantId: string, domain: ObserveDomain): Promise<ObserveEntity[]> {
    const cfg = CI_DOMAIN_MAP[domain];
    if (!cfg) return [];
    try {
      const rows = await query<{
        id: string;
        name: string;
        ci_type: string;
        health_score: number | null;
        status: string | null;
        attributes: Record<string, unknown> | null;
      }>(
        `SELECT id, name, ci_type::text, health_score, status, attributes
         FROM configuration_items
         WHERE tenant_id = $1::uuid
           AND (
             ci_type::text = ANY($2::text[])
             OR attributes->>'kind' = ANY($2::text[])
             OR $3 = ANY(tags)
           )
         ORDER BY health_score ASC NULLS LAST, name ASC
         LIMIT 100`,
        [tenantId, cfg.kinds, domain === 'kubernetes' ? 'kubernetes' : domain],
      );

      // Soften kubernetes filter: cloud_resource with kind kubernetes
      let filtered = rows;
      if (domain === 'kubernetes') {
        filtered = rows.filter(
          (r) =>
            r.ci_type.includes('kube') ||
            r.ci_type === 'pod' ||
            String(r.attributes?.kind || '').toLowerCase().includes('kubernetes') ||
            String(r.attributes?.kind || '').toLowerCase() === 'namespace',
        );
        if (filtered.length === 0) filtered = rows.slice(0, 20);
      }
      if (domain === 'containers') {
        filtered = rows.filter(
          (r) => r.ci_type === 'container' || r.ci_type === 'pod' || String(r.attributes?.kind || '') === 'container',
        );
      }
      if (domain === 'infrastructure') {
        filtered = rows.filter((r) => !['application', 'database', 'api'].includes(r.ci_type));
      }

      return filtered.map((r) => {
        const score = Number(r.health_score ?? 90);
        const health = healthFromScore(score);
        return {
          id: r.id,
          name: r.name,
          domain: cfg.domain,
          kind: r.ci_type,
          health,
          healthScore: score,
          environment:
            (typeof r.attributes?.environment === 'string' ? String(r.attributes.environment) : undefined) ||
            undefined,
          twinHref: `/twin?workflow=impact&focus=${encodeURIComponent(r.id)}&name=${encodeURIComponent(r.name)}`,
          observeHref: `/observability/${domain}?focus=${encodeURIComponent(r.id)}`,
          asOf: new Date().toISOString(),
          source: 'live' as const,
          labels: {
            status: r.status || 'active',
            ...(typeof r.attributes?.engine === 'string' ? { engine: String(r.attributes.engine) } : {}),
          },
        };
      });
    } catch (e) {
      this.log.warn(`CMDB entity load failed for ${domain}: ${e}`);
      return [];
    }
  }
}
