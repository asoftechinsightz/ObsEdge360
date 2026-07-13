'use client';

import Link from 'next/link';
import type {
  ActionWidget,
  ChartWidget,
  ComplianceWidget,
  DomainWidget,
  HealthWidget,
  IncidentWidget,
  RecommendationWidget,
  RiskWidget,
  SecurityWidget,
  TableWidget,
  TrendWidget,
} from '@opsedge360/shared-types';
import {
  ActionCard,
  DomainCard,
  MetricCard,
  StatusBadge,
} from '@/components/eig/primitives';
import { DemoAwareEmptyState } from '@/components/ede/DemoAwareEmptyState';
import { markWidgetRender } from '@/hooks/useDashboardTelemetry';
import { useEffect, useRef } from 'react';

function useWidgetTiming(widgetId: string) {
  const start = useRef(performance.now());
  useEffect(() => {
    markWidgetRender(widgetId, Math.round(performance.now() - start.current));
  }, [widgetId]);
}

export function HealthWidgetView({ widget }: { widget: HealthWidget }) {
  useWidgetTiming(widget.id);
  return (
    <MetricCard
      label={widget.title}
      value={String(widget.score)}
      trend={widget.trend}
      status={widget.status}
      href={widget.drilldown?.href}
      sparkline={widget.sparkline}
      hint={widget.unit ? `Unit: ${widget.unit}` : undefined}
    />
  );
}

export function DomainWidgetView({ widget, security, compliance }: { widget: DomainWidget; security?: SecurityWidget; compliance?: ComplianceWidget }) {
  useWidgetTiming(widget.id);
  const isSecurity = widget.id === 'domain.security' && security;
  const isCompliance = widget.id === 'domain.compliance' && compliance;
  return (
    <DomainCard
      title={widget.title}
      summary={widget.summary}
      status={widget.status}
      href={widget.drilldown?.href ?? '#'}
      meta={widget.countLabel}
      trend={widget.summary}
      criticalCount={isSecurity ? security.critical : undefined}
      warningCount={isSecurity ? security.warning : undefined}
      healthLabel={isCompliance ? `${compliance.score}/100` : isSecurity ? security.posture.toUpperCase() : undefined}
    />
  );
}

export function RiskWidgetsPanel({ risks }: { risks: RiskWidget[] }) {
  useWidgetTiming('insights.risks');
  if (!risks.length) {
    return (
      <DemoAwareEmptyState
        title="No elevated risks in this workspace"
        hint="Load Illustrative Demo Data to surface drift-backed business risks."
        setupHref="/cmdb/drift"
      />
    );
  }
  return (
    <div className="space-y-2">
      {risks.map((risk) => (
        <div key={risk.id} className="rounded-[var(--eig-radius-sm)] border border-white/5 bg-black/10 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-medium text-slate-100">{risk.title}</div>
            <StatusBadge status={risk.severity} />
          </div>
          <div className="mt-1 text-xs text-slate-400">{risk.affectedService}</div>
          {risk.owner ? <div className="mt-0.5 text-[11px] text-slate-500">Owner: {risk.owner}</div> : null}
          {risk.revenueAtRisk != null && risk.revenueAtRisk > 0 && (
            <div className="mt-1 text-xs text-amber-400">₹{(risk.revenueAtRisk / 1000).toFixed(0)}K/hr impact</div>
          )}
          <Link href={risk.drilldown.href} className="mt-2 inline-block text-xs text-sky-400 hover:underline">
            {risk.recommendedAction ?? risk.drilldown.label} →
          </Link>
        </div>
      ))}
    </div>
  );
}

export function RecommendationWidgetsPanel({ items }: { items: RecommendationWidget[] }) {
  useWidgetTiming('insights.ai');
  return (
    <ul className="space-y-2">
      {items.map((r) => (
        <li key={r.id} className="rounded-[var(--eig-radius-sm)] border border-white/5 bg-black/10 p-3">
          <div className="text-sm font-medium text-slate-100">{r.title}</div>
          <p className="mt-1 text-xs text-slate-400">{r.reason}</p>
          {r.owner ? <p className="mt-0.5 text-[11px] text-slate-500">Owner: {r.owner}</p> : null}
          {r.confidence != null && (
            <p className="mt-0.5 text-[11px] text-sky-400/80">Confidence: {Math.round(r.confidence)}%</p>
          )}
          <Link href={r.href} className="mt-2 inline-block text-xs text-sky-400 hover:underline">
            {r.action} →
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SecurityWidgetView({ widget }: { widget: SecurityWidget }) {
  useWidgetTiming(widget.id);
  return (
    <div className="eig-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">{widget.title}</h3>
        <StatusBadge status={widget.status} />
      </div>
      <p className="mt-1 text-xs text-slate-500">{widget.trend}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded border border-red-500/20 bg-red-500/10 px-2 py-2">
          <div className="font-semibold text-red-300">{widget.critical}</div>
          <div className="text-slate-500">Critical</div>
        </div>
        <div className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-2">
          <div className="font-semibold text-amber-200">{widget.warning}</div>
          <div className="text-slate-500">Warning</div>
        </div>
        <div className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-2">
          <div className="font-semibold text-emerald-300">{widget.healthy}</div>
          <div className="text-slate-500">Healthy</div>
        </div>
      </div>
      {widget.action && (
        <Link href={widget.action.href} className="mt-3 inline-block text-xs text-sky-400 hover:underline">
          {widget.action.label} →
        </Link>
      )}
    </div>
  );
}

export function ComplianceWidgetView({ widget }: { widget: ComplianceWidget }) {
  useWidgetTiming(widget.id);
  return (
    <div className="eig-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">{widget.title}</h3>
        <StatusBadge status={widget.status} />
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-50">{widget.score}/100</div>
      {widget.trend && <p className="mt-1 text-xs text-slate-500">{widget.trend}</p>}
      {widget.drilldown && (
        <Link href={widget.drilldown.href} className="mt-3 inline-block text-xs text-sky-400 hover:underline">
          {widget.drilldown.label} →
        </Link>
      )}
    </div>
  );
}

export function TableWidgetView({ widget }: { widget: TableWidget }) {
  useWidgetTiming(widget.id);
  if (!widget.rows.length) {
    return (
      <DemoAwareEmptyState
        title="No services to display"
        hint="Load Illustrative Demo Data to populate tier-1 services."
        setupHref="/demo/guided"
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label={widget.title}>
        <thead>
          <tr className="border-b border-white/10 text-left text-[11px] text-slate-500">
            {widget.columns.map((c) => (
              <th key={c.key} className="px-3 py-2 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {widget.rows.map((row, i) => (
            <tr key={String(row.id ?? i)} className="border-b border-white/5 hover:bg-white/[0.02]">
              {widget.columns.map((c) => (
                <td key={c.key} className="px-3 py-2.5 text-slate-200">
                  {c.key === 'status' ? <StatusBadge status={String(row[c.key] ?? 'unknown')} /> : String(row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function IncidentWidgetsPanel({ incidents }: { incidents: IncidentWidget[] }) {
  useWidgetTiming('insights.incidents');
  if (!incidents.length) {
    return <p className="text-xs text-slate-500">No active incidents in the current executive snapshot.</p>;
  }
  return (
    <ul className="space-y-2">
      {incidents.map((inc) => (
        <li key={inc.id} className="rounded-[var(--eig-radius-sm)] border border-white/5 px-3 py-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-slate-200">{inc.title}</span>
            <StatusBadge status={inc.severity} />
          </div>
          {inc.affectedService && <div className="mt-1 text-slate-500">{inc.affectedService}</div>}
          <Link href={inc.drilldown.href} className="mt-1 inline-block text-sky-400 hover:underline">
            {inc.drilldown.label} →
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ActionWidgetsGrid({ actions }: { actions: ActionWidget[] }) {
  useWidgetTiming('actions.board');
  const seen = new Set<string>();
  const unique = actions.filter((a) => {
    if (seen.has(a.href)) return false;
    seen.add(a.href);
    return true;
  });
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {unique.slice(0, 8).map((a) => (
        <ActionCard key={a.id} title={a.title} description={a.description} href={a.href} cta={a.cta} />
      ))}
    </div>
  );
}

export function TrendWidgetSummary({ widget, dataMode }: { widget: TrendWidget; dataMode?: string }) {
  useWidgetTiming(widget.id);
  const last = widget.series[widget.series.length - 1];
  if (!last) return null;
  return (
    <p className="mb-3 text-xs text-slate-500">
      Latest availability {last.availability?.toFixed(2)}% · MTTR {last.mttrMinutes}m ·{' '}
      {dataMode === 'illustrative' ? 'Illustrative Demo Data' : 'Live executive trends'}
    </p>
  );
}

export type ChartWidgetsProps = { charts: ChartWidget[]; dataMode?: string };
