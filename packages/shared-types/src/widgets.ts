export type WidgetStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';
export type WidgetCategory = 'health' | 'estate' | 'observe' | 'assure' | 'ai' | 'action' | 'trend' | 'chart';
export type WidgetSize = 'sm' | 'md' | 'lg' | 'xl';

export interface WidgetDrilldown {
  href: string;
  label: string;
}

export interface WidgetMetadata {
  permission?: string;
  refreshIntervalSec?: number;
  size?: WidgetSize;
  roles?: string[];
  position?: number;
  priority?: number;
  defaultVisible?: boolean;
  width?: number;
  height?: number;
  /** SSE/WebSocket channel id for future subscribe() */
  streamChannel?: string;
}

export interface WidgetBase {
  id: string;
  title: string;
  description?: string;
  category: WidgetCategory;
  status: WidgetStatus;
  drilldown?: WidgetDrilldown;
  metadata?: WidgetMetadata;
}

export interface HealthWidget extends WidgetBase {
  category: 'health';
  score: number | string;
  unit?: string;
  trend?: string;
  sparkline?: number[];
}

export interface DomainWidget extends WidgetBase {
  category: 'estate' | 'observe' | 'assure';
  summary: string;
  count?: number;
  countLabel?: string;
}

export interface RiskWidget {
  id: string;
  title: string;
  severity: string;
  affectedService: string;
  revenueAtRisk?: number;
  owner?: string;
  recommendedAction?: string;
  status: WidgetStatus;
  drilldown: WidgetDrilldown;
  illustrative?: boolean;
  label?: string;
}

export interface ActionWidget {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  category: 'action';
  permission?: string;
  priority?: number;
}

export interface TrendPoint {
  day: string;
  availability?: number;
  slaCompliance?: number;
  mttrMinutes?: number;
  activeIncidents?: number;
  revenueAtRisk?: number;
  openAlerts?: number;
}

export interface TrendWidget extends WidgetBase {
  category: 'trend';
  series: TrendPoint[];
  metrics: Array<'availability' | 'slaCompliance' | 'mttrMinutes' | 'activeIncidents'>;
}

export interface ChartSeries {
  name: string;
  data: Array<{ x: string; y: number }>;
}

export interface ChartWidget extends WidgetBase {
  category: 'chart';
  chartType: 'line' | 'bar' | 'area';
  series: ChartSeries[];
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  severity?: string;
  description?: string;
}

export interface TimelineWidget extends WidgetBase {
  category: 'assure';
  events: TimelineEvent[];
}

export interface TopologyNode {
  id: string;
  label: string;
  type: string;
  status: WidgetStatus;
}

export interface TopologyWidget extends WidgetBase {
  category: 'estate';
  nodes: TopologyNode[];
  edgeCount?: number;
}

export interface IncidentWidget {
  id: string;
  title: string;
  severity: string;
  status: string;
  affectedService?: string;
  owner?: string;
  openedAt?: string;
  drilldown: WidgetDrilldown;
}

export interface ComplianceWidget extends WidgetBase {
  category: 'assure';
  score: number;
  frameworkCount?: number;
  controlsPassing?: number;
  controlsFailing?: number;
  trend?: string;
}

export interface SecurityWidget extends WidgetBase {
  category: 'assure';
  posture: string;
  critical: number;
  warning: number;
  healthy: number;
  trend?: string;
  action?: WidgetDrilldown;
}

export interface TableColumn {
  key: string;
  label: string;
}

export interface TableWidget extends WidgetBase {
  category: 'observe' | 'estate' | 'assure';
  columns: TableColumn[];
  rows: Array<Record<string, unknown>>;
}

export interface ServiceHealthRow {
  id: string;
  name: string;
  tier: number;
  availability: number;
  slaTarget: number;
  status: string;
  owner?: string;
}

export interface RecommendationWidget {
  id: string;
  title: string;
  reason: string;
  href: string;
  action: string;
  owner?: string;
  confidence?: number;
}

export interface ExecutiveNarrative {
  what: string;
  why: string;
  impact: string;
  owner: string;
  next: string;
  nextHref: string;
  aiConfidence?: number;
  illustrative?: boolean;
  label?: string;
}
