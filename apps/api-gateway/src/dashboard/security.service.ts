import { Injectable } from '@nestjs/common';
import type { KpiPayload } from './executive-data.service';
import { DashboardRulesService } from './dashboard-rules.service';

export type SecuritySummary = {
  posture: string;
  openAlerts: number;
  critical: number;
  warning: number;
  healthy: number;
  status: ReturnType<DashboardRulesService['postureStatus']>;
};

@Injectable()
export class SecurityService {
  constructor(private readonly rules: DashboardRulesService) {}

  summarize(kpis: KpiPayload): SecuritySummary {
    const counts = this.rules.securityCounts(kpis.openAlerts, kpis.activeIncidents);
    return {
      posture: kpis.securityPosture,
      openAlerts: kpis.openAlerts,
      ...counts,
      status: this.rules.postureStatus(kpis.securityPosture),
    };
  }
}
