/**
 * Canonical Twin / Business Service Intelligence DTOs.
 * Customer vocabulary only — no engine vendor names.
 */

export type TwinHealth = 'healthy' | 'degraded' | 'critical' | 'unknown';

export interface TwinOwnership {
  businessOwner?: string;
  technicalOwner?: string;
  operationsOwner?: string;
  supportTeam?: string;
  escalationGroup?: string;
  onCallTeam?: string;
}

export interface TwinSla {
  target: number;
  actual: number;
  compliance: number;
  breachPredicted: boolean;
  trend: 'improving' | 'stable' | 'worsening';
}

export interface TwinBusinessKpis {
  availability: number;
  latencyMs: number;
  errorRate: number;
  incidentCount: number;
  mttrMinutes: number;
  slaCompliance: number;
  businessRisk: TwinHealth;
  revenueImpactPerHour: number;
  customerImpact: string;
  trend: 'improving' | 'stable' | 'worsening';
  forecastRisk: string;
}

export interface TwinBusinessService {
  id: string;
  name: string;
  description?: string;
  businessUnit?: string;
  businessCapability?: string;
  environment?: string;
  tier: number;
  criticality: string;
  costCenter?: string;
  lifecycle: string;
  tags: string[];
  health: TwinHealth;
  healthScore: number;
  riskScore: number;
  ownership: TwinOwnership;
  sla: TwinSla;
  kpis: TwinBusinessKpis;
  dependencyCount: number;
  twinHref: string;
  observeHref: string;
  asOf: string;
}

export interface TwinBlastRadiusBusiness {
  serviceId: string;
  serviceName: string;
  depth: number;
  direction: string;
  affectedServices: string[];
  affectedApplications: string[];
  affectedCustomers: string;
  businessRisk: TwinHealth;
  revenueImpactPerHour: number;
  operationalImpact: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  recoveryOrder: string[];
  affectedCis: number;
  criticalCount: number;
  atRiskCount: number;
  avgHealth: number;
  nodes: Array<{
    id: string;
    name: string;
    ciType: string;
    healthScore: number;
    riskScore: number;
    depth: number;
    status: string;
  }>;
  edges: Array<{ source: string; target: string; type: string }>;
  rootCiIds: string[];
  asOf: string;
}

export interface TwinExecutiveRisk {
  brand: 'OpsEdge360';
  asOf: string;
  businessHealth: TwinHealth;
  businessHealthScore: number;
  topRisks: Array<{ id: string; title: string; severity: string; href: string }>;
  criticalServices: TwinBusinessService[];
  capacityRisks: string[];
  securityRisks: string[];
  complianceStatus: string;
  revenueImpactPerHour: number;
  customerImpact: string;
  openIncidents: number;
  recommendations: Array<{ id: string; title: string; href: string }>;
}

export interface TwinAiContext {
  brand: 'OpsEdge360';
  summary: string;
  evidence: Array<{ type: string; ref: string; detail: string }>;
  confidence: number;
  businessImpact: string;
  affectedServices: string[];
  rootCause: string;
  recommendedRemediation: string[];
  automationRecommendations: string[];
  twinHref: string;
  recoveryOrder: string[];
}
