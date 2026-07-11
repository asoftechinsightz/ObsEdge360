import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createSecretsProvider,
  countExpiringSecrets,
  emitAudit,
  maskSecret,
  PermissionIds,
  incSecurityMetric,
  type SecretsProvider,
} from '@opsedge360/shared-security';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';

class CreateSecretDto {
  name!: string;
  value!: string;
  description?: string;
  expiresAt?: string;
  rotateAfterDays?: number;
}

class RotateSecretDto {
  value!: string;
}

@ApiTags('secrets')
@ApiBearerAuth()
@Controller('secrets')
export class SecretsController {
  private provider: SecretsProvider = createSecretsProvider();

  private tenantId(tenant?: TenantContext) {
    if (!tenant?.id) throw new BadRequestException('Tenant context required');
    return tenant.id;
  }

  private async audit(
    tenantId: string,
    eventType: string,
    action: string,
    secretId: string,
    actorId?: string,
    metadata?: Record<string, unknown>,
  ) {
    await emitAudit({
      tenantId,
      organizationId: tenantId,
      eventCategory: 'secrets_key_management',
      eventType,
      action,
      outcome: 'success',
      actor: actorId,
      actorType: 'user',
      resourceType: 'secret',
      resourceId: secretId,
      sourceService: 'api-gateway',
      metadata,
    });
  }

  @Get('health')
  @RequirePermission(PermissionIds.SECRETS_READ)
  @ApiOperation({ summary: 'Secrets provider health' })
  async health() {
    const h = await this.provider.health();
    const expiring = await countExpiringSecrets(30).catch(() => 0);
    if (expiring > 0) incSecurityMetric('security.secrets.expiring', 0);
    return {
      provider: this.provider.name,
      ...h,
      expiringWithin30Days: expiring,
    };
  }

  @Post()
  @RequirePermission(PermissionIds.SECRETS_WRITE)
  @ApiOperation({ summary: 'Create secret (encrypted at rest)' })
  async create(
    @Body() body: CreateSecretDto,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const tenantId = this.tenantId(tenant);
    if (!body.name || !body.value) throw new BadRequestException('name and value required');
    try {
      const row = await this.provider.create({
        tenantId,
        name: body.name,
        value: body.value,
        description: body.description,
        expiresAt: body.expiresAt,
        rotateAfterDays: body.rotateAfterDays,
        actorId: user.sub,
      });
      await this.audit(tenantId, 'secret.created', 'secret.created', row.id, user.sub, {
        name: body.name,
        masked: maskSecret(body.value),
      });
      incSecurityMetric('security.secrets.created');
      return {
        id: row.id,
        name: row.name,
        status: row.status,
        currentVersion: row.current_version,
        provider: row.provider,
      };
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  @Get()
  @RequirePermission(PermissionIds.SECRETS_READ)
  @ApiOperation({ summary: 'List secrets (metadata only)' })
  async list(@CurrentTenant() tenant?: TenantContext) {
    const tenantId = this.tenantId(tenant);
    const rows = await this.provider.list(tenantId);
    return {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        currentVersion: r.current_version,
        expiresAt: r.expires_at,
        provider: r.provider,
      })),
    };
  }

  @Get(':id')
  @RequirePermission(PermissionIds.SECRETS_READ)
  @ApiOperation({ summary: 'Get secret metadata' })
  async get(@Param('id') id: string, @CurrentTenant() tenant?: TenantContext) {
    const tenantId = this.tenantId(tenant);
    const row = await this.provider.getMetadata(tenantId, id);
    if (!row) throw new NotFoundException('Secret not found');
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      currentVersion: row.current_version,
      expiresAt: row.expires_at,
      provider: row.provider,
    };
  }

  @Get(':id/value')
  @RequirePermission(PermissionIds.SECRETS_READ)
  @ApiOperation({ summary: 'Reveal secret value (audited; never logged)' })
  async reveal(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const tenantId = this.tenantId(tenant);
    try {
      const result = await this.provider.reveal(tenantId, id);
      await this.audit(tenantId, 'secret.accessed', 'secret.accessed', id, user.sub, {
        version: result.version,
      });
      return { id, version: result.version, value: result.value };
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('not found')) throw new NotFoundException(msg);
      if (msg.includes('disabled') || msg.includes('revoked')) throw new ForbiddenException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Post(':id/rotate')
  @RequirePermission(PermissionIds.SECRETS_ROTATE)
  @ApiOperation({ summary: 'Rotate secret to a new version' })
  async rotate(
    @Param('id') id: string,
    @Body() body: RotateSecretDto,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const tenantId = this.tenantId(tenant);
    if (!body.value) throw new BadRequestException('value required');
    try {
      const row = await this.provider.rotate(tenantId, id, body.value, user.sub);
      await this.audit(tenantId, 'secret.rotated', 'secret.rotated', id, user.sub, {
        version: row.current_version,
      });
      incSecurityMetric('security.secrets.rotated');
      return { id: row.id, currentVersion: row.current_version, status: row.status };
    } catch (e) {
      incSecurityMetric('security.secrets.rotate_fail');
      throw new BadRequestException((e as Error).message);
    }
  }

  @Post(':id/disable')
  @RequirePermission(PermissionIds.SECRETS_WRITE)
  @ApiOperation({ summary: 'Disable secret' })
  async disable(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const tenantId = this.tenantId(tenant);
    const row = await this.provider.disable(tenantId, id);
    await this.audit(tenantId, 'secret.disabled', 'secret.disabled', id, user.sub);
    return { id: row.id, status: row.status };
  }

  @Post(':id/revoke')
  @RequirePermission(PermissionIds.SECRETS_WRITE)
  @ApiOperation({ summary: 'Revoke secret and disable versions' })
  async revoke(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const tenantId = this.tenantId(tenant);
    const row = await this.provider.revoke(tenantId, id);
    await this.audit(tenantId, 'secret.revoked', 'secret.revoked', id, user.sub);
    return { id: row.id, status: row.status };
  }

  @Get(':id/versions')
  @RequirePermission(PermissionIds.SECRETS_READ)
  @ApiOperation({ summary: 'Secret version history (no plaintext)' })
  async versions(@Param('id') id: string, @CurrentTenant() tenant?: TenantContext) {
    const tenantId = this.tenantId(tenant);
    try {
      const items = await this.provider.versions(tenantId, id);
      return { id, items };
    } catch (e) {
      throw new NotFoundException((e as Error).message);
    }
  }
}
