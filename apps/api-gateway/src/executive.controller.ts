import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { ExecutiveKpis } from '@opsedge360/shared-types';
import { ProxyService } from './proxy.service';
import { CacheService } from './cache/cache.service';
import { CurrentUser } from './auth/current-user.decorator';
import { CurrentTenant } from './auth/current-tenant.decorator';
import type { JwtPayload } from './auth/auth.service';
import type { TenantContext } from './auth/authorization.guard';
import { query, queryOne, resolveTenantId } from '@opsedge360/shared-db';

@ApiTags('executive')
@ApiBearerAuth()
@Controller('executive')
export class ExecutiveController {
  constructor(private proxy: ProxyService, private cache: CacheService) {}

  private async tenantUuid(user: JwtPayload, tenant?: TenantContext): Promise<string> {
    if (tenant?.id) return tenant.id;
    return resolveTenantId(user.tenantId);
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Executive dashboard KPIs' })
  async getKpis(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
  ): Promise<ExecutiveKpis & { illustrative?: boolean; label?: string; coverageLabel?: string }> {
    const tid = await this.tenantUuid(user, tenant);
    return this.cache.getOrSet(tid, 'executive', 'kpis', async () => {
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
        [tid],
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
        [tid],
      ).catch(() => null);

      let totalAssets = 0;
      try {
        const statsRes = await this.proxy.cmdb('/stats', { tenantId: tid });
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
          securityPosture: 'medium' as const,
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
          this.proxy.cmdb('/stats', { tenantId: tid }),
          this.proxy.compliance('/score', { tenantId: tid }),
        ]);
        const stats = statsRes.data as { totalAssets?: number; avgHealth?: number; openAlerts?: number };
        const compliance = complianceRes.data as { overallScore?: number };
        return {
          availability: stats.avgHealth ? Number(((stats.avgHealth / 100) * 99.99).toFixed(2)) : 99.94,
          revenueAtRisk: 240000,
          complianceScore: compliance.overallScore ?? 87,
          securityPosture: 'medium' as const,
          sustainabilityScore: 72,
          activeIncidents: Math.min(stats.openAlerts ?? 0, 10),
          totalAssets: stats.totalAssets ?? totalAssets,
          openAlerts: stats.openAlerts ?? 0,
          coverageLabel,
        };
      } catch {
        return {
          availability: 99.97,
          revenueAtRisk: 180000,
          complianceScore: 94,
          securityPosture: 'medium' as const,
          sustainabilityScore: 82,
          activeIncidents: 2,
          totalAssets: totalAssets || 3502,
          openAlerts: 14,
          illustrative: true,
          label: 'Illustrative Demo Data',
          coverageLabel: coverageLabel || 'Illustrative enterprise estate',
        };
      }
    });
  }

  @Get('services')
  @ApiOperation({ summary: 'Business service health summary' })
  async getServices(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    const tid = await this.tenantUuid(user, tenant);
    const rows = await query<{
      id: string;
      name: string;
      tier: number;
      sla_target: string;
      revenue_per_hour: string;
    }>(
      `SELECT id, name, tier, sla_target::text, revenue_per_hour::text
       FROM business_services WHERE tenant_id=$1 ORDER BY tier ASC, name ASC LIMIT 40`,
      [tid],
    ).catch(() => []);

    if (rows.length) {
      return rows.map((r, i) => {
        const sla = Number(r.sla_target);
        const availability = Number((sla - (i % 5 === 0 ? 0.08 : i % 3 === 0 ? 0.03 : -0.02)).toFixed(2));
        const status =
          availability >= sla ? 'healthy' : availability >= sla - 0.05 ? 'degraded' : 'at_risk';
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
      {
        id: '1',
        name: 'UPI Payments',
        tier: 1,
        availability: 99.98,
        slaTarget: 99.95,
        status: 'healthy',
        owner: 'Payments Platform',
        illustrative: true,
        label: 'Illustrative Demo Data',
      },
      {
        id: '2',
        name: 'Digital Banking',
        tier: 1,
        availability: 99.92,
        slaTarget: 99.9,
        status: 'degraded',
        owner: 'Digital Channels',
        illustrative: true,
        label: 'Illustrative Demo Data',
      },
      {
        id: '3',
        name: 'Loan Processing',
        tier: 2,
        availability: 99.99,
        slaTarget: 99.5,
        status: 'healthy',
        owner: 'Lending Ops',
        illustrative: true,
        label: 'Illustrative Demo Data',
      },
      {
        id: '4',
        name: 'Merchant Payments',
        tier: 1,
        availability: 99.87,
        slaTarget: 99.95,
        status: 'at_risk',
        owner: 'Payments Platform',
        illustrative: true,
        label: 'Illustrative Demo Data',
      },
      {
        id: '5',
        name: 'Core Banking',
        tier: 1,
        availability: 99.96,
        slaTarget: 99.99,
        status: 'healthy',
        owner: 'Core Banking Ops',
        illustrative: true,
        label: 'Illustrative Demo Data',
      },
    ];
  }

  @Get('risks')
  @ApiOperation({ summary: 'Top enterprise risks' })
  async getRisks(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    const tid = await this.tenantUuid(user, tenant);
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
      [tid],
    ).catch(() => []);

    if (drifts.length) {
      return drifts.map((d, i) => ({
        id: d.id,
        title: d.summary ?? 'Configuration drift',
        severity: d.severity,
        revenueAtRisk: d.severity === 'critical' ? 180000 : d.severity === 'high' ? 90000 : 25000,
        affectedService: String((d.details as { businessImpact?: string })?.businessImpact ?? 'Enterprise services'),
        recommendedAction: String(
          (d.details as { recommendedAction?: string })?.recommendedAction ?? 'Review in CMDB Drift',
        ),
        owner: i % 2 === 0 ? 'Platform Reliability' : 'Security Operations',
        illustrative: true,
        label: 'Illustrative Demo Data',
      }));
    }

    return [
      {
        id: '1',
        title: 'DB connection pool exhaustion',
        severity: 'high',
        revenueAtRisk: 120000,
        affectedService: 'UPI Payments',
        recommendedAction: 'Scale pool and review connection leaks in Payment Gateway',
        owner: 'Payments Platform',
        illustrative: true,
        label: 'Illustrative Demo Data',
      },
      {
        id: '2',
        title: 'Certificate expiry in 7 days',
        severity: 'medium',
        revenueAtRisk: 45000,
        affectedService: 'API Gateway',
        recommendedAction: 'Renew TLS certificate before customer cutoff',
        owner: 'Security Operations',
        illustrative: true,
        label: 'Illustrative Demo Data',
      },
      {
        id: '3',
        title: 'UPI latency elevated vs baseline',
        severity: 'medium',
        revenueAtRisk: 90000,
        affectedService: 'UPI Payments',
        recommendedAction: 'Open Banking360 rails and validate PG / CBS path',
        owner: 'Payments Platform',
        illustrative: true,
        label: 'Illustrative Demo Data',
      },
    ];
  }

  @Get('trends')
  @ApiOperation({ summary: '30-day executive trends (availability, SLA, MTTR, incidents)' })
  async getTrends(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    const tid = await this.tenantUuid(user, tenant);
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
      [tid],
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

  @Get('narrative')
  @ApiOperation({ summary: 'Executive narrative brief driven by demo or live signals' })
  async getNarrative(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    const tid = await this.tenantUuid(user, tenant);
    const latest = await queryOne<{
      availability: string;
      revenue_at_risk: string;
      active_incidents: number;
      compliance_score: string;
      open_alerts: number;
    }>(
      `SELECT availability, revenue_at_risk, active_incidents, compliance_score, open_alerts
       FROM ede_executive_daily WHERE tenant_id=$1 ORDER BY day DESC LIMIT 1`,
      [tid],
    ).catch(() => null);

    const topRisk = await queryOne<{ summary: string | null; severity: string }>(
      `SELECT summary, severity FROM drift_events
       WHERE tenant_id=$1 AND resolved_at IS NULL
       ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END, detected_at DESC
       LIMIT 1`,
      [tid],
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
        : 'Board confidence depends on UPI/CBS continuity and controlled change velocity.',
      impact: `≈ ₹${revenueK}K/hr revenue at risk · compliance ${Number(latest.compliance_score).toFixed(0)}/100 · availability ${Number(latest.availability).toFixed(2)}%`,
      owner: 'Payments Platform · Security Operations',
      next: 'Review UPI / CBS health, then clear high-severity CMDB Drift before the next CAB.',
      nextHref: '/cmdb/drift',
      aiConfidence: 88,
    };
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Proactive executive recommendations for board brief' })
  async getRecommendations(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    const tid = await this.tenantUuid(user, tenant);
    const latest = await queryOne<{
      revenue_at_risk: string;
      active_incidents: number;
      open_alerts: number;
      availability: string;
    }>(
      `SELECT revenue_at_risk, active_incidents, open_alerts, availability
       FROM ede_executive_daily WHERE tenant_id=$1 ORDER BY day DESC LIMIT 1`,
      [tid],
    ).catch(() => null);

    const drifts = await query<{ summary: string | null; severity: string }>(
      `SELECT summary, severity FROM drift_events
       WHERE tenant_id=$1 AND resolved_at IS NULL
       ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END
       LIMIT 3`,
      [tid],
    ).catch(() => []);

    const items = [
      {
        title: 'Revenue is at risk on payment rails',
        reason: latest
          ? `≈ ₹${Math.round(Number(latest.revenue_at_risk) / 1000)}K/hr exposed while ${latest.active_incidents} incidents remain open.`
          : 'Load demo data to quantify payment-rail revenue exposure.',
        href: '/banking360',
        action: 'Open Banking360',
        owner: 'Payments Platform',
      },
      {
        title: drifts[0]?.summary?.toLowerCase().includes('cert')
          ? 'Certificate change requires approval'
          : 'Clear high-severity configuration drift',
        reason: drifts[0]?.summary
          ? `${drifts[0].summary} — ${drifts[0].severity} severity still unresolved.`
          : 'Unauthorized firewall, cert, and IAM changes should clear before CAB.',
        href: '/cmdb/drift',
        action: 'Review CMDB Drift',
        owner: 'Security Operations',
      },
      {
        title: 'Validate UPI latency and CBS dependency path',
        reason: latest
          ? `Availability ${Number(latest.availability).toFixed(2)}% with ${latest.open_alerts} alerts — confirm blast radius in Digital Twin.`
          : 'Use Digital Twin to walk payment dependency impact before peak hours.',
        href: '/twin',
        action: 'Open Digital Twin',
        owner: 'Platform Reliability',
      },
      {
        title: 'Prepare board-ready executive summary',
        reason: 'Package availability, revenue-at-risk, and open risks into a QBR-ready report.',
        href: '/reports',
        action: 'Generate executive report',
        owner: 'CIO Office',
      },
    ];

    return {
      illustrative: Boolean(latest),
      label: latest ? 'Illustrative Demo Data' : undefined,
      items,
    };
  }
}
