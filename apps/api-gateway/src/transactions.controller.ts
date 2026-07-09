import { Controller, Get, Post, Delete, Param, Body, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from './auth/current-user.decorator';
import type { JwtPayload } from './auth/auth.service';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private proxy: ProxyService) {}

  @Get()
  @ApiOperation({ summary: 'List business transactions' })
  async list(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.transactions('/transactions', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Transaction template library' })
  async templates(@Res() res: Response) {
    const result = await this.proxy.transactions('/transactions/templates');
    return res.status(result.status).json(result.data);
  }

  @Get('slos')
  @ApiOperation({ summary: 'SLA / SLO dashboard' })
  async sloDashboard(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.transactions('/transactions/slos', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('slos')
  @ApiOperation({ summary: 'Create transaction SLO' })
  async createSlo(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.transactions('/transactions/slos', {
      method: 'POST',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Delete('slos/:id')
  @ApiOperation({ summary: 'Delete transaction SLO' })
  async deleteSlo(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.transactions(`/transactions/slos/${id}`, {
      method: 'DELETE',
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('by-classification/:classification')
  @ApiOperation({ summary: 'Get transaction by classification code' })
  async getByClass(
    @CurrentUser() user: JwtPayload,
    @Param('classification') classification: string,
    @Res() res: Response,
  ) {
    const result = await this.proxy.transactions(
      `/transactions/by-classification/${classification}`,
      { tenantId: user.tenantId },
    );
    return res.status(result.status).json(result.data);
  }

  @Get(':id/flow')
  @ApiOperation({ summary: 'Transaction flow map' })
  async flowMap(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.transactions(`/transactions/${id}/flow`, {
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get(':id/correlate')
  @ApiOperation({ summary: 'Correlate transaction steps with OTLP traces' })
  async correlate(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.transactions(`/transactions/${id}/correlate`, {
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get(':id/latency')
  @ApiOperation({ summary: 'Latency time series' })
  @ApiQuery({ name: 'hours', required: false })
  async latency(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('hours') hours: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.proxy.transactions(`/transactions/${id}/latency`, {
      tenantId: user.tenantId,
      query: { ...(hours && { hours }) },
    });
    return res.status(result.status).json(result.data);
  }

  @Post(':id/samples')
  @ApiOperation({ summary: 'Record transaction latency sample' })
  async sample(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const result = await this.proxy.transactions(`/transactions/${id}/samples`, {
      method: 'POST',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction with end-to-end steps' })
  async getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.transactions(`/transactions/${id}`, { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('discover')
  @ApiOperation({ summary: 'Discover/classify transaction from trace' })
  async discover(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.transactions('/transactions/discover', {
      method: 'POST',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('classify')
  @ApiOperation({ summary: 'Classify trace name without persisting' })
  async classify(@Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.transactions('/transactions/classify', { method: 'POST', body });
    return res.status(result.status).json(result.data);
  }
}
