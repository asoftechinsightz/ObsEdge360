'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Plus, RefreshCw, Save } from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import clsx from 'clsx';

interface Widget {
  id: string;
  widgetType: string;
  title: string;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
}

interface Dashboard {
  id: string;
  name: string;
  refreshSeconds: number;
  layoutVersion: number;
  widgets: Widget[];
}

interface CatalogItem {
  type: string;
  title: string;
  description: string;
}

interface WidgetData {
  widgetId: string;
  widgetType: string;
  title: string;
  data: unknown;
  error?: string;
}

function renderWidgetBody(wd: WidgetData | undefined) {
  if (!wd) return <p className="text-xs text-slate-500">Loading…</p>;
  if (wd.error) return <p className="text-xs text-rose-400">{wd.error}</p>;
  const data = wd.data as Record<string, unknown> | null;
  if (!data) return <p className="text-xs text-slate-500">No data</p>;

  if (wd.widgetType === 'kpi') {
    const entries = Object.entries(data).slice(0, 6);
    return (
      <div className="grid grid-cols-3 gap-2">
        {entries.map(([k, v]) => (
          <div key={k} className="rounded bg-slate-950/60 p-2">
            <div className="text-[10px] text-slate-500 truncate">{k}</div>
            <div className="text-lg text-slate-100">{String(v)}</div>
          </div>
        ))}
      </div>
    );
  }

  if (wd.widgetType === 'incidents') {
    const items = ((data.incidents as Array<Record<string, unknown>>) ?? []).slice(0, 8);
    return (
      <ul className="space-y-1 text-xs text-slate-300">
        {items.map((i) => (
          <li key={String(i.id)} className="truncate">
            <span className="text-slate-500">{String(i.severity)}</span> · {String(i.title)}
          </li>
        ))}
        {items.length === 0 && <li className="text-slate-500">No open incidents</li>}
      </ul>
    );
  }

  if (wd.widgetType === 'anomalies') {
    const items = ((data.anomalies as Array<Record<string, unknown>>) ?? []).slice(0, 8);
    return (
      <ul className="space-y-1 text-xs text-slate-300">
        {items.map((i) => (
          <li key={String(i.id)} className="truncate">
            {String(i.metric_name ?? i.anomaly_type)} · σ{String(i.deviation_sigma ?? '—')}
          </li>
        ))}
        {items.length === 0 && <li className="text-slate-500">No anomalies</li>}
      </ul>
    );
  }

  if (wd.widgetType === 'topology') {
    const layers = ((data.layers as Array<Record<string, unknown>>) ?? []).slice(0, 8);
    return (
      <ul className="space-y-1 text-xs text-slate-300">
        {layers.map((l) => (
          <li key={String(l.id)} className="flex justify-between">
            <span>{String(l.label ?? l.id)}</span>
            <span>{String(l.nodeCount ?? 0)}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (wd.widgetType === 'signals' || wd.widgetType === 'forecasts') {
    const key = wd.widgetType === 'signals' ? 'signals' : 'forecasts';
    const items = ((data[key] as Array<Record<string, unknown>>) ?? []).slice(0, 8);
    return (
      <ul className="space-y-1 text-xs text-slate-300">
        {items.map((i, idx) => (
          <li key={String(i.id ?? idx)} className="truncate">
            {String(i.title ?? i.metric_name ?? i.signal_type ?? JSON.stringify(i).slice(0, 60))}
          </li>
        ))}
        {items.length === 0 && <li className="text-slate-500">Empty</li>}
      </ul>
    );
  }

  return (
    <pre className="text-[10px] text-slate-400 overflow-auto max-h-40">
      {JSON.stringify(data, null, 2).slice(0, 800)}
    </pre>
  );
}

export default function DashboardStudioPage() {
  const params = useParams();
  const id = String(params.id);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [dataMap, setDataMap] = useState<Record<string, WidgetData>>({});
  const [message, setMessage] = useState('');
  const [addType, setAddType] = useState('kpi');

  const load = useCallback(async () => {
    try {
      const [d, cat] = await Promise.all([
        apiClient<Dashboard>(`/dashboards/${id}`),
        apiClient<{ widgets: CatalogItem[] }>('/dashboards/catalog'),
      ]);
      setDash(d);
      setCatalog(cat.widgets ?? []);
      if (cat.widgets?.[0]) setAddType(cat.widgets[0].type);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }, [id]);

  const loadData = useCallback(async () => {
    try {
      const res = await apiClient<{ widgets: WidgetData[] }>(`/dashboards/${id}/data`);
      const map: Record<string, WidgetData> = {};
      for (const w of res.widgets ?? []) map[w.widgetId] = w;
      setDataMap(map);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }, [id]);

  useEffect(() => {
    void load().then(() => loadData());
  }, [load, loadData]);

  useEffect(() => {
    if (!dash?.refreshSeconds) return;
    const ms = Math.max(dash.refreshSeconds, 5) * 1000;
    const t = setInterval(() => void loadData(), ms);
    return () => clearInterval(t);
  }, [dash?.refreshSeconds, loadData]);

  async function addWidget() {
    try {
      await apiClient(`/dashboards/${id}/widgets`, {
        method: 'POST',
        body: JSON.stringify({ widgetType: addType }),
      });
      setMessage(`Added ${addType}`);
      await load();
      await loadData();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function saveLayout() {
    if (!dash) return;
    try {
      await apiClient(`/dashboards/${id}/layout`, {
        method: 'PUT',
        body: JSON.stringify({
          widgets: dash.widgets.map((w) => ({
            id: w.id,
            gridX: w.gridX,
            gridY: w.gridY,
            gridW: w.gridW,
            gridH: w.gridH,
          })),
        }),
      });
      setMessage('Layout saved');
      await load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function shareViewer() {
    try {
      await apiClient(`/dashboards/${id}/shares`, {
        method: 'POST',
        body: JSON.stringify({ principalType: 'role', principalId: 'viewer', permission: 'view' }),
      });
      setMessage('Shared with role:viewer');
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboards" className="text-slate-400 hover:text-slate-200">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold text-slate-100">{dash?.name ?? 'Dashboard'}</h1>
          <span className="text-xs text-slate-500">v{dash?.layoutVersion ?? '—'}</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <select
              value={addType}
              onChange={(e) => setAddType(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
            >
              {catalog.map((c) => (
                <option key={c.type} value={c.type}>{c.title}</option>
              ))}
            </select>
            <button type="button" onClick={() => void addWidget()} className="inline-flex items-center gap-1 rounded-md bg-cyan-600/80 px-2 py-1 text-xs text-white">
              <Plus className="h-3.5 w-3.5" /> Widget
            </button>
            <button type="button" onClick={() => void saveLayout()} className="inline-flex items-center gap-1 rounded-md bg-indigo-600/80 px-2 py-1 text-xs text-white">
              <Save className="h-3.5 w-3.5" /> Layout
            </button>
            <button type="button" onClick={() => void shareViewer()} className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300">
              Share viewer
            </button>
            <button type="button" onClick={() => void loadData()} className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {message && (
          <div className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">{message}</div>
        )}

        <div className="grid grid-cols-12 gap-3 auto-rows-min">
          {(dash?.widgets ?? []).map((w) => (
            <div
              key={w.id}
              className={clsx('rounded-lg border border-slate-800 bg-slate-950/70 p-3')}
              style={{
                gridColumn: `span ${Math.min(Math.max(w.gridW, 2), 12)} / span ${Math.min(Math.max(w.gridW, 2), 12)}`,
                minHeight: `${Math.max(w.gridH, 2) * 48}px`,
              }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-slate-200 truncate">{w.title}</h2>
                <span className="text-[10px] uppercase text-slate-500">{w.widgetType}</span>
              </div>
              {renderWidgetBody(dataMap[w.id])}
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
