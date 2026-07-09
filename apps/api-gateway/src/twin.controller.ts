import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from './auth/current-user.decorator';
import type { JwtPayload } from './auth/auth.service';

@ApiTags('twin')
@ApiBearerAuth()
@Controller('twin')
export class TwinController {
  constructor(private proxy: ProxyService) {}

  @Get('graph')
  @ApiOperation({ summary: 'Get digital twin topology graph' })
  @ApiQuery({ name: 'ciType', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getGraph(
    @CurrentUser() user: JwtPayload,
    @Query('ciType') ciType: string | undefined,
    @Query('limit') limit: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.proxy.cmdb('/twin/graph', {
      tenantId: user.tenantId,
      query: {
        ...(ciType && { ciType }),
        ...(limit && { limit }),
      },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('impact/:ciId')
  @ApiOperation({ summary: 'Dependency impact analysis' })
  @ApiQuery({ name: 'depth', required: false })
  @ApiQuery({ name: 'direction', required: false, enum: ['downstream', 'upstream', 'both'] })
  async getImpact(
    @CurrentUser() user: JwtPayload,
    @Param('ciId') ciId: string,
    @Query('depth') depth: string | undefined,
    @Query('direction') direction: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.proxy.cmdb(`/twin/impact/${ciId}`, {
      tenantId: user.tenantId,
      query: {
        ...(depth && { depth }),
        ...(direction && { direction }),
      },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('blast-radius/:ciId')
  @ApiOperation({ summary: 'Blast-radius visualization data' })
  @ApiQuery({ name: 'depth', required: false })
  @ApiQuery({ name: 'direction', required: false, enum: ['downstream', 'upstream', 'both'] })
  async getBlastRadius(
    @CurrentUser() user: JwtPayload,
    @Param('ciId') ciId: string,
    @Query('depth') depth: string | undefined,
    @Query('direction') direction: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.proxy.cmdb(`/twin/blast-radius/${ciId}`, {
      tenantId: user.tenantId,
      query: {
        ...(depth && { depth }),
        ...(direction && { direction }),
      },
    });
    return res.status(result.status).json(result.data);
  }
}
