'use client';

import Link from 'next/link';
import type { ExecutiveDashboardPayload, HealthWidget, ResponseMetadata } from '@opsedge360/shared-types';
import { SectionHeader, PanelHeader, StoryBridge } from '@/components/eig/primitives';
import { ExecutiveBriefing } from '@/components/dashboard/ExecutiveBriefing';
import { DashboardCachedBadge } from '@/components/dashboard/DashboardStates';
import { slotsForSection, slotVisible } from '@/lib/dashboard-layout';
import { useDashboardRenderTelemetry } from '@/hooks/useDashboardTelemetry';
import {
  ActionWidgetsGrid,
  ComplianceWidgetView,
  DomainWidgetView,
  HealthWidgetView,
  IncidentWidgetsPanel,
  RecommendationWidgetsPanel,
  RiskWidgetsPanel,
  SecurityWidgetView,
  TableWidgetView,
  TrendWidgetSummary,
} from '@/components/dashboard/widgets/WidgetViews';
import { ChartWidgetsLazy } from '@/components/dashboard/widgets/ChartWidgetsLazy';

export type ExecutiveDashboardClientProps = {
  payload: ExecutiveDashboardPayload;
  metadata: ResponseMetadata;
  requestId: string;
  apiDurationMs: number;
  cacheHit: boolean;
};

export function ExecutiveDashboardClient({
  payload,
  metadata,
  requestId,
  apiDurationMs,
  cacheHit,
}: ExecutiveDashboardClientProps) {
  const role = metadata.role ?? payload.role ?? 'cio';

  useDashboardRenderTelemetry([payload, metadata], {
    apiCalls: 1,
    apiDurationMs,
    cacheHit,
    requestId,
    widgetCount:
      payload.health.length +
      payload.operationalSummary.length +
      payload.recommendedActions.length +
      payload.charts.length,
    dashboardLoadMs: apiDurationMs,
  });

  const healthSlots = slotsForSection('health', role);
  const healthWidgets = payload.health
    .filter((w) => slotVisible(w.id, role))
    .sort((a, b) => {
      const pa = healthSlots.find((s) => s.widgetId === a.id)?.position ?? 99;
      const pb = healthSlots.find((s) => s.widgetId === b.id)?.position ?? 99;
      return pa - pb;
    });

  const domainWidgets = payload.operationalSummary.filter((w) => slotVisible(w.id, role));
  const tableWidget = payload.tables.find((t) => t.id === 'table.services');

  const priorityActions = [
    {
      id: 'a-incident',
      title: 'Open incident',
      description: 'Correlate alerts into an incident and open investigation.',
      href: '/ops-intelligence?workflow=create-incident',
      cta: 'Create & investigate',
    },
    {
      id: 'a-topology',
      title: 'View topology',
      description: 'Dependency paths and blast radius.',
      href: '/topology',
      cta: 'Open Topology',
    },
    {
      id: 'a-twin',
      title: 'Digital Twin',
      description: 'Simulate impact before change windows.',
      href: '/twin?workflow=impact',
      cta: 'Simulate impact',
    },
    {
      id: 'a-drift',
      title: 'CMDB Drift',
      description: 'Clear unauthorized configuration change.',
      href: '/cmdb/drift',
      cta: 'Review drift',
    },
    {
      id: 'a-investigate',
      title: 'Investigate',
      description: 'Ops Intelligence on active signals.',
      href: '/ops-intelligence',
      cta: 'Investigate',
    },
    {
      id: 'a-report',
      title: 'Generate executive report',
      description: 'Board-ready health and risk package with download.',
      href: '/reports?workflow=generate&type=executive_summary',
      cta: 'Generate & export',
    },
    {
      id: 'a-automation',
      title: 'Run automation',
      description: 'Automation catalog — execute remediation workflow.',
      href: '/admin/workflows?workflow=run',
      cta: 'Open catalog',
    },
  ];

  const actions = [
    ...priorityActions.map((a, i) => ({
      ...a,
      category: 'action' as const,
      priority: i,
      permission: undefined,
    })),
    ...payload.recommendedActions,
  ];

  return (
    <div className="space-y-6 eig-page-enter">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Executive command center
          </div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Where am I · what is unhealthy · what next</h1>
          <p className="mt-0.5 max-w-2xl text-xs text-slate-400 sm:text-sm">
            Enterprise digital operations — one aggregated view · role: {role}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span>API {apiDurationMs}ms</span>
          <span>·</span>
          <span>{metadata.dataMode === 'illustrative' ? metadata.label ?? 'Illustrative Demo Data' : 'Live'}</span>
          <DashboardCachedBadge cacheHit={cacheHit} />
          <Link href="/demo/guided" className="rounded-[var(--eig-radius-sm)] bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-500">
            Guided eval
          </Link>
        </div>
      </div>

      <ExecutiveBriefing payload={payload} metadata={metadata} />

      <StoryBridge>
        Start with board-level health, then scan operational domains, understand risks and AI guidance, and act.
      </StoryBridge>

      <section aria-labelledby="exec-kpis">
        <SectionHeader
          id="exec-kpis"
          eyebrow="Executive health"
          title="Are we within tolerance?"
          description="Availability, security, compliance, business impact — each KPI drills into the owning workspace."
        />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-4">
          {healthWidgets.map((w: HealthWidget) => (
            <HealthWidgetView key={w.id} widget={w} />
          ))}
        </div>
      </section>

      <section aria-labelledby="ops-domains">
        <SectionHeader
          id="ops-domains"
          eyebrow="Operational status"
          title="How is the estate performing?"
          description="Domain summaries — infrastructure through compliance — without raw metric dumps."
          actions={<Link href="/cmdb" className="text-xs text-sky-400 hover:underline">CMDB →</Link>}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {domainWidgets.map((w) => (
            <DomainWidgetView
              key={w.id}
              widget={w}
              security={payload.insights.security}
              compliance={payload.insights.compliance}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="ops-intel">
        <SectionHeader
          id="ops-intel"
          eyebrow="Business risks & intelligence"
          title="What needs attention now?"
          description="Top risks, affected services, AI recommendations, and open incidents."
        />
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
          <div className="eig-panel overflow-hidden xl:col-span-4">
            <PanelHeader title="Top risks" description="Business impact · owner · next step" />
            <div className="p-3">
              <RiskWidgetsPanel risks={payload.insights.topRisks} />
            </div>
          </div>

          <div className="eig-panel overflow-hidden xl:col-span-5">
            <PanelHeader
              title="Affected services"
              description="Business service continuity"
              action={
                <Link href="/ops-intelligence" className="text-xs text-sky-400 hover:underline">
                  Investigate →
                </Link>
              }
            />
            <div className="p-3">
              {tableWidget ? <TableWidgetView widget={tableWidget} /> : null}
            </div>
          </div>

          <div className="space-y-3 xl:col-span-3">
            <div className="eig-panel overflow-hidden">
              <PanelHeader title="AI recommendations" description="Proactive next moves" />
              <div className="max-h-64 overflow-y-auto p-3">
                <RecommendationWidgetsPanel items={payload.insights.aiRecommendations} />
              </div>
            </div>
            {payload.insights.security && slotVisible('insights.security', role) && (
              <SecurityWidgetView widget={payload.insights.security} />
            )}
            {payload.insights.compliance && slotVisible('insights.compliance', role) && (
              <ComplianceWidgetView widget={payload.insights.compliance} />
            )}
            <div className="eig-panel overflow-hidden">
              <PanelHeader title="Recent incidents" description="Active operational events" />
              <div className="p-3">
                <IncidentWidgetsPanel incidents={payload.insights.recentIncidents} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="actions">
        <SectionHeader
          id="actions"
          eyebrow="Recommended actions"
          title="What should we do next?"
          description="Investigate, twin, drift, report — one click to the right workspace."
        />
        <ActionWidgetsGrid actions={actions} />
      </section>

      {slotVisible('trends.executive', role) && payload.trends.series.length > 0 && (
        <section aria-labelledby="trends">
          <SectionHeader
            id="trends"
            eyebrow="Trend context"
            title="30-day executive trends"
            description="Availability, SLA compliance, incidents, and MTTR — context for the KPI story above."
          />
          <TrendWidgetSummary widget={payload.trends} dataMode={metadata.dataMode} />
          <ChartWidgetsLazy charts={payload.charts} dataMode={metadata.dataMode} />
        </section>
      )}
    </div>
  );
}
