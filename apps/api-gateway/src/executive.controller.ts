import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { ExecutiveKpis } from '@opsedge360/shared-types';
import { ProxyService } from './proxy.service';
import { CacheService } from './cache/cache.service';
import { CurrentUser } from './auth/current-user.decorator';
import type { JwtPayload } from './auth/auth.service';

@ApiTags('executive')
@ApiBearerAuth()
@Controller('executive')
export class ExecutiveController {
  constructor(private proxy: ProxyService, private cache: CacheService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Executive dashboard KPIs' })
  async getKpis(@CurrentUser() user: JwtPayload): Promise<ExecutiveKpis> {
    return this.cache.getOrSet(user.tenantId, 'executive', 'kpis', async () => {
      const [statsRes, complianceRes] = await Promise.all([
        this.proxy.cmdb('/stats', { tenantId: user.tenantId }),
        this.proxy.compliance('/score', { tenantId: user.tenantId }),
      ]);
      const stats = statsRes.data as { totalAssets?: number; avgHealth?: number; openAlerts?: number };
      const compliance = complianceRes.data as { overallScore?: number };

      return {
        availability: stats.avgHealth ? (stats.avgHealth / 100) * 99.99 : 99.94,
        revenueAtRisk: 240000,
        complianceScore: compliance.overallScore ?? 87,
        securityPosture: 'medium',
        sustainabilityScore: 72,
        activeIncidents: Math.min(stats.openAlerts ?? 0, 10),
        totalAssets: stats.totalAssets ?? 0,
        openAlerts: stats.openAlerts ?? 0,
      };
    });
  }

  @Get('services')
  @ApiOperation({ summary: 'Business service health summary' })
  getServices() {
    return [
      { id: '1', name: 'UPI Payments', tier: 1, availability: 99.98, slaTarget: 99.95, status: 'healthy' },
      { id: '2', name: 'Digital Banking', tier: 1, availability: 99.92, slaTarget: 99.90, status: 'degraded' },
      { id: '3', name: 'Loan Processing', tier: 2, availability: 99.99, slaTarget: 99.50, status: 'healthy' },
      { id: '4', name: 'Merchant Payments', tier: 1, availability: 99.87, slaTarget: 99.95, status: 'at_risk' },
      { id: '5', name: 'Core Banking', tier: 1, availability: 99.96, slaTarget: 99.99, status: 'healthy' },
    ];
  }

  @Get('risks')
  @ApiOperation({ summary: 'Top enterprise risks' })
  getRisks() {
    return [
      { id: '1', title: 'DB connection pool exhaustion', severity: 'high', revenueAtRisk: 120000, affectedService: 'UPI Payments' },
      { id: '2', title: 'Certificate expiry in 7 days', severity: 'medium', revenueAtRisk: 0, affectedService: 'API Gateway' },
      { id: '3', title: 'OT sensor latency spike', severity: 'medium', revenueAtRisk: 45000, affectedService: 'Manufacturing Line 3' },
    ];
  }
}
