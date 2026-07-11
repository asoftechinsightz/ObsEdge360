import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionIds } from '@opsedge360/shared-security';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';
import { Wave7Service } from './wave7.service';

@ApiTags('enterprise-certification')
@ApiBearerAuth()
@Controller('admin/system/certification')
export class Wave7Controller {
  constructor(private readonly wave7: Wave7Service) {}

  @Get()
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'Certification Center overview' })
  overview(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.wave7.overview(tenant?.id, user);
  }

  @Get('suites')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  suites(@CurrentUser() user: JwtPayload) {
    return this.wave7.listSuites(user);
  }

  @Get('runs')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listRuns(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Query('suite') suite?: string,
  ) {
    return this.wave7.listRuns(tenant?.id, user, suite);
  }

  @Get('runs/:id')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  getRun(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.wave7.getRun(user, id);
  }

  @Post('runs')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  startRun(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { suiteKey: string; runType?: string; environment?: Record<string, unknown>; notes?: string },
  ) {
    return this.wave7.startRun(tenant?.id, user, body);
  }

  @Put('runs/:id/complete')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  completeRun(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body()
    body: {
      status?: string;
      checks?: unknown[];
      metrics?: Record<string, unknown>;
      passed?: number;
      failed?: number;
      notes?: string;
    },
  ) {
    return this.wave7.completeRun(tenant?.id, user, id, body);
  }

  @Post('runs/:id/benchmarks')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  benchmarks(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { results: Array<Record<string, unknown>> },
  ) {
    return this.wave7.recordBenchmarks(tenant?.id, user, id, body);
  }

  @Post('runs/:id/load')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  load(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.wave7.recordLoadTest(tenant?.id, user, id, body);
  }

  @Post('runs/:id/chaos')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  chaos(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.wave7.recordChaos(tenant?.id, user, id, body);
  }

  @Post('soak')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  startSoak(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { certificationRunId?: string; plannedDurationSec: number },
  ) {
    return this.wave7.startSoak(tenant?.id, user, body);
  }

  @Post('soak/:id/checkpoint')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  checkpoint(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { checkpoint: Record<string, unknown>; leakSignals?: Record<string, unknown> },
  ) {
    return this.wave7.checkpointSoak(tenant?.id, user, id, body);
  }

  @Put('soak/:id/finish')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  finishSoak(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { status?: string; actualDurationSec?: number; leakSignals?: Record<string, unknown> },
  ) {
    return this.wave7.finishSoak(tenant?.id, user, id, body);
  }

  @Post('reports')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  report(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      reportType: string;
      title?: string;
      runIds?: string[];
      summary?: Record<string, unknown>;
      body?: Record<string, unknown>;
      overallStatus?: string;
    },
  ) {
    return this.wave7.generateReport(tenant?.id, user, body);
  }

  @Get('reports')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listReports(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Query('type') type?: string,
  ) {
    return this.wave7.listReports(tenant?.id, user, type);
  }

  @Get('scalability')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  scalability(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.wave7.scalabilitySnapshot(tenant?.id, user);
  }

  @Get('security-matrix')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  security(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.wave7.securityMatrix(tenant?.id, user);
  }

  @Get('operational')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  operational(@CurrentUser() user: JwtPayload) {
    return this.wave7.operationalChecklist(user);
  }
}
