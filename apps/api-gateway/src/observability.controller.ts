import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from './auth/current-user.decorator';
import type { JwtPayload } from './auth/auth.service';

@ApiTags('observability')
@ApiBearerAuth()
@Controller('observability')
export class ObservabilityController {
  constructor(private proxy: ProxyService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Telemetry ingestion summary' })
  async getSummary(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/metrics/summary', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('infra/summary')
  @ApiOperation({ summary: 'Infrastructure monitoring summary' })
  async getInfraSummary(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/infra/summary', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('otlp/metrics')
  @ApiOperation({ summary: 'Ingest OTLP metrics (JSON)' })
  async ingestMetrics(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/v1/metrics', {
      method: 'POST',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('otlp/logs')
  @ApiOperation({ summary: 'Ingest OTLP logs (JSON)' })
  async ingestLogs(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/v1/logs', {
      method: 'POST',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('otlp/traces')
  @ApiOperation({ summary: 'Ingest OTLP traces (JSON)' })
  async ingestTraces(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/v1/traces', {
      method: 'POST',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('apm/summary')
  @ApiOperation({ summary: 'APM summary' })
  async apmSummary(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/apm/summary', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('apm/service-map')
  @ApiOperation({ summary: 'Service map from traces' })
  @ApiQuery({ name: 'hours', required: false })
  async serviceMap(
    @CurrentUser() user: JwtPayload,
    @Query('hours') hours: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.proxy.observability('/apm/service-map', {
      tenantId: user.tenantId,
      query: { ...(hours && { hours }) },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('apm/traces')
  @ApiOperation({ summary: 'Recent traces' })
  async listTraces(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/apm/traces', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('apm/traces/:traceId')
  @ApiOperation({ summary: 'Trace detail' })
  async getTrace(@CurrentUser() user: JwtPayload, @Param('traceId') traceId: string, @Res() res: Response) {
    const result = await this.proxy.observability(`/apm/traces/${traceId}`, { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('apm/logs')
  @ApiOperation({ summary: 'Search logs' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'service', required: false })
  @ApiQuery({ name: 'traceId', required: false })
  async searchLogs(
    @CurrentUser() user: JwtPayload,
    @Query('q') q: string | undefined,
    @Query('severity') severity: string | undefined,
    @Query('service') service: string | undefined,
    @Query('traceId') traceId: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.proxy.observability('/apm/logs', {
      tenantId: user.tenantId,
      query: {
        ...(q && { q }),
        ...(severity && { severity }),
        ...(service && { service }),
        ...(traceId && { traceId }),
      },
    });
    return res.status(result.status).json(result.data);
  }

  @Post('health-score/sync')
  @ApiOperation({ summary: 'Sync CI health scores from telemetry' })
  async syncHealthScores(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/health-score/sync', {
      method: 'POST',
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('scrape-targets')
  @ApiOperation({ summary: 'List Prometheus scrape targets' })
  async listTargets(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/scrape-targets', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('scrape-targets')
  @ApiOperation({ summary: 'Create scrape target' })
  async createTarget(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/scrape-targets', {
      method: 'POST',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Patch('scrape-targets/:id')
  @ApiOperation({ summary: 'Update scrape target' })
  async updateTarget(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const result = await this.proxy.observability(`/scrape-targets/${id}`, {
      method: 'PATCH',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Delete('scrape-targets/:id')
  @ApiOperation({ summary: 'Delete scrape target' })
  async deleteTarget(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.observability(`/scrape-targets/${id}`, {
      method: 'DELETE',
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('scrape-targets/:id/scrape')
  @ApiOperation({ summary: 'Live Prometheus scrape for target' })
  async runScrape(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.observability(`/scrape-targets/${id}/scrape`, {
      method: 'POST',
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('scrape-targets/scrape-all')
  @ApiOperation({ summary: 'Live scrape all enabled targets' })
  async scrapeAll(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/scrape-targets/scrape-all', {
      method: 'POST',
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('prometheus/write')
  @ApiOperation({ summary: 'Prometheus remote_write (JSON or metrics text field)' })
  async promWrite(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/prometheus/write', {
      method: 'POST',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('prometheus/remote_write')
  @ApiOperation({ summary: 'Prometheus remote_write ingest' })
  async promRemoteWrite(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/prometheus/remote_write', {
      method: 'POST',
      body,
      tenantId: user.tenantId,
      headers: { Accept: 'application/json' },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('prometheus/samples')
  @ApiOperation({ summary: 'Recent Prometheus samples' })
  async promSamples(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/prometheus/samples', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('hosts')
  @ApiOperation({ summary: 'Host metrics dashboard' })
  async getHosts(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/hosts', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('hosts/metrics')
  @ApiOperation({ summary: 'Ingest host metrics' })
  async ingestHosts(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/hosts/metrics', {
      method: 'POST',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('channels')
  @ApiOperation({ summary: 'Notification channels' })
  async listChannels(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/channels', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('channels')
  @ApiOperation({ summary: 'Create notification channel' })
  async createChannel(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/channels', {
      method: 'POST',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Delete('channels/:id')
  @ApiOperation({ summary: 'Delete notification channel' })
  async deleteChannel(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.observability(`/channels/${id}`, {
      method: 'DELETE',
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('alert-rules')
  @ApiOperation({ summary: 'List alert rules' })
  async listRules(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/alert-rules', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('alert-rules')
  @ApiOperation({ summary: 'Create alert rule' })
  async createRule(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/alert-rules', {
      method: 'POST',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Patch('alert-rules/:id')
  @ApiOperation({ summary: 'Update alert rule' })
  async updateRule(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const result = await this.proxy.observability(`/alert-rules/${id}`, {
      method: 'PATCH',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Delete('alert-rules/:id')
  @ApiOperation({ summary: 'Delete alert rule' })
  async deleteRule(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.observability(`/alert-rules/${id}`, {
      method: 'DELETE',
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('alert-rules/evaluate')
  @ApiOperation({ summary: 'Evaluate alert rules against latest host metrics' })
  async evaluateRules(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/alert-rules/evaluate', {
      method: 'POST',
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('alert-events')
  @ApiOperation({ summary: 'Recent alert events' })
  async listEvents(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/alert-events', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('pipeline/sources')
  @ApiOperation({
    summary: 'List telemetry pipeline sources',
    description: 'Enterprise log/metric source adapters (nginx, syslog, cloudwatch, etc.).',
  })
  async listPipelineSources(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/pipeline/sources', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('pipeline/sources')
  @ApiOperation({ summary: 'Register a telemetry pipeline source' })
  async createPipelineSource(
    @CurrentUser() user: JwtPayload,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const result = await this.proxy.observability('/pipeline/sources', {
      method: 'POST',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('pipeline/ingest/:sourceId')
  @ApiOperation({ summary: 'Ingest payload into a registered telemetry source' })
  async ingestPipeline(
    @CurrentUser() user: JwtPayload,
    @Param('sourceId') sourceId: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const result = await this.proxy.observability(`/pipeline/ingest/${encodeURIComponent(sourceId)}`, {
      method: 'POST',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('telemetry/health')
  @ApiOperation({ summary: 'Telemetry platform health KPIs' })
  async telemetryHealth(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/telemetry/health', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('telemetry/collectors')
  @ApiOperation({ summary: 'List OTel collectors' })
  async listCollectors(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/telemetry/collectors', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('telemetry/collectors')
  @ApiOperation({ summary: 'Register OTel collector' })
  async registerCollector(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/telemetry/collectors', {
      method: 'POST',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('telemetry/collectors/:id/heartbeat')
  @ApiOperation({ summary: 'Collector heartbeat' })
  async collectorHeartbeat(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const result = await this.proxy.observability(`/telemetry/collectors/${encodeURIComponent(id)}/heartbeat`, {
      method: 'POST',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('telemetry/stats')
  @ApiOperation({ summary: 'Telemetry ingest stats' })
  @ApiQuery({ name: 'hours', required: false })
  async telemetryStats(
    @CurrentUser() user: JwtPayload,
    @Query('hours') hours: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.proxy.observability('/telemetry/stats', {
      tenantId: user.tenantId,
      query: { ...(hours && { hours }) },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('telemetry/quality')
  @ApiOperation({ summary: 'Telemetry quality events' })
  async telemetryQuality(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/telemetry/quality', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('telemetry/retention')
  @ApiOperation({ summary: 'List telemetry retention policies' })
  async listRetention(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/telemetry/retention', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('telemetry/retention')
  @ApiOperation({ summary: 'Upsert telemetry retention policy' })
  async upsertRetention(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/telemetry/retention', {
      method: 'POST',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('telemetry/retention/apply')
  @ApiOperation({ summary: 'Apply telemetry retention (delete aged rows)' })
  async applyRetention(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/telemetry/retention/apply', {
      method: 'POST',
      body: {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }
}
