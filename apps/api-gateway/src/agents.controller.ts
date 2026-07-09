import { Controller, Get, Post, Param, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from './auth/current-user.decorator';
import type { JwtPayload } from './auth/auth.service';

@ApiTags('agents')
@ApiBearerAuth()
@Controller('agents')
export class AgentsController {
  constructor(private proxy: ProxyService) {}

  @Get('runs')
  @ApiOperation({ summary: 'List recent AI agent runs' })
  async getRuns(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.aiAgents(`/api/v1/agents/runs?tenant_id=${user.tenantId}`);
    return res.status(result.status).json(result.data);
  }

  @Get('approvals')
  @ApiOperation({ summary: 'Pending remediation approvals' })
  async getApprovals(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.proxy.aiAgents(`/api/v1/agents/approvals?tenant_id=${user.tenantId}`);
    return res.status(result.status).json(result.data);
  }

  @Post('approvals/:id/approve')
  @ApiOperation({ summary: 'Approve agent remediation action' })
  async approve(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Res() res: Response) {
    const agentResult = await this.proxy.aiAgents(`/api/v1/agents/approvals/${id}/approve`, { method: 'POST' });
    const remediationResult = await this.proxy.remediation(`/approvals/${id}/execute`, {
      method: 'POST',
      body: { resolvedBy: user.sub },
      tenantId: user.tenantId,
    });
    return res.status(agentResult.status).json({
      ...(agentResult.data as object),
      remediation: remediationResult.status < 400 ? remediationResult.data : undefined,
    });
  }

  @Post('approvals/:id/reject')
  @ApiOperation({ summary: 'Reject agent remediation action' })
  async reject(@Param('id') id: string, @Body() body: { reason?: string }, @Res() res: Response) {
    const result = await this.proxy.aiAgents(
      `/api/v1/agents/approvals/${id}/reject?reason=${encodeURIComponent(body.reason ?? '')}`,
      { method: 'POST' },
    );
    return res.status(result.status).json(result.data);
  }

  @Post('run')
  @ApiOperation({ summary: 'Trigger an AI agent run' })
  async runAgent(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Res() res: Response) {
    const result = await this.proxy.aiAgents('/api/v1/agents/run', {
      method: 'POST',
      body: { ...(body as object), tenant_id: user.tenantId },
    });
    return res.status(result.status).json(result.data);
  }
}
