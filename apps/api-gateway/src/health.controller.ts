import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import axios from 'axios';
import { Public } from './auth/public.decorator';
import { getSecurityMetrics, securityMetricsPrometheus } from '@opsedge360/shared-security';

const GATEWAY_VERSION = process.env.SERVICE_VERSION ?? '1.0.0';

type ServiceStatus = 'up' | 'down';

interface ProbeTarget {
  key: string;
  url: string;
}

@ApiTags('health')
@Controller()
export class HealthController {
  private targets(): ProbeTarget[] {
    return [
      { key: 'discovery', url: `${process.env.DISCOVERY_URL ?? 'http://localhost:4001'}/health` },
      { key: 'cmdb', url: `${process.env.CMDB_URL ?? 'http://localhost:4002'}/health` },
      { key: 'observability', url: `${process.env.OBSERVABILITY_URL ?? 'http://localhost:4003'}/health` },
      { key: 'compliance', url: `${process.env.COMPLIANCE_URL ?? 'http://localhost:4004'}/health` },
      { key: 'transactions', url: `${process.env.TRANSACTIONS_URL ?? 'http://localhost:4005'}/health` },
      { key: 'security', url: `${process.env.SECURITY_URL ?? 'http://localhost:4006'}/health` },
    ];
  }

  private async probe(url: string): Promise<ServiceStatus> {
    try {
      const res = await axios.get(url, {
        timeout: Number(process.env.HEALTH_PROBE_TIMEOUT_MS ?? 1500),
        validateStatus: (s) => s >= 200 && s < 500,
      });
      return res.status >= 200 && res.status < 300 ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }

  private async buildHealth() {
    const entries = await Promise.all(
      this.targets().map(async (t) => [t.key, await this.probe(t.url)] as const),
    );
    const services: Record<string, ServiceStatus> = {
      apiGateway: 'up',
      ...Object.fromEntries(entries),
    };
    const down = Object.values(services).filter((s) => s === 'down').length;
    const status = down === 0 ? 'healthy' : down === entries.length ? 'unhealthy' : 'degraded';
    return {
      status,
      platform: 'OpsEdge360',
      version: GATEWAY_VERSION,
      timestamp: new Date().toISOString(),
      services,
    };
  }

  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Platform health check with dependency probes',
    description:
      'Probes core production microservices. Returns healthy | degraded | unhealthy. HTTP 200 by default even when degraded (set HEALTH_FAIL_ON_DEGRADED=true for 503).',
  })
  @ApiOkResponse({ description: 'Health payload' })
  async check(@Res() res: Response) {
    const body = await this.buildHealth();
    const failOnDegraded = process.env.HEALTH_FAIL_ON_DEGRADED === 'true';
    const code = failOnDegraded && body.status !== 'healthy' ? 503 : 200;
    return res.status(code).json(body);
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness — gateway process ready to accept traffic' })
  ready() {
    return {
      status: 'ready',
      service: 'api-gateway',
      version: GATEWAY_VERSION,
    };
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Liveness — process alive' })
  live() {
    return {
      status: 'live',
      service: 'api-gateway',
      version: GATEWAY_VERSION,
    };
  }

  @Public()
  @Get('version')
  @ApiOperation({ summary: 'Gateway version metadata' })
  version() {
    return {
      service: 'api-gateway',
      version: GATEWAY_VERSION,
      platform: 'OpsEdge360',
      node: process.version,
    };
  }

  @Public()
  @Get('metrics')
  @ApiOperation({ summary: 'Prometheus text metrics for the API gateway' })
  metrics(@Res() res: Response) {
    const mem = process.memoryUsage();
    const security = securityMetricsPrometheus();
    const counters = getSecurityMetrics();
    const counterLines = Object.entries(counters)
      .map(([k, v]) => `${k.replace(/\./g, '_')} ${v}`)
      .join('\n');
    const body = [
      '# HELP process_resident_memory_bytes Resident memory size in bytes.',
      '# TYPE process_resident_memory_bytes gauge',
      `process_resident_memory_bytes{service="api-gateway"} ${mem.rss}`,
      '# HELP process_uptime_seconds Process uptime in seconds.',
      '# TYPE process_uptime_seconds gauge',
      `process_uptime_seconds{service="api-gateway"} ${process.uptime()}`,
      '# HELP service_up Service availability.',
      '# TYPE service_up gauge',
      'service_up{service="api-gateway"} 1',
      '# HELP opsedge360_security Security counters (Wave 6)',
      '# TYPE opsedge360_security counter',
      counterLines,
      security.trim(),
      '',
    ].join('\n');
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return res.status(200).send(body);
  }
}
