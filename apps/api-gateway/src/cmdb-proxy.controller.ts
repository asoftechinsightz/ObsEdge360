import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from './auth/current-user.decorator';
import type { JwtPayload } from './auth/auth.service';

@ApiTags('cmdb')
@ApiBearerAuth()
@Controller('cmdb')
export class CmdbProxyController {
  constructor(private proxy: ProxyService) {}

  @Get('cis')
  @ApiOperation({ summary: 'List configuration items' })
  @ApiQuery({ name: 'ciType', required: false })
  @ApiQuery({ name: 'search', required: false })
  async listCis(
    @CurrentUser() user: JwtPayload,
    @Query('ciType') ciType?: string,
    @Query('search') search?: string,
    @Res() res?: Response,
  ) {
    const result = await this.proxy.cmdb('/cis', {
      tenantId: user.tenantId,
      query: { ...(ciType && { ciType }), ...(search && { search }) },
    });
    return res!.status(result.status).json(result.data);
  }

  @Get('cis/:id')
  @ApiOperation({ summary: 'Get configuration item by ID' })
  async getCi(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.cmdb(`/cis/${id}`, { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('cis/:id/relationships')
  @ApiOperation({ summary: 'Get CI relationships' })
  async getRelationships(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.cmdb(`/cis/${id}/relationships`, { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('cis')
  @ApiOperation({ summary: 'Create or update configuration item' })
  async upsertCi(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.cmdb('/cis', { method: 'POST', body, tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Patch('cis/:id')
  @ApiOperation({ summary: 'Update configuration item' })
  async updateCi(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const result = await this.proxy.cmdb(`/cis/${id}`, { method: 'PATCH', body, tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Delete('cis/:id')
  @ApiOperation({ summary: 'Delete configuration item' })
  async deleteCi(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.cmdb(`/cis/${id}`, { method: 'DELETE', tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('relationships')
  @ApiOperation({ summary: 'List all relationships' })
  async listRelationships(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.cmdb('/relationships', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('relationships')
  @ApiOperation({ summary: 'Create relationship between CIs' })
  async createRelationship(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.cmdb('/relationships', { method: 'POST', body, tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Delete('relationships/:id')
  @ApiOperation({ summary: 'Delete relationship' })
  async deleteRelationship(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.cmdb(`/relationships/${id}`, { method: 'DELETE', tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('stats')
  @ApiOperation({ summary: 'CMDB statistics' })
  async getStats(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.cmdb('/stats', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('import')
  @ApiOperation({ summary: 'Bulk import configuration items' })
  async importCis(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.cmdb('/import', { method: 'POST', body, tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export CMDB as JSON or CSV' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  async exportCis(
    @CurrentUser() user: JwtPayload,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ) {
    const isCsv = format === 'csv';
    const result = await this.proxy.cmdb('/export', {
      tenantId: user.tenantId,
      query: { format: format ?? 'json' },
      responseType: isCsv ? 'text' : 'json',
    });
    if (isCsv) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="cmdb-export.csv"');
      return res.status(result.status).send(result.data);
    }
    return res.status(result.status).json(result.data);
  }

  @Post('topology/sync-traces')
  @ApiOperation({ summary: 'Sync trace-derived service dependencies into CMDB topology' })
  async syncTraces(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.cmdb('/topology/sync-traces', {
      method: 'POST',
      body: body ?? {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('topology/dependencies')
  @ApiOperation({ summary: 'List inferred topology dependencies (trace/discovery)' })
  @ApiQuery({ name: 'origin', required: false })
  async listDependencies(
    @CurrentUser() user: JwtPayload,
    @Query('origin') origin: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.proxy.cmdb('/topology/dependencies', {
      tenantId: user.tenantId,
      query: { ...(origin ? { origin } : {}) },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('topology/layers')
  @ApiOperation({ summary: 'Topology layer catalog with node counts' })
  async listLayers(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.cmdb('/topology/layers', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('topology/events')
  @ApiOperation({ summary: 'Poll live topology events cursor' })
  @ApiQuery({ name: 'afterId', required: false })
  async listTopologyEvents(
    @CurrentUser() user: JwtPayload,
    @Query('afterId') afterId: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.proxy.cmdb('/topology/events', {
      tenantId: user.tenantId,
      query: { ...(afterId ? { afterId } : {}) },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('topology/:type')
  @ApiOperation({
    summary: 'Get versioned topology snapshot',
    description:
      'Returns latest topology for type: application | infrastructure | cloud | network | business-service | kubernetes | service. Proxies CMDB topology engine.',
  })
  async getTopology(
    @CurrentUser() user: JwtPayload,
    @Param('type') type: string,
    @Res() res: Response,
  ) {
    const result = await this.proxy.cmdb(`/topology/${encodeURIComponent(type)}`, {
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('topology/:type/refresh')
  @ApiOperation({
    summary: 'Incrementally refresh and version a topology snapshot',
  })
  async refreshTopology(
    @CurrentUser() user: JwtPayload,
    @Param('type') type: string,
    @Res() res: Response,
  ) {
    const result = await this.proxy.cmdb(`/topology/${encodeURIComponent(type)}/refresh`, {
      method: 'POST',
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('topology/:type/layout')
  @ApiOperation({ summary: 'Compute and persist topology layout positions' })
  async layoutTopology(
    @CurrentUser() user: JwtPayload,
    @Param('type') type: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const result = await this.proxy.cmdb(`/topology/${encodeURIComponent(type)}/layout`, {
      method: 'POST',
      body: body ?? {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('assets')
  @ApiOperation({ summary: 'Asset inventory (CI alias)' })
  @ApiQuery({ name: 'ciType', required: false })
  @ApiQuery({ name: 'q', required: false })
  async listAssets(
    @CurrentUser() user: JwtPayload,
    @Query('ciType') ciType: string | undefined,
    @Query('q') q: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.proxy.cmdb('/assets', {
      tenantId: user.tenantId,
      query: { ...(ciType ? { ciType } : {}), ...(q ? { q } : {}) },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('drift')
  @ApiOperation({ summary: 'Configuration drift events' })
  async listDrift(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.cmdb('/drift', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('history')
  @ApiOperation({ summary: 'CI configuration history' })
  @ApiQuery({ name: 'ciId', required: true })
  async listHistory(
    @CurrentUser() user: JwtPayload,
    @Query('ciId') ciId: string,
    @Res() res: Response,
  ) {
    const result = await this.proxy.cmdb('/history', {
      tenantId: user.tenantId,
      query: { ciId },
    });
    return res.status(result.status).json(result.data);
  }
}
