import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { query, queryOne } from '@opsedge360/shared-db';
import {
  emitAudit,
  verifyEvidenceHash,
  type AuditEventV11,
  PermissionIds,
} from '@opsedge360/shared-security';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';
import { AuditEvidenceWriterService } from './audit-evidence-writer.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private writer: AuditEvidenceWriterService) {}

  @Post('events')
  @RequirePermission(PermissionIds.AUDIT_WRITE)
  @ApiOperation({ summary: 'Ingest audit event (L1 + queue for L2)' })
  async ingest(
    @Body() body: Partial<AuditEventV11>,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const tenantId = tenant?.id ?? body.tenantId;
    if (!tenantId) throw new BadRequestException('tenantId required');
    if (!body.action || !body.eventCategory || !body.eventType) {
      throw new BadRequestException('action, eventCategory, eventType required');
    }
    const result = await emitAudit({
      ...body,
      tenantId,
      organizationId: body.organizationId ?? tenantId,
      actor: body.actor ?? user.sub,
      actorType: body.actorType ?? 'user',
      action: body.action,
      eventCategory: body.eventCategory,
      eventType: body.eventType,
      sourceService: body.sourceService ?? 'api-gateway',
    } as AuditEventV11);
    return { ...result, schemaVersion: '1.1' };
  }

  @Get('events')
  @RequirePermission(PermissionIds.SECURITY_READ)
  @ApiOperation({ summary: 'Search operational audit events (Layer 1)' })
  async search(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Query('limit') limitStr?: string,
    @Query('action') action?: string,
    @Query('category') category?: string,
  ) {
    const tenantId = tenant?.id;
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const limit = Math.min(Number(limitStr ?? 50) || 50, 100);
    const rows = await query(
      `SELECT id, event_id, tenant_id, actor_id, actor_type, action, resource_type, resource_id,
              correlation_id, ip_address, metadata, schema_version, created_at
       FROM audit_logs
       WHERE tenant_id = $1
         AND ($2::text IS NULL OR action = $2)
         AND ($3::text IS NULL OR metadata->>'eventCategory' = $3)
       ORDER BY created_at DESC
       LIMIT $4`,
      [tenantId, action ?? null, category ?? null, limit],
    );
    return { items: rows, tenantId, limit };
  }

  @Get('evidence/export')
  @RequirePermission(PermissionIds.AUDIT_EXPORT)
  @ApiOperation({ summary: 'Export compliance evidence (Layer 2)' })
  async exportEvidence(
    @CurrentTenant() tenant: TenantContext | undefined,
    @Query('limit') limitStr?: string,
  ) {
    const tenantId = tenant?.id;
    if (!tenantId) throw new BadRequestException('Tenant context required');
    const limit = Math.min(Number(limitStr ?? 100) || 100, 500);
    const rows = await query(
      `SELECT id, event_id, tenant_id, organization_id, event_category, event_type,
              content_hash, schema_version, created_at
       FROM audit_evidence
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [tenantId, limit],
    );
    await emitAudit({
      tenantId,
      organizationId: tenantId,
      eventCategory: 'data_export',
      eventType: 'evidence_export',
      action: 'audit.evidence.export',
      outcome: 'success',
      actorType: 'user',
      sourceService: 'api-gateway',
    });
    return { items: rows, count: rows.length };
  }

  @Get('evidence/:id/verify')
  @RequirePermission(PermissionIds.COMPLIANCE_VIEW)
  @ApiOperation({ summary: 'Verify evidence content hash' })
  async verify(@Param('id') id: string, @CurrentTenant() tenant?: TenantContext) {
    if (!tenant?.id) throw new BadRequestException('Tenant context required');
    const result = await verifyEvidenceHash(id, tenant.id);
    if (!result.eventId && !result.ok) throw new NotFoundException('Evidence not found');
    return result;
  }

  @Get('retention')
  @RequirePermission(PermissionIds.SECURITY_READ)
  @ApiOperation({ summary: 'List retention policies' })
  async listRetention(@CurrentTenant() tenant?: TenantContext) {
    const rows = await query(
      `SELECT id, tenant_id, retention_class, retention_days, applies_to, updated_at
       FROM audit_retention_policies
       WHERE tenant_id IS NULL OR tenant_id = $1
       ORDER BY retention_class`,
      [tenant?.id ?? null],
    );
    return { items: rows };
  }

  @Put('retention')
  @RequirePermission(PermissionIds.SECURITY_WRITE)
  @ApiOperation({ summary: 'Upsert tenant retention policy' })
  async upsertRetention(
    @Body()
    body: { retentionClass: string; retentionDays: number; appliesTo?: string },
    @CurrentTenant() tenant?: TenantContext,
  ) {
    if (!tenant?.id) throw new BadRequestException('Tenant context required');
    if (!body.retentionClass || !body.retentionDays) {
      throw new BadRequestException('retentionClass and retentionDays required');
    }
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM audit_retention_policies WHERE tenant_id = $1 AND retention_class = $2`,
      [tenant.id, body.retentionClass],
    );
    if (existing) {
      await query(
        `UPDATE audit_retention_policies
         SET retention_days = $3, applies_to = $4, updated_at = NOW()
         WHERE tenant_id = $1 AND retention_class = $2`,
        [tenant.id, body.retentionClass, body.retentionDays, body.appliesTo ?? 'both'],
      );
    } else {
      await query(
        `INSERT INTO audit_retention_policies (tenant_id, retention_class, retention_days, applies_to)
         VALUES ($1, $2, $3, $4)`,
        [tenant.id, body.retentionClass, body.retentionDays, body.appliesTo ?? 'both'],
      );
    }
    return { ok: true };
  }

  @Post('legal-holds')
  @RequirePermission(PermissionIds.SECURITY_WRITE)
  @ApiOperation({ summary: 'Create legal hold' })
  async createHold(
    @Body() body: { reason: string },
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    if (!tenant?.id) throw new BadRequestException('Tenant context required');
    if (!body.reason) throw new BadRequestException('reason required');
    const row = await queryOne(
      `INSERT INTO audit_legal_holds (tenant_id, reason, created_by)
       VALUES ($1, $2, $3) RETURNING id, tenant_id, reason, active, created_at`,
      [tenant.id, body.reason, user.sub],
    );
    return row;
  }

  @Delete('legal-holds/:id')
  @RequirePermission(PermissionIds.SECURITY_WRITE)
  @ApiOperation({ summary: 'Release legal hold' })
  async releaseHold(@Param('id') id: string, @CurrentTenant() tenant?: TenantContext) {
    if (!tenant?.id) throw new BadRequestException('Tenant context required');
    await query(
      `UPDATE audit_legal_holds SET active = false, released_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenant.id],
    );
    return { ok: true };
  }

  @Get('health')
  @RequirePermission(PermissionIds.SECURITY_READ)
  @ApiOperation({ summary: 'Audit pipeline health (writer + outbox depth)' })
  async health() {
    return this.writer.status();
  }
}
