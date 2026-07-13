import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { ExecutiveKpis } from '@opsedge360/shared-types';
import { CurrentUser } from './auth/current-user.decorator';
import { CurrentTenant } from './auth/current-tenant.decorator';
import type { JwtPayload } from './auth/auth.service';
import type { TenantContext } from './auth/authorization.guard';
import { resolveTenantId } from '@opsedge360/shared-db';
import { ExecutiveDataService } from './dashboard/executive-data.service';
import { DashboardCacheService } from './dashboard/dashboard-cache.service';

@ApiTags('executive')
@ApiBearerAuth()
@Controller('executive')
export class ExecutiveController {
  constructor(
    private readonly executiveData: ExecutiveDataService,
    private readonly cache: DashboardCacheService,
  ) {}

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
    const { value } = await this.cache.getOrSet(tid, 'executive', 'kpis', () => this.executiveData.getKpis(tid));
    return value;
  }

  @Get('services')
  @ApiOperation({ summary: 'Business service health summary' })
  async getServices(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    const tid = await this.tenantUuid(user, tenant);
    return this.executiveData.getServices(tid);
  }

  @Get('risks')
  @ApiOperation({ summary: 'Top enterprise risks' })
  async getRisks(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    const tid = await this.tenantUuid(user, tenant);
    return this.executiveData.getRisks(tid);
  }

  @Get('trends')
  @ApiOperation({ summary: '30-day executive trends (availability, SLA, MTTR, incidents)' })
  async getTrends(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    const tid = await this.tenantUuid(user, tenant);
    return this.executiveData.getTrends(tid);
  }

  @Get('narrative')
  @ApiOperation({ summary: 'Executive narrative brief driven by demo or live signals' })
  async getNarrative(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    const tid = await this.tenantUuid(user, tenant);
    return this.executiveData.getNarrative(tid);
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Proactive executive recommendations for board brief' })
  async getRecommendations(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    const tid = await this.tenantUuid(user, tenant);
    return this.executiveData.getRecommendations(tid);
  }
}
