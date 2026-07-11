import { Controller, Get, Post, Param, Query, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from './auth/current-user.decorator';
import type { JwtPayload } from './auth/auth.service';

@ApiTags('ops-intelligence')
@ApiBearerAuth()
@Controller('ops-intelligence')
export class OpsIntelligenceController {
  constructor(private proxy: ProxyService) {}

  @Get('health')
  @ApiOperation({ summary: 'Ops intelligence KPI health' })
  async health(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/ops-intelligence/health', {
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('correlate')
  @ApiOperation({ summary: 'Correlate alerts and anomalies into incidents' })
  async correlate(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/ops-intelligence/correlate', {
      method: 'POST',
      body: body ?? {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('incidents')
  @ApiOperation({ summary: 'List correlated incidents' })
  @ApiQuery({ name: 'status', required: false })
  async listIncidents(
    @CurrentUser() user: JwtPayload,
    @Query('status') status: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.proxy.observability('/ops-intelligence/incidents', {
      tenantId: user.tenantId,
      query: { ...(status ? { status } : {}) },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('incidents/:id')
  @ApiOperation({ summary: 'Get incident detail' })
  async getIncident(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.observability(`/ops-intelligence/incidents/${id}`, {
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('rca')
  @ApiOperation({ summary: 'Run evidence-based RCA session' })
  async rca(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/ops-intelligence/rca', {
      method: 'POST',
      body: body ?? {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('rca/:id')
  @ApiOperation({ summary: 'Get RCA session' })
  async getRca(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.observability(`/ops-intelligence/rca/${id}`, {
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('anomalies/scan')
  @ApiOperation({ summary: 'Scan metrics for anomalies against rolling baselines' })
  async scanAnomalies(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/ops-intelligence/anomalies/scan', {
      method: 'POST',
      body: body ?? {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('anomalies')
  @ApiOperation({ summary: 'List anomalies' })
  async listAnomalies(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/ops-intelligence/anomalies', {
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('forecasts/generate')
  @ApiOperation({ summary: 'Generate trend-v1 forecasts from real metric samples' })
  async generateForecasts(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/ops-intelligence/forecasts/generate', {
      method: 'POST',
      body: body ?? {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('forecasts')
  @ApiOperation({ summary: 'List predictive forecasts' })
  async listForecasts(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/ops-intelligence/forecasts', {
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('remediation/request')
  @ApiOperation({ summary: 'Request remediation (Wave 5 dry-run path)' })
  async requestRemediation(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/ops-intelligence/remediation/request', {
      method: 'POST',
      body: body ?? {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('remediation/approvals')
  @ApiOperation({ summary: 'List remediation approvals' })
  async listApprovals(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/ops-intelligence/remediation/approvals', {
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('remediation/approvals/:id/execute')
  @ApiOperation({ summary: 'Execute remediation dry-run' })
  async execute(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const result = await this.proxy.observability(
      `/ops-intelligence/remediation/approvals/${id}/execute`,
      { method: 'POST', body: {}, tenantId: user.tenantId },
    );
    return res.status(result.status).json(result.data);
  }

  @Get('signals')
  @ApiOperation({ summary: 'Unified ops intelligence signal feed' })
  async signals(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/ops-intelligence/signals', {
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }
}
