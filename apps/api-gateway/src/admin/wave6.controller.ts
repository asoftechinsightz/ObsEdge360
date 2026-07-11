import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionIds } from '@opsedge360/shared-security';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';
import { Wave6Service } from './wave6.service';
import { GovernanceService } from './governance.service';

@ApiTags('deployment-security')
@ApiBearerAuth()
@Controller()
export class Wave6Controller {
  constructor(
    private readonly wave6: Wave6Service,
    private readonly gov: GovernanceService,
  ) {}

  @Get('admin/ops-health')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'Operational health (deployment/cluster/secrets/certs/backups)' })
  opsHealth(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.wave6.getOpsHealth(tenant?.id, user);
  }

  @Get('admin/system/security')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  securityOverview(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.wave6.getSecurityOverview(tenant?.id, user);
  }

  @Put('admin/system/security/password')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  putPassword(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.gov.putSecurityPolicy(tenant?.id, user, 'password', body);
  }

  @Put('admin/system/security/session')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  putSession(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.gov.putSecurityPolicy(tenant?.id, user, 'session', body);
  }

  @Get('admin/deployment/airgap')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listAirgap(@CurrentUser() user: JwtPayload) {
    return this.wave6.listAirgapPackages(user);
  }

  @Post('admin/deployment/airgap')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  registerAirgap(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      packageName: string;
      version: string;
      checksumSha256: string;
      manifest?: Record<string, unknown>;
      imageDigests?: unknown[];
      offlineDocs?: boolean;
    },
  ) {
    return this.wave6.registerAirgapPackage(tenant?.id, user, body);
  }

  @Post('admin/deployment/airgap/:id/verify')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  verifyAirgap(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { computedChecksumSha256: string },
  ) {
    return this.wave6.verifyAirgapPackage(tenant?.id, user, id, body);
  }

  @Get('admin/deployment/profiles')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listProfiles(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.wave6.listDeploymentProfiles(tenant?.id, user);
  }

  @Post('admin/deployment/profiles')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  upsertProfile(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      profileName: string;
      mode?: string;
      namespace?: string;
      helmRelease?: string;
      valuesSnapshot?: Record<string, unknown>;
      airgap?: boolean;
      status?: string;
    },
  ) {
    return this.wave6.upsertDeploymentProfile(tenant?.id, user, body);
  }

  @Get('admin/deployment/backup/schedules')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listSchedules(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.wave6.listBackupSchedules(tenant?.id, user);
  }

  @Post('admin/deployment/backup/schedules')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  createSchedule(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      name: string;
      target?: string;
      cronExpr?: string;
      retentionDays?: number;
      encrypt?: boolean;
      enabled?: boolean;
    },
  ) {
    return this.wave6.upsertBackupSchedule(tenant?.id, user, body);
  }

  @Post('admin/deployment/backup/certify')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  certifyBackup(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      artifactPath: string;
      checksumSha256: string;
      sizeBytes?: number;
      backupRunId?: string;
      retentionDays?: number;
      report?: Record<string, unknown>;
    },
  ) {
    return this.wave6.certifyBackup(tenant?.id, user, body);
  }

  @Get('admin/deployment/backup/certifications')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listBackupCerts(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.wave6.listBackupCertifications(tenant?.id, user);
  }

  @Post('admin/deployment/restore/certify')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  certifyRestore(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      restoreType?: string;
      sourceArtifact: string;
      status?: string;
      validationReport?: Record<string, unknown>;
      pointInTime?: string;
    },
  ) {
    return this.wave6.certifyRestore(tenant?.id, user, body);
  }

  @Get('admin/deployment/restore/certifications')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listRestoreCerts(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.wave6.listRestoreCertifications(tenant?.id, user);
  }

  @Get('admin/system/security/rotation')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listRotation(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.wave6.listRotationJobs(tenant?.id, user);
  }

  @Post('admin/system/security/rotation')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  createRotation(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      secretId: string;
      scheduleCron?: string;
      rotateAfterDays?: number;
      notifyBeforeDays?: number;
      autoRotate?: boolean;
    },
  ) {
    return this.wave6.createRotationJob(tenant?.id, user, body);
  }

  @Post('admin/system/security/rotation/:id/run')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  runRotation(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { newValue?: string },
  ) {
    return this.wave6.runRotationJob(tenant?.id, user, id, body);
  }

  @Post('admin/system/security/rotation/notify')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  notifyRotation(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.wave6.notifyExpiringSecrets(tenant?.id, user);
  }

  @Get('admin/system/security/certificates')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listCerts(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.wave6.listCertificates(tenant?.id, user);
  }

  @Post('admin/system/security/certificates')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  uploadCert(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { name: string; purpose?: string; pemPublic: string; secretRef?: string },
  ) {
    return this.wave6.uploadCertificate(tenant?.id, user, body);
  }

  @Post('admin/system/security/certificates/:id/validate')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  validateCert(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.wave6.validateCertificate(tenant?.id, user, id);
  }

  @Post('admin/system/security/certificates/:id/rotate')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  rotateCert(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { pemPublic: string; secretRef?: string },
  ) {
    return this.wave6.rotateCertificateMeta(tenant?.id, user, id, body);
  }

  @Get('admin/system/security/audit')
  @RequirePermission(PermissionIds.AUDIT_READ)
  securityAudit(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Query('q') q?: string,
  ) {
    return this.wave6.listSecurityAudit(tenant?.id, user, q);
  }
}
