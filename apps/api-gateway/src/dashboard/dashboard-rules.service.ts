import { Injectable } from '@nestjs/common';
import type { WidgetStatus } from '@opsedge360/shared-types';

/** Default SLA thresholds — overridden by tenant config in Wave 3. */
export interface SlaThresholds {
  availabilityHealthy: number;
  availabilityDegraded: number;
  mttrHealthyMin: number;
  mttrDegradedMin: number;
  complianceHealthy: number;
  complianceDegraded: number;
  openAlertsDegraded: number;
  openAlertsCritical: number;
  revenueAtRiskDegraded: number;
  revenueAtRiskCritical: number;
  domainHealthMin: number;
  domainAtRiskRatio: number;
}

export const DEFAULT_SLA_THRESHOLDS: SlaThresholds = {
  availabilityHealthy: 99.9,
  availabilityDegraded: 99.5,
  mttrHealthyMin: 35,
  mttrDegradedMin: 55,
  complianceHealthy: 90,
  complianceDegraded: 75,
  openAlertsDegraded: 5,
  openAlertsCritical: 20,
  revenueAtRiskDegraded: 50_000,
  revenueAtRiskCritical: 200_000,
  domainHealthMin: 90,
  domainAtRiskRatio: 0.08,
};

@Injectable()
export class DashboardRulesService {
  private thresholds: SlaThresholds = DEFAULT_SLA_THRESHOLDS;

  setThresholds(partial: Partial<SlaThresholds>): void {
    this.thresholds = { ...this.thresholds, ...partial };
  }

  getThresholds(): SlaThresholds {
    return { ...this.thresholds };
  }

  overallHealth(availability: number, activeIncidents: number): { label: string; status: WidgetStatus } {
    const t = this.thresholds;
    if (activeIncidents >= 5 || availability < t.availabilityDegraded) {
      return { label: 'Critical', status: 'critical' };
    }
    if (activeIncidents >= 1 || availability < t.availabilityHealthy) {
      return { label: 'Watch', status: 'degraded' };
    }
    return { label: 'Healthy', status: 'healthy' };
  }

  availabilityStatus(availability: number): WidgetStatus {
    const t = this.thresholds;
    if (availability >= t.availabilityHealthy) return 'healthy';
    if (availability >= t.availabilityDegraded) return 'degraded';
    return 'critical';
  }

  alertStatus(openAlerts: number): WidgetStatus {
    const t = this.thresholds;
    if (openAlerts > t.openAlertsCritical) return 'critical';
    if (openAlerts > t.openAlertsDegraded) return 'degraded';
    return 'healthy';
  }

  postureStatus(posture: string): WidgetStatus {
    if (posture === 'low') return 'healthy';
    if (posture === 'medium') return 'degraded';
    if (posture === 'high' || posture === 'critical') return 'critical';
    return 'unknown';
  }

  complianceStatus(score: number): WidgetStatus {
    const t = this.thresholds;
    if (score >= t.complianceHealthy) return 'healthy';
    if (score >= t.complianceDegraded) return 'degraded';
    return 'critical';
  }

  mttrStatus(mttrMinutes: number | null): WidgetStatus {
    if (mttrMinutes == null) return 'unknown';
    const t = this.thresholds;
    if (mttrMinutes <= t.mttrHealthyMin) return 'healthy';
    if (mttrMinutes <= t.mttrDegradedMin) return 'degraded';
    return 'critical';
  }

  revenueAtRiskStatus(revenueAtRisk: number): WidgetStatus {
    const t = this.thresholds;
    if (revenueAtRisk > t.revenueAtRiskCritical) return 'critical';
    if (revenueAtRisk > t.revenueAtRiskDegraded) return 'degraded';
    return 'healthy';
  }

  domainHealth(count: number, avgHealth: number, atRisk: number): WidgetStatus {
    if (!count) return 'unknown';
    const t = this.thresholds;
    if (atRisk > count * t.domainAtRiskRatio || avgHealth < 80) return 'critical';
    if (atRisk > 0 || avgHealth < t.domainHealthMin) return 'degraded';
    return 'healthy';
  }

  serviceStatus(availability: number, slaTarget: number): string {
    if (availability >= slaTarget) return 'healthy';
    if (availability >= slaTarget - 0.05) return 'degraded';
    return 'at_risk';
  }

  riskRevenueAtRisk(severity: string): number {
    if (severity === 'critical') return 180_000;
    if (severity === 'high') return 90_000;
    return 25_000;
  }

  securityCounts(openAlerts: number, activeIncidents: number): { critical: number; warning: number; healthy: number } {
    const critical = Math.min(openAlerts, activeIncidents + Math.floor(openAlerts / 3));
    const warning = Math.max(0, openAlerts - critical);
    const healthy = Math.max(0, 100 - critical - warning);
    return { critical, warning, healthy };
  }
}
