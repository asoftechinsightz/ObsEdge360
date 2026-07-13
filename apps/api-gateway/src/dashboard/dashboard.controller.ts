import { Controller, Get, Headers, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { randomUUID } from 'crypto';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';
import { resolveTenantId } from '@opsedge360/shared-db';
import { DashboardAggregationService } from './dashboard-aggregation.service';
import { buildApiEnvelope } from './api-envelope.util';
import { WidgetRegistryService } from './widget-registry.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly aggregation: DashboardAggregationService,
    private readonly widgetRegistry: WidgetRegistryService,
  ) {}

  private async tenantUuid(user: JwtPayload, tenant?: TenantContext): Promise<string> {
    if (tenant?.id) return tenant.id;
    return resolveTenantId(user.tenantId);
  }

  @Get('executive')
  @ApiOperation({ summary: 'Aggregated executive dashboard — single payload for Enterprise Home' })
  @ApiQuery({ name: 'role', required: false, description: 'Role composition hint (cio, ciso, noc, soc)' })
  async getExecutive(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Query('role') role: string | undefined,
    @Headers('x-request-id') requestIdHeader: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const effectiveRole = role ?? user.role ?? 'cio';
    const { payload, cacheHit, registryVersion } = await this.aggregation.getExecutiveDashboard(tid, effectiveRole);

    res.setHeader('X-API-Version', 'v1');
    res.setHeader('Deprecation', 'false');

    const dataMode = payload.kpis.illustrative ? 'illustrative' : 'live';

    return buildApiEnvelope({
      data: payload,
      tenantId: tid,
      requestId: requestIdHeader ?? randomUUID(),
      metadata: {
        generatedAt: new Date().toISOString(),
        cacheHit,
        cacheTtlSec: 60,
        dataMode,
        label: payload.kpis.label,
        coverageLabel: payload.kpis.coverageLabel,
        refreshIntervalSec: 60,
        role: effectiveRole,
        widgetRegistryVersion: registryVersion,
      },
    });
  }

  @Get('widgets/registry')
  @ApiOperation({ summary: 'Widget registry metadata for configuration-driven dashboards' })
  @ApiQuery({ name: 'role', required: false })
  getWidgetRegistry(@Query('role') role: string | undefined, @Headers('x-request-id') requestIdHeader: string | undefined) {
    return buildApiEnvelope({
      data: {
        version: this.widgetRegistry.getVersion(),
        widgets: this.widgetRegistry.getForRole(role),
      },
      requestId: requestIdHeader ?? randomUUID(),
      metadata: { generatedAt: new Date().toISOString() },
    });
  }
}
