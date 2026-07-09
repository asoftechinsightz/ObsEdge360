import { Controller, Get, Post, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from './auth/current-user.decorator';
import type { JwtPayload } from './auth/auth.service';

@ApiTags('network')
@ApiBearerAuth()
@Controller('network')
export class NetworkController {
  constructor(private proxy: ProxyService) {}

  @Get('flows')
  @ApiOperation({ summary: 'Recent network flows' })
  async getFlows(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/network/flows', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Network observability summary' })
  async getSummary(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/network/summary', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('flows')
  @ApiOperation({ summary: 'Ingest NetFlow/IPFIX flows' })
  async ingestFlows(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/network/flows', {
      method: 'POST',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('snmp/metrics')
  @ApiOperation({ summary: 'Ingest SNMP interface metrics' })
  async ingestSnmp(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.observability('/network/snmp/metrics', {
      method: 'POST',
      body,
      tenantId: user.tenantId,
    });
    return res.status(result.status).json(result.data);
  }
}
