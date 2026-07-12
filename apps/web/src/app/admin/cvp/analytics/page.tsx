'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../AdminShell';
import { CvpNav } from '../CvpNav';
import { loadAnalytics, rankedPages, type AnalyticsSnapshot } from '@/lib/cvp/analytics';
import { TrustBar } from '@/components/apex/TrustBar';
import { EmptyState } from '@/components/UiStates';

export default function CvpAnalyticsPage() {
  const [a, setA] = useState<AnalyticsSnapshot | null>(null);
  useEffect(() => setA(loadAnalytics()), []);

  const most = a ? rankedPages(a.pageViews, 10, 'desc') : [];
  const least = a ? rankedPages(a.pageViews, 10, 'asc') : [];
  const searches = a ? Object.entries(a.searches).sort((x, y) => y[1] - x[1]).slice(0, 10) : [];

  return (
    <AdminShell title="Product Analytics" subtitle="Aggregated usage — no personal profiling">
      <CvpNav />
      <TrustBar lastUpdated={a?.updatedAt} freshness="live" dataSource="Browser-aggregated CVP analytics" coverageLabel="Page views · search · Copilot · errors" />
      {!a || !Object.keys(a.pageViews).length ? (
        <EmptyState title="No analytics yet" hint="Navigate the product to collect aggregated page views. Data stays local unless exported." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="eig-panel p-4">
            <h2 className="mb-2 text-sm font-semibold">Most visited</h2>
            <ul className="space-y-1 text-xs text-slate-300">
              {most.map(([p, n]) => (
                <li key={p} className="flex justify-between gap-2">
                  <span className="truncate">{p}</span>
                  <span className="text-slate-500">{n}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="eig-panel p-4">
            <h2 className="mb-2 text-sm font-semibold">Least visited (among seen)</h2>
            <ul className="space-y-1 text-xs text-slate-300">
              {least.map(([p, n]) => (
                <li key={p} className="flex justify-between gap-2">
                  <span className="truncate">{p}</span>
                  <span className="text-slate-500">{n}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="eig-panel p-4">
            <h2 className="mb-2 text-sm font-semibold">Search / jump terms</h2>
            <ul className="space-y-1 text-xs text-slate-300">
              {searches.length === 0 && <li className="text-slate-500">No palette searches yet</li>}
              {searches.map(([t, n]) => (
                <li key={t} className="flex justify-between gap-2">
                  <span>{t}</span>
                  <span className="text-slate-500">{n}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="eig-panel grid grid-cols-2 gap-3 p-4 text-xs">
            <div>
              <div className="text-slate-500">Dashboard interactions</div>
              <div className="text-lg font-semibold">{a.dashboardClicks}</div>
            </div>
            <div>
              <div className="text-slate-500">Report generations</div>
              <div className="text-lg font-semibold">{a.reportGenerations}</div>
            </div>
            <div>
              <div className="text-slate-500">Copilot opens</div>
              <div className="text-lg font-semibold">{a.copilotOpens}</div>
            </div>
            <div>
              <div className="text-slate-500">Copilot messages</div>
              <div className="text-lg font-semibold">{a.copilotMessages}</div>
            </div>
            <div>
              <div className="text-slate-500">Inline AI runs</div>
              <div className="text-lg font-semibold">{a.inlineAiRuns}</div>
            </div>
            <div>
              <div className="text-slate-500">Client errors</div>
              <div className="text-lg font-semibold">{a.errors}</div>
            </div>
          </div>
          <div className="eig-panel p-4 lg:col-span-2">
            <h2 className="mb-2 text-sm font-semibold">Recent navigation paths</h2>
            <ul className="space-y-1 text-xs text-slate-400">
              {a.navPaths.map((p, i) => (
                <li key={`${p}-${i}`}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
