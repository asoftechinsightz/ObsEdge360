import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionIds } from '@opsedge360/shared-security';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';
import { AdminService } from './admin.service';
import { HaService } from './ha.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly ha: HaService,
  ) {}

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
  clusterHealthLegacy(@CurrentUser() user: JwtPayload) {
    return this.ha.getCluster(user);
  }

  @Get('cluster')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'Cluster health (HA Wave 2)' })
  cluster(@CurrentUser() user: JwtPayload) {
    return this.ha.getCluster(user);
  }

  @Get('ha')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'HA foundation overview' })
  haOverview(@CurrentUser() user: JwtPayload) {
    return this.ha.getHaOverview(user);
  }

  @Post('ha/refresh')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  haRefresh(@CurrentUser() user: JwtPayload) {
    return this.ha.refreshProbes(user);
  }

  @Get('replication')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  replication(@CurrentUser() user: JwtPayload) {
    return this.ha.getReplication(user);
  }

  @Get('failover')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  failoverList(@CurrentUser() user: JwtPayload) {
    return this.ha.listFailover(user);
  }

  @Post('failover')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  failoverRecord(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      component: string;
      eventType: string;
      fromNode?: string;
      toNode?: string;
      notes?: string;
      status?: string;
    },
  ) {
    return this.ha.recordFailover(user, body);
  }

  @Post('backups/verify')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  backupVerify(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      backupRunId?: string;
      artifactPath?: string;
      integrityOk?: boolean;
      restoreVerified?: boolean;
      report?: Record<string, unknown>;
    },
  ) {
    return this.ha.verifyBackup(user, body);
  }

  @Get('backups/verifications')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  backupVerifications(@CurrentUser() user: JwtPayload) {
    return this.ha.listBackupVerifications(user);
  }

  @Post('upgrades/precheck')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  upgradePrecheck(
    @CurrentUser() user: JwtPayload,
    @Body() body: { fromVersion?: string; toVersion?: string },
  ) {
    return this.ha.runUpgradePrecheck(user, body);
  }

  @Get('upgrades/checks')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  upgradeChecks(@CurrentUser() user: JwtPayload) {
    return this.ha.listUpgradeChecks(user);
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
