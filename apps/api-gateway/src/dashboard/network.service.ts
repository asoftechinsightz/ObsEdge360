import { Injectable } from '@nestjs/common';
import type { CmdbStatsPayload } from './executive-data.service';
import { DashboardRulesService } from './dashboard-rules.service';

export type NetworkSummary = {
  deviceCount: number;
  avgHealth: number;
  status: ReturnType<DashboardRulesService['domainHealth']>;
};

@Injectable()
export class NetworkService {
  constructor(private readonly rules: DashboardRulesService) {}

  summarize(stats: CmdbStatsPayload | null, avgHealth: number, atRisk: number): NetworkSummary {
    const deviceCount = (stats?.byType ?? [])
      .filter((t) => t.type === 'network_device' || t.type === 'network')
      .reduce((sum, t) => sum + (t.count || 0), 0);
    return {
      deviceCount,
      avgHealth,
      status: this.rules.domainHealth(deviceCount, avgHealth, atRisk),
    };
  }
}
