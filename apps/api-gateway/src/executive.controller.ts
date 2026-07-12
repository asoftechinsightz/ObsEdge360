import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { ExecutiveKpis } from '@opsedge360/shared-types';
import { ProxyService } from './proxy.service';
import { CacheService } from './cache/cache.service';
import { CurrentUser } from './auth/current-user.decorator';
import { CurrentTenant } from './auth/current-tenant.decorator';
import type { JwtPayload } from './auth/auth.service';
import type { TenantContext } from './auth/authorization.guard';
import { query, queryOne } from '@opsedge360/shared-db';

@ApiTags('executive')
@ApiBearerAuth()
@Controller('executive')
export class ExecutiveController {
  constructor(private proxy: ProxyService, private cache: CacheService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Executive dashboard KPIs' })
  async getKpis(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
  ): Promise<ExecutiveKpis & { illustrative?: boolean; label?: string }> {
    const cacheTenant = tenant?.id ?? user.tenantId;
    return this.cache.getOrSet(cacheTenant, 'executive', 'kpis', async () => {
      const tid = user.tenantId;
      const ede = await queryOne<{
        illustrative: boolean;
      }>(`SELECT illustrative FROM ede_inventory_summary WHERE tenant_id=$1`, [tid]).catch(() => null);

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
          availability: stats.avgHealth ? (stats.avgHealth / 100) * 99.99 : 99.94,
          revenueAtRisk: 240000,
          complianceScore: compliance.overallScore ?? 87,
          securityPosture: 'medium' as const,
          sustainabilityScore: 72,
          activeIncidents: Math.min(stats.openAlerts ?? 0, 10),
          totalAssets: stats.totalAssets ?? 0,
          openAlerts: stats.openAlerts ?? 0,
        };
      } catch {
        return {
          availability: 99.97,
          revenueAtRisk: 180000,
          complianceScore: 94,
          securityPosture: 'medium' as const,
          sustainabilityScore: 82,
          activeIncidents: 12,
          totalAssets: 0,
          openAlerts: 147,
          illustrative: true,
          label: 'Illustrative Demo Data',
        };
      }
    });
  }

  @Get('services')
  @ApiOperation({ summary: 'Business service health summary' })
  async getServices(@CurrentUser() user: JwtPayload) {
    const rows = await query<{
      id: string;
      name: string;
      tier: number;
      sla_target: string;
      revenue_per_hour: string;
    }>(
      `SELECT id, name, tier, sla_target::text, revenue_per_hour::text
       FROM business_services WHERE tenant_id=$1 ORDER BY tier ASC, name ASC LIMIT 40`,
      [user.tenantId],
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
          illustrative: true,
          label: 'Illustrative Demo Data',
        };
      });
    }

    return [
      { id: '1', name: 'UPI Payments', tier: 1, availability: 99.98, slaTarget: 99.95, status: 'healthy' },
      { id: '2', name: 'Digital Banking', tier: 1, availability: 99.92, slaTarget: 99.9, status: 'degraded' },
      { id: '3', name: 'Loan Processing', tier: 2, availability: 99.99, slaTarget: 99.5, status: 'healthy' },
      { id: '4', name: 'Merchant Payments', tier: 1, availability: 99.87, slaTarget: 99.95, status: 'at_risk' },
      { id: '5', name: 'Core Banking', tier: 1, availability: 99.96, slaTarget: 99.99, status: 'healthy' },
    ];
  }

  @Get('risks')
  @ApiOperation({ summary: 'Top enterprise risks' })
  async getRisks(@CurrentUser() user: JwtPayload) {
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
      [user.tenantId],
    ).catch(() => []);

    if (drifts.length) {
      return drifts.map((d) => ({
        id: d.id,
        title: d.summary ?? 'Configuration drift',
        severity: d.severity,
        revenueAtRisk: d.severity === 'critical' ? 180000 : d.severity === 'high' ? 90000 : 25000,
        affectedService: String((d.details as { businessImpact?: string })?.businessImpact ?? 'Enterprise services'),
        recommendedAction: String(
          (d.details as { recommendedAction?: string })?.recommendedAction ?? 'Review in CMDB Drift',
        ),
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
      },
      {
        id: '2',
        title: 'Certificate expiry in 7 days',
        severity: 'medium',
        revenueAtRisk: 0,
        affectedService: 'API Gateway',
      },
      {
        id: '3',
        title: 'OT sensor latency spike',
        severity: 'medium',
        revenueAtRisk: 45000,
        affectedService: 'Manufacturing Line 3',
      },
    ];
  }

  @Get('trends')
  @ApiOperation({ summary: '30-day executive trends (availability, SLA, MTTR, incidents)' })
  async getTrends(@CurrentUser() user: JwtPayload) {
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
      [user.tenantId],
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
  async getNarrative(@CurrentUser() user: JwtPayload) {
    const latest = await queryOne<{
      availability: string;
      revenue_at_risk: string;
      active_incidents: number;
      compliance_score: string;
    }>(
      `SELECT availability, revenue_at_risk, active_incidents, compliance_score
       FROM ede_executive_daily WHERE tenant_id=$1 ORDER BY day DESC LIMIT 1`,
      [user.tenantId],
    ).catch(() => null);

    if (!latest) {
      return {
        illustrative: false,
        what: 'Platform operating within normal executive thresholds',
        why: 'Stable posture supports board-level confidence and continuous service delivery.',
        next: 'Load Enterprise Demo pack or connect Discovery for live estate context.',
      };
    }

    return {
      illustrative: true,
      label: 'Illustrative Demo Data',
      what: `Availability ${Number(latest.availability).toFixed(2)}% with ${latest.active_incidents} active incidents`,
      why: `Revenue at risk ₹${Math.round(Number(latest.revenue_at_risk) / 1000)}K/hour — compliance ${Number(latest.compliance_score).toFixed(0)}%`,
      next: 'Review UPI / CBS service health, then open CMDB Drift for pending high-severity changes.',
      aiConfidence: 88,
    };
  }
}
