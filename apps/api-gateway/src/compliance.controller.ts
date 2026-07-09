import { Controller, Get, Post, Param, Body, Res, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from './auth/current-user.decorator';
import type { JwtPayload } from './auth/auth.service';

@ApiTags('compliance')
@ApiBearerAuth()
@Controller('compliance')
export class ComplianceController {
  constructor(private proxy: ProxyService) {}

  @Get('frameworks')
  @ApiOperation({ summary: 'List compliance frameworks with live scores' })
  async getFrameworks(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.compliance('/frameworks', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('controls')
  @ApiOperation({ summary: 'List compliance controls with status' })
  @ApiQuery({ name: 'framework', required: false })
  async getControls(
    @CurrentUser() user: JwtPayload,
    @Query('framework') framework: string,
    @Res() res: Response,
  ) {
    const result = await this.proxy.compliance('/controls', {
      tenantId: user.tenantId,
      query: framework ? { framework } : {},
    });
    return res.status(result.status).json(result.data);
  }

  @Get('score')
  @ApiOperation({ summary: 'Overall compliance score' })
  async getScore(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.compliance('/score', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Run compliance validation engine' })
  async validate(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.compliance('/validate', {
      method: 'POST',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('packs')
  @ApiOperation({ summary: 'List regulated industry compliance packs' })
  async packs(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.compliance('/packs', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('packs/:code')
  @ApiOperation({ summary: 'Get industry pack details' })
  async packDetail(@CurrentUser() user: JwtPayload, @Param('code') code: string, @Res() res: Response) {
    const result = await this.proxy.compliance(`/packs/${code}`, { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('packs/:code/enable')
  @ApiOperation({ summary: 'Enable industry compliance pack' })
  async enablePack(@CurrentUser() user: JwtPayload, @Param('code') code: string, @Res() res: Response) {
    const result = await this.proxy.compliance(`/packs/${code}/enable`, { method: 'POST', tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('packs/:code/disable')
  @ApiOperation({ summary: 'Disable industry compliance pack' })
  async disablePack(@CurrentUser() user: JwtPayload, @Param('code') code: string, @Res() res: Response) {
    const result = await this.proxy.compliance(`/packs/${code}/disable`, { method: 'POST', tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('banking360')
  @ApiOperation({ summary: 'Banking360 dashboard' })
  async banking360(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.compliance('/banking360', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('banking360/activate')
  @ApiOperation({ summary: 'Activate Banking360 / BFSI pack' })
  async activateBanking(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.compliance('/banking360/activate', {
      method: 'POST',
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('banking360/deactivate')
  @ApiOperation({ summary: 'Deactivate Banking360' })
  async deactivateBanking(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.compliance('/banking360/deactivate', {
      method: 'POST',
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('banking360/validate')
  @ApiOperation({ summary: 'Run RBI + PCI validation' })
  async validateBanking(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.compliance('/banking360/validate', {
      method: 'POST',
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('banking360/payment-templates')
  @ApiOperation({ summary: 'UPI / payment flow templates' })
  async paymentTemplates(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.compliance('/banking360/payment-templates', {
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('banking360/payment-templates/:code/apply')
  @ApiOperation({ summary: 'Apply payment monitoring template' })
  async applyTemplate(
    @CurrentUser() user: JwtPayload,
    @Param('code') code: string,
    @Res() res: Response,
  ) {
    const result = await this.proxy.compliance(`/banking360/payment-templates/${code}/apply`, {
      method: 'POST',
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }
}
