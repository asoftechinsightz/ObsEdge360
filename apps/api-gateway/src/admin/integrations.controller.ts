import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionIds } from '@opsedge360/shared-security';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';
import { IntegrationsService } from './integrations.service';
import { authRateLimitOk } from '../auth/auth-rate-limit';
import { BadRequestException } from '@nestjs/common';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'Integration dashboard' })
  dashboard(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.integrations.dashboard(tenant?.id, user);
  }

  @Get('connectors')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listConnectors(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.integrations.listConnectors(tenant?.id, user);
  }

  @Get('connectors/catalog')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  catalog() {
    return this.integrations.catalog();
  }

  @Post('connectors')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  register(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      connectorType: string;
      name: string;
      config?: Record<string, unknown>;
      secretRef?: string;
      enabled?: boolean;
    },
  ) {
    if (!authRateLimitOk(`int-reg:${user.sub}`, 30)) throw new BadRequestException('Rate limit exceeded');
    return this.integrations.registerConnector(tenant?.id, user, body);
  }

  @Patch('connectors/:id')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  update(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { name?: string; config?: Record<string, unknown>; secretRef?: string | null; enabled?: boolean },
  ) {
    return this.integrations.updateConnector(tenant?.id, user, id, body);
  }

  @Post('test')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  test(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { connectorId: string },
  ) {
    if (!authRateLimitOk(`int-test:${user.sub}`, 20)) throw new BadRequestException('Rate limit exceeded');
    return this.integrations.testConnector(tenant?.id, user, undefined, body);
  }

  @Post('connectors/:id/test')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  testOne(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.integrations.testConnector(tenant?.id, user, id);
  }

  @Get('health')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  health(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.integrations.listHealth(tenant?.id, user);
  }

  @Post('itsm')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  itsm(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      connectorId: string;
      action:
        | 'create_incident'
        | 'update_incident'
        | 'close_incident'
        | 'create_change'
        | 'create_ticket'
        | 'update_ticket'
        | 'sync_status'
        | 'cmdb_sync';
      payload: Record<string, unknown>;
      idempotencyKey?: string;
      correlationId?: string;
    },
  ) {
    if (!authRateLimitOk(`int-itsm:${user.sub}`, 60)) throw new BadRequestException('Rate limit exceeded');
    return this.integrations.itsmAction(tenant?.id, user, body);
  }

  @Get('notifications')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listChannels(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.integrations.listNotificationChannels(tenant?.id, user);
  }

  @Post('notifications')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  createChannel(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      name: string;
      channelType: 'email' | 'slack' | 'teams' | 'webhook';
      config?: Record<string, unknown>;
      secretRef?: string;
      severityRoutes?: string[];
      template?: Record<string, unknown>;
      rateLimitPerMin?: number;
    },
  ) {
    return this.integrations.createNotificationChannel(tenant?.id, user, body);
  }

  @Post('notifications/deliver')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  deliver(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { channelId: string; severity?: string; title?: string; message?: string; data?: Record<string, unknown> },
  ) {
    if (!authRateLimitOk(`int-deliver:${user.sub}`, 60)) throw new BadRequestException('Rate limit exceeded');
    return this.integrations.deliverNotification(tenant?.id, user, body);
  }

  @Get('notifications/deliveries')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  deliveries(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
  ) {
    return this.integrations.listDeliveries(tenant?.id, user, status);
  }

  @Get('identity')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listIdentity(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.integrations.listIdentityProviders(tenant?.id, user);
  }

  @Post('identity')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  upsertIdentity(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      id?: string;
      name: string;
      protocol: 'ldap' | 'active_directory' | 'saml' | 'oidc';
      config?: Record<string, unknown>;
      secretRef?: string;
      roleMapping?: Record<string, unknown>;
      attributeMapping?: Record<string, unknown>;
      groupMapping?: Record<string, unknown>;
      jitProvisioning?: boolean;
      ssoProviderId?: string;
      enabled?: boolean;
    },
  ) {
    return this.integrations.upsertIdentityProvider(tenant?.id, user, body);
  }

  @Post('identity/ldap/login')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  ldapLogin(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() _user: JwtPayload,
    @Body() body: { providerId: string; username: string; password: string },
  ) {
    if (!authRateLimitOk(`ldap-login:${body.username}`, 10)) throw new BadRequestException('Rate limit exceeded');
    return this.integrations.ldapLogin(tenant?.id, body);
  }

  @Get('sync')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listSync(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.integrations.listSyncJobs(tenant?.id, user);
  }

  @Post('sync')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  sync(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { providerId: string },
  ) {
    return this.integrations.syncIdentity(tenant?.id, user, body.providerId);
  }

  @Post('secrets/validate')
  @RequirePermission(PermissionIds.SECRETS_READ)
  validateSecret(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { secretRef: string },
  ) {
    return this.integrations.validateSecretRef(tenant?.id, user, body.secretRef);
  }

  @Get('audit')
  @RequirePermission(PermissionIds.AUDIT_READ)
  audit(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Query('q') q?: string,
  ) {
    return this.integrations.listAudit(tenant?.id, user, q);
  }
}
