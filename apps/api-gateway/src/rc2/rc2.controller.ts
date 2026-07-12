import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionIds } from '@opsedge360/shared-security';
import { Public } from '../auth/public.decorator';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';
import { Rc2Service } from './rc2.service';

@ApiTags('rc2-pilot')
@ApiBearerAuth()
@Controller()
export class Rc2Controller {
  constructor(private readonly rc2Service: Rc2Service) {}

  @Public()
  @Get('branding')
  @ApiOperation({ summary: 'Canonical product branding' })
  branding() {
    return this.rc2Service.branding();
  }

  @Public()
  @Get('demo/walkthrough')
  walkthrough() {
    return this.rc2Service.executiveWalkthrough();
  }

  @Get('rc2')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  rc2Overview(@CurrentUser() user: JwtPayload) {
    return this.rc2Service.rc2Overview(user);
  }

  @Put('rc2/approve')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  approve(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      productionSha?: string;
      validationToken?: string;
      security?: Record<string, unknown>;
      performance?: Record<string, unknown>;
      auditSummary?: Record<string, unknown>;
    },
  ) {
    return this.rc2Service.approveRc2(user, body);
  }

  @Get('pilot/package')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  pilotPackage() {
    return this.rc2Service.pilotPackage();
  }

  @Get('security/dashboard')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  securityDash(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.rc2Service.securityDashboard(tenant?.id, user);
  }

  @Get('security/login-history')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  loginHistory(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    return this.rc2Service.loginHistory(tenant?.id, user, limit ? Number(limit) : 100);
  }

  @Get('security/sessions')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  sessions(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.rc2Service.listSessions(tenant?.id, user);
  }

  @Post('security/sessions/revoke-all')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  revokeAll(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { userId?: string },
  ) {
    return this.rc2Service.revokeAllSessions(tenant?.id, user, body?.userId);
  }

  @Post('security/sessions/:id/revoke')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  revokeOne(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.rc2Service.revokeSession(tenant?.id, user, id);
  }

  @Get('security/alerts')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  alerts(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.rc2Service.listSecurityAlerts(tenant?.id, user);
  }

  @Post('security/alerts')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  createAlert(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { severity?: string; title: string; detail?: string },
  ) {
    return this.rc2Service.createSecurityAlert(tenant?.id, user, body);
  }

  @Post('me/mfa/enroll-totp')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  enrollTotp(@CurrentUser() user: JwtPayload) {
    return this.rc2Service.enrollTotpProduction(user);
  }

  @Post('me/mfa/verify-totp')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  verifyTotp(@CurrentUser() user: JwtPayload, @Body() body: { factorId: string; code: string }) {
    return this.rc2Service.verifyTotpProduction(user, body);
  }

  @Post('me/mfa/backup-codes')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  backupCodes(@CurrentUser() user: JwtPayload) {
    return this.rc2Service.regenerateBackupCodes(user);
  }

  @Get('me/mfa/backup-codes/status')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  backupStatus(@CurrentUser() user: JwtPayload) {
    return this.rc2Service.backupCodeStatus(user);
  }

  @Get('me/password/rotation')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  passwordRotation(@CurrentUser() user: JwtPayload) {
    return this.rc2Service.passwordRotationStatus(user);
  }

  @Post('me/password/rotated')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  markRotated(@CurrentUser() user: JwtPayload) {
    return this.rc2Service.markPasswordRotated(user);
  }

  @Post('security/api-tokens/:id/rotate')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  rotateToken(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.rc2Service.rotateApiToken(tenant?.id, user, id);
  }

  @Post('demo/reset')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  demoReset(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.rc2Service.demoReset(tenant?.id, user);
  }

  @Get('performance/report')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  perfReport(@CurrentUser() user: JwtPayload) {
    return this.rc2Service.performanceReport(user);
  }

  @Get('performance/benchmarks')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listBench(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.rc2Service.listBenchmarks(tenant?.id, user);
  }

  @Post('performance/benchmarks')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  runBench(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { concurrentUsers: number },
  ) {
    return this.rc2Service.runBenchmarkProfile(tenant?.id, user, body.concurrentUsers);
  }
}
