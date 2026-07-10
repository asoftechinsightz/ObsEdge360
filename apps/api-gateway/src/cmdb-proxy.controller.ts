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

  @Get('topology/:type')
  @ApiOperation({
    summary: 'Get versioned topology snapshot',
    description:
      'Returns latest topology for type: application | infrastructure | cloud | network | business-service. Proxies CMDB topology engine.',
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
}
