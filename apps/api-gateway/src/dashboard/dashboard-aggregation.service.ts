import { Injectable } from '@nestjs/common';
import type { ExecutiveDashboardPayload } from '@opsedge360/shared-types';
import { DashboardCacheService } from './dashboard-cache.service';
import { ExecutiveDataService } from './executive-data.service';
import { EstateService } from './estate.service';
import { ObserveService } from './observe.service';
import { ComplianceService } from './compliance.service';
import { SecurityService } from './security.service';
import { NetworkService } from './network.service';
import { AiInsightService } from './ai-insight.service';
import { WidgetRegistryService } from './widget-registry.service';

/**
 * Orchestrates domain services only — no business rules.
 * All calculations live in ExecutiveDataService + DashboardRulesService.
 */
@Injectable()
export class DashboardAggregationService {
  constructor(
    private readonly cache: DashboardCacheService,
    private readonly executiveData: ExecutiveDataService,
    private readonly estate: EstateService,
    private readonly observe: ObserveService,
    private readonly compliance: ComplianceService,
    private readonly security: SecurityService,
    private readonly network: NetworkService,
    private readonly aiInsight: AiInsightService,
    private readonly widgetRegistry: WidgetRegistryService,
  ) {}

  async getExecutiveDashboard(
    tenantId: string,
    role?: string,
  ): Promise<{ payload: ExecutiveDashboardPayload; cacheHit: boolean; registryVersion: string }> {
    const { value, cacheHit } = await this.cache.getOrSet(
      tenantId,
      'dashboard',
      `executive${role ? `:${role}` : ''}`,
      async () => this.compose(tenantId, role),
    );
    return { payload: value, cacheHit, registryVersion: this.widgetRegistry.getVersion() };
  }

  private async compose(tenantId: string, role?: string): Promise<ExecutiveDashboardPayload> {
    const [kpis, trends, services, risks, narrative, recommendations, estateStats, complianceScore, incidents] =
      await Promise.all([
        this.executiveData.getKpis(tenantId),
        this.executiveData.getTrends(tenantId),
        this.observe.getServices(tenantId),
        this.executiveData.getRisks(tenantId),
        this.aiInsight.getNarrative(tenantId),
        this.aiInsight.getRecommendations(tenantId),
        this.estate.getStats(tenantId),
        this.compliance.getScore(tenantId),
        this.executiveData.getRecentIncidents(tenantId, 5),
      ]);

    if (complianceScore != null && complianceScore > 0) {
      kpis.complianceScore = complianceScore;
    }

    if (incidents.length > 0) {
      kpis.activeIncidents = Math.max(kpis.activeIncidents, incidents.length);
    }

    const avgHealth = estateStats?.avgHealth ?? Math.round(kpis.availability);
    const atRisk = estateStats?.atRiskAssets ?? Math.max(1, Math.round((kpis.totalAssets || 1) * 0.04));

    // Domain services produce summaries used during composition (side-effect free telemetry hooks)
    this.security.summarize(kpis);
    this.network.summarize(estateStats, avgHealth, atRisk);

    return this.executiveData.composeDashboard({
      kpis,
      trends,
      services,
      risks,
      narrative,
      recommendations,
      estateStats,
      role,
      incidents,
    });
  }
}
