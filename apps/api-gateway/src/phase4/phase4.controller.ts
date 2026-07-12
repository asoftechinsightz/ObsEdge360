import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionIds } from '@opsedge360/shared-security';
import { Public } from '../auth/public.decorator';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';
import { Phase4Service } from './phase4.service';

@ApiTags('phase4-rc1')
@ApiBearerAuth()
@Controller()
export class Phase4Controller {
  constructor(private readonly phase4: Phase4Service) {}

  @Public()
  @Get('about')
  @ApiOperation({ summary: 'Product branding and version information' })
  about() {
    return this.phase4.about();
  }

  @Public()
  @Get('integrations/matrix')
  integrationMatrix() {
    return this.phase4.integrationMatrix();
  }

  @Get('rc1')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  rc1(@CurrentUser() user: JwtPayload) {
    return this.phase4.rc1Overview(user);
  }

  @Put('rc1/approve')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  approveRc1(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      productionSha?: string;
      validationToken?: string;
      security?: Record<string, unknown>;
      performance?: Record<string, unknown>;
    },
  ) {
    return this.phase4.approveRc1(user, body);
  }

  @Get('readiness/production')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  readiness(@CurrentUser() user: JwtPayload) {
    return this.phase4.productionReadinessChecklist(user);
  }

  @Get('security/assessment')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  security(@CurrentUser() user: JwtPayload) {
    return this.phase4.securityAssessment(user);
  }

  @Get('scalability/profile')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  scalability(@CurrentUser() user: JwtPayload) {
    return this.phase4.scalabilityProfile(user);
  }

  @Get('security/mfa-policy')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  mfaPolicy(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.phase4.getMfaPolicy(tenant?.id, user);
  }

  @Put('security/mfa-policy')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  setMfaPolicy(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { mode: string; graceDays?: number },
  ) {
    return this.phase4.setMfaPolicy(tenant?.id, user, body);
  }

  @Get('me/mfa/status')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  mfaStatus(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.phase4.mfaStatusEnriched(user, tenant?.id);
  }

  @Post('me/mfa/enroll')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  enroll(@CurrentUser() user: JwtPayload) {
    return this.phase4.enrollTotp(user);
  }

  @Post('me/mfa/verify')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  verify(@CurrentUser() user: JwtPayload, @Body() body: { factorId: string; code: string }) {
    return this.phase4.verifyTotp(user, body);
  }

  @Get('commercial')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  commercial(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.phase4.commercialOverview(tenant?.id, user);
  }

  @Post('commercial/trial')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  trial(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { days?: number; seats?: number },
  ) {
    return this.phase4.activateTrial(tenant?.id, user, body);
  }

  @Get('commercial/entitlements')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  entitlements(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.phase4.entitlements(tenant?.id, user);
  }

  @Get('security/api-tokens')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  tokens(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.phase4.listTokens(tenant?.id, user);
  }

  @Post('security/api-tokens')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  createToken(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { name: string; scopes?: string[]; expiresAt?: string },
  ) {
    return this.phase4.createToken(tenant?.id, user, body);
  }

  @Post('security/api-tokens/:id/revoke')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  revokeToken(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.phase4.revokeToken(tenant?.id, user, id);
  }

  @Get('demo/tours')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  tours() {
    return this.phase4.listTours();
  }

  @Post('demo/tours/progress')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  tourProgress(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { tourCode: string; stepIndex: number; completed?: boolean },
  ) {
    return this.phase4.saveTourProgress(tenant?.id, user, body);
  }
}
