import { Body, Controller, ForbiddenException, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionIds } from '@opsedge360/shared-security';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';
import { Wave8Service } from './wave8.service';

@ApiTags('release-candidate')
@ApiBearerAuth()
@Controller('admin/system/release-candidate')
export class Wave8Controller {
  constructor(private readonly wave8: Wave8Service) {}

  @Get()
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'Release Candidate overview' })
  overview(@CurrentUser() user: JwtPayload) {
    return this.wave8.overview(user);
  }

  @Get('readiness')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'Release readiness review report' })
  readiness(@CurrentUser() user: JwtPayload) {
    return this.wave8.readinessReport(user);
  }

  @Get('docs-freeze')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  docs(@CurrentUser() user: JwtPayload) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin role required');
    return this.wave8.documentationFreeze();
  }

  @Get('packaging')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  packaging(@CurrentUser() user: JwtPayload) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin role required');
    return this.wave8.packagingInventory();
  }

  @Get('openapi')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  openapi(@CurrentUser() user: JwtPayload) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin role required');
    return this.wave8.openApiCoverageHint();
  }

  @Get('pilot')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  pilot(@CurrentUser() user: JwtPayload) {
    return this.wave8.listPilots(user);
  }

  @Put('pilot/:type')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  updatePilot(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('type') type: string,
    @Body() body: { items?: unknown[]; status?: string },
  ) {
    return this.wave8.updatePilot(tenant?.id, user, type, body);
  }

  @Post('install/attest')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  attest(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      installType: string;
      status?: string;
      evidence?: Record<string, unknown>;
      profileId?: string;
    },
  ) {
    return this.wave8.attestInstall(tenant?.id, user, body);
  }

  @Get('install')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  installs(@CurrentUser() user: JwtPayload) {
    return this.wave8.listInstalls(user);
  }

  @Put('profile')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  profile(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      status?: string;
      openapi?: Record<string, unknown>;
      packages?: Record<string, unknown>;
      pilot?: Record<string, unknown>;
    },
  ) {
    return this.wave8.markProfile(tenant?.id, user, body);
  }

  @Get('demo')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  demos(@CurrentUser() user: JwtPayload) {
    return this.wave8.listDemos(user);
  }

  @Post('demo/:id/seed')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  seedDemo(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.wave8.seedDemo(tenant?.id, user, id);
  }
}
