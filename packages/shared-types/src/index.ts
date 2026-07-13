export type CiType =
  | 'server' | 'vm' | 'container' | 'pod' | 'database' | 'application'
  | 'service' | 'network_device' | 'firewall' | 'load_balancer'
  | 'ot_device' | 'cloud_resource' | 'api' | 'queue' | 'cache' | 'user' | 'location' | 'saas_app'
  | 'cluster' | 'storage' | 'middleware' | 'business_service' | 'k8s_object';

export type CiStatus = 'discovered' | 'active' | 'maintenance' | 'decommissioned';

export type RelationshipType =
  | 'depends_on' | 'runs_on' | 'connects_to' | 'owned_by'
  | 'part_of' | 'secures' | 'monitors' | 'calls'
  | 'hosted_by' | 'member_of' | 'uses';

export interface ConfigurationItem {
  id: string;
  tenantId: string;
  externalId?: string;
  name: string;
  ciType: CiType;
  status: CiStatus;
  healthScore: number;
  complianceScore: number;
  riskScore: number;
  aiConfidenceScore: number;
  ownerId?: string;
  locationId?: string;
  attributes: Record<string, unknown>;
  tags: string[];
  discoveredAt?: string;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Relationship {
  id: string;
  tenantId: string;
  sourceCiId: string;
  targetCiId: string;
  relationshipType: RelationshipType;
  strength: 'weak' | 'normal' | 'critical';
  aiConfidenceScore: number;
  metadata: Record<string, unknown>;
}

export interface DiscoveredAsset {
  externalId?: string;
  name: string;
  ciType: CiType;
  attributes: Record<string, unknown>;
  aiConfidenceScore?: number;
  tags?: string[];
  relationships?: Array<{ targetExternalId: string; type: RelationshipType }>;
}

export interface PlatformEvent<T = unknown> {
  eventType: string;
  tenantId: string;
  timestamp: string;
  payload: T;
}

export type { ExecutiveKpis } from './executive-kpis';

export interface TwinNode {
  id: string;
  label: string;
  type: CiType;
  healthScore: number;
  riskScore: number;
}

export interface TwinEdge {
  source: string;
  target: string;
  type: RelationshipType;
}

export interface TwinGraph {
  nodes: TwinNode[];
  edges: TwinEdge[];
}

export type TransactionClassification =
  | 'upi_payment' | 'neft_transfer' | 'rtgs_transfer' | 'imps' | 'login'
  | 'loan_processing' | 'insurance_claim' | 'retail_checkout' | 'custom';

export interface BusinessTransaction {
  id: string;
  tenantId: string;
  serviceId?: string;
  name: string;
  classification: TransactionClassification | string;
  templateCode?: string;
  entryCiId?: string;
  p50LatencyMs?: number;
  p99LatencyMs?: number;
  volumePerHour?: number;
  status: string;
  steps?: TransactionStep[];
}

export interface TransactionStep {
  id: string;
  transactionId: string;
  stepOrder: number;
  stepType: string;
  name: string;
  ciId?: string;
  avgLatencyMs: number;
  p99LatencyMs: number;
  status: 'ok' | 'warn' | 'error';
}

export interface NetworkFlow {
  id: string;
  tenantId: string;
  srcCiId?: string;
  dstCiId?: string;
  srcIp?: string;
  dstIp?: string;
  srcPort?: number;
  dstPort?: number;
  protocol?: string;
  bytes: number;
  packets: number;
  latencyMs?: number;
  jitterMs?: number;
  packetLossPct?: number;
  recordedAt: string;
}

export interface ComplianceControlResult {
  controlId: string;
  framework: string;
  title: string;
  status: 'pass' | 'fail' | 'partial' | 'pending';
  score?: number;
  message?: string;
  lastChecked?: string;
  affectedCiIds?: string[];
}

export interface AgentRun {
  id: string;
  tenantId: string;
  agentType: string;
  triggerEvent?: string;
  status: string;
  summary?: string;
  confidence?: number;
  toolsUsed?: string[];
  startedAt: string;
  completedAt?: string;
}

export interface FraudAlert {
  id: string;
  tenantId: string;
  alertType: string;
  severity: string;
  title: string;
  description?: string;
  reasonCodes: string[];
  confidenceScore?: number;
  status: string;
  explainability?: Record<string, unknown>;
  detectedAt: string;
}

export interface Anomaly {
  id: string;
  tenantId: string;
  ciId?: string;
  anomalyType: string;
  metricName?: string;
  baselineValue?: number;
  observedValue?: number;
  deviationSigma?: number;
  severity: string;
  status: string;
  detectedAt: string;
}

export interface RemediationRunbook {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  riskTier: string;
  autoExecute: boolean;
  otZoneSafe: boolean;
  enabled: boolean;
}

export interface SustainabilityRollup {
  periodDate: string;
  energyKwh: number;
  carbonKg: number;
  pue?: number;
  renewablePct?: number;
  idleResources: number;
  efficiencyScore?: number;
}

export interface SustainabilityRecommendation {
  id: string;
  title: string;
  description?: string;
  projectedSavingsPct?: number;
  projectedCarbonReductionKg?: number;
  status: string;
}

export interface SiemEvent {
  id: string;
  severity?: string;
  title?: string;
  source?: string;
  status: string;
  receivedAt: string;
}

export interface OtSafetyZone {
  id: string;
  name: string;
  zoneLevel: string;
  readOnly: boolean;
  maxPollRateHz: number;
  requiresOtEngineerApproval: boolean;
}

export interface IndustryPack {
  id: string;
  code: string;
  name: string;
  industry: string;
  description?: string;
  frameworkCodes: string[];
  controlCount: number;
  enabled: boolean;
}

export interface PredictiveForecast {
  id: string;
  forecastType: string;
  metricName: string;
  ciId?: string;
  horizonDays: number;
  forecastPoints: Array<{ day: number; value: number }>;
  confidenceLow: Array<{ day: number; value: number }>;
  confidenceHigh: Array<{ day: number; value: number }>;
  businessImpact: Record<string, unknown>;
  generatedAt: string;
}

export interface IncidentPrediction {
  id: string;
  ciId?: string;
  incidentType: string;
  probabilityPct: number;
  predictedWindowStart: string;
  predictedWindowEnd: string;
  revenueAtRisk?: number;
  affectedTransactions: string[];
  rootCauseHypothesis?: string;
  confidencePct?: number;
  status: string;
  createdAt: string;
}

export interface QuantumJob {
  id: string;
  externalJobId?: string;
  provider: string;
  jobType: string;
  algorithm?: string;
  qubitsUsed?: number;
  circuitDepth?: number;
  status: string;
  classicalRuntimeMs?: number;
  quantumRuntimeMs?: number;
  resultSummary: Record<string, unknown>;
  submittedAt: string;
  completedAt?: string;
}

export interface QuantumReadiness {
  id: string;
  assessmentType: string;
  score: number;
  pqcAlgorithmsAdopted: string[];
  tlsPqcReady: boolean;
  keyRotationDays?: number;
  findings: Array<Record<string, unknown>>;
  recommendations: Array<Record<string, unknown>>;
  assessedAt: string;
}

export interface HaDrRegion {
  id: string;
  regionCode: string;
  regionName: string;
  role: 'primary' | 'dr' | 'secondary';
  cloudProvider?: string;
  rtoMinutes: number;
  rpoMinutes: number;
  dataResidency?: string;
  enabled: boolean;
}

export interface HaDrStatus {
  id: string;
  regionId: string;
  regionCode: string;
  regionName: string;
  role: 'primary' | 'dr' | 'secondary';
  healthStatus: 'healthy' | 'degraded' | 'unavailable';
  replicationLagMs: number;
  lastFailoverTest?: string;
  failoverTestResult?: string;
  activeServices: number;
  checkedAt: string;
}

export interface FedrampControl {
  id: string;
  controlFamily: string;
  controlId: string;
  title: string;
  baseline: string;
  description?: string;
  implementationStatus: string;
  assessmentStatus: string;
  assessmentScore?: number;
}

export interface FedrampScore {
  overallScore: number;
  baseline: string;
  controlsTotal: number;
  controlsImplemented: number;
  controlsPartial: number;
  controlsPlanned: number;
  readinessLevel: string;
  lastAssessed: string;
}

export * from './api-envelope';
export * from './executive-kpis';
export * from './widgets';
export * from './dashboard';
