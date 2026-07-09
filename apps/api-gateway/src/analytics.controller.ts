import { Controller, Get, Post, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from './auth/current-user.decorator';
import type { JwtPayload } from './auth/auth.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private proxy: ProxyService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Predictive analytics summary' })
  async summary(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.analytics('/summary', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('forecasts')
  @ApiOperation({ summary: '7-day capacity and incident forecasts' })
  async forecasts(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.analytics('/forecasts', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('incidents')
  @ApiOperation({ summary: 'Predicted incidents with business impact' })
  async incidents(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.analytics('/incidents', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('forecast/generate')
  @ApiOperation({ summary: 'Generate new 7-day forecasts with confidence intervals' })
  async generate(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.analytics('/forecast/generate', { method: 'POST', body, tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }
}
