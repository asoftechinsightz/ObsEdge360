import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Res, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from './auth/current-user.decorator';
import { Public } from './auth/public.decorator';
import type { JwtPayload } from './auth/auth.service';

@ApiTags('discovery')
@ApiBearerAuth()
@Controller('discovery')
export class DiscoveryProxyController {
  constructor(private proxy: ProxyService) {}

  @Get('connectors')
  @ApiOperation({ summary: 'List discovery connectors' })
  async listConnectors(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.discovery('/connectors', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('connectors')
  @ApiOperation({ summary: 'Create discovery connector' })
  async createConnector(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.discovery('/connectors', { method: 'POST', body, tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Patch('connectors/:id')
  @ApiOperation({ summary: 'Update discovery connector' })
  async updateConnector(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const result = await this.proxy.discovery(`/connectors/${id}`, { method: 'PATCH', body, tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Delete('connectors/:id')
  @ApiOperation({ summary: 'Delete discovery connector' })
  async deleteConnector(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.discovery(`/connectors/${id}`, { method: 'DELETE', tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('scan')
  @ApiOperation({ summary: 'Trigger discovery scan' })
  async triggerScan(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.discovery('/scan', { method: 'POST', body, tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('protocols')
  @ApiOperation({ summary: 'Supported discovery protocols' })
  async getProtocols(@Res() res: Response) {
    const result = await this.proxy.discovery('/protocols');
    return res.status(result.status).json(result.data);
  }

  @Get('agents')
  @ApiOperation({ summary: 'List discovery agents' })
  async listAgents(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.discovery('/agents', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('agents/register')
  @ApiOperation({ summary: 'Register a discovery agent' })
  async registerAgent(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.discovery('/agents/register', { method: 'POST', body, tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Public()
  @Post('agents/:id/heartbeat')
  @ApiOperation({ summary: 'Agent heartbeat + optional metrics (X-Agent-Key header)' })
  async agentHeartbeat(
    @Param('id') id: string,
    @Headers('x-agent-key') agentKey: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const result = await this.proxy.discovery(`/agents/${id}/heartbeat`, {
      method: 'POST',
      body,
      headers: { 'X-Agent-Key': agentKey },
    });
    return res.status(result.status).json(result.data);
  }

  @Public()
  @Post('agents/:id/metrics')
  @ApiOperation({ summary: 'Push host metrics from agent (X-Agent-Key header)' })
  async agentMetrics(
    @Param('id') id: string,
    @Headers('x-agent-key') agentKey: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const result = await this.proxy.discovery(`/agents/${id}/metrics`, {
      method: 'POST',
      body,
      headers: { 'X-Agent-Key': agentKey },
    });
    return res.status(result.status).json(result.data);
  }

  @Public()
  @Get('agents/:id/config')
  @ApiOperation({
    summary: 'Pull agent configuration (X-Agent-Key)',
    description: 'JWT not required. Discovery validates X-Agent-Key (ADR-004).',
  })
  async getAgentConfig(
    @Param('id') id: string,
    @Headers('x-agent-key') agentKey: string,
    @Res() res: Response,
  ) {
    const result = await this.proxy.discovery(`/agents/${id}/config`, {
      headers: { 'X-Agent-Key': agentKey ?? '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Public()
  @Put('agents/:id/config')
  @ApiOperation({
    summary: 'Push agent configuration revision (X-Agent-Key)',
  })
  async putAgentConfig(
    @Param('id') id: string,
    @Headers('x-agent-key') agentKey: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const result = await this.proxy.discovery(`/agents/${id}/config`, {
      method: 'PUT',
      body,
      headers: { 'X-Agent-Key': agentKey ?? '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Public()
  @Get('agents/:id/updates')
  @ApiOperation({
    summary: 'Check agent auto-update manifest (X-Agent-Key)',
  })
  async getAgentUpdates(
    @Param('id') id: string,
    @Headers('x-agent-key') agentKey: string,
    @Query('version') version: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.proxy.discovery(`/agents/${id}/updates`, {
      headers: { 'X-Agent-Key': agentKey ?? '' },
      query: { ...(version ? { version } : {}) },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('schedules')
  @ApiOperation({ summary: 'List scan schedules' })
  async listSchedules(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.discovery('/schedules', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('schedules')
  @ApiOperation({ summary: 'Create scan schedule' })
  async createSchedule(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.discovery('/schedules', { method: 'POST', body, tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Delete('schedules/:id')
  @ApiOperation({ summary: 'Delete scan schedule' })
  async deleteSchedule(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.discovery(`/schedules/${id}`, { method: 'DELETE', tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Discovery notifications' })
  async listNotifications(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.discovery('/notifications', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification read' })
  async markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.discovery(`/notifications/${id}/read`, { method: 'POST', tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }
}
