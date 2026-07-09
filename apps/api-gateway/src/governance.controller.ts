import { Controller, Get, Post, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from './auth/current-user.decorator';
import type { JwtPayload } from './auth/auth.service';

@ApiTags('governance')
@ApiBearerAuth()
@Controller('governance')
export class GovernanceController {
  constructor(private proxy: ProxyService) {}

  @Get('ha-dr/regions')
  @ApiOperation({ summary: 'List HA/DR deployment regions' })
  async regions(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.governance('/ha-dr/regions', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('ha-dr/status')
  @ApiOperation({ summary: 'Global HA/DR health and replication status' })
  async haDrStatus(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.governance('/ha-dr/status', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('ha-dr/failover-test')
  @ApiOperation({ summary: 'Record DR failover test result' })
  async failoverTest(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.governance('/ha-dr/failover-test', { method: 'POST', body, tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('fedramp/controls')
  @ApiOperation({ summary: 'FedRAMP Moderate control inventory' })
  async fedrampControls(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.governance('/fedramp/controls', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('fedramp/score')
  @ApiOperation({ summary: 'FedRAMP readiness score' })
  async fedrampScore(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.governance('/fedramp/score', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('fedramp/assess')
  @ApiOperation({ summary: 'Run FedRAMP control assessment' })
  async fedrampAssess(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.governance('/fedramp/assess', { method: 'POST', tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }
}
