export interface ExecutiveKpis {
  availability: number;
  revenueAtRisk: number;
  complianceScore: number;
  securityPosture: 'low' | 'medium' | 'high' | 'critical';
  sustainabilityScore: number;
  activeIncidents: number;
  totalAssets: number;
  openAlerts: number;
}
