import { Controller, Get, Post, Param, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from './auth/current-user.decorator';
import type { JwtPayload } from './auth/auth.service';

@ApiTags('remediation')
@ApiBearerAuth()
@Controller('remediation')
export class RemediationController {
  constructor(private proxy: ProxyService) {}

  @Get('runbooks')
  @ApiOperation({ summary: 'List remediation runbooks' })
  async runbooks(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.remediation('/runbooks', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('match')
  @ApiOperation({ summary: 'Match runbooks to alert context' })
  async match(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.remediation('/match', { method: 'POST', body, tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('request')
  @ApiOperation({ summary: 'Request remediation (may require approval)' })
  async request(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.remediation('/request', { method: 'POST', body, tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('approvals/:id/execute')
  @ApiOperation({ summary: 'Approve and execute remediation' })
  async execute(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const result = await this.proxy.remediation(`/approvals/${id}/execute`, {
      method: 'POST',
      body: { resolvedBy: user.sub },
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('executions')
  @ApiOperation({ summary: 'Remediation execution history' })
  async executions(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.remediation('/executions', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('ot/zones')
  @ApiOperation({ summary: 'OT safety zones' })
  async otZones(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.remediation('/ot/zones', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }
}
