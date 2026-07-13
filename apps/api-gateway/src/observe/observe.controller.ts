import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';
import { ObserveFacadeService } from './observe-facade.service';
import type { ObserveDomain } from './observe.types';

@ApiTags('observe')
@ApiBearerAuth()
@Controller('observe')
export class ObserveController {
  constructor(private readonly observe: ObserveFacadeService) {}

  private tid(user: JwtPayload, tenant?: TenantContext) {
    return tenant?.id ?? user.tenantId;
  }

  @Get('overview')
  @ApiOperation({ summary: 'Unified Observability overview (OpsEdge360 branded)' })
  overview(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    return this.observe.getOverview(this.tid(user, tenant));
  }

  @Get('applications')
  @ApiOperation({ summary: 'Application inventory and health' })
  applications(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    return this.listDomain(user, tenant, 'applications');
  }

  @Get('infrastructure')
  @ApiOperation({ summary: 'Infrastructure inventory and health' })
  infrastructure(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    return this.listDomain(user, tenant, 'infrastructure');
  }

  @Get('kubernetes')
  @ApiOperation({ summary: 'Kubernetes clusters, namespaces, workloads' })
  kubernetes(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    return this.listDomain(user, tenant, 'kubernetes');
  }

  @Get('containers')
  @ApiOperation({ summary: 'Container inventory and health' })
  containers(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    return this.listDomain(user, tenant, 'containers');
  }

  @Get('databases')
  @ApiOperation({ summary: 'Database inventory, health, performance' })
  databases(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    return this.listDomain(user, tenant, 'databases');
  }

  @Get('logs')
  @ApiOperation({ summary: 'Enterprise log explorer' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'service', required: false })
  @ApiQuery({ name: 'hours', required: false })
  @ApiQuery({ name: 'limit', required: false })
  logs(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
    @Query('q') q?: string,
    @Query('severity') severity?: string,
    @Query('service') service?: string,
    @Query('hours') hours?: string,
    @Query('limit') limit?: string,
  ) {
    return this.observe.searchLogs(this.tid(user, tenant), {
      q,
      severity,
      service,
      hours: hours ? Number(hours) : undefined,
      limit: limit ? Number(limit) : 100,
    });
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Infrastructure, application, and business metrics' })
  @ApiQuery({ name: 'service', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'hours', required: false })
  @ApiQuery({ name: 'limit', required: false })
  metrics(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
    @Query('service') service?: string,
    @Query('category') category?: string,
    @Query('hours') hours?: string,
    @Query('limit') limit?: string,
  ) {
    return this.observe.listMetrics(this.tid(user, tenant), {
      service,
      category,
      hours: hours ? Number(hours) : undefined,
      limit: limit ? Number(limit) : 100,
    });
  }

  @Get('traces')
  @ApiOperation({ summary: 'Distributed traces' })
  @ApiQuery({ name: 'hours', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async traces(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
    @Query('hours') hours?: string,
    @Query('limit') limit?: string,
  ) {
    const items = await this.observe.listTraces(this.tid(user, tenant), {
      hours: hours ? Number(hours) : undefined,
      limit: limit ? Number(limit) : 50,
    });
    return { items, brand: 'OpsEdge360' };
  }

  @Get('traces/:traceId')
  @ApiOperation({ summary: 'Trace detail with span waterfall' })
  async traceDetail(
    @CurrentUser() user: JwtPayload,
    @Param('traceId') traceId: string,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const detail = await this.observe.getTrace(this.tid(user, tenant), traceId);
    return detail ?? { traceId, spans: [], source: 'live' };
  }

  @Get('topology')
  @ApiOperation({ summary: 'Service / dependency topology with health' })
  @ApiQuery({ name: 'hours', required: false })
  topology(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
    @Query('hours') hours?: string,
  ) {
    return this.observe.getTopology(this.tid(user, tenant), hours ? Number(hours) : 1);
  }

  @Post('ai/explain')
  @ApiOperation({ summary: 'AI investigation context for an observability entity' })
  explain(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
    @Body() body?: { kind?: string; id?: string; name?: string; prompt?: string },
  ) {
    return this.observe.explainContext(this.tid(user, tenant), {
      kind: body?.kind || 'entity',
      id: body?.id,
      name: body?.name,
      prompt: body?.prompt,
    });
  }

  @Post('demo/seed')
  @ApiOperation({ summary: 'Load Unified Observability demo telemetry (Banking360/Retail360/K8s)' })
  seed(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    return this.observe.seedDemoTelemetry(this.tid(user, tenant));
  }

  private async listDomain(user: JwtPayload, tenant: TenantContext | undefined, domain: ObserveDomain) {
    const items = await this.observe.listEntities(this.tid(user, tenant), domain);
    return {
      brand: 'OpsEdge360',
      domain,
      asOf: new Date().toISOString(),
      items,
      count: items.length,
    };
  }
}
