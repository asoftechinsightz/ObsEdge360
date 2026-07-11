import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsIn, IsNumber } from 'class-validator';
import { query, queryOne } from '@opsedge360/shared-db';
import {
  emitAudit,
  mintServiceJwt,
  hashCredential,
  PermissionIds,
} from '@opsedge360/shared-security';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';

class CreateIdentityDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsIn(['service', 'workload'])
  kind?: 'service' | 'workload';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];
}

class MintTokenDto {
  @IsOptional()
  @IsNumber()
  ttlSeconds?: number;
}

class RegisterCertDto {
  @IsString()
  subjectCn!: string;

  @IsString()
  fingerprintSha256!: string;

  @IsString()
  notAfter!: string;

  @IsOptional()
  @IsString()
  identityId?: string;

  @IsOptional()
  @IsString()
  pemPublic?: string;
}

@ApiTags('trust')
@ApiBearerAuth()
@Controller('trust')
export class TrustController {
  private tenantId(tenant?: TenantContext) {
    if (!tenant?.id) throw new BadRequestException('Tenant context required');
    return tenant.id;
  }

  @Get('health')
  @RequirePermission(PermissionIds.TRUST_READ)
  @ApiOperation({ summary: 'Trust / service-identity health' })
  async health() {
    const identities = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM service_identities WHERE status = 'active'`,
    ).catch(() => ({ c: '0' }));
    return {
      ok: true,
      serviceAuthEnabled: process.env.SERVICE_AUTH_ENABLED === 'true',
      serviceAuthRequired: process.env.SERVICE_AUTH_REQUIRED === 'true',
      activeIdentities: Number(identities?.c ?? 0),
      mtls: 'metadata-only (full mesh deferred)',
    };
  }

  @Post('identities')
  @RequirePermission(PermissionIds.TRUST_WRITE)
  @ApiOperation({ summary: 'Register service or workload identity' })
  async createIdentity(
    @Body() body: CreateIdentityDto,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const tenantId = this.tenantId(tenant);
    if (!body.name) throw new BadRequestException('name required');
    const scopes = body.scopes?.length
      ? body.scopes
      : ['cmdb:proxy', 'discovery:proxy', 'observability:proxy'];
    const row = await queryOne<{ id: string }>(
      `INSERT INTO service_identities (tenant_id, name, kind, scopes)
       VALUES ($1,$2,$3,$4)
       RETURNING id, tenant_id, name, kind, status, scopes, created_at`,
      [tenantId, body.name, body.kind ?? 'service', scopes],
    );
    if (!row) throw new BadRequestException('Failed to create identity');
    await emitAudit({
      tenantId,
      eventCategory: 'administrative_actions',
      eventType: 'service_identity.created',
      action: 'trust.identity.created',
      outcome: 'success',
      actor: user.sub,
      resourceType: 'service_identity',
      resourceId: row.id,
      sourceService: 'api-gateway',
    });
    return row;
  }

  @Get('identities')
  @RequirePermission(PermissionIds.TRUST_READ)
  @ApiOperation({ summary: 'List service identities' })
  async listIdentities(@CurrentTenant() tenant?: TenantContext) {
    const tenantId = this.tenantId(tenant);
    const items = await query(
      `SELECT id, name, kind, status, scopes, created_at FROM service_identities
       WHERE tenant_id = $1 ORDER BY name`,
      [tenantId],
    );
    return { items };
  }

  @Post('identities/:id/token')
  @RequirePermission(PermissionIds.TRUST_MINT)
  @ApiOperation({ summary: 'Mint short-lived service JWT' })
  async mintToken(
    @Param('id') id: string,
    @Body() body: MintTokenDto,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const tenantId = this.tenantId(tenant);
    const identity = await queryOne<{
      id: string;
      tenant_id: string;
      kind: string;
      scopes: string[];
      status: string;
    }>(`SELECT * FROM service_identities WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    if (!identity) throw new NotFoundException('Identity not found');
    if (identity.status !== 'active') throw new BadRequestException('Identity not active');

    const minted = mintServiceJwt({
      identityId: identity.id,
      tenantId: identity.tenant_id,
      kind: identity.kind,
      scopes: identity.scopes ?? [],
      ttlSeconds: body.ttlSeconds,
    });

    await query(
      `INSERT INTO service_credentials (identity_id, credential_type, key_hash, kid, expires_at)
       VALUES ($1,'jwt_key',$2,$3,NOW() + ($4 || ' seconds')::interval)`,
      [identity.id, hashCredential(minted.jti), minted.jti, String(minted.expiresIn)],
    );

    await emitAudit({
      tenantId,
      eventCategory: 'secrets_key_management',
      eventType: 'service_token.minted',
      action: 'trust.token.minted',
      outcome: 'success',
      actor: user.sub,
      resourceType: 'service_identity',
      resourceId: id,
      sourceService: 'api-gateway',
      metadata: { expiresIn: minted.expiresIn, jti: minted.jti },
    });

    return {
      accessToken: minted.token,
      tokenType: 'Bearer',
      expiresIn: minted.expiresIn,
      scopes: identity.scopes,
    };
  }

  @Post('identities/:id/revoke')
  @RequirePermission(PermissionIds.TRUST_WRITE)
  @ApiOperation({ summary: 'Revoke service identity and credentials' })
  async revokeIdentity(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const tenantId = this.tenantId(tenant);
    const row = await queryOne(
      `UPDATE service_identities SET status = 'revoked', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING id, status`,
      [id, tenantId],
    );
    if (!row) throw new NotFoundException('Identity not found');
    await query(`UPDATE service_credentials SET revoked_at = NOW() WHERE identity_id = $1 AND revoked_at IS NULL`, [
      id,
    ]);
    await emitAudit({
      tenantId,
      eventCategory: 'administrative_actions',
      eventType: 'service_identity.revoked',
      action: 'trust.identity.revoked',
      outcome: 'success',
      actor: user.sub,
      resourceType: 'service_identity',
      resourceId: id,
      sourceService: 'api-gateway',
    });
    return row;
  }

  @Get('certificates')
  @RequirePermission(PermissionIds.TRUST_READ)
  @ApiOperation({ summary: 'List trust certificates (metadata)' })
  async listCerts(@CurrentTenant() tenant?: TenantContext) {
    const tenantId = this.tenantId(tenant);
    const items = await query(
      `SELECT id, subject_cn, fingerprint_sha256, not_before, not_after, status, identity_id
       FROM trust_certificates WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId],
    );
    return { items };
  }

  @Post('certificates')
  @RequirePermission(PermissionIds.TRUST_WRITE)
  @ApiOperation({ summary: 'Register certificate metadata' })
  async registerCert(
    @Body() body: RegisterCertDto,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const tenantId = this.tenantId(tenant);
    const fp = body.fingerprintSha256.toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(fp)) {
      throw new BadRequestException('fingerprintSha256 must be 64 hex chars');
    }
    const row = await queryOne<{ id: string }>(
      `INSERT INTO trust_certificates
        (tenant_id, identity_id, subject_cn, fingerprint_sha256, not_after, pem_public)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, subject_cn, fingerprint_sha256, status, not_after`,
      [tenantId, body.identityId ?? null, body.subjectCn, fp, body.notAfter, body.pemPublic ?? null],
    );
    await emitAudit({
      tenantId,
      eventCategory: 'administrative_actions',
      eventType: 'certificate.registered',
      action: 'trust.certificate.registered',
      outcome: 'success',
      actor: user.sub,
      resourceType: 'trust_certificate',
      resourceId: row?.id,
      sourceService: 'api-gateway',
    });
    return row;
  }

  @Post('certificates/:id/revoke')
  @RequirePermission(PermissionIds.TRUST_WRITE)
  @ApiOperation({ summary: 'Revoke certificate' })
  async revokeCert(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const tenantId = this.tenantId(tenant);
    const row = await queryOne(
      `UPDATE trust_certificates SET status = 'revoked'
       WHERE id = $1 AND tenant_id = $2 RETURNING id, status`,
      [id, tenantId],
    );
    if (!row) throw new NotFoundException('Certificate not found');
    await emitAudit({
      tenantId,
      eventCategory: 'administrative_actions',
      eventType: 'certificate.revoked',
      action: 'trust.certificate.revoked',
      outcome: 'success',
      actor: user.sub,
      resourceType: 'trust_certificate',
      resourceId: id,
      sourceService: 'api-gateway',
    });
    return row;
  }
}
