import { Injectable } from '@nestjs/common';
import type { WidgetRegistryEntry } from '@opsedge360/shared-types';

export const WIDGET_REGISTRY_VERSION = '1.0.0';

/** Seed registry — Wave 4 will move to database-backed configuration. */
export const WIDGET_REGISTRY: WidgetRegistryEntry[] = [
  { widgetId: 'health.overall', widgetType: 'HealthWidget', title: 'Overall Health', category: 'health', permission: 'executive:read', refreshIntervalSec: 60, contract: 'HealthWidget', defaultRoles: ['cio', 'admin', 'noc'], defaultVisible: true, position: 1, width: 3, height: 2, priority: 1 },
  { widgetId: 'health.availability', widgetType: 'HealthWidget', title: 'Availability', category: 'health', permission: 'executive:read', refreshIntervalSec: 60, contract: 'HealthWidget', defaultRoles: ['cio', 'admin', 'noc', 'operations'], defaultVisible: true, position: 2, width: 3, height: 2, priority: 2 },
  { widgetId: 'health.alerts', widgetType: 'HealthWidget', title: 'Critical Alerts', category: 'health', permission: 'executive:read', refreshIntervalSec: 30, contract: 'HealthWidget', defaultRoles: ['cio', 'soc', 'noc'], defaultVisible: true, position: 3, width: 3, height: 2, priority: 3 },
  { widgetId: 'health.security', widgetType: 'HealthWidget', title: 'Security Score', category: 'health', permission: 'security:read', refreshIntervalSec: 60, contract: 'HealthWidget', defaultRoles: ['ciso', 'soc'], defaultVisible: true, position: 4, width: 3, height: 2, priority: 4 },
  { widgetId: 'health.compliance', widgetType: 'HealthWidget', title: 'Compliance Score', category: 'health', permission: 'compliance:read', refreshIntervalSec: 120, contract: 'HealthWidget', defaultRoles: ['ciso', 'auditor'], defaultVisible: true, position: 5, width: 3, height: 2, priority: 5 },
  { widgetId: 'insights.risks', widgetType: 'RiskWidget', title: 'Top Risks', category: 'assure', permission: 'executive:read', refreshIntervalSec: 60, contract: 'RiskWidget', defaultRoles: ['cio', 'ciso'], defaultVisible: true, position: 10, width: 4, height: 3, priority: 6 },
  { widgetId: 'table.services', widgetType: 'TableWidget', title: 'Business Service Health', category: 'observe', permission: 'executive:read', refreshIntervalSec: 60, contract: 'TableWidget', defaultRoles: ['cio', 'noc', 'operations'], defaultVisible: true, position: 12, width: 6, height: 4, priority: 7 },
  { widgetId: 'insights.ai', widgetType: 'RecommendationWidget', title: 'AI Recommendations', category: 'ai', permission: 'executive:read', refreshIntervalSec: 30, contract: 'RecommendationWidget', defaultRoles: ['cio'], defaultVisible: true, position: 14, width: 4, height: 3, priority: 8 },
  { widgetId: 'trends.executive', widgetType: 'TrendWidget', title: 'Executive Trends', category: 'trend', permission: 'executive:read', refreshIntervalSec: 120, contract: 'TrendWidget', defaultRoles: ['cio', 'admin'], defaultVisible: true, position: 20, width: 12, height: 4, priority: 9 },
  { widgetId: 'actions.board', widgetType: 'ActionWidget', title: 'Recommended Actions', category: 'action', permission: 'executive:read', refreshIntervalSec: 60, contract: 'ActionWidget', defaultRoles: ['cio', 'noc', 'operations'], defaultVisible: true, position: 30, width: 12, height: 3, priority: 10 },
];

@Injectable()
export class WidgetRegistryService {
  getRegistry(): WidgetRegistryEntry[] {
    return WIDGET_REGISTRY;
  }

  getVersion(): string {
    return WIDGET_REGISTRY_VERSION;
  }

  getForRole(role?: string): WidgetRegistryEntry[] {
    if (!role) return WIDGET_REGISTRY;
    return WIDGET_REGISTRY.filter(
      (w) => w.defaultRoles.includes(role) || w.defaultRoles.includes('admin') || role === 'admin' || role === 'cio',
    );
  }
}
