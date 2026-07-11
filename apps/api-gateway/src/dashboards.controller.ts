import { Controller, Get, Post, Patch, Put, Delete, Param, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from './auth/current-user.decorator';
import type { JwtPayload } from './auth/auth.service';

@ApiTags('dashboards')
@ApiBearerAuth()
@Controller('dashboards')
export class DashboardsController {
  constructor(private proxy: ProxyService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Widget catalog' })
  async catalog(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/dashboards/catalog', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get()
  @ApiOperation({ summary: 'List dashboards' })
  async list(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/dashboards', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post()
  @ApiOperation({ summary: 'Create dashboard' })
  async create(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/dashboards', {
      method: 'POST',
      body: body ?? {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('default')
  @ApiOperation({ summary: 'Ensure default NOC dashboard' })
  async ensureDefault(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/dashboards/default', {
      method: 'POST',
      body: {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dashboard with widgets' })
  async get(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.observability(`/dashboards/${id}`, { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update dashboard' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const result = await this.proxy.observability(`/dashboards/${id}`, {
      method: 'PATCH',
      body: body ?? {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete dashboard' })
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.observability(`/dashboards/${id}`, {
      method: 'DELETE',
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get(':id/data')
  @ApiOperation({ summary: 'Resolve all widget data for dashboard' })
  async data(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.observability(`/dashboards/${id}/data`, { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post(':id/widgets')
  @ApiOperation({ summary: 'Add widget' })
  async addWidget(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const result = await this.proxy.observability(`/dashboards/${id}/widgets`, {
      method: 'POST',
      body: body ?? {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Patch(':id/widgets/:widgetId')
  @ApiOperation({ summary: 'Update widget' })
  async updateWidget(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('widgetId') widgetId: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const result = await this.proxy.observability(`/dashboards/${id}/widgets/${widgetId}`, {
      method: 'PATCH',
      body: body ?? {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Delete(':id/widgets/:widgetId')
  @ApiOperation({ summary: 'Delete widget' })
  async deleteWidget(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('widgetId') widgetId: string,
    @Res() res: Response,
  ) {
    const result = await this.proxy.observability(`/dashboards/${id}/widgets/${widgetId}`, {
      method: 'DELETE',
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Put(':id/layout')
  @ApiOperation({ summary: 'Persist widget layout positions' })
  async layout(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const result = await this.proxy.observability(`/dashboards/${id}/layout`, {
      method: 'PUT',
      body: body ?? {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post(':id/shares')
  @ApiOperation({ summary: 'Share dashboard with role or user' })
  async share(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const result = await this.proxy.observability(`/dashboards/${id}/shares`, {
      method: 'POST',
      body: body ?? {},
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }
}
