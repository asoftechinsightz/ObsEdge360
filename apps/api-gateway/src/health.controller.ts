import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './auth/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Platform health check' })
  check() {
    return {
      status: 'healthy',
      platform: 'OpsEdge360',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      services: {
        apiGateway: 'up',
        discovery: 'up',
        cmdb: 'up',
        observability: 'up',
        compliance: 'up',
        aiAgents: 'up',
      },
    };
  }
}
