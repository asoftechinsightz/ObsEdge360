/** Customer Validation Program (CVP) — internal types only. */

export type Industry =
  | 'Banking'
  | 'Healthcare'
  | 'Manufacturing'
  | 'Retail'
  | 'Government'
  | 'Other';

export type PilotStatus =
  | 'prospect'
  | 'signed'
  | 'onboarding'
  | 'deployed'
  | 'live'
  | 'exited'
  | 'churn_risk';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type FeedbackCategory =
  | 'ui'
  | 'performance'
  | 'missing_capability'
  | 'bug'
  | 'workflow'
  | 'documentation'
  | 'ai_copilot';

export type FeedbackStatus = 'new' | 'triaged' | 'planned' | 'in_progress' | 'done' | 'wont_fix';

export type FeatureDecision = 'approved_v1_1' | 'future_consideration' | 'rejected' | 'needs_evidence';

export interface PilotRecord {
  id: string;
  customerName: string;
  industry: Industry;
  primaryContact: string;
  role: string;
  deploymentStatus: PilotStatus;
  successCriteria: string;
  openIssues: string;
  featureRequests: string;
  risks: string;
  meetingNotes: string;
  goLiveChecklistDone: boolean;
  exitChecklistDone: boolean;
  healthScore: number; // 0–100
  targetGoLive?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackItem {
  id: string;
  customer: string;
  role: string;
  category: FeedbackCategory;
  title: string;
  detail: string;
  severity: Severity;
  businessImpact: string;
  frequency: string;
  status: FeedbackStatus;
  plannedRelease: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureRequest {
  id: string;
  title: string;
  customer: string;
  industry: Industry | string;
  businessJustification: string;
  estimatedRoi: string;
  effort: 'S' | 'M' | 'L' | 'XL';
  risk: Severity;
  targetRelease: string;
  decision: FeatureDecision;
  evidenceNotes: string;
  linkedFeedbackIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseItem {
  id: string;
  title: string;
  type: 'backlog' | 'sprint' | 'version' | 'flag' | 'comms';
  version: string;
  status: string;
  notes: string;
  customerEvidence: string;
  updatedAt: string;
}

export interface CvpState {
  version: 1;
  pilots: PilotRecord[];
  feedback: FeedbackItem[];
  features: FeatureRequest[];
  releases: ReleaseItem[];
  updatedAt: string;
}

export function emptyCvpState(): CvpState {
  return {
    version: 1,
    pilots: [],
    feedback: [],
    features: [],
    releases: [],
    updatedAt: new Date().toISOString(),
  };
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function computeSuccessMetrics(state: CvpState) {
  const active = state.pilots.filter((p) => !['exited', 'prospect'].includes(p.deploymentStatus));
  const avgHealth =
    active.length === 0 ? 0 : Math.round(active.reduce((s, p) => s + p.healthScore, 0) / active.length);
  const openFeedback = state.feedback.filter((f) => !['done', 'wont_fix'].includes(f.status)).length;
  const criticalFeedback = state.feedback.filter((f) => f.severity === 'critical' && f.status !== 'done').length;
  const evidenceBacked = state.features.filter((f) => f.decision === 'approved_v1_1' && f.customer.trim()).length;
  const futureOnly = state.features.filter((f) => f.decision === 'future_consideration').length;
  return {
    activePilots: active.length,
    totalPilots: state.pilots.length,
    avgHealth,
    openFeedback,
    criticalFeedback,
    openIssuesApprox: state.pilots.reduce((n, p) => n + (p.openIssues.trim() ? 1 : 0), 0),
    featureRequests: state.features.length,
    evidenceBacked,
    futureOnly,
  };
}
