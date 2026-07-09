import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './auth/public.decorator';
import { getPlatformConfig } from '@opsedge360/platform-config';

@ApiTags('platform')
@Controller('platform')
export class PlatformController {
  @Public()
  @Get('config')
  @ApiOperation({ summary: 'Deployment topology and performance profile (read-only)' })
  getConfig() {
    const cfg = getPlatformConfig();
    return {
      deploymentMode: cfg.deploymentMode,
      performanceProfile: cfg.performanceProfile,
      topologyLabel: cfg.topologyLabel,
      multiTenant: cfg.multiTenant,
      dataResidencyEnforced: cfg.dataResidencyEnforced,
      kafkaRequired: cfg.kafkaRequired,
      redisRecommended: cfg.redisRecommended,
      cacheEnabled: cfg.cacheEnabled,
      dbPoolMax: cfg.dbPoolMax,
      cacheTtlSec: cfg.cacheTtlSec,
      hints: {
        saas: 'DEPLOYMENT_MODE=saas PERFORMANCE_PROFILE=high — Kafka + Redis required',
        hybrid: 'DEPLOYMENT_MODE=hybrid — control plane cloud, data plane in customer region',
        onprem: 'DEPLOYMENT_MODE=onprem PERFORMANCE_PROFILE=standard — optional Kafka (HTTP fallback)',
      },
    };
  }
}
