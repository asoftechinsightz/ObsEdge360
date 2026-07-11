'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Plus, RefreshCw, Star } from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  refreshSeconds?: number;
  updatedAt?: string;
  widgets?: unknown[];
}

export default function DashboardsListPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient<{ dashboards: Dashboard[] }>('/dashboards');
      setDashboards(res.dashboards ?? []);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!name.trim()) return;
    try {
      const dash = await apiClient<Dashboard>('/dashboards', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), seedNoc: true }),
      });
      setName('');
      setMessage(`Created ${dash.name}`);
      await load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function ensureDefault() {
    try {
      await apiClient('/dashboards/default', { method: 'POST', body: '{}' });
      setMessage('Default NOC dashboard ready');
      await load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-cyan-400" /> Operations Dashboards
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Tenant-scoped NOC dashboards with live widgets from telemetry, CMDB, and ops intelligence.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void ensureDefault()} className="inline-flex items-center gap-1 rounded-md bg-amber-600/80 px-3 py-1.5 text-sm text-white">
              <Star className="h-4 w-4" /> Default NOC
            </button>
            <button type="button" onClick={() => void load()} className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {message && (
          <div className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">{message}</div>
        )}

        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New dashboard name"
            className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <button type="button" onClick={() => void create()} className="inline-flex items-center gap-1 rounded-md bg-cyan-600/80 px-3 py-2 text-sm text-white">
            <Plus className="h-4 w-4" /> Create
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dashboards.map((d) => (
            <Link
              key={d.id}
              href={`/dashboards/${d.id}`}
              className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 hover:border-cyan-600/50"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-medium text-slate-100">{d.name}</h2>
                {d.isDefault && <span className="text-[10px] uppercase text-amber-400">default</span>}
              </div>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{d.description || 'No description'}</p>
              <p className="mt-3 text-xs text-slate-400">
                refresh {d.refreshSeconds ?? 30}s
              </p>
            </Link>
          ))}
          {dashboards.length === 0 && !loading && (
            <p className="text-sm text-slate-500">No dashboards yet — create one or seed the default NOC.</p>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
