import type { ExecutiveKpis } from './executive-kpis';
import type {
  ActionWidget,
  ChartWidget,
  ComplianceWidget,
  DomainWidget,
  ExecutiveNarrative,
  HealthWidget,
  IncidentWidget,
  RecommendationWidget,
  RiskWidget,
  SecurityWidget,
  ServiceHealthRow,
  TableWidget,
  TimelineWidget,
  TopologyWidget,
  TrendWidget,
} from './widgets';

export interface ExecutiveDashboardPayload {
  narrative: ExecutiveNarrative;
  kpis: ExecutiveKpis & {
    illustrative?: boolean;
    label?: string;
    coverageLabel?: string;
  };
  health: HealthWidget[];
  operationalSummary: DomainWidget[];
  insights: {
    topRisks: RiskWidget[];
    affectedServices: ServiceHealthRow[];
    aiRecommendations: RecommendationWidget[];
    recentIncidents: IncidentWidget[];
    security?: SecurityWidget;
    compliance?: ComplianceWidget;
    timeline?: TimelineWidget;
  };
  recommendedActions: ActionWidget[];
  trends: TrendWidget;
  charts: ChartWidget[];
  tables: TableWidget[];
  topology?: TopologyWidget;
  role?: string;
}

export interface WidgetRegistryEntry {
  widgetId: string;
  widgetType: string;
  title: string;
  description?: string;
  category: string;
  permission?: string;
  refreshIntervalSec: number;
  contract: string;
  defaultRoles: string[];
  defaultVisible: boolean;
  position: number;
  width: number;
  height: number;
  priority: number;
}
