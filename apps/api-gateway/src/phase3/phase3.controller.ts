import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionIds } from '@opsedge360/shared-security';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';
import { Phase3Service } from './phase3.service';

@ApiTags('phase3')
@ApiBearerAuth()
@Controller()
export class Phase3Controller {
  constructor(private readonly phase3: Phase3Service) {}

  @Get('me/preferences')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  preferences(@CurrentUser() user: JwtPayload) {
    return this.phase3.getPreferences(user);
  }

  @Patch('me/preferences')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  savePreferences(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { theme?: string; landingPath?: string; prefs?: Record<string, unknown> },
  ) {
    return this.phase3.upsertPreferences(user, tenant?.id, body);
  }

  @Get('me/notifications')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  notifications(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.phase3.listNotifications(user, tenant?.id);
  }

  @Post('me/notifications/:id/read')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  readNotification(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.phase3.markNotificationRead(user, tenant?.id, id);
  }

  @Get('me/mfa')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  mfa(@CurrentUser() user: JwtPayload) {
    return this.phase3.mfaStatus(user);
  }

  @Get('itsm/problems')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  problems(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.phase3.listProblems(tenant?.id, user);
  }

  @Post('itsm/problems')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  createProblem(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { title: string; priority?: string },
  ) {
    return this.phase3.createProblem(tenant?.id, user, body);
  }

  @Get('itsm/changes')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  changes(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.phase3.listChanges(tenant?.id, user);
  }

  @Post('itsm/changes')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  createChange(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.phase3.createChange(tenant?.id, user, body as never);
  }

  @Get('itsm/calendar')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  calendar(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.phase3.changeCalendar(tenant?.id, user);
  }

  @Post('itsm/cab/:id/decide')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  decideCab(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'rejected'; comment?: string },
  ) {
    return this.phase3.decideCab(tenant?.id, user, id, body);
  }

  @Get('itsm/knowledge')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  knowledge(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.phase3.listKnowledge(tenant?.id, user);
  }

  @Post('itsm/knowledge')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  createKnowledge(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { title: string; body: string; tags?: string[]; published?: boolean },
  ) {
    return this.phase3.createKnowledge(tenant?.id, user, body);
  }

  @Get('itsm/catalog')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  catalog(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.phase3.listCatalog(tenant?.id, user);
  }

  @Get('itsm/sla')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  sla(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.phase3.listSla(tenant?.id, user);
  }

  @Post('itsm/sla')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  createSla(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { name: string; targetPct?: number; metric?: string },
  ) {
    return this.phase3.createSla(tenant?.id, user, body);
  }

  @Get('synthetics/browser/journeys')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  browserJourneys(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.phase3.listBrowserJourneys(tenant?.id, user);
  }

  @Post('synthetics/browser/journeys')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  createBrowserJourney(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.phase3.createBrowserJourney(tenant?.id, user, body as never);
  }

  @Post('synthetics/browser/journeys/:id/run')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  @ApiOperation({ summary: 'Run browser journey (Phase B — simulation engine with live navigation probe)' })
  runBrowser(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.phase3.runBrowserJourney(tenant?.id, user, id);
  }

  @Get('reports')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  reports(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.phase3.listReports(tenant?.id, user);
  }

  @Post('reports/generate')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  generateReport(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { reportType: string; title?: string },
  ) {
    return this.phase3.generateReport(tenant?.id, user, body);
  }

  @Get('reports/:id/export')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  exportReport(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('format') format?: string,
  ) {
    return this.phase3.exportReport(tenant?.id, user, id, format === 'csv' ? 'csv' : 'json');
  }

  @Get('marketplace/extensions')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  marketplace(@CurrentUser() user: JwtPayload) {
    return this.phase3.listMarketplace(user);
  }

  @Get('banking360/payment-monitors')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  paymentMonitors(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.phase3.listPaymentMonitors(tenant?.id, user);
  }

  @Post('banking360/payment-monitors')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  createPaymentMonitor(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { rail: string; name: string; target?: string; sloTargetMs?: number },
  ) {
    return this.phase3.upsertPaymentMonitor(tenant?.id, user, body);
  }

  @Post('banking360/payment-monitors/:id/sample')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  samplePayment(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.phase3.samplePaymentMonitor(tenant?.id, user, id);
  }

  @Patch('platform/feature-flags/:key')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  patchFlag(@CurrentUser() user: JwtPayload, @Param('key') key: string, @Body() body: { enabled: boolean }) {
    return this.phase3.setFeatureFlag(user, key, !!body.enabled);
  }
}
