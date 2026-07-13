import { Injectable } from '@nestjs/common';
import type {
  ActionWidget,
  ChartWidget,
  ComplianceWidget,
  DomainWidget,
  ExecutiveDashboardPayload,
  ExecutiveNarrative,
  HealthWidget,
  IncidentWidget,
  RecommendationWidget,
  RiskWidget,
  SecurityWidget,
  ServiceHealthRow,
  TableWidget,
  TrendPoint,
  TrendWidget,
} from '@opsedge360/shared-types';
import type { ExecutiveKpis } from '@opsedge360/shared-types';
import { ProxyService } from '../proxy.service';
import { DashboardRulesService } from './dashboard-rules.service';
import { query, queryOne } from '@opsedge360/shared-db';

export type KpiPayload = ExecutiveKpis & {
  illustrative?: boolean;
  label?: string;
  coverageLabel?: string;
};

export type ServiceRow = ServiceHealthRow & {
  revenuePerHour?: number;
  illustrative?: boolean;
  label?: string;
};

export type RiskRow = RiskWidget & { illustrative?: boolean; label?: string };

export type TrendsPayload = {
  series: TrendPoint[];
  illustrative?: boolean;
  label?: string;
  message?: string;
};

export type RecommendationsPayload = {
  items: RecommendationWidget[];
  illustrative?: boolean;
  label?: string;
};

export type CmdbStatsPayload = {
  totalAssets?: number;
  avgHealth?: number;
  openAlerts?: number;
  atRiskAssets?: number;
  byType?: Array<{ type: string; count: number }>;
  illustrative?: boolean;
  label?: string;
};

export type DashboardComposeInput = {
  kpis: KpiPayload;
  trends: TrendsPayload;
  services: ServiceRow[];
  risks: RiskRow[];
  narrative: ExecutiveNarrative;
  recommendations: RecommendationsPayload;
  estateStats: CmdbStatsPayload | null;
  role?: string;
  incidents?: IncidentWidget[];
};

@Injectable()
export class ExecutiveDataService {
  constructor(
    private readonly proxy: ProxyService,
    private readonly rules: DashboardRulesService,
  ) {}

  async getKpis(tenantId: string): Promise<KpiPayload> {
    const ede = await queryOne<{
      illustrative: boolean;
      servers: number;
      applications: number;
      databases: number;
      kubernetes_clusters: number;
      cloud_resources: number;
      network_devices: number;
      apis: number;
      business_services: number;
    }>(
      `SELECT illustrative, servers, applications, databases, kubernetes_clusters,
              cloud_resources, network_devices, apis, business_services
       FROM ede_inventory_summary WHERE tenant_id=$1`,
      [tenantId],
    ).catch(() => null);

    const latest = await queryOne<{
      availability: string;
      revenue_at_risk: string;
      compliance_score: string;
      sustainability_score: string;
      active_incidents: number;
      open_alerts: number;
    }>(
      `SELECT availability, revenue_at_risk, compliance_score, sustainability_score, active_incidents, open_alerts
       FROM ede_executive_daily WHERE tenant_id=$1 ORDER BY day DESC LIMIT 1`,
      [tenantId],
    ).catch(() => null);

    let totalAssets = 0;
    try {
      const statsRes = await this.proxy.cmdb('/stats', { tenantId });
      const stats = statsRes.data as { totalAssets?: number };
      totalAssets = stats.totalAssets ?? 0;
    } catch {
      totalAssets = 0;
    }

    if (!totalAssets && ede) {
      totalAssets =
        (ede.servers ?? 0) +
        (ede.applications ?? 0) +
        (ede.databases ?? 0) +
        (ede.kubernetes_clusters ?? 0) +
        (ede.cloud_resources ?? 0) +
        (ede.network_devices ?? 0) +
        (ede.apis ?? 0);
    }

    const coverageLabel = ede
      ? `${ede.business_services} services · ${ede.applications} apps · ${ede.servers} servers`
      : totalAssets > 0
        ? `${totalAssets.toLocaleString()} configuration items`
        : 'Enterprise services';

    if (latest) {
      return {
        availability: Number(latest.availability),
        revenueAtRisk: Number(latest.revenue_at_risk),
        complianceScore: Number(latest.compliance_score),
        securityPosture: 'medium',
        sustainabilityScore: Number(latest.sustainability_score),
        activeIncidents: latest.active_incidents,
        totalAssets,
        openAlerts: latest.open_alerts,
        illustrative: ede?.illustrative ?? true,
        label: 'Illustrative Demo Data',
        coverageLabel,
      };
    }

    try {
      const [statsRes, complianceRes] = await Promise.all([
        this.proxy.cmdb('/stats', { tenantId }),
        this.proxy.compliance('/score', { tenantId }),
      ]);
      const stats = statsRes.data as { totalAssets?: number; avgHealth?: number; openAlerts?: number };
      const compliance = complianceRes.data as { overallScore?: number };
      return {
        availability: stats.avgHealth ? Number(((stats.avgHealth / 100) * 99.99).toFixed(2)) : 99.94,
        revenueAtRisk: 240_000,
        complianceScore: compliance.overallScore ?? 87,
        securityPosture: 'medium',
        sustainabilityScore: 72,
        activeIncidents: Math.min(stats.openAlerts ?? 0, 10),
        totalAssets: stats.totalAssets ?? totalAssets,
        openAlerts: stats.openAlerts ?? 0,
        coverageLabel,
      };
    } catch {
      // Honest empty / illustrative fallback — do not invent a populated estate
      return {
        availability: 0,
        revenueAtRisk: 0,
        complianceScore: 0,
        securityPosture: 'medium',
        sustainabilityScore: 0,
        activeIncidents: 0,
        totalAssets: totalAssets || 0,
        openAlerts: 0,
        illustrative: true,
        label: 'Illustrative Demo Data',
        coverageLabel: coverageLabel || 'Load Illustrative Demo Data to populate executive KPIs',
      };
    }
  }

  async getRecentIncidents(tenantId: string, limit = 5): Promise<IncidentWidget[]> {
    const rows = await query<{
      id: string;
      title: string;
      severity: string | null;
      status: string | null;
      correlation_key: string | null;
    }>(
      `SELECT id, title, severity, status, correlation_key
       FROM ops_incidents
       WHERE tenant_id=$1
         AND COALESCE(status, 'open') NOT IN ('closed', 'resolved')
       ORDER BY
         CASE LOWER(COALESCE(severity, 'medium'))
           WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3
         END,
         created_at DESC NULLS LAST
       LIMIT $2`,
      [tenantId, limit],
    ).catch(() => []);

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      severity: (r.severity || 'medium').toLowerCase(),
      status: (r.status || 'open').toLowerCase(),
      affectedService: r.correlation_key || undefined,
      drilldown: {
        href: `/ops-intelligence?incident=${encodeURIComponent(r.id)}`,
        label: 'Open workspace',
      },
    }));
  }

  async getServices(tenantId: string): Promise<ServiceRow[]> {
    const rows = await query<{
      id: string;
      name: string;
      tier: number;
      sla_target: string;
      revenue_per_hour: string;
    }>(
      `SELECT id, name, tier, sla_target::text, revenue_per_hour::text
       FROM business_services WHERE tenant_id=$1 ORDER BY tier ASC, name ASC LIMIT 40`,
      [tenantId],
    ).catch(() => []);

    if (rows.length) {
      return rows.map((r, i) => {
        const sla = Number(r.sla_target);
        const availability = Number((sla - (i % 5 === 0 ? 0.08 : i % 3 === 0 ? 0.03 : -0.02)).toFixed(2));
        const status = this.rules.serviceStatus(availability, sla);
        return {
          id: r.id,
          name: r.name,
          tier: r.tier,
          availability,
          slaTarget: sla,
          status,
          revenuePerHour: Number(r.revenue_per_hour),
          owner: i % 4 === 0 ? 'Payments Platform' : i % 3 === 0 ? 'Core Banking Ops' : 'Digital Channels',
          illustrative: true,
          label: 'Illustrative Demo Data',
        };
      });
    }

    return [
      { id: '1', name: 'UPI Payments', tier: 1, availability: 99.98, slaTarget: 99.95, status: 'healthy', owner: 'Payments Platform', illustrative: true, label: 'Illustrative Demo Data' },
      { id: '2', name: 'Digital Banking', tier: 1, availability: 99.92, slaTarget: 99.9, status: 'degraded', owner: 'Digital Channels', illustrative: true, label: 'Illustrative Demo Data' },
      { id: '3', name: 'Loan Processing', tier: 2, availability: 99.99, slaTarget: 99.5, status: 'healthy', owner: 'Lending Ops', illustrative: true, label: 'Illustrative Demo Data' },
      { id: '4', name: 'Merchant Payments', tier: 1, availability: 99.87, slaTarget: 99.95, status: 'at_risk', owner: 'Payments Platform', illustrative: true, label: 'Illustrative Demo Data' },
      { id: '5', name: 'Core Banking', tier: 1, availability: 99.96, slaTarget: 99.99, status: 'healthy', owner: 'Core Banking Ops', illustrative: true, label: 'Illustrative Demo Data' },
    ];
  }

  async getRisks(tenantId: string): Promise<RiskRow[]> {
    const drifts = await query<{
      id: string;
      summary: string | null;
      severity: string;
      details: Record<string, unknown> | null;
    }>(
      `SELECT id, summary, severity, details FROM drift_events
       WHERE tenant_id=$1 AND resolved_at IS NULL
       ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, detected_at DESC
       LIMIT 8`,
      [tenantId],
    ).catch(() => []);

    if (drifts.length) {
      return drifts.map((d, i) => {
        const severity = d.severity;
        const status =
          severity === 'critical' || severity === 'high'
            ? 'critical'
            : severity === 'medium'
              ? 'degraded'
              : 'healthy';
        return {
          id: d.id,
          title: d.summary ?? 'Configuration drift',
          severity,
          revenueAtRisk: this.rules.riskRevenueAtRisk(severity),
          affectedService: String((d.details as { businessImpact?: string })?.businessImpact ?? 'Enterprise services'),
          recommendedAction: String(
            (d.details as { recommendedAction?: string })?.recommendedAction ?? 'Review in CMDB Drift',
          ),
          owner: i % 2 === 0 ? 'Platform Reliability' : 'Security Operations',
          status: status as RiskRow['status'],
          drilldown: { href: '/cmdb/drift', label: 'Review CMDB Drift' },
          illustrative: true,
          label: 'Illustrative Demo Data',
        };
      });
    }

    return [
      {
        id: '1',
        title: 'DB connection pool exhaustion',
        severity: 'high',
        revenueAtRisk: 120_000,
        affectedService: 'UPI Payments',
        recommendedAction: 'Scale pool and review connection leaks in Payment Gateway',
        owner: 'Payments Platform',
        status: 'critical',
        drilldown: { href: '/cmdb/drift', label: 'Investigate' },
        illustrative: true,
        label: 'Illustrative Demo Data',
      },
      {
        id: '2',
        title: 'Certificate expiry in 7 days',
        severity: 'medium',
        revenueAtRisk: 45_000,
        affectedService: 'API Gateway',
        recommendedAction: 'Renew TLS certificate before customer cutoff',
        owner: 'Security Operations',
        status: 'degraded',
        drilldown: { href: '/cmdb/drift', label: 'Review' },
        illustrative: true,
        label: 'Illustrative Demo Data',
      },
      {
        id: '3',
        title: 'UPI latency elevated vs baseline',
        severity: 'medium',
        revenueAtRisk: 90_000,
        affectedService: 'UPI Payments',
        recommendedAction: 'Open Banking360 rails and validate PG / CBS path',
        owner: 'Payments Platform',
        status: 'degraded',
        drilldown: { href: '/banking360', label: 'Open Banking360' },
        illustrative: true,
        label: 'Illustrative Demo Data',
      },
    ];
  }

  async getTrends(tenantId: string): Promise<TrendsPayload> {
    const rows = await query<{
      day: string;
      availability: string;
      sla_compliance: string;
      mttr_minutes: string;
      active_incidents: number;
      revenue_at_risk: string;
      open_alerts: number;
    }>(
      `SELECT day::text, availability::text, sla_compliance::text, mttr_minutes::text,
              active_incidents, revenue_at_risk::text, open_alerts
       FROM ede_executive_daily WHERE tenant_id=$1 ORDER BY day ASC LIMIT 30`,
      [tenantId],
    ).catch(() => []);

    if (!rows.length) {
      return { series: [], illustrative: false, message: 'No trend series yet — load Enterprise Demo pack.' };
    }

    return {
      illustrative: true,
      label: 'Illustrative Demo Data',
      series: rows.map((r) => ({
        day: r.day,
        availability: Number(r.availability),
        slaCompliance: Number(r.sla_compliance),
        mttrMinutes: Number(r.mttr_minutes),
        activeIncidents: r.active_incidents,
        revenueAtRisk: Number(r.revenue_at_risk),
        openAlerts: r.open_alerts,
      })),
    };
  }

  async getNarrative(tenantId: string): Promise<ExecutiveNarrative> {
    const latest = await queryOne<{
      availability: string;
      revenue_at_risk: string;
      active_incidents: number;
      compliance_score: string;
      open_alerts: number;
    }>(
      `SELECT availability, revenue_at_risk, active_incidents, compliance_score, open_alerts
       FROM ede_executive_daily WHERE tenant_id=$1 ORDER BY day DESC LIMIT 1`,
      [tenantId],
    ).catch(() => null);

    const topRisk = await queryOne<{ summary: string | null; severity: string }>(
      `SELECT summary, severity FROM drift_events
       WHERE tenant_id=$1 AND resolved_at IS NULL
       ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END, detected_at DESC
       LIMIT 1`,
      [tenantId],
    ).catch(() => null);

    if (!latest) {
      return {
        illustrative: false,
        what: 'Platform operating within normal executive thresholds',
        why: 'Stable posture supports board-level confidence and continuous service delivery.',
        impact: 'Load Illustrative Demo Data to see revenue, availability, and incident trends.',
        owner: 'Enterprise Operations',
        next: 'Load Enterprise Demo pack or connect Discovery for live estate context.',
        nextHref: '/demo/guided',
        aiConfidence: 70,
      };
    }

    const incidents = latest.active_incidents;
    const revenueK = Math.round(Number(latest.revenue_at_risk) / 1000);
    return {
      illustrative: true,
      label: 'Illustrative Demo Data',
      what:
        incidents > 0
          ? `${incidents} active incidents with ${latest.open_alerts} open alerts across the banking estate`
          : `Availability ${Number(latest.availability).toFixed(2)}% — estate within executive thresholds`,
      why: topRisk?.summary
        ? `Primary pressure: ${topRisk.summary} (${topRisk.severity})`
        : 'Board confidence depends on service continuity and controlled change velocity.',
      impact: `≈ ₹${revenueK}K/hr revenue at risk · compliance ${Number(latest.compliance_score).toFixed(0)}/100 · availability ${Number(latest.availability).toFixed(2)}%`,
      owner: 'Payments Platform · Security Operations',
      next: 'Review critical paths, then clear high-severity CMDB Drift before the next CAB.',
      nextHref: '/cmdb/drift',
      aiConfidence: 88,
    };
  }

  async getRecommendations(tenantId: string): Promise<RecommendationsPayload> {
    const latest = await queryOne<{
      revenue_at_risk: string;
      active_incidents: number;
      open_alerts: number;
      availability: string;
    }>(
      `SELECT revenue_at_risk, active_incidents, open_alerts, availability
       FROM ede_executive_daily WHERE tenant_id=$1 ORDER BY day DESC LIMIT 1`,
      [tenantId],
    ).catch(() => null);

    const drifts = await query<{ summary: string | null; severity: string }>(
      `SELECT summary, severity FROM drift_events
       WHERE tenant_id=$1 AND resolved_at IS NULL
       ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END
       LIMIT 3`,
      [tenantId],
    ).catch(() => []);

    const items: RecommendationWidget[] = [
      {
        id: 'rec-revenue',
        title: 'Revenue is at risk on payment rails',
        reason: latest
          ? `≈ ₹${Math.round(Number(latest.revenue_at_risk) / 1000)}K/hr exposed while ${latest.active_incidents} incidents remain open.`
          : 'Load demo data to quantify payment-rail revenue exposure.',
        href: '/banking360',
        action: 'Open Banking360',
        owner: 'Payments Platform',
        confidence: 82,
      },
      {
        id: 'rec-drift',
        title: drifts[0]?.summary?.toLowerCase().includes('cert')
          ? 'Certificate change requires approval'
          : 'Clear high-severity configuration drift',
        reason: drifts[0]?.summary
          ? `${drifts[0].summary} — ${drifts[0].severity} severity still unresolved.`
          : 'Unauthorized firewall, cert, and IAM changes should clear before CAB.',
        href: '/cmdb/drift',
        action: 'Review CMDB Drift',
        owner: 'Security Operations',
        confidence: 85,
      },
      {
        id: 'rec-twin',
        title: 'Validate dependency path in Digital Twin',
        reason: latest
          ? `Availability ${Number(latest.availability).toFixed(2)}% with ${latest.open_alerts} alerts — confirm blast radius.`
          : 'Use Digital Twin to walk dependency impact before peak hours.',
        href: '/twin',
        action: 'Open Digital Twin',
        owner: 'Platform Reliability',
        confidence: 78,
      },
      {
        id: 'rec-report',
        title: 'Prepare board-ready executive summary',
        reason: 'Package availability, revenue-at-risk, and open risks into a QBR-ready report.',
        href: '/reports',
        action: 'Generate executive report',
        owner: 'CIO Office',
        confidence: 90,
      },
    ];

    return {
      illustrative: Boolean(latest),
      label: latest ? 'Illustrative Demo Data' : undefined,
      items,
    };
  }

  composeDashboard(input: DashboardComposeInput): ExecutiveDashboardPayload {
    const { kpis, trends, services, risks, narrative, recommendations, estateStats, role, incidents } = input;
    const availabilitySpark = trends.series.map((p) => p.availability ?? 99.9).filter(Number.isFinite);
    const incidentSpark = trends.series.map((p) => p.activeIncidents ?? 0).filter(Number.isFinite);
    const mttrSpark = trends.series.map((p) => p.mttrMinutes ?? 0).filter(Number.isFinite);
    const latestMttr = mttrSpark.length ? mttrSpark[mttrSpark.length - 1] : null;
    const avgHealth = estateStats?.avgHealth ?? Math.round(kpis.availability);
    const atRisk = estateStats?.atRiskAssets ?? Math.max(1, Math.round((kpis.totalAssets || 1) * 0.04));
    const overall = this.rules.overallHealth(kpis.availability, kpis.activeIncidents);

    // Business outcomes first — Phase 3 Executive Dashboard Rule
    const health: HealthWidget[] = [
      {
        id: 'health.business',
        title: 'Business Health',
        category: 'health',
        score: `₹${(kpis.revenueAtRisk / 1000).toFixed(0)}K/hr`,
        trend: 'Revenue at risk · business services',
        status: this.rules.revenueAtRiskStatus(kpis.revenueAtRisk),
        drilldown: { href: '/transactions', label: 'Business Services' },
        metadata: { refreshIntervalSec: 60, position: 1 },
      },
      {
        id: 'health.revenue',
        title: 'Revenue At Risk',
        category: 'health',
        score: `₹${(kpis.revenueAtRisk / 1000).toFixed(0)}K/hr`,
        trend: 'Banking journey exposure',
        status: this.rules.revenueAtRiskStatus(kpis.revenueAtRisk),
        drilldown: { href: '/banking360', label: 'Banking360' },
        metadata: { refreshIntervalSec: 60, roles: ['cio', 'admin'], position: 2 },
      },
      {
        id: 'health.alerts',
        title: 'What is broken',
        category: 'health',
        score: String(kpis.openAlerts),
        trend: `${kpis.activeIncidents} active incidents`,
        status: this.rules.alertStatus(kpis.openAlerts),
        sparkline: incidentSpark.length > 1 ? incidentSpark : undefined,
        drilldown: { href: '/ops-intelligence', label: 'Incident Queue' },
        metadata: { refreshIntervalSec: 30, position: 3 },
      },
      {
        id: 'health.overall',
        title: 'Overall Health',
        category: 'health',
        score: overall.label,
        trend: `${kpis.availability.toFixed(2)}% availability`,
        status: overall.status,
        sparkline: availabilitySpark.length > 1 ? availabilitySpark : undefined,
        drilldown: { href: '/observability/infrastructure', label: 'Infrastructure' },
        metadata: { refreshIntervalSec: 60, roles: ['cio', 'admin', 'noc'], position: 4, size: 'md' },
      },
      {
        id: 'health.availability',
        title: 'Availability',
        category: 'health',
        score: `${kpis.availability.toFixed(2)}%`,
        unit: '%',
        trend: 'Service continuity',
        status: this.rules.availabilityStatus(kpis.availability),
        sparkline: availabilitySpark.length > 1 ? availabilitySpark : undefined,
        drilldown: { href: '/observability', label: 'Observability' },
        metadata: { refreshIntervalSec: 60, position: 5 },
      },
      {
        id: 'health.security',
        title: 'Security Score',
        category: 'health',
        score: kpis.securityPosture.toUpperCase(),
        trend: 'Enterprise security posture',
        status: this.rules.postureStatus(kpis.securityPosture),
        drilldown: { href: '/security', label: 'Security Operations' },
        metadata: { refreshIntervalSec: 60, roles: ['ciso', 'soc'], position: 6 },
      },
      {
        id: 'health.compliance',
        title: 'Compliance Score',
        category: 'health',
        score: `${kpis.complianceScore}/100`,
        trend: 'Control posture',
        status: this.rules.complianceStatus(kpis.complianceScore),
        drilldown: { href: '/compliance', label: 'Compliance Workspace' },
        metadata: { refreshIntervalSec: 120, roles: ['ciso', 'auditor'], position: 7 },
      },
      {
        id: 'health.mttr',
        title: 'MTTR',
        category: 'health',
        score: latestMttr != null ? `${Math.round(latestMttr)}m` : '—',
        unit: 'min',
        trend: 'Mean time to restore',
        status: this.rules.mttrStatus(latestMttr),
        sparkline: mttrSpark.length > 1 ? mttrSpark : undefined,
        drilldown: { href: '/itsm', label: 'ITSM' },
        metadata: { refreshIntervalSec: 60, position: 8 },
      },
      {
        id: 'health.network',
        title: 'Network Health',
        category: 'health',
        score: this.typeCount(estateStats, ['network_device', 'network']) > 0 ? `${avgHealth}%` : '—',
        trend:
          this.typeCount(estateStats, ['network_device', 'network']) > 0
            ? `${this.typeCount(estateStats, ['network_device', 'network'])} devices`
            : 'Awaiting inventory',
        status: this.rules.domainHealth(
          this.typeCount(estateStats, ['network_device', 'network']),
          avgHealth,
          atRisk,
        ),
        drilldown: { href: '/network', label: 'Network Operations' },
        metadata: { refreshIntervalSec: 90, roles: ['noc'], position: 9 },
      },
    ];

    const operationalSummary = this.buildDomainWidgets(kpis, services, estateStats, avgHealth, atRisk);
    const securityCounts = this.rules.securityCounts(kpis.openAlerts, kpis.activeIncidents);

    const securityWidget: SecurityWidget = {
      id: 'insights.security',
      title: 'Security Posture',
      category: 'assure',
      posture: kpis.securityPosture,
      critical: securityCounts.critical,
      warning: securityCounts.warning,
      healthy: securityCounts.healthy,
      status: this.rules.postureStatus(kpis.securityPosture),
      trend: `${kpis.openAlerts} open alerts`,
      action: { href: '/security', label: 'Open Security' },
      metadata: { refreshIntervalSec: 60, roles: ['ciso', 'soc'], position: 10 },
    };

    const complianceWidget: ComplianceWidget = {
      id: 'insights.compliance',
      title: 'Compliance Posture',
      category: 'assure',
      score: kpis.complianceScore,
      trend: 'Active framework controls',
      status: this.rules.complianceStatus(kpis.complianceScore),
      drilldown: { href: '/compliance', label: 'Compliance workspace' },
      metadata: { refreshIntervalSec: 120, roles: ['ciso', 'auditor'], position: 11 },
    };

    const degraded = services.filter((s) => s.status !== 'healthy');
    const affectedServices = (degraded.length ? degraded : services.slice(0, 5)).map((s) => ({
      id: s.id,
      name: s.name,
      tier: s.tier,
      availability: s.availability,
      slaTarget: s.slaTarget,
      status: s.status,
      owner: s.owner,
      href: `/twin?workflow=impact&focus=${encodeURIComponent(s.id)}&name=${encodeURIComponent(s.name)}`,
    }));

    const recentIncidents: IncidentWidget[] =
      incidents && incidents.length > 0
        ? incidents.map((inc, i) => ({
            ...inc,
            affectedService:
              inc.affectedService ||
              affectedServices[i % Math.max(affectedServices.length, 1)]?.name ||
              'Enterprise services',
            owner: inc.owner || affectedServices[i % Math.max(affectedServices.length, 1)]?.owner,
          }))
        : [];

    const trendsWidget: TrendWidget = {
      id: 'trends.executive',
      title: '30-Day Executive Trends',
      category: 'trend',
      status: trends.series.length ? 'healthy' : 'unknown',
      series: trends.series,
      metrics: ['availability', 'slaCompliance', 'mttrMinutes', 'activeIncidents'],
      metadata: { refreshIntervalSec: 120, size: 'lg', position: 20 },
    };

    const charts: ChartWidget[] = [
      {
        id: 'chart.availability',
        title: 'Availability Trend',
        category: 'chart',
        chartType: 'line',
        status: trends.series.length ? 'healthy' : 'unknown',
        series: [
          {
            name: 'Availability',
            data: trends.series.map((p) => ({ x: p.day.slice(5) || p.day, y: p.availability ?? 0 })),
          },
        ],
        metadata: { refreshIntervalSec: 120, position: 21 },
      },
      {
        id: 'chart.incidents',
        title: 'Active Incidents',
        category: 'chart',
        chartType: 'bar',
        status: trends.series.length ? 'healthy' : 'unknown',
        series: [
          {
            name: 'Incidents',
            data: trends.series.map((p) => ({ x: p.day.slice(5) || p.day, y: p.activeIncidents ?? 0 })),
          },
        ],
        metadata: { refreshIntervalSec: 120, position: 22 },
      },
    ];

    const tables: TableWidget[] = [
      {
        id: 'table.services',
        title: 'Business Service Health',
        category: 'observe',
        status: services.some((s) => s.status === 'at_risk')
          ? 'critical'
          : services.some((s) => s.status === 'degraded')
            ? 'degraded'
            : 'healthy',
        columns: [
          { key: 'name', label: 'Service' },
          { key: 'status', label: 'Status' },
          { key: 'availability', label: 'Availability' },
          { key: 'owner', label: 'Owner' },
        ],
        rows: affectedServices.map((s) => ({ ...s })),
        drilldown: { href: '/transactions', label: 'View journeys' },
        metadata: { refreshIntervalSec: 60, position: 12 },
      },
    ];

    const recommendedActions: ActionWidget[] = [
      ...recommendations.items.map((r, i) => ({
        id: r.id ?? `action-${i}`,
        title: r.title,
        description: r.reason,
        href: r.href,
        cta: r.action,
        category: 'action' as const,
        priority: i + 1,
      })),
      {
        id: 'action-open-incident',
        title: 'Open incident',
        description: 'Correlate alerts into an incident and open the investigation workspace.',
        href: '/ops-intelligence?workflow=create-incident',
        cta: 'Create & investigate',
        category: 'action',
        priority: 8,
      },
      {
        id: 'action-generate-report',
        title: 'Generate executive report',
        description: 'Create a board-ready report and download export artifacts.',
        href: '/reports?workflow=generate&type=executive_summary',
        cta: 'Generate & export',
        category: 'action',
        priority: 9,
      },
      {
        id: 'action-run-automation',
        title: 'Run automation',
        description: 'Open the automation catalog and execute a remediation workflow.',
        href: '/admin/workflows?workflow=run',
        cta: 'Open catalog',
        category: 'action',
        priority: 10,
      },
      {
        id: 'action-twin',
        title: 'Digital Twin',
        description: 'Impact simulation across dependencies and blast radius.',
        href: '/twin?workflow=impact',
        cta: 'Simulate impact',
        category: 'action',
        priority: 11,
      },
      {
        id: 'action-drift',
        title: 'CMDB Drift',
        description: 'Compare drifted configuration, affected assets, and change history.',
        href: '/cmdb/drift',
        cta: 'Review drift',
        category: 'action',
        priority: 12,
      },
      {
        id: 'action-investigate',
        title: 'Investigate',
        description: 'Open Ops Intelligence on active incidents and alert pressure.',
        href: '/ops-intelligence',
        cta: 'Investigate now',
        category: 'action',
        priority: 13,
      },
      {
        id: 'action-topology',
        title: 'View topology',
        description: 'See dependency paths and blast radius across the estate.',
        href: '/topology',
        cta: 'Open Topology',
        category: 'action',
        priority: 14,
      },
    ];

    return {
      narrative,
      kpis,
      health: this.filterWidgetsByRole(health, role),
      operationalSummary: this.filterWidgetsByRole(operationalSummary, role),
      insights: {
        topRisks: risks.slice(0, 8),
        affectedServices,
        aiRecommendations: recommendations.items,
        recentIncidents,
        security: securityWidget,
        compliance: complianceWidget,
      },
      recommendedActions,
      trends: trendsWidget,
      charts: this.filterWidgetsByRole(charts, role),
      tables: this.filterWidgetsByRole(tables, role),
      role,
    };
  }

  private buildDomainWidgets(
    kpis: KpiPayload,
    services: ServiceRow[],
    stats: CmdbStatsPayload | null,
    avgHealth: number,
    atRisk: number,
  ): DomainWidget[] {
    const domains: Array<{ id: string; title: string; types: string[]; href: string; summary: string }> = [
      { id: 'domain.infrastructure', title: 'Infrastructure', types: ['server', 'host'], href: '/observability/infrastructure', summary: 'Servers and hosts across the estate' },
      { id: 'domain.applications', title: 'Applications', types: ['application', 'app'], href: '/observability/applications', summary: 'Application health and dependency context' },
      { id: 'domain.services', title: 'Services', types: ['business_service', 'service'], href: '/transactions', summary: 'Business service continuity and SLA' },
      { id: 'domain.cloud', title: 'Cloud', types: ['cloud_resource', 'cloud'], href: '/discovery', summary: 'Cloud resources discovered in inventory' },
      { id: 'domain.databases', title: 'Databases', types: ['database', 'db'], href: '/observability/databases', summary: 'Data stores supporting critical journeys' },
      { id: 'domain.containers', title: 'Containers', types: ['kubernetes', 'container', 'k8s'], href: '/observability/kubernetes', summary: 'Clusters and containerized workloads' },
      { id: 'domain.network', title: 'Network', types: ['network_device', 'network'], href: '/network', summary: 'Devices and path health for critical routes' },
      { id: 'domain.security', title: 'Security', types: [], href: '/security', summary: `Posture ${kpis.securityPosture} · open alert pressure` },
      { id: 'domain.compliance', title: 'Compliance', types: [], href: '/compliance', summary: 'Control posture across active frameworks' },
    ];

    return domains.map((d) => {
      const count =
        d.title === 'Services'
          ? services.length || this.typeCount(stats, d.types)
          : d.title === 'Security'
            ? kpis.openAlerts
            : d.title === 'Compliance'
              ? kpis.complianceScore
              : this.typeCount(stats, d.types);

      let status = this.rules.domainHealth(count, avgHealth, atRisk);
      if (d.title === 'Security') status = this.rules.postureStatus(kpis.securityPosture);
      if (d.title === 'Compliance') status = this.rules.complianceStatus(kpis.complianceScore);
      if (d.title === 'Services' && services.length) {
        status = services.some((s) => s.status === 'at_risk')
          ? 'critical'
          : services.some((s) => s.status === 'degraded')
            ? 'degraded'
            : 'healthy';
      }

      const countLabel =
        d.title === 'Compliance'
          ? `Score ${count}/100`
          : d.title === 'Security'
            ? `${count} open alerts`
            : count
              ? `${Number(count).toLocaleString()} in inventory`
              : 'Awaiting inventory';

      return {
        id: d.id,
        title: d.title,
        category: d.title === 'Security' || d.title === 'Compliance' ? 'assure' : d.title === 'Services' ? 'observe' : 'estate',
        summary: d.summary,
        status,
        count: typeof count === 'number' ? count : undefined,
        countLabel,
        drilldown: { href: d.href, label: `Open ${d.title}` },
        metadata: { refreshIntervalSec: 90, position: 30 },
      } as DomainWidget;
    });
  }

  private typeCount(stats: CmdbStatsPayload | null, types: string[]): number {
    if (!stats?.byType?.length || !types.length) return 0;
    return stats.byType.filter((t) => types.includes(t.type)).reduce((sum, t) => sum + (t.count || 0), 0);
  }

  private filterWidgetsByRole<T extends { metadata?: { roles?: string[] } }>(widgets: T[], role?: string): T[] {
    if (!role) return widgets;
    return widgets.filter((w) => {
      const roles = w.metadata?.roles;
      if (!roles?.length) return true;
      return roles.includes(role) || roles.includes('admin') || role === 'admin' || role === 'cio';
    });
  }
}
