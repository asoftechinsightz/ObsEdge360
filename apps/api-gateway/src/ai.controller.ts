import { Controller, Get, Post, Param, Query, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from './auth/current-user.decorator';
import type { JwtPayload } from './auth/auth.service';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private proxy: ProxyService) {}

  @Get('health')
  @ApiOperation({ summary: 'LLM gateway health and provider status' })
  async health(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/ai/health', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('chat')
  @ApiOperation({ summary: 'LLM gateway chat completion (sole egress)' })
  async chat(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/ai/chat', {
      method: 'POST',
      body: body ?? {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('rag/documents')
  @ApiOperation({ summary: 'Ingest RAG document (chunked, tenant-scoped)' })
  async ingest(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/ai/rag/documents', {
      method: 'POST',
      body: body ?? {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('rag/documents')
  @ApiOperation({ summary: 'List RAG documents' })
  async listDocs(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/ai/rag/documents', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('rag/retrieve')
  @ApiOperation({ summary: 'Retrieve RAG chunks' })
  @ApiQuery({ name: 'q', required: true })
  async retrieve(
    @CurrentUser() user: JwtPayload,
    @Query('q') q: string,
    @Res() res: Response,
  ) {
    const result = await this.proxy.observability('/ai/rag/retrieve', {
      tenantId: user.tenantId,
      query: { q: q ?? '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Post('rca')
  @ApiOperation({ summary: 'Grounded LLM RCA session' })
  async rca(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/ai/rca', {
      method: 'POST',
      body: body ?? {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('rca')
  @ApiOperation({ summary: 'List LLM RCA sessions' })
  async listRca(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/ai/rca', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('rca/:id')
  @ApiOperation({ summary: 'Get LLM RCA session' })
  async getRca(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.observability(`/ai/rca/${id}`, { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('copilot')
  @ApiOperation({ summary: 'Conversational Copilot (grounded NL)' })
  async copilot(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/ai/copilot', {
      method: 'POST',
      body: body ?? {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('correlate')
  @ApiOperation({ summary: 'Advanced multi-signal AIOps correlation (metrics/logs/traces/alerts/changes)' })
  async correlate(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/ai/correlate', {
      method: 'POST',
      body: body ?? {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('correlations')
  @ApiOperation({ summary: 'List AIOps correlation events' })
  async correlations(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/ai/correlations', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('correlations/:id')
  @ApiOperation({ summary: 'Correlation cluster detail with members' })
  async correlationDetail(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const result = await this.proxy.observability(`/ai/correlations/${id}`, {
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('signals/collect')
  @ApiOperation({ summary: 'Collect multi-signal snapshot for correlation window' })
  async collectSignals(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/ai/signals/collect', {
      method: 'POST',
      body: body ?? {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('signals/snapshot')
  @ApiOperation({ summary: 'Latest signal collection snapshot' })
  async signalSnapshot(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/ai/signals/snapshot', {
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }
}
