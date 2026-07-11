import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionIds } from '@opsedge360/shared-security';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';
import { Wave9Service } from './wave9.service';

@ApiTags('general-availability')
@ApiBearerAuth()
@Controller('admin/system/ga')
export class Wave9Controller {
  constructor(private readonly wave9: Wave9Service) {}

  @Get()
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'GA release overview' })
  overview(@CurrentUser() user: JwtPayload) {
    return this.wave9.overview(user);
  }

  @Get('readiness')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'GA readiness report' })
  readiness(@CurrentUser() user: JwtPayload) {
    return this.wave9.readinessReport(user);
  }

  @Get('regression')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  regression(@CurrentUser() user: JwtPayload) {
    return this.wave9.listRegressions(user);
  }

  @Post('regression')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  recordRegression(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { moduleKey: string; status?: string; checks?: unknown[]; evidence?: Record<string, unknown> },
  ) {
    return this.wave9.recordRegression(tenant?.id, user, body);
  }

  @Post('signoff')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  signoff(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { reportType: string; title?: string; body?: Record<string, unknown>; status?: string },
  ) {
    return this.wave9.upsertSignoff(tenant?.id, user, body);
  }

  @Put('approve')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  approve(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      productionSha?: string;
      validationToken?: string;
      manifest?: Record<string, unknown>;
      sbom?: Record<string, unknown>;
      readiness?: Record<string, unknown>;
      status?: string;
    },
  ) {
    return this.wave9.approveRelease(tenant?.id, user, body);
  }
}
