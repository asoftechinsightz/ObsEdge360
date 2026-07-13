import type { WidgetRegistryEntry } from '@opsedge360/shared-types';

export type DashboardSectionId = 'health' | 'domains' | 'intelligence' | 'actions' | 'trends';

export type LayoutSlot = {
  widgetId: string;
  section: DashboardSectionId;
  position: number;
  width: number;
  height: number;
  priority: number;
  defaultVisible: boolean;
  roles: string[];
  refreshIntervalSec: number;
  contract: string;
};

/** Layout metadata — mirrors backend WidgetRegistry; no JSX positions. */
export const EXECUTIVE_DASHBOARD_LAYOUT: LayoutSlot[] = [
  { widgetId: 'health.overall', section: 'health', position: 1, width: 3, height: 2, priority: 1, defaultVisible: true, roles: ['cio', 'admin', 'noc'], refreshIntervalSec: 60, contract: 'HealthWidget' },
  { widgetId: 'health.availability', section: 'health', position: 2, width: 3, height: 2, priority: 2, defaultVisible: true, roles: ['cio', 'admin', 'noc', 'operations'], refreshIntervalSec: 60, contract: 'HealthWidget' },
  { widgetId: 'health.alerts', section: 'health', position: 3, width: 3, height: 2, priority: 3, defaultVisible: true, roles: ['cio', 'soc', 'noc'], refreshIntervalSec: 30, contract: 'HealthWidget' },
  { widgetId: 'health.security', section: 'health', position: 4, width: 3, height: 2, priority: 4, defaultVisible: true, roles: ['ciso', 'soc', 'cio'], refreshIntervalSec: 60, contract: 'HealthWidget' },
  { widgetId: 'health.compliance', section: 'health', position: 5, width: 3, height: 2, priority: 5, defaultVisible: true, roles: ['ciso', 'auditor', 'cio'], refreshIntervalSec: 120, contract: 'HealthWidget' },
  { widgetId: 'health.network', section: 'health', position: 6, width: 3, height: 2, priority: 6, defaultVisible: true, roles: ['noc', 'cio'], refreshIntervalSec: 90, contract: 'HealthWidget' },
  { widgetId: 'health.business', section: 'health', position: 7, width: 3, height: 2, priority: 7, defaultVisible: true, roles: ['cio'], refreshIntervalSec: 60, contract: 'HealthWidget' },
  { widgetId: 'health.revenue', section: 'health', position: 8, width: 3, height: 2, priority: 8, defaultVisible: true, roles: ['cio', 'admin'], refreshIntervalSec: 60, contract: 'HealthWidget' },
  { widgetId: 'health.mttr', section: 'health', position: 9, width: 3, height: 2, priority: 9, defaultVisible: true, roles: ['noc', 'operations'], refreshIntervalSec: 60, contract: 'HealthWidget' },
  { widgetId: 'domain.infrastructure', section: 'domains', position: 10, width: 4, height: 2, priority: 10, defaultVisible: true, roles: ['cio', 'noc'], refreshIntervalSec: 90, contract: 'DomainWidget' },
  { widgetId: 'domain.applications', section: 'domains', position: 11, width: 4, height: 2, priority: 11, defaultVisible: true, roles: ['cio', 'noc'], refreshIntervalSec: 90, contract: 'DomainWidget' },
  { widgetId: 'domain.services', section: 'domains', position: 12, width: 4, height: 2, priority: 12, defaultVisible: true, roles: ['cio', 'noc'], refreshIntervalSec: 90, contract: 'DomainWidget' },
  { widgetId: 'domain.cloud', section: 'domains', position: 13, width: 4, height: 2, priority: 13, defaultVisible: true, roles: ['cio'], refreshIntervalSec: 90, contract: 'DomainWidget' },
  { widgetId: 'domain.databases', section: 'domains', position: 14, width: 4, height: 2, priority: 14, defaultVisible: true, roles: ['cio'], refreshIntervalSec: 90, contract: 'DomainWidget' },
  { widgetId: 'domain.containers', section: 'domains', position: 15, width: 4, height: 2, priority: 15, defaultVisible: true, roles: ['noc'], refreshIntervalSec: 90, contract: 'DomainWidget' },
  { widgetId: 'domain.network', section: 'domains', position: 16, width: 4, height: 2, priority: 16, defaultVisible: true, roles: ['noc'], refreshIntervalSec: 90, contract: 'DomainWidget' },
  { widgetId: 'domain.security', section: 'domains', position: 17, width: 4, height: 2, priority: 17, defaultVisible: true, roles: ['ciso', 'soc'], refreshIntervalSec: 60, contract: 'DomainWidget' },
  { widgetId: 'domain.compliance', section: 'domains', position: 18, width: 4, height: 2, priority: 18, defaultVisible: true, roles: ['ciso', 'auditor'], refreshIntervalSec: 120, contract: 'DomainWidget' },
  { widgetId: 'insights.risks', section: 'intelligence', position: 20, width: 4, height: 3, priority: 20, defaultVisible: true, roles: ['cio', 'ciso'], refreshIntervalSec: 60, contract: 'RiskWidget' },
  { widgetId: 'table.services', section: 'intelligence', position: 21, width: 6, height: 4, priority: 21, defaultVisible: true, roles: ['cio', 'noc'], refreshIntervalSec: 60, contract: 'TableWidget' },
  { widgetId: 'insights.ai', section: 'intelligence', position: 22, width: 4, height: 3, priority: 22, defaultVisible: true, roles: ['cio'], refreshIntervalSec: 30, contract: 'RecommendationWidget' },
  { widgetId: 'insights.security', section: 'intelligence', position: 23, width: 4, height: 2, priority: 23, defaultVisible: true, roles: ['ciso', 'soc'], refreshIntervalSec: 60, contract: 'SecurityWidget' },
  { widgetId: 'insights.compliance', section: 'intelligence', position: 24, width: 4, height: 2, priority: 24, defaultVisible: true, roles: ['ciso', 'auditor'], refreshIntervalSec: 120, contract: 'ComplianceWidget' },
  { widgetId: 'actions.board', section: 'actions', position: 30, width: 12, height: 3, priority: 30, defaultVisible: true, roles: ['cio', 'noc', 'operations'], refreshIntervalSec: 60, contract: 'ActionWidget' },
  { widgetId: 'trends.executive', section: 'trends', position: 40, width: 12, height: 4, priority: 40, defaultVisible: true, roles: ['cio', 'admin'], refreshIntervalSec: 120, contract: 'TrendWidget' },
  { widgetId: 'chart.availability', section: 'trends', position: 41, width: 6, height: 4, priority: 41, defaultVisible: true, roles: ['cio'], refreshIntervalSec: 120, contract: 'ChartWidget' },
  { widgetId: 'chart.incidents', section: 'trends', position: 42, width: 6, height: 4, priority: 42, defaultVisible: true, roles: ['cio', 'noc'], refreshIntervalSec: 120, contract: 'ChartWidget' },
];

export function slotsForSection(section: DashboardSectionId, role?: string): LayoutSlot[] {
  return EXECUTIVE_DASHBOARD_LAYOUT.filter((s) => {
    if (s.section !== section || !s.defaultVisible) return false;
    if (!role) return true;
    return s.roles.includes(role) || s.roles.includes('admin') || role === 'admin' || role === 'cio';
  }).sort((a, b) => a.position - b.position);
}

export function slotVisible(widgetId: string, role?: string): boolean {
  const slot = EXECUTIVE_DASHBOARD_LAYOUT.find((s) => s.widgetId === widgetId);
  if (!slot || !slot.defaultVisible) return false;
  if (!role) return true;
  return slot.roles.includes(role) || slot.roles.includes('admin') || role === 'admin' || role === 'cio';
}

export function layoutFromRegistry(entries: WidgetRegistryEntry[]): LayoutSlot[] {
  return entries.map((e) => ({
    widgetId: e.widgetId,
    section: categoryToSection(e.category),
    position: e.position,
    width: e.width,
    height: e.height,
    priority: e.priority,
    defaultVisible: e.defaultVisible,
    roles: e.defaultRoles,
    refreshIntervalSec: e.refreshIntervalSec,
    contract: e.contract,
  }));
}

function categoryToSection(category: string): DashboardSectionId {
  if (category === 'health') return 'health';
  if (category === 'estate' || category === 'observe' || category === 'assure') return 'domains';
  if (category === 'action') return 'actions';
  if (category === 'trend' || category === 'chart') return 'trends';
  return 'intelligence';
}

export function gridColsClass(width: number): string {
  if (width >= 12) return 'col-span-12';
  if (width >= 6) return 'col-span-12 lg:col-span-6';
  if (width >= 4) return 'col-span-12 sm:col-span-6 lg:col-span-4';
  return 'col-span-12 sm:col-span-6 lg:col-span-3';
}
