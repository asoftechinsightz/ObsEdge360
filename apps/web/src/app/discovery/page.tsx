'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Radar, Plus, Play, Trash2, Clock, Bell, Server, Cloud, Network,
  RefreshCw, Copy, CheckCircle2,
} from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';
import { ConnectorWizard, type WizardProtocol } from '@/components/discovery/ConnectorWizard';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/eig/primitives';
import { TrustBar } from '@/components/apex/TrustBar';
import { DemoAwareEmptyState } from '@/components/ede/DemoAwareEmptyState';
import { friendlyError } from '@/lib/friendly-error';
import clsx from 'clsx';

interface Connector {
  id: string;
  name: string;
  protocol: string;
  enabled: boolean;
  lastRunAt: string | null;
  config: Record<string, unknown>;
}

interface Agent {
  id: string;
  name: string;
  hostname: string | null;
  version: string | null;
  status: string;
  isOnline: boolean;
  last_heartbeat_at: string | null;
  capabilities: string[];
}

interface Schedule {
  id: string;
  connector_id: string;
  connector_name?: string;
  interval_minutes: number;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  created_at: string;
}

type Tab = 'connectors' | 'agents' | 'schedules' | 'notifications';

export default function DiscoveryPage() {
  const [tab, setTab] = useState<Tab>('connectors');
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState<string | null>(null);
  const [wizard, setWizard] = useState<WizardProtocol | null>(null);
  const [newAgent, setNewAgent] = useState<{ id: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, a, s, n] = await Promise.all([
        apiClient<{ connectors: Connector[] }>('/discovery/connectors'),
        apiClient<{ agents: Agent[] }>('/discovery/agents'),
        apiClient<{ schedules: Schedule[] }>('/discovery/schedules'),
        apiClient<{ notifications: Notification[] }>('/discovery/notifications'),
      ]);
      setConnectors(c.connectors);
      setAgents(a.agents);
      setSchedules(s.schedules);
      setNotifications(n.notifications);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load discovery data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runScan(connectorId?: string) {
    setScanning(connectorId ?? 'all');
    try {
      const result = await apiClient<{ assetsDiscovered?: number; results?: unknown[] }>(
        '/discovery/scan',
        { method: 'POST', body: JSON.stringify(connectorId ? { connectorId } : {}) },
      );
      const count = result.assetsDiscovered ?? result.results?.length ?? 0;
      setMessage(`Scan completed — ${count} result(s)`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(null);
    }
  }

  async function toggleConnector(id: string, enabled: boolean) {
    await apiClient(`/discovery/connectors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !enabled }),
    });
    await load();
  }

  async function deleteConnector(id: string) {
    if (!confirm('Delete this connector?')) return;
    await apiClient(`/discovery/connectors/${id}`, { method: 'DELETE' });
    await load();
  }

  async function registerAgent() {
    const name = prompt('Agent name (e.g. dc-east-scanner)');
    if (!name) return;
    const result = await apiClient<{ agentKey: string; agent: { id: string } }>('/discovery/agents/register', {
      method: 'POST',
      body: JSON.stringify({
        name,
        hostname: typeof window !== 'undefined' ? window.location.hostname : undefined,
        capabilities: ['host-metrics', 'heartbeat'],
      }),
    });
    setNewAgent({ id: result.agent.id, key: result.agentKey });
    await load();
  }

  async function createSchedule(connectorId: string) {
    const mins = prompt('Scan interval in minutes (min 5):', '60');
    if (!mins) return;
    await apiClient('/discovery/schedules', {
      method: 'POST',
      body: JSON.stringify({ connectorId, intervalMinutes: Number(mins) }),
    });
    setMessage('Schedule created');
    await load();
  }

  async function deleteSchedule(id: string) {
    await apiClient(`/discovery/schedules/${id}`, { method: 'DELETE' });
    await load();
  }

  async function markRead(id: string) {
    await apiClient(`/discovery/notifications/${id}/read`, { method: 'POST', body: '{}' });
    await load();
  }

  function copyKey() {
    if (newAgent) {
      navigator.clipboard.writeText(newAgent.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function agentEnvSnippet() {
    if (!newAgent) return '';
    const api = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_API_URL ?? window.location.origin.replace(/:\d+$/, ':4000'))
      : 'http://localhost:4000';
    return [
      `OBS360_API_URL=${api}`,
      `OBS360_AGENT_ID=${newAgent.id}`,
      `OBS360_AGENT_KEY=${newAgent.key}`,
      'OBS360_INTERVAL_SEC=30',
    ].join('\n');
  }

  const tabs: { id: Tab; label: string; icon: typeof Radar }[] = [
    { id: 'connectors', label: 'Connectors', icon: Radar },
    { id: 'agents', label: 'Agents', icon: Server },
    { id: 'schedules', label: 'Schedules', icon: Clock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="Discovery"
        purpose="Estate coverage across cloud, containers, servers, and network — connector health, scan history, and agent setup."
        actions={
          <div className="flex gap-2">
            <button type="button" onClick={() => load()} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            {connectors.length > 0 ? (
              <button
                type="button"
                onClick={() => runScan()}
                disabled={!!scanning}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                <Play size={16} /> {scanning === 'all' ? 'Scanning…' : 'Scan all'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setWizard('kubernetes')}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
              >
                <Plus size={16} /> Add connector
              </button>
            )}
          </div>
        }
      />
      <TrustBar
        lastUpdated={new Date()}
        freshness={loading ? 'unknown' : 'recent'}
        dataSource="Discovery connectors & agents"
        coverageLabel={`${connectors.length} connectors · ${agents.length} agents · ${schedules.length} schedules`}
        integrationHealth="healthy"
      />

      {connectors.length === 0 && !loading && (
        <div className="mb-6">
          <DemoAwareEmptyState
            title="No discovery coverage yet"
            hint="Load Illustrative Demo Data to see AWS, Azure, GCP, VMware, Kubernetes, and SNMP connector health — or add a connector to start live discovery."
            setupHref="/demo/guided"
          />
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-lg border border-slate-600 bg-surface-elevated px-4 py-2 text-sm text-slate-300">
          {message}
          <button type="button" className="ml-3 text-slate-500 hover:text-white" onClick={() => setMessage('')}>×</button>
        </div>
      )}

      {newAgent && (
        <div className="mb-4 rounded-lg border border-primary/40 bg-primary/10 p-4">
          <p className="text-sm font-medium text-primary">Host agent registered — save this one-time install key</p>
          <p className="mt-1 text-xs text-slate-400">Keep this credential private. It is shown once.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-surface px-2 py-1 text-xs">{newAgent.key}</code>
            <button type="button" onClick={copyKey} className="rounded border border-slate-600 p-2 hover:bg-slate-800">
              {copied ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-200">Show install steps (operators)</summary>
            <pre className="mt-2 overflow-x-auto rounded bg-surface p-2 text-[11px] text-slate-300">{agentEnvSnippet()}</pre>
            <p className="mt-2 text-xs text-slate-500">Run the host agent with the saved env file — metrics appear under Observability.</p>
          </details>
          <button type="button" className="mt-2 text-xs text-slate-400 hover:text-white" onClick={() => setNewAgent(null)}>Dismiss</button>
        </div>
      )}

      <div className="mb-6 flex gap-1 border-b border-slate-700">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition',
              tab === id ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white',
            )}
          >
            <Icon size={16} /> {label}
            {id === 'notifications' && notifications.filter((n) => !n.read).length > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 text-[10px]">{notifications.filter((n) => !n.read).length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'connectors' && (
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setWizard('kubernetes')} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
              <Plus size={14} /> K8s
            </button>
            <button type="button" onClick={() => setWizard('aws')} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
              <Cloud size={14} /> AWS
            </button>
            <button type="button" onClick={() => setWizard('snmp')} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
              <Network size={14} /> SNMP
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Protocol</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last scan</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {connectors.map((c) => (
                  <tr key={c.id} className="border-t border-slate-700">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-slate-400">{c.protocol}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => toggleConnector(c.id, c.enabled)} className={clsx('rounded-full px-2 py-0.5 text-xs', c.enabled ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-400')}>
                        {c.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {c.lastRunAt ? new Date(c.lastRunAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => runScan(c.id)} disabled={!!scanning} className="mr-2 text-primary hover:underline">
                        {scanning === c.id ? '…' : 'Scan'}
                      </button>
                      <button type="button" onClick={() => createSchedule(c.id)} className="mr-2 text-slate-400 hover:text-white">Schedule</button>
                      <button type="button" onClick={() => deleteConnector(c.id)} className="text-red-400 hover:text-red-300">
                        <Trash2 size={14} className="inline" />
                      </button>
                    </td>
                  </tr>
                ))}
                {connectors.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8">
                      <div className="mx-auto max-w-lg text-center">
                        <div className="text-sm font-medium text-slate-200">No discovery connectors yet</div>
                        <p className="mt-2 text-xs text-slate-500">
                          Connectors find assets that feed CMDB, Digital Twin, and Topology. Add Kubernetes, cloud, or SNMP to begin.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">Use “Add connector” above — guided setup walks you through credentials safely.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'agents' && (
        <div>
          <button type="button" onClick={registerAgent} className="mb-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
            <Plus size={16} /> Register agent
          </button>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-700 bg-surface-elevated p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{a.name}</span>
                  <span className={clsx('h-2 w-2 rounded-full', a.isOnline ? 'bg-green-400' : 'bg-slate-500')} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{a.hostname ?? '—'} · {a.version ?? 'unknown'}</p>
                <p className="mt-2 text-xs text-slate-400">
                  Last heartbeat: {a.last_heartbeat_at ? new Date(a.last_heartbeat_at).toLocaleString() : 'Never'}
                </p>
              </div>
            ))}
            {agents.length === 0 && !loading && (
              <DemoAwareEmptyState
                title="No discovery agents registered"
                hint="Agents extend coverage into private networks. For evaluations, load Illustrative Demo Data to populate connector coverage without installing agents."
                setupHref="/demo/guided"
              />
            )}
          </div>
        </div>
      )}

      {tab === 'schedules' && (
        <div className="space-y-3">
          {schedules.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-surface-elevated px-4 py-3">
              <div>
                <p className="font-medium">{s.connector_name ?? s.connector_id}</p>
                <p className="text-xs text-slate-400">
                  Every {s.interval_minutes} min · Next: {s.next_run_at ? new Date(s.next_run_at).toLocaleString() : '—'}
                </p>
              </div>
              <button type="button" onClick={() => deleteSchedule(s.id)} className="text-red-400 hover:text-red-300">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {schedules.length === 0 && !loading && (
            <p className="text-slate-500">No schedules — use &quot;Schedule&quot; on a connector</p>
          )}
        </div>
      )}

      {tab === 'notifications' && (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={clsx(
                'flex items-start justify-between rounded-lg border px-4 py-3',
                n.read ? 'border-slate-700 bg-surface' : 'border-primary/30 bg-primary/5',
              )}
            >
              <div>
                <p className="text-sm font-medium">{n.title}</p>
                {n.message && <p className="text-xs text-slate-400">{n.message}</p>}
                <p className="mt-1 text-[10px] text-slate-500">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.read && (
                <button type="button" onClick={() => markRead(n.id)} className="text-xs text-primary hover:underline">Mark read</button>
              )}
            </div>
          ))}
          {notifications.length === 0 && !loading && (
            <p className="text-slate-500">No notifications yet</p>
          )}
        </div>
      )}

      {wizard && (
        <ConnectorWizard
          protocol={wizard}
          onClose={() => setWizard(null)}
          onSubmit={async (data) => {
            await apiClient('/discovery/connectors', { method: 'POST', body: JSON.stringify(data) });
            setMessage(`Connector "${data.name}" created`);
            await load();
          }}
        />
      )}
    </DashboardShell>
  );
}
