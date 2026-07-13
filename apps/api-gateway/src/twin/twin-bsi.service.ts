import { Injectable, Logger } from '@nestjs/common';
import { query, queryOne } from '@opsedge360/shared-db';
import { ProxyService } from '../proxy.service';
import type {
  TwinAiContext,
  TwinBlastRadiusBusiness,
  TwinBusinessKpis,
  TwinBusinessService,
  TwinExecutiveRisk,
  TwinOwnership,
  TwinSla,
} from './twin-bsi.types';
import {
  availabilityFromHealth,
  healthFromScore,
  priorityFrom,
  propagateHealthFromDependencies,
  recoveryOrderFromNodes,
} from './twin-bsi.helpers';

@Injectable()
export class TwinBsiService {
  private readonly log = new Logger(TwinBsiService.name);

  constructor(private readonly proxy: ProxyService) {}

  async listBusinessServices(tenantId: string): Promise<TwinBusinessService[]> {
    const rows = await this.loadServiceRows(tenantId);
    const out: TwinBusinessService[] = [];
    for (const row of rows) {
      out.push(await this.composeService(tenantId, row));
    }
    return out.sort((a, b) => a.healthScore - b.healthScore || a.tier - b.tier);
  }

  async getBusinessService(tenantId: string, serviceId: string): Promise<TwinBusinessService | null> {
    const rows = await this.loadServiceRows(tenantId, serviceId);
    if (!rows.length) return null;
    return this.composeService(tenantId, rows[0]);
  }

  async getEnterpriseGraph(
    tenantId: string,
    opts?: { serviceId?: string; limit?: number; asOf?: string },
  ) {
    const limit = Math.min(Math.max(opts?.limit ?? 160, 20), 400);
    const asOf = opts?.asOf || new Date().toISOString();

    const services = opts?.serviceId
      ? await this.loadServiceRows(tenantId, opts.serviceId)
      : await this.loadServiceRows(tenantId);

    // Business service synthetic nodes + mapped CIs + relationships (optionally as-of)
    const serviceNodes = services.map((s) => ({
      id: `bs:${s.id}`,
      label: s.name,
      type: 'business_service',
      kind: 'BusinessService',
      status: 'active',
      healthScore: 90,
      riskScore: Number(s.tier) * 10,
      tier: s.tier,
      serviceId: s.id,
    }));

    const maps = await query<{ service_id: string; ci_id: string; role: string; name: string; ci_type: string; health_score: number; risk_score: number; status: string }>(
      `SELECT sm.service_id, sm.ci_id, sm.role, c.name, c.ci_type::text, c.health_score, c.risk_score, c.status::text
       FROM service_maps sm
       JOIN configuration_items c ON c.id = sm.ci_id
       WHERE c.tenant_id = $1::uuid
         AND ($2::uuid IS NULL OR sm.service_id = $2::uuid)
       LIMIT $3`,
      [tenantId, opts?.serviceId ?? null, limit],
    ).catch(() => []);

    const ciIds = [...new Set(maps.map((m) => m.ci_id))];
    const ciNodes = maps.map((m) => ({
      id: m.ci_id,
      label: m.name,
      type: m.ci_type,
      kind: m.ci_type,
      status: m.status,
      healthScore: Number(m.health_score ?? 90),
      riskScore: Number(m.risk_score ?? 0),
    }));

    // Deduplicate CI nodes
    const byId = new Map<string, (typeof ciNodes)[0]>();
    for (const n of ciNodes) byId.set(n.id, n);

    // Expand with related CIs for richer graph
    if (ciIds.length) {
      const more = await query<{
        id: string;
        name: string;
        ci_type: string;
        health_score: number;
        risk_score: number;
        status: string;
      }>(
        `SELECT DISTINCT c.id, c.name, c.ci_type::text, c.health_score, c.risk_score, c.status::text
         FROM relationships r
         JOIN configuration_items c ON c.id = r.source_ci_id OR c.id = r.target_ci_id
         WHERE r.tenant_id = $1::uuid
           AND (r.source_ci_id = ANY($2::uuid[]) OR r.target_ci_id = ANY($2::uuid[]))
           AND (r.valid_to IS NULL OR r.valid_to > $3::timestamptz)
           AND r.valid_from <= $3::timestamptz
         LIMIT $4`,
        [tenantId, ciIds, asOf, limit],
      ).catch(() => []);
      for (const m of more) {
        if (!byId.has(m.id)) {
          byId.set(m.id, {
            id: m.id,
            label: m.name,
            type: m.ci_type,
            kind: m.ci_type,
            status: m.status,
            healthScore: Number(m.health_score ?? 90),
            riskScore: Number(m.risk_score ?? 0),
          });
        }
      }
    }

    const allCiIds = [...byId.keys()];
    const relEdges =
      allCiIds.length === 0
        ? []
        : await query<{ source_ci_id: string; target_ci_id: string; relationship_type: string }>(
            `SELECT source_ci_id, target_ci_id, relationship_type::text
             FROM relationships
             WHERE tenant_id = $1::uuid
               AND source_ci_id = ANY($2::uuid[])
               AND target_ci_id = ANY($2::uuid[])
               AND (valid_to IS NULL OR valid_to > $3::timestamptz)
               AND valid_from <= $3::timestamptz
             LIMIT 500`,
            [tenantId, allCiIds, asOf],
          ).catch(() => []);

    const bsEdges = maps.map((m) => ({
      source: `bs:${m.service_id}`,
      target: m.ci_id,
      type: m.role === 'entry_point' ? 'part_of' : 'depends_on',
      strength: 'critical',
    }));

    // Propagate health onto service nodes
    const composed = await Promise.all(services.map((s) => this.composeService(tenantId, s)));
    const healthByService = new Map(composed.map((c) => [c.id, c]));
    for (const n of serviceNodes) {
      const c = healthByService.get(n.serviceId);
      if (c) {
        n.healthScore = c.healthScore;
        n.riskScore = c.riskScore;
        n.status = c.health;
      }
    }

    return {
      brand: 'OpsEdge360' as const,
      asOf,
      view: 'enterprise-digital-twin',
      nodes: [...serviceNodes, ...byId.values()],
      edges: [
        ...bsEdges,
        ...relEdges.map((e) => ({
          source: e.source_ci_id,
          target: e.target_ci_id,
          type: e.relationship_type,
          strength: 'normal',
        })),
      ],
      services: composed,
      source: 'twin-bsi',
    };
  }

  async blastRadiusForService(
    tenantId: string,
    serviceId: string,
    opts?: { depth?: number; direction?: string },
  ): Promise<TwinBlastRadiusBusiness | null> {
    const svc = await this.getBusinessService(tenantId, serviceId);
    if (!svc) return null;
    const depth = opts?.depth ?? 3;
    const direction = opts?.direction ?? 'downstream';

    const roots = await query<{ ci_id: string; name: string }>(
      `SELECT sm.ci_id, c.name
       FROM service_maps sm
       JOIN configuration_items c ON c.id = sm.ci_id
       WHERE sm.service_id = $1::uuid AND c.tenant_id = $2::uuid`,
      [serviceId, tenantId],
    ).catch(() => []);

    if (!roots.length) {
      return {
        serviceId,
        serviceName: svc.name,
        depth,
        direction,
        affectedServices: [svc.name],
        affectedApplications: [],
        affectedCustomers: 'Unknown — map CIs to this business service',
        businessRisk: svc.health,
        revenueImpactPerHour: svc.kpis.revenueImpactPerHour,
        operationalImpact: 'No configuration items mapped; blast radius limited to service metadata',
        priority: priorityFrom(svc.health, svc.kpis.revenueImpactPerHour),
        recoveryOrder: [svc.name],
        affectedCis: 0,
        criticalCount: 0,
        atRiskCount: 0,
        avgHealth: svc.healthScore,
        nodes: [],
        edges: [],
        rootCiIds: [],
        asOf: new Date().toISOString(),
      };
    }

    // Merge blast from each entry CI via CMDB or fallback aggregation
    const mergedNodes = new Map<string, TwinBlastRadiusBusiness['nodes'][0]>();
    const mergedEdges: TwinBlastRadiusBusiness['edges'] = [];
    for (const root of roots.slice(0, 5)) {
      const blast = await this.fetchCiBlast(tenantId, root.ci_id, depth, direction);
      for (const n of blast.nodes) mergedNodes.set(n.id, n);
      for (const e of blast.edges) mergedEdges.push(e);
    }

    const nodes = [...mergedNodes.values()];
    const apps = nodes.filter((n) => /app|service|api/i.test(n.ciType)).map((n) => n.name);
    const criticalCount = nodes.filter((n) => n.healthScore < 70).length;
    const atRiskCount = nodes.filter((n) => n.healthScore < 85 && n.healthScore >= 70).length;
    const avgHealth = nodes.length
      ? Math.round(nodes.reduce((s, n) => s + n.healthScore, 0) / nodes.length)
      : svc.healthScore;

    const recoveryOrder = recoveryOrderFromNodes(
      nodes.map((n) => ({ name: n.name, ciType: n.ciType })),
      svc.name,
    );

    const businessRisk = healthFromScore(Math.min(svc.healthScore, avgHealth));
    const revenueImpact =
      businessRisk === 'critical'
        ? svc.kpis.revenueImpactPerHour
        : businessRisk === 'degraded'
          ? Math.round(svc.kpis.revenueImpactPerHour * 0.45)
          : Math.round(svc.kpis.revenueImpactPerHour * 0.1);

    return {
      serviceId,
      serviceName: svc.name,
      depth,
      direction,
      affectedServices: [svc.name],
      affectedApplications: apps.slice(0, 20),
      affectedCustomers: svc.tier === 1 ? 'Retail + merchant payment corridors' : 'Segment customers for this journey',
      businessRisk,
      revenueImpactPerHour: revenueImpact,
      operationalImpact: `${criticalCount} critical CIs · ${nodes.length} in blast radius`,
      priority: priorityFrom(businessRisk, revenueImpact),
      recoveryOrder,
      affectedCis: nodes.length,
      criticalCount,
      atRiskCount,
      avgHealth,
      nodes,
      edges: mergedEdges.slice(0, 300),
      rootCiIds: roots.map((r) => r.ci_id),
      asOf: new Date().toISOString(),
    };
  }

  async getExecutiveRisk(tenantId: string): Promise<TwinExecutiveRisk> {
    const services = await this.listBusinessServices(tenantId);
    const critical = services.filter((s) => s.health !== 'healthy' || s.tier === 1).slice(0, 8);
    const worst = services[0];
    const revenueImpact = services
      .filter((s) => s.health !== 'healthy')
      .reduce((sum, s) => sum + (s.health === 'critical' ? s.kpis.revenueImpactPerHour : s.kpis.revenueImpactPerHour * 0.4), 0);

    const openIncidents = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM ops_incidents
       WHERE tenant_id=$1::uuid AND status NOT IN ('resolved','closed')`,
      [tenantId],
    ).catch(() => ({ c: '0' }));

    const score =
      services.length === 0
        ? 0
        : Math.round(services.reduce((s, x) => s + x.healthScore, 0) / services.length);

    return {
      brand: 'OpsEdge360',
      asOf: new Date().toISOString(),
      businessHealth: healthFromScore(score),
      businessHealthScore: score,
      topRisks: critical.slice(0, 5).map((s) => ({
        id: s.id,
        title: `${s.name} is ${s.health}`,
        severity: s.health === 'critical' ? 'critical' : s.health === 'degraded' ? 'high' : 'medium',
        href: s.twinHref,
      })),
      criticalServices: services.filter((s) => s.tier === 1).slice(0, 10),
      capacityRisks: services
        .filter((s) => s.kpis.forecastRisk.toLowerCase().includes('capacity') || s.healthScore < 85)
        .slice(0, 3)
        .map((s) => `${s.name}: ${s.kpis.forecastRisk}`),
      securityRisks: ['Review twin-linked security overlays on payment edge', 'Confirm ownership on tier-1 services'],
      complianceStatus: score >= 90 ? 'Within operating band' : 'Attention required on SLA burn',
      revenueImpactPerHour: Math.round(revenueImpact),
      customerImpact: worst?.kpis.customerImpact || 'No elevated customer impact detected',
      openIncidents: Number(openIncidents?.c || 0),
      recommendations: [
        {
          id: 'rec-blast',
          title: worst ? `Run blast radius on ${worst.name}` : 'Open Digital Twin',
          href: worst?.twinHref || '/twin',
        },
        { id: 'rec-observe', title: 'Correlate with Unified Observability', href: '/observability' },
        { id: 'rec-incident', title: 'Open incident workspace', href: '/ops-intelligence' },
      ],
    };
  }

  async explainWithTwin(
    tenantId: string,
    body: { serviceId?: string; ciId?: string; name?: string; prompt?: string },
  ): Promise<TwinAiContext> {
    let svc: TwinBusinessService | null = null;
    if (body.serviceId) svc = await this.getBusinessService(tenantId, body.serviceId);
    if (!svc && body.name) {
      const all = await this.listBusinessServices(tenantId);
      svc = all.find((s) => s.name.toLowerCase().includes(body.name!.toLowerCase())) || null;
    }

    const blast = svc ? await this.blastRadiusForService(tenantId, svc.id) : null;
    const evidence: TwinAiContext['evidence'] = [];
    if (svc) {
      evidence.push({
        type: 'business_service',
        ref: svc.id,
        detail: `${svc.name} health=${svc.health} SLA ${svc.sla.actual}% vs ${svc.sla.target}%`,
      });
      evidence.push({
        type: 'ownership',
        ref: svc.id,
        detail: `Business=${svc.ownership.businessOwner || 'n/a'}; Ops=${svc.ownership.operationsOwner || 'n/a'}`,
      });
    }
    if (blast) {
      evidence.push({
        type: 'blast_radius',
        ref: blast.serviceId,
        detail: `${blast.affectedCis} CIs · revenue at risk ₹${blast.revenueImpactPerHour}/hr · priority ${blast.priority}`,
      });
      for (const app of blast.affectedApplications.slice(0, 3)) {
        evidence.push({ type: 'application', ref: app, detail: `Depends in blast radius: ${app}` });
      }
    }

    return {
      brand: 'OpsEdge360',
      summary: svc
        ? `Twin analysis for ${svc.name}: ${svc.health} with ${blast?.affectedCis || 0} CIs in blast radius. Restore order starts with foundational data/platform dependencies.`
        : 'Select a business service in the Digital Twin to ground AI in graph relationships.',
      evidence,
      confidence: evidence.length >= 2 ? 0.82 : 0.55,
      businessImpact: blast
        ? `₹${blast.revenueImpactPerHour}/hr · ${blast.affectedCustomers}`
        : svc?.kpis.customerImpact || 'n/a',
      affectedServices: blast?.affectedServices || (svc ? [svc.name] : []),
      rootCause: blast?.operationalImpact || 'Insufficient twin mapping for causal path',
      recommendedRemediation: [
        'Open blast radius view for the business service',
        'Restore recovery-order items starting with data stores',
        'Correlate ERROR logs on entry applications via Observability',
      ],
      automationRecommendations: [
        'Propose approved restart of unhealthy entry deployment',
        'Open incident with twin evidence pack (approval required)',
      ],
      twinHref: svc?.twinHref || '/twin',
      recoveryOrder: blast?.recoveryOrder || [],
    };
  }

  async recordHealthSnapshot(tenantId: string, serviceId: string): Promise<void> {
    const svc = await this.getBusinessService(tenantId, serviceId);
    if (!svc) return;
    await query(
      `INSERT INTO twin_service_health_history
         (tenant_id, service_id, health_score, availability, latency_ms, error_rate, sla_compliance, business_risk, revenue_at_risk, source)
       VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,'propagation')`,
      [
        tenantId,
        serviceId,
        svc.healthScore,
        svc.kpis.availability,
        svc.kpis.latencyMs,
        svc.kpis.errorRate,
        svc.kpis.slaCompliance,
        svc.health,
        svc.health === 'critical' ? svc.kpis.revenueImpactPerHour : svc.kpis.revenueImpactPerHour * 0.4,
      ],
    ).catch((e) => this.log.warn(`health snapshot skip: ${e}`));
  }

  async getServiceHistory(tenantId: string, serviceId: string, hours = 24) {
    const rows = await query(
      `SELECT health_score, availability, latency_ms, error_rate, sla_compliance, business_risk, revenue_at_risk, recorded_at
       FROM twin_service_health_history
       WHERE tenant_id=$1::uuid AND service_id=$2::uuid
         AND recorded_at > NOW() - ($3 || ' hours')::interval
       ORDER BY recorded_at ASC`,
      [tenantId, serviceId, String(hours)],
    ).catch(() => []);
    return { brand: 'OpsEdge360', serviceId, hours, items: rows };
  }

  /** Map executive ServiceRow shape from twin-composed services. */
  async getExecutiveServiceRows(tenantId: string) {
    const services = await this.listBusinessServices(tenantId);
    if (!services.length) return [];
    return services.map((s) => ({
      id: s.id,
      name: s.name,
      tier: s.tier,
      availability: s.kpis.availability,
      slaTarget: s.sla.target,
      status: (s.health === 'healthy'
        ? 'healthy'
        : s.health === 'degraded'
          ? 'degraded'
          : 'at_risk') as 'healthy' | 'degraded' | 'at_risk' | 'critical',
      revenuePerHour: s.kpis.revenueImpactPerHour,
      owner: s.ownership.businessOwner || s.ownership.operationsOwner || 'Unassigned',
      illustrative: false,
      label: undefined as string | undefined,
      href: s.twinHref,
    }));
  }

  private async composeService(
    tenantId: string,
    row: Awaited<ReturnType<TwinBsiService['loadServiceRows']>>[0],
  ): Promise<TwinBusinessService> {
    const mapped = await query<{ health_score: number; risk_score: number; ci_type: string; name: string }>(
      `SELECT c.health_score, c.risk_score, c.ci_type::text, c.name
       FROM service_maps sm
       JOIN configuration_items c ON c.id = sm.ci_id
       WHERE sm.service_id = $1::uuid AND c.tenant_id = $2::uuid`,
      [row.id, tenantId],
    ).catch(() => []);

    const healthScore = mapped.length
      ? propagateHealthFromDependencies(mapped.map((m) => Number(m.health_score ?? 100))).healthScore
      : 92 - (row.tier - 1) * 4;
    const riskScore = mapped.length
      ? Math.max(...mapped.map((m) => Number(m.risk_score ?? 0)))
      : row.tier * 12;
    const health = healthFromScore(healthScore);
    const slaTarget = Number(row.sla_target);
    // Propagated availability approximates SLA actual from health
    const availability = availabilityFromHealth(slaTarget, healthScore);
    const slaCompliance = Number(Math.min(100, (availability / slaTarget) * 100).toFixed(2));
    const latencyMs = healthScore >= 90 ? 85 : healthScore >= 70 ? 220 : 480;
    const errorRate = healthScore >= 90 ? 0.2 : healthScore >= 70 ? 1.8 : 4.5;
    const revenue = Number(row.revenue_per_hour || 0);

    const ownership: TwinOwnership = {
      businessOwner: row.business_owner_name || undefined,
      technicalOwner: row.technical_owner_name || undefined,
      operationsOwner: row.operations_owner_name || undefined,
      supportTeam: row.support_team || undefined,
      escalationGroup: row.escalation_group || undefined,
      onCallTeam: row.oncall_team || undefined,
    };

    const sla: TwinSla = {
      target: slaTarget,
      actual: availability,
      compliance: slaCompliance,
      breachPredicted: availability < slaTarget,
      trend: healthScore >= 90 ? 'stable' : healthScore >= 70 ? 'worsening' : 'worsening',
    };

    const kpis: TwinBusinessKpis = {
      availability,
      latencyMs,
      errorRate,
      incidentCount: health === 'critical' ? 2 : health === 'degraded' ? 1 : 0,
      mttrMinutes: health === 'critical' ? 42 : 18,
      slaCompliance,
      businessRisk: health,
      revenueImpactPerHour: revenue,
      customerImpact:
        health === 'critical'
          ? 'Customer-facing journey impaired'
          : health === 'degraded'
            ? 'Elevated friction on journey'
            : 'Within customer experience band',
      trend: sla.trend,
      forecastRisk: healthScore < 80 ? 'Capacity / dependency pressure next 24h' : 'Stable forecast',
    };

    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      businessUnit: row.business_unit || 'Retail Banking',
      businessCapability: row.business_capability || 'Payments',
      environment: row.environment || 'Prod',
      tier: row.tier,
      criticality: row.criticality || (row.tier === 1 ? 'tier1' : row.tier === 2 ? 'tier2' : 'tier3'),
      costCenter: row.cost_center || undefined,
      lifecycle: row.lifecycle || 'active',
      tags: row.tags || [],
      health,
      healthScore,
      riskScore,
      ownership,
      sla,
      kpis,
      dependencyCount: mapped.length,
      twinHref: `/twin?workflow=impact&serviceId=${encodeURIComponent(row.id)}&name=${encodeURIComponent(row.name)}`,
      observeHref: `/observability/applications?focus=${encodeURIComponent(row.name)}`,
      asOf: new Date().toISOString(),
    };
  }

  private async loadServiceRows(tenantId: string, serviceId?: string) {
    // Prefer enriched Sprint 3 columns; fall back to core schema if migration not applied yet.
    const enriched = await query<{
      id: string;
      name: string;
      description: string | null;
      tier: number;
      sla_target: string;
      revenue_per_hour: string;
      business_unit: string | null;
      business_capability: string | null;
      environment: string | null;
      criticality: string | null;
      cost_center: string | null;
      lifecycle: string | null;
      tags: string[] | null;
      support_team: string | null;
      escalation_group: string | null;
      oncall_team: string | null;
      business_owner_name: string | null;
      technical_owner_name: string | null;
      operations_owner_name: string | null;
    }>(
      `SELECT b.id, b.name, b.description, b.tier, b.sla_target::text, b.revenue_per_hour::text,
              b.business_unit, b.business_capability, b.environment, b.criticality, b.cost_center,
              b.lifecycle, b.tags, b.support_team, b.escalation_group, b.oncall_team,
              ub.name AS business_owner_name,
              ut.name AS technical_owner_name,
              uo.name AS operations_owner_name
       FROM business_services b
       LEFT JOIN users ub ON ub.id = b.owner_id
       LEFT JOIN users ut ON ut.id = b.technical_owner_id
       LEFT JOIN users uo ON uo.id = b.operations_owner_id
       WHERE b.tenant_id = $1::uuid
         AND ($2::uuid IS NULL OR b.id = $2::uuid)
       ORDER BY b.tier ASC, b.name ASC
       LIMIT 80`,
      [tenantId, serviceId ?? null],
    ).catch(() => null);

    if (enriched) return enriched;

    return query<{
      id: string;
      name: string;
      description: string | null;
      tier: number;
      sla_target: string;
      revenue_per_hour: string;
      business_unit: string | null;
      business_capability: string | null;
      environment: string | null;
      criticality: string | null;
      cost_center: string | null;
      lifecycle: string | null;
      tags: string[] | null;
      support_team: string | null;
      escalation_group: string | null;
      oncall_team: string | null;
      business_owner_name: string | null;
      technical_owner_name: string | null;
      operations_owner_name: string | null;
    }>(
      `SELECT b.id, b.name, b.description, b.tier, b.sla_target::text, b.revenue_per_hour::text,
              NULL::text AS business_unit, NULL::text AS business_capability, 'Prod'::text AS environment,
              CASE WHEN b.tier=1 THEN 'tier1' WHEN b.tier=2 THEN 'tier2' ELSE 'tier3' END AS criticality,
              NULL::text AS cost_center, 'active'::text AS lifecycle, ARRAY[]::text[] AS tags,
              NULL::text AS support_team, NULL::text AS escalation_group, NULL::text AS oncall_team,
              ub.name AS business_owner_name,
              NULL::text AS technical_owner_name,
              NULL::text AS operations_owner_name
       FROM business_services b
       LEFT JOIN users ub ON ub.id = b.owner_id
       WHERE b.tenant_id = $1::uuid
         AND ($2::uuid IS NULL OR b.id = $2::uuid)
       ORDER BY b.tier ASC, b.name ASC
       LIMIT 80`,
      [tenantId, serviceId ?? null],
    ).catch(() => []);
  }

  private async fetchCiBlast(tenantId: string, ciId: string, depth: number, direction: string) {
    try {
      const result = await this.proxy.cmdb(`/twin/blast-radius/${ciId}`, {
        tenantId,
        query: { depth: String(depth), direction },
      });
      if (result.status >= 200 && result.status < 300 && result.data) {
        const d = result.data as Record<string, unknown>;
        const nodes = (Array.isArray(d.nodes) ? d.nodes : []) as Array<Record<string, unknown>>;
        const edges = (Array.isArray(d.edges) ? d.edges : []) as Array<Record<string, unknown>>;
        return {
          nodes: nodes.map((n) => ({
            id: String(n.id ?? n.ciId ?? ''),
            name: String(n.name ?? n.label ?? ''),
            ciType: String(n.ciType ?? n.type ?? 'ci'),
            healthScore: Number(n.healthScore ?? n.health_score ?? 90),
            riskScore: Number(n.riskScore ?? n.risk_score ?? 0),
            depth: Number(n.depth ?? 1),
            status: String(n.status ?? 'active'),
          })),
          edges: edges.map((e) => ({
            source: String(e.source ?? e.sourceId ?? ''),
            target: String(e.target ?? e.targetId ?? ''),
            type: String(e.type ?? e.relationship_type ?? 'depends_on'),
          })),
        };
      }
    } catch (e) {
      this.log.warn(`cmdb blast failed for ${ciId}: ${e}`);
    }

    // Lightweight local fallback
    const rels = await query<{ source_ci_id: string; target_ci_id: string; relationship_type: string }>(
      `SELECT source_ci_id, target_ci_id, relationship_type::text
       FROM relationships WHERE tenant_id=$1::uuid
         AND (source_ci_id=$2::uuid OR target_ci_id=$2::uuid)
       LIMIT 80`,
      [tenantId, ciId],
    ).catch(() => []);
    const ids = new Set<string>([ciId]);
    for (const r of rels) {
      ids.add(r.source_ci_id);
      ids.add(r.target_ci_id);
    }
    const nodes = await query<{
      id: string;
      name: string;
      ci_type: string;
      health_score: number;
      risk_score: number;
      status: string;
    }>(
      `SELECT id, name, ci_type::text, health_score, risk_score, status::text
       FROM configuration_items WHERE tenant_id=$1::uuid AND id = ANY($2::uuid[])`,
      [tenantId, [...ids]],
    ).catch(() => []);
    return {
      nodes: nodes.map((n, i) => ({
        id: n.id,
        name: n.name,
        ciType: n.ci_type,
        healthScore: Number(n.health_score ?? 90),
        riskScore: Number(n.risk_score ?? 0),
        depth: n.id === ciId ? 0 : 1,
        status: n.status,
      })),
      edges: rels.map((e) => ({
        source: e.source_ci_id,
        target: e.target_ci_id,
        type: e.relationship_type,
      })),
    };
  }
}
