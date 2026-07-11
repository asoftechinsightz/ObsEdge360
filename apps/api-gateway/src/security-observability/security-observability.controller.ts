import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import { query, queryOne } from '@opsedge360/shared-db';
import {
  ingestSecurityEvent,
  securityDashboard,
  PermissionIds,
  getSecurityMetrics,
} from '@opsedge360/shared-security';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';

class IngestEventDto {
  @IsString()
  eventType!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  traceId?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

class CreateRuleDto {
  @IsString()
  name!: string;

  @IsString()
  ruleType!: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

@ApiTags('security-observability')
@ApiBearerAuth()
@Controller('security-observability')
export class SecurityObservabilityController {
  private tenantId(tenant?: TenantContext) {
    if (!tenant?.id) throw new BadRequestException('Tenant context required');
    return tenant.id;
  }

  @Get('health')
  @RequirePermission(PermissionIds.SECURITY_READ)
  @ApiOperation({ summary: 'Security observability pipeline health' })
  async health(@CurrentTenant() tenant?: TenantContext) {
    const tenantId = this.tenantId(tenant);
    const events = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM security_events WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
      [tenantId],
    ).catch(() => ({ c: '0' }));
    return {
      ok: true,
      enabled: process.env.SECURITY_OBS_ENABLED !== 'false',
      eventsLast24h: Number(events?.c ?? 0),
      processMetrics: getSecurityMetrics(),
    };
  }

  @Post('events')
  @RequirePermission(PermissionIds.SECURITY_WRITE)
  @ApiOperation({ summary: 'Ingest security observability event' })
  async ingest(
    @Body() body: IngestEventDto,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const tenantId = this.tenantId(tenant);
    if (!body.eventType) throw new BadRequestException('eventType required');
    const actorUuid = /^[0-9a-f-]{36}$/i.test(user.sub) ? user.sub : undefined;
    return ingestSecurityEvent({
      tenantId,
      eventType: body.eventType,
      category: body.category,
      severity: body.severity,
      actorId: actorUuid,
      correlationId: body.correlationId,
      traceId: body.traceId,
      payload: body.payload,
      sourceService: 'api-gateway',
    });
  }

  @Get('events')
  @RequirePermission(PermissionIds.SECURITY_READ)
  @ApiOperation({ summary: 'Search security events' })
  async search(
    @CurrentTenant() tenant?: TenantContext,
    @Query('limit') limitStr?: string,
    @Query('eventType') eventType?: string,
    @Query('correlationId') correlationId?: string,
  ) {
    const tenantId = this.tenantId(tenant);
    const limit = Math.min(Number(limitStr ?? 50) || 50, 200);
    const items = await query(
      `SELECT id, event_type, category, severity, source_service, correlation_id, trace_id, risk_score, created_at
       FROM security_events
       WHERE tenant_id = $1
         AND ($2::text IS NULL OR event_type = $2)
         AND ($3::text IS NULL OR correlation_id = $3)
       ORDER BY created_at DESC
       LIMIT $4`,
      [tenantId, eventType ?? null, correlationId ?? null, limit],
    );
    return { items, limit };
  }

  @Get('dashboard')
  @RequirePermission(PermissionIds.SECURITY_READ)
  @ApiOperation({ summary: 'Security posture dashboard KPIs' })
  async dashboard(@CurrentTenant() tenant?: TenantContext, @Query('hours') hoursStr?: string) {
    const tenantId = this.tenantId(tenant);
    const hours = Math.min(Number(hoursStr ?? 24) || 24, 168);
    return securityDashboard(tenantId, hours);
  }

  @Get('rules')
  @RequirePermission(PermissionIds.SECURITY_READ)
  @ApiOperation({ summary: 'List detection rules' })
  async listRules(@CurrentTenant() tenant?: TenantContext) {
    const tenantId = this.tenantId(tenant);
    const items = await query(
      `SELECT id, tenant_id, name, enabled, rule_type, config, severity, created_at
       FROM security_detection_rules
       WHERE tenant_id IS NULL OR tenant_id = $1
       ORDER BY name`,
      [tenantId],
    );
    return { items };
  }

  @Post('rules')
  @RequirePermission(PermissionIds.SECURITY_WRITE)
  @ApiOperation({ summary: 'Create tenant detection rule' })
  async createRule(@Body() body: CreateRuleDto, @CurrentTenant() tenant?: TenantContext) {
    const tenantId = this.tenantId(tenant);
    if (!body.name || !body.ruleType) throw new BadRequestException('name and ruleType required');
    const row = await queryOne(
      `INSERT INTO security_detection_rules (tenant_id, name, enabled, rule_type, config, severity)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, name, enabled, rule_type, severity`,
      [
        tenantId,
        body.name,
        body.enabled ?? true,
        body.ruleType,
        JSON.stringify(body.config ?? {}),
        body.severity ?? 'medium',
      ],
    );
    return row;
  }

  @Get('alerts')
  @RequirePermission(PermissionIds.SECURITY_READ)
  @ApiOperation({ summary: 'List security alerts' })
  async listAlerts(@CurrentTenant() tenant?: TenantContext, @Query('status') status?: string) {
    const tenantId = this.tenantId(tenant);
    const items = await query(
      `SELECT id, rule_id, title, severity, status, summary, created_at, acked_at
       FROM security_alerts
       WHERE tenant_id = $1 AND ($2::text IS NULL OR status = $2)
       ORDER BY created_at DESC
       LIMIT 100`,
      [tenantId, status ?? null],
    );
    return { items };
  }

  @Post('alerts/:id/ack')
  @RequirePermission(PermissionIds.SECURITY_WRITE)
  @ApiOperation({ summary: 'Acknowledge security alert' })
  async ackAlert(@Param('id') id: string, @CurrentTenant() tenant?: TenantContext) {
    const tenantId = this.tenantId(tenant);
    const row = await queryOne(
      `UPDATE security_alerts SET status = 'acked', acked_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING id, status, acked_at`,
      [id, tenantId],
    );
    if (!row) throw new NotFoundException('Alert not found');
    return row;
  }
}
