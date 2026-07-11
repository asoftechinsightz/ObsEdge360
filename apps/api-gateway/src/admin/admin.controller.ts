import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionIds } from '@opsedge360/shared-security';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'Enterprise Admin Center overview' })
  overview(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.admin.overview(tenant?.id, user);
  }

  @Get('organization')
  @RequirePermission(PermissionIds.USERS_READ)
  organization(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.admin.getOrganization(tenant?.id, user);
  }

  @Put('organization')
  @RequirePermission(PermissionIds.USERS_WRITE)
  updateOrganization(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { name?: string; region?: string; settings?: Record<string, unknown> },
  ) {
    return this.admin.updateOrganization(tenant?.id, user, body);
  }

  @Put('quotas')
  @RequirePermission(PermissionIds.USERS_WRITE)
  upsertQuota(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      maxUsers?: number;
      maxAgents?: number;
      maxCis?: number;
      maxTelemetryPointsPerHour?: number;
    },
  ) {
    return this.admin.upsertQuota(tenant?.id, user, body);
  }

  @Get('licenses')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  licenses(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.admin.listLicenses(tenant?.id, user).then((licenses) => ({ licenses }));
  }

  @Post('licenses')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  createLicense(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      licenseKey: string;
      licenseTier?: string;
      seats?: number;
      validUntil?: string;
      features?: Record<string, unknown>;
    },
  ) {
    return this.admin.createLicense(tenant?.id, user, body);
  }

  @Get('settings')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  settings(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.admin.listSettings(tenant?.id, user).then((settings) => ({ settings }));
  }

  @Put('settings/:key')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  upsertSetting(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('key') key: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.admin.upsertSetting(tenant?.id, user, key, body);
  }

  @Get('health/system')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  systemHealth(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.admin.systemHealth(tenant?.id, user);
  }

  @Get('health/cluster')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  clusterHealth(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.admin.clusterHealth(tenant?.id, user);
  }

  @Get('backups')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  backups(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.admin.listBackupRuns(tenant?.id, user).then((runs) => ({ runs }));
  }

  @Post('backups')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  recordBackup(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { artifactPath?: string; notes?: string; status?: string; runType?: string },
  ) {
    return this.admin.recordBackup(tenant?.id, user, body);
  }

  @Get('upgrades')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  upgrades(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.admin.listUpgradeRuns(tenant?.id, user).then((runs) => ({ runs }));
  }

  @Post('upgrades')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  recordUpgrade(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { fromVersion?: string; toVersion?: string; notes?: string; status?: string },
  ) {
    return this.admin.recordUpgrade(tenant?.id, user, body);
  }

  @Get('automation/policies')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  policies(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.admin.listPolicies(tenant?.id, user).then((policies) => ({ policies }));
  }

  @Post('automation/policies')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  createPolicy(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      name: string;
      policyType?: string;
      executionMode?: string;
      requireApproval?: boolean;
      emergencyStop?: boolean;
      safetyRules?: Record<string, unknown>;
    },
  ) {
    return this.admin.createPolicy(tenant?.id, user, body);
  }

  @Patch('automation/policies/:id/emergency-stop')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  emergencyStop(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { emergencyStop: boolean },
  ) {
    return this.admin.setEmergencyStop(tenant?.id, user, id, !!body.emergencyStop);
  }

  @Get('runbooks')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  runbooks(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.admin.listRunbooks(tenant?.id, user).then((runbooks) => ({ runbooks }));
  }

  @Post('runbooks')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  createRunbook(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: { name: string; description?: string; steps?: unknown[]; linkedActionCode?: string; status?: string },
  ) {
    return this.admin.createRunbook(tenant?.id, user, body);
  }

  @Get('integrations')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  integrations(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.admin.listConnectors(tenant?.id, user).then((connectors) => ({ connectors }));
  }

  @Post('integrations')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  createIntegration(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { connectorType: string; name: string; config?: Record<string, unknown> },
  ) {
    return this.admin.createConnector(tenant?.id, user, body);
  }

  @Get('audit')
  @RequirePermission(PermissionIds.AUDIT_READ)
  audit(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    return this.admin.listAudit(tenant?.id, user, Number(limit ?? 50) || 50).then((events) => ({ events }));
  }
}
