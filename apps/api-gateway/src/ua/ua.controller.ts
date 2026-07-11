import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString, IsNumber } from 'class-validator';
import { PermissionIds } from '@opsedge360/shared-security';
import { RequirePermission } from '../auth/require-permission.decorator';
import { Public } from '../auth/public.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { TenantContext } from '../auth/authorization.guard';
import * as ua from './ua.service';

class RegisterDto {
  @IsString()
  name!: string;

  @IsOptional() @IsString() hostname?: string;
  @IsOptional() @IsString() platform?: string;
  @IsOptional() @IsString() osVersion?: string;
  @IsOptional() @IsString() architecture?: string;
  @IsOptional() @IsString() version?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) capabilities?: string[];
  @IsOptional() @IsObject() labels?: Record<string, unknown>;
}

class EnrollDto extends RegisterDto {
  @IsString()
  bootstrapToken!: string;

  @IsOptional() @IsObject() inventory?: Record<string, unknown>;
}

class BootstrapTokenDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsNumber() ttlHours?: number;
  @IsOptional() @IsNumber() maxUses?: number;
}

class BulkStatusDto {
  @IsArray()
  @IsString({ each: true })
  agentIds!: string[];

  @IsString()
  status!: string;
}

@ApiTags('universal-agent')
@Controller('ua')
export class UaController {
  private tenantId(tenant?: TenantContext) {
    if (!tenant?.id) throw new BadRequestException('Tenant context required');
    return tenant.id;
  }

  private async requireAgent(agentId: string, keyHeader?: string) {
    if (!keyHeader) throw new UnauthorizedException({ code: 'AGENT_KEY_REQUIRED', message: 'X-Agent-Key required' });
    const agent = await ua.authenticateAgent(agentId, keyHeader);
    if (!agent) throw new UnauthorizedException({ code: 'AGENT_AUTH_INVALID', message: 'Invalid agent credentials' });
    return agent;
  }

  @Get('summary')
  @ApiBearerAuth()
  @RequirePermission(PermissionIds.DISCOVERY_READ)
  @ApiOperation({ summary: 'Universal agent fleet summary' })
  async summary(@CurrentTenant() tenant?: TenantContext) {
    return ua.fleetSummary(this.tenantId(tenant));
  }

  @Get('agents')
  @ApiBearerAuth()
  @RequirePermission(PermissionIds.DISCOVERY_READ)
  @ApiOperation({ summary: 'List universal agents' })
  async list(
    @CurrentTenant() tenant?: TenantContext,
    @Query('q') q?: string,
    @Query('platform') platform?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return ua.listUaAgents(this.tenantId(tenant), {
      q,
      platform,
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Post('agents/bulk-status')
  @ApiBearerAuth()
  @RequirePermission(PermissionIds.DISCOVERY_WRITE)
  @ApiOperation({ summary: 'Bulk update agent status' })
  async bulkStatus(@Body() body: BulkStatusDto, @CurrentTenant() tenant?: TenantContext) {
    return ua.bulkSetStatus(this.tenantId(tenant), body.agentIds ?? [], body.status);
  }

  @Get('agents/:id')
  @ApiBearerAuth()
  @RequirePermission(PermissionIds.DISCOVERY_READ)
  @ApiOperation({ summary: 'Get universal agent' })
  async getOne(@Param('id') id: string, @CurrentTenant() tenant?: TenantContext) {
    const row = await ua.getUaAgent(this.tenantId(tenant), id);
    if (!row) throw new NotFoundException('Agent not found');
    return row;
  }

  @Post('agents/register')
  @ApiBearerAuth()
  @RequirePermission(PermissionIds.DISCOVERY_WRITE)
  @ApiOperation({ summary: 'Register universal agent (console)' })
  async register(@Body() body: RegisterDto, @CurrentTenant() tenant?: TenantContext) {
    return ua.registerUaAgent(this.tenantId(tenant), body);
  }

  @Post('bootstrap-tokens')
  @ApiBearerAuth()
  @RequirePermission(PermissionIds.DISCOVERY_WRITE)
  @ApiOperation({ summary: 'Create agent bootstrap enrollment token' })
  async createBootstrap(@Body() body: BootstrapTokenDto, @CurrentTenant() tenant?: TenantContext) {
    return ua.createBootstrapToken(this.tenantId(tenant), body);
  }

  @Post('enroll')
  @Public()
  @ApiOperation({ summary: 'Enroll agent with bootstrap token (no user JWT)' })
  async enroll(@Body() body: EnrollDto) {
    if (!body.bootstrapToken) throw new BadRequestException('bootstrapToken required');
    return ua.enrollWithBootstrapToken(body);
  }

  @Post('agents/:id/heartbeat')
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: 'Agent heartbeat + optional health' })
  async heartbeat(
    @Param('id') id: string,
    @Headers('x-agent-key') agentKey: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const agent = await this.requireAgent(id, agentKey);
    return ua.heartbeatUa(agent, {
      status: body.status as string | undefined,
      version: body.version as string | undefined,
      hostname: body.hostname as string | undefined,
      metrics: body.metrics as Record<string, unknown> | undefined,
      health: body.health as {
        healthy?: boolean;
        queueDepth?: number;
        cpuUsage?: number;
        memoryUsage?: number;
        collectorStatus?: Record<string, unknown>;
        details?: Record<string, unknown>;
      },
    });
  }

  @Post('agents/:id/inventory')
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: 'Upload agent inventory' })
  async inventory(
    @Param('id') id: string,
    @Headers('x-agent-key') agentKey: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const agent = await this.requireAgent(id, agentKey);
    return ua.upsertInventory(agent.tenant_id, agent.id, body);
  }

  @Get('agents/:id/health')
  @ApiBearerAuth()
  @RequirePermission(PermissionIds.DISCOVERY_READ)
  @ApiOperation({ summary: 'Get latest agent health' })
  async health(@Param('id') id: string, @CurrentTenant() tenant?: TenantContext) {
    const tenantId = this.tenantId(tenant);
    const agent = await ua.getUaAgent(tenantId, id);
    if (!agent) throw new NotFoundException('Agent not found');
    const { queryOne } = await import('@opsedge360/shared-db');
    const row = await queryOne(`SELECT * FROM agent_health WHERE agent_id = $1 AND tenant_id = $2`, [
      id,
      tenantId,
    ]);
    return { agent, health: row };
  }

  @Get('agents/:id/config')
  @Public()
  @ApiOperation({ summary: 'Pull remote configuration' })
  async getConfig(@Param('id') id: string, @Headers('x-agent-key') agentKey: string | undefined) {
    const agent = await this.requireAgent(id, agentKey);
    const cfg = await ua.getConfig(agent.id, agent.tenant_id);
    if (!cfg) throw new NotFoundException('Config not found');
    return cfg;
  }

  @Put('agents/:id/config')
  @ApiBearerAuth()
  @RequirePermission(PermissionIds.DISCOVERY_WRITE)
  @ApiOperation({ summary: 'Push remote configuration (console)' })
  async putConfig(
    @Param('id') id: string,
    @Body() body: { config: Record<string, unknown> },
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const tenantId = this.tenantId(tenant);
    const agent = await ua.getUaAgent(tenantId, id);
    if (!agent) throw new NotFoundException('Agent not found');
    return ua.setConfig(tenantId, id, body.config ?? {});
  }

  @Post('agents/:id/plugins')
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: 'Report plugin status' })
  async plugins(
    @Param('id') id: string,
    @Headers('x-agent-key') agentKey: string | undefined,
    @Body() body: { plugins: Array<{ pluginId: string; name: string; version?: string; status?: string }> },
  ) {
    const agent = await this.requireAgent(id, agentKey);
    return ua.reportPlugins(agent.tenant_id, agent.id, body.plugins ?? []);
  }

  @Get('agents/:id/updates')
  @Public()
  @ApiOperation({ summary: 'Check update manifest (no download)' })
  async updates(@Param('id') id: string, @Headers('x-agent-key') agentKey: string | undefined) {
    const agent = await this.requireAgent(id, agentKey);
    const manifest = await ua.getUpdateManifest(agent.tenant_id, agent.platform);
    return manifest ?? { updateAvailable: false };
  }

  @Post('agents/:id/telemetry/metrics')
  @Public()
  @ApiOperation({ summary: 'Upload OTLP-style metrics batch via agent auth' })
  async uploadMetrics(
    @Param('id') id: string,
    @Headers('x-agent-key') agentKey: string | undefined,
    @Body() body: unknown,
  ) {
    const agent = await this.requireAgent(id, agentKey);
    return this.forwardOtlp(agent.tenant_id, '/v1/metrics', body);
  }

  @Post('agents/:id/telemetry/logs')
  @Public()
  @ApiOperation({ summary: 'Upload OTLP-style logs batch via agent auth' })
  async uploadLogs(
    @Param('id') id: string,
    @Headers('x-agent-key') agentKey: string | undefined,
    @Body() body: unknown,
  ) {
    const agent = await this.requireAgent(id, agentKey);
    return this.forwardOtlp(agent.tenant_id, '/v1/logs', body);
  }

  @Post('agents/:id/telemetry/traces')
  @Public()
  @ApiOperation({ summary: 'Upload OTLP-style traces batch via agent auth' })
  async uploadTraces(
    @Param('id') id: string,
    @Headers('x-agent-key') agentKey: string | undefined,
    @Body() body: unknown,
  ) {
    const agent = await this.requireAgent(id, agentKey);
    return this.forwardOtlp(agent.tenant_id, '/v1/traces', body);
  }

  private async forwardOtlp(tenantId: string, path: string, body: unknown) {
    const base = process.env.OBSERVABILITY_URL ?? 'http://localhost:4003';
    const axios = (await import('axios')).default;
    const res = await axios.post(`${base}${path}`, body, {
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId },
      validateStatus: () => true,
      timeout: 10000,
    });
    return { status: res.status, data: res.data };
  }
}
