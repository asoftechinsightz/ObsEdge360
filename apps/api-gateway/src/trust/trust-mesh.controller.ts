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
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { query, queryOne } from '@opsedge360/shared-db';
import {
  PermissionIds,
  bootstrapTrustCa,
  buildSpiffeId,
  getTrustBundle,
  issueWorkloadSvid,
  materializeWorkloadFiles,
  meshHealthSummary,
  proveMtlsHandshake,
  rotateWorkloadSvid,
  revokeWorkloadSvid,
  mtlsEnabled,
} from '@opsedge360/shared-security';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';

class IssueSvidDto {
  @IsOptional()
  @IsNumber()
  ttlSeconds?: number;

  @IsOptional()
  @IsString()
  spiffeId?: string;
}

@ApiTags('trust-mesh')
@ApiBearerAuth()
@Controller('trust/mesh')
export class TrustMeshController {
  private tenantId(tenant?: TenantContext) {
    if (!tenant?.id) throw new BadRequestException('Tenant context required');
    return tenant.id;
  }

  @Post('bootstrap')
  @RequirePermission(PermissionIds.TRUST_WRITE)
  @ApiOperation({ summary: 'Bootstrap platform SPIFFE-compatible CA + trust bundle' })
  async bootstrap(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    const tenantId = this.tenantId(tenant);
    return bootstrapTrustCa(user.sub, tenantId);
  }

  @Get('bundle')
  @RequirePermission(PermissionIds.TRUST_READ)
  @ApiOperation({ summary: 'Get current trust bundle PEM' })
  async bundle() {
    const b = await getTrustBundle();
    if (!b) throw new NotFoundException('Trust bundle not found — bootstrap first');
    return b;
  }

  @Get('health')
  @RequirePermission(PermissionIds.TRUST_READ)
  @ApiOperation({ summary: 'Mesh / CA / SVID health and expiry monitoring' })
  async health() {
    return meshHealthSummary();
  }

  @Get('inventory')
  @RequirePermission(PermissionIds.TRUST_READ)
  @ApiOperation({ summary: 'Identity + SVID inventory' })
  async inventory(@CurrentTenant() tenant?: TenantContext) {
    const tenantId = this.tenantId(tenant);
    const rows = await query(
      `SELECT i.id, i.name, i.kind, i.status, i.spiffe_id, i.tenant_id,
              s.id AS svid_id, s.fingerprint_sha256, s.not_after, s.status AS svid_status
       FROM service_identities i
       LEFT JOIN workload_svids s ON s.identity_id = i.id AND s.status = 'active'
       WHERE i.tenant_id = $1 OR i.tenant_id IS NULL
       ORDER BY i.name ASC
       LIMIT 200`,
      [tenantId],
    );
    return { items: rows };
  }

  @Get('relationships')
  @RequirePermission(PermissionIds.TRUST_READ)
  @ApiOperation({ summary: 'Trust relationship visualization data' })
  async relationships() {
    const edges = await query(
      `SELECT 'gateway' AS source, i.name AS target, i.spiffe_id, s.status AS svid_status, s.not_after
       FROM service_identities i
       LEFT JOIN workload_svids s ON s.identity_id = i.id AND s.status = 'active'
       WHERE i.status = 'active'
       ORDER BY i.name
       LIMIT 100`,
    );
    return {
      trustDomain: process.env.SPIFFE_TRUST_DOMAIN ?? 'opsedge360.local',
      mtlsEnabled: mtlsEnabled(),
      edges,
    };
  }

  @Post('identities/:id/svid')
  @RequirePermission(PermissionIds.TRUST_MINT)
  @ApiOperation({ summary: 'Issue X.509 SVID for service identity' })
  async issueSvid(
    @Param('id') id: string,
    @Body() body: IssueSvidDto,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const tenantId = this.tenantId(tenant);
    const identity = await queryOne<{ id: string; name: string; tenant_id: string | null; spiffe_id: string | null }>(
      `SELECT id, name, tenant_id, spiffe_id FROM service_identities
       WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)`,
      [id, tenantId],
    );
    if (!identity) throw new NotFoundException('Identity not found');
    const spiffeId =
      body.spiffeId ??
      identity.spiffe_id ??
      buildSpiffeId(identity.name, identity.tenant_id ?? 'platform');
    const issued = await issueWorkloadSvid({
      identityId: identity.id,
      spiffeId,
      tenantId,
      actorId: user.sub,
      ttlSeconds: body.ttlSeconds,
    });
    return {
      svidId: issued.svidId,
      spiffeId: issued.spiffeId,
      fingerprint: issued.fingerprint,
      notAfter: issued.notAfter,
      pemCert: issued.pemCert,
      // private key returned once for materialize; not listed thereafter
      pemKey: issued.pemKey,
    };
  }

  @Post('svids/:id/rotate')
  @RequirePermission(PermissionIds.TRUST_MINT)
  @ApiOperation({ summary: 'Rotate SVID without interrupting JWT auth path' })
  async rotate(
    @Param('id') id: string,
    @Body() body: IssueSvidDto,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const tenantId = this.tenantId(tenant);
    const owned = await queryOne<{ id: string }>(
      `SELECT s.id FROM workload_svids s
       JOIN service_identities i ON i.id = s.identity_id
       WHERE s.id = $1 AND (i.tenant_id = $2 OR i.tenant_id IS NULL OR s.tenant_id = $2)`,
      [id, tenantId],
    );
    if (!owned) throw new NotFoundException('SVID not found');
    const issued = await rotateWorkloadSvid(id, user.sub, body.ttlSeconds);
    return {
      svidId: issued.svidId,
      spiffeId: issued.spiffeId,
      fingerprint: issued.fingerprint,
      notAfter: issued.notAfter,
      pemCert: issued.pemCert,
      pemKey: issued.pemKey,
    };
  }

  @Post('svids/:id/revoke')
  @RequirePermission(PermissionIds.TRUST_WRITE)
  @ApiOperation({ summary: 'Revoke SVID' })
  async revoke(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const tenantId = this.tenantId(tenant);
    const owned = await queryOne<{ id: string }>(
      `SELECT s.id FROM workload_svids s
       JOIN service_identities i ON i.id = s.identity_id
       WHERE s.id = $1 AND (i.tenant_id = $2 OR i.tenant_id IS NULL OR s.tenant_id = $2)`,
      [id, tenantId],
    );
    if (!owned) throw new NotFoundException('SVID not found');
    await revokeWorkloadSvid(id, user.sub, tenantId);
    return { ok: true, svidId: id };
  }

  @Post('materialize')
  @RequirePermission(PermissionIds.TRUST_WRITE)
  @ApiOperation({ summary: 'Write gateway/cmdb SVID PEMs to shared volume' })
  async materialize(@CurrentTenant() tenant?: TenantContext) {
    this.tenantId(tenant);
    const gatewayName = process.env.MESH_GATEWAY_IDENTITY_NAME ?? 'api-gateway';
    const cmdbName = process.env.MESH_CMDB_IDENTITY_NAME ?? 'cmdb';
    const rows = await query<{ id: string; name: string; svid_id: string }>(
      `SELECT i.id, i.name, s.id AS svid_id
       FROM service_identities i
       JOIN workload_svids s ON s.identity_id = i.id AND s.status = 'active'
       WHERE i.name = ANY($1::text[])`,
      [[gatewayName, cmdbName]],
    );
    if (rows.length < 2) {
      throw new BadRequestException(
        `Need active SVIDs for ${gatewayName} and ${cmdbName}. Issue SVIDs first.`,
      );
    }
    const written = await materializeWorkloadFiles(
      rows.map((r) => ({ name: r.name, svidId: r.svid_id })),
    );
    return written;
  }

  @Post('probe')
  @RequirePermission(PermissionIds.TRUST_READ)
  @ApiOperation({ summary: 'In-process mTLS handshake proof' })
  async probe() {
    return proveMtlsHandshake();
  }
}
