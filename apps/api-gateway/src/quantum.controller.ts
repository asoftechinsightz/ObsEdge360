import { Controller, Get, Post, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from './auth/current-user.decorator';
import type { JwtPayload } from './auth/auth.service';

@ApiTags('quantum')
@ApiBearerAuth()
@Controller('quantum')
export class QuantumController {
  constructor(private proxy: ProxyService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Quantum readiness and job summary' })
  async summary(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.quantum('/summary', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List hybrid classical-quantum jobs' })
  async jobs(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.quantum('/jobs', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('jobs')
  @ApiOperation({ summary: 'Submit quantum job for monitoring' })
  async submitJob(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.quantum('/jobs', { method: 'POST', body, tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Post-quantum cryptography readiness assessment' })
  async readiness(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.quantum('/readiness', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Post('readiness/assess')
  @ApiOperation({ summary: 'Run PQC migration readiness assessment' })
  async assess(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.quantum('/readiness/assess', { method: 'POST', tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }
}
