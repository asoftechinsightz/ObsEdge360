import { Controller, Get, Post, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from './auth/current-user.decorator';
import type { JwtPayload } from './auth/auth.service';

@ApiTags('security')
@ApiBearerAuth()
@Controller('security')
export class SecurityController {
  constructor(private proxy: ProxyService) {}

  @Get('posture')
  @ApiOperation({ summary: 'Security posture score and counts' })
  async posture(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.security('/posture', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('fraud')
  @ApiOperation({ summary: 'List fraud alerts with explainability' })
  async fraud(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.security('/fraud', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('anomalies')
  @ApiOperation({ summary: 'List detected anomalies' })
  async anomalies(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.security('/anomalies', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('analyze')
  @ApiOperation({ summary: 'Run fraud/anomaly analysis on metrics' })
  async analyze(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.security('/analyze', { method: 'POST', body, tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('siem/webhook')
  @ApiOperation({ summary: 'Ingest SIEM/SOAR webhook event' })
  async siemWebhook(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.security('/siem/webhook', { method: 'POST', body, tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('siem/events')
  @ApiOperation({ summary: 'List correlated SIEM events' })
  async siemEvents(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.security('/siem/events', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }
}
