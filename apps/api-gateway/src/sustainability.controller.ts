import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from './auth/current-user.decorator';
import type { JwtPayload } from './auth/auth.service';

@ApiTags('sustainability')
@ApiBearerAuth()
@Controller('sustainability')
export class SustainabilityController {
  constructor(private proxy: ProxyService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Sustainability summary (energy, carbon, PUE)' })
  async summary(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/sustainability/summary', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'AI sustainability recommendations' })
  async recommendations(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/sustainability/recommendations', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }

  @Get('rollups')
  @ApiOperation({ summary: 'Daily sustainability rollups' })
  async rollups(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.observability('/sustainability/rollups', { tenantId: user.tenantId });
    return res.status(result.status).json(result.data);
  }
}
