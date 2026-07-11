'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Server, RefreshCw, Search, Activity, Cpu, Filter, CheckSquare,
} from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import clsx from 'clsx';

interface FleetSummary {
  total: number;
  online: number;
  offline: number;
  degraded: number;
  platforms: Array<{ platform: string; count: number }>;
  versions: Array<{ version: string; count: number }>;
}

interface UaAgent {
  id: string;
  name: string;
  hostname: string | null;
  platform: string;
  version: string | null;
  status: string;
  last_heartbeat_at: string | null;
}

export default function FleetPage() {
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [agents, setAgents] = useState<UaAgent[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [bootstrapToken, setBootstrapToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (platform) params.set('platform', platform);
      if (status) params.set('status', status);
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      const [sum, list] = await Promise.all([
        apiClient<FleetSummary>('/ua/summary'),
        apiClient<{ items: UaAgent[]; total: number }>(`/ua/agents?${params}`),
      ]);
      setSummary(sum);
      setAgents(list.items ?? []);
      setTotal(list.total ?? 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [q, platform, status, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createBootstrap() {
    const res = await apiClient<{ token: string }>('/ua/bootstrap-tokens', {
      method: 'POST',
      body: JSON.stringify({ label: 'fleet-ui', ttlHours: 24, maxUses: 50 }),
    });
    setBootstrapToken(res.token);
  }

  async function bulkOffline() {
    if (!selected.length) return;
    await apiClient('/ua/agents/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ agentIds: selected, status: 'offline' }),
    });
    setSelected([]);
    await load();
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <DashboardShell>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Universal Agents</h1>
            <p className="text-sm text-slate-500">Fleet inventory, health, and enrollment</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void createBootstrap()}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
            >
              Create bootstrap token
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        {bootstrapToken && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
            <div className="font-medium">Bootstrap token (show once)</div>
            <code className="break-all">{bootstrapToken}</code>
            <div className="mt-1 text-slate-600">
              Set <code>BOOTSTRAP_TOKEN</code> and <code>API_URL</code> on the agent host.
            </div>
          </div>
        )}

        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total', value: summary?.total ?? '—', icon: Server },
            { label: 'Online', value: summary?.online ?? '—', icon: Activity },
            { label: 'Offline', value: summary?.offline ?? '—', icon: Filter },
            { label: 'Degraded', value: summary?.degraded ?? '—', icon: Cpu },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border bg-white p-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <c.icon className="h-4 w-4" /> {c.label}
              </div>
              <div className="mt-2 text-2xl font-semibold">{c.value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-white p-4">
            <h2 className="font-medium">Platform summary</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {(summary?.platforms ?? []).map((p) => (
                <li key={p.platform} className="flex justify-between">
                  <span>{p.platform}</span>
                  <span className="font-medium">{p.count}</span>
                </li>
              ))}
              {!summary?.platforms?.length && <li className="text-slate-400">No agents yet</li>}
            </ul>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <h2 className="font-medium">Version distribution</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {(summary?.versions ?? []).map((v) => (
                <li key={v.version} className="flex justify-between">
                  <span>{v.version}</span>
                  <span className="font-medium">{v.count}</span>
                </li>
              ))}
              {!summary?.versions?.length && <li className="text-slate-400">No agents yet</li>}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <input
              className="rounded-md border py-2 pl-8 pr-3 text-sm"
              placeholder="Search name/hostname"
              value={q}
              onChange={(e) => {
                setOffset(0);
                setQ(e.target.value);
              }}
            />
          </div>
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={platform}
            onChange={(e) => {
              setOffset(0);
              setPlatform(e.target.value);
            }}
          >
            <option value="">All platforms</option>
            <option value="linux">linux</option>
            <option value="windows">windows</option>
            <option value="mac">mac</option>
          </select>
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={status}
            onChange={(e) => {
              setOffset(0);
              setStatus(e.target.value);
            }}
          >
            <option value="">All statuses</option>
            <option value="online">online</option>
            <option value="offline">offline</option>
            <option value="degraded">degraded</option>
          </select>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => void bulkOffline()}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm"
            >
              <CheckSquare className="h-4 w-4" /> Mark offline ({selected.length})
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2" />
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Hostname</th>
                <th className="px-3 py-2">Platform</th>
                <th className="px-3 py-2">Version</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Last heartbeat</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading &&
                agents.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} />
                    </td>
                    <td className="px-3 py-2 font-medium">{a.name}</td>
                    <td className="px-3 py-2">{a.hostname ?? '—'}</td>
                    <td className="px-3 py-2">{a.platform}</td>
                    <td className="px-3 py-2">{a.version ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={clsx(
                          'rounded-full px-2 py-0.5 text-xs',
                          a.status === 'online' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700',
                        )}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {a.last_heartbeat_at ? new Date(a.last_heartbeat_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              {!loading && !agents.length && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                    No universal agents registered
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Showing {agents.length} of {total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={offset === 0}
              className="rounded border px-3 py-1 disabled:opacity-40"
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              Prev
            </button>
            <button
              type="button"
              disabled={offset + limit >= total}
              className="rounded border px-3 py-1 disabled:opacity-40"
              onClick={() => setOffset(offset + limit)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
