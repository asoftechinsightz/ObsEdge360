'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity, Plus, Trash2, Play, RefreshCw, Server, Radio,
  Bell, Target, AlertTriangle,
} from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import clsx from 'clsx';

type Tab = 'overview' | 'hosts' | 'network' | 'scrape' | 'alerts';

interface HostRow {
  id: string;
  hostname: string;
  cpuPct: number;
  memoryPct: number;
  diskPct: number;
  load1m: number;
  networkInMbps: number;
  networkOutMbps: number;
  status: string;
  recordedAt: string;
}

interface ScrapeTarget {
  id: string;
  name: string;
  job_name: string;
  targets: string[];
  metrics_path: string;
  scrape_interval_seconds: number;
  enabled: boolean;
  last_scrape_at: string | null;
  last_scrape_status: string;
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  severity: string;
  enabled: boolean;
  channel_ids: string[];
  last_fired_at: string | null;
}

interface Channel {
  id: string;
  name: string;
  channel_type: string;
  enabled: boolean;
}

interface AlertEvent {
  id: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  metric_value: number;
  fired_at: string;
}

interface Flow {
  id: string;
  src_ip: string;
  dst_ip: string;
  protocol: string;
  bytes: string;
  latency_ms: string;
  packet_loss_pct: string;
}

function barColor(pct: number) {
  if (pct >= 85) return 'bg-red-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export default function ObservabilityPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [infra, setInfra] = useState<{
    hosts: { totalHosts: number; upHosts: number; avgCpu: number; avgMemory: number; avgDisk: number; hosts: HostRow[] };
    scrapeTargets: number;
    enabledTargets: number;
    alertRules: number;
    recentAlerts: number;
    network: { total_flows: string | number; avg_latency: string | number; total_bytes: string | number };
    telemetry: { totalMetrics: number; totalLogs: number; totalSpans: number };
  } | null>(null);
  const [targets, setTargets] = useState<ScrapeTarget[]>([]);
  const [promConfig, setPromConfig] = useState<unknown>(null);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);

  const [targetForm, setTargetForm] = useState({ name: '', jobName: 'node', targets: 'localhost:9100', interval: 30 });
  const [ruleForm, setRuleForm] = useState({
    name: '',
    metric: 'cpu_pct',
    operator: 'gt',
    threshold: 80,
    severity: 'warning',
    channelIds: [] as string[],
  });
  const [channelForm, setChannelForm] = useState({ name: '', channelType: 'webhook', webhookUrl: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summary, scrape, alertRules, ch, ev, net] = await Promise.all([
        apiClient<NonNullable<typeof infra>>('/observability/infra/summary'),
        apiClient<{ targets: ScrapeTarget[]; prometheusConfig: unknown }>('/observability/scrape-targets'),
        apiClient<{ rules: AlertRule[] }>('/observability/alert-rules'),
        apiClient<{ channels: Channel[] }>('/observability/channels'),
        apiClient<{ events: AlertEvent[] }>('/observability/alert-events'),
        apiClient<{ flows: Flow[] }>('/network/flows'),
      ]);
      setInfra(summary);
      setTargets(scrape.targets);
      setPromConfig(scrape.prometheusConfig);
      setRules(alertRules.rules);
      setChannels(ch.channels);
      setEvents(ev.events);
      setFlows(net.flows ?? []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createTarget(e: React.FormEvent) {
    e.preventDefault();
    await apiClient('/observability/scrape-targets', {
      method: 'POST',
      body: JSON.stringify({
        name: targetForm.name,
        jobName: targetForm.jobName,
        targets: targetForm.targets.split(',').map((t) => t.trim()),
        scrapeIntervalSeconds: targetForm.interval,
      }),
    });
    setTargetForm({ name: '', jobName: 'node', targets: 'localhost:9100', interval: 30 });
    setMessage('Scrape target created');
    await load();
  }

  async function runScrape(id: string) {
    const result = await apiClient<{
      metricsIngested: number;
      status: string;
      mode?: string;
      success?: number;
      failed?: number;
      results?: Array<{ endpoint: string; status: string; error?: string; samples?: number }>;
    }>(`/observability/scrape-targets/${id}/scrape`, {
      method: 'POST',
      body: '{}',
    });
    const detail = result.results?.map((r) =>
      r.status === 'success' ? `${r.endpoint}: ${r.samples ?? 0} samples` : `${r.endpoint}: ${r.error}`,
    ).join('; ');
    setMessage(
      `Live scrape ${result.status}${result.mode ? ` (${result.mode})` : ''} — ${result.success ?? result.metricsIngested} ok` +
        (result.failed ? `, ${result.failed} failed` : '') +
        (detail ? ` · ${detail}` : ''),
    );
    await load();
  }

  async function scrapeAll() {
    const result = await apiClient<{ results: Array<{ status: string }> }>('/observability/scrape-targets/scrape-all', {
      method: 'POST',
      body: '{}',
    });
    const ok = result.results.filter((r) => r.status === 'success' || r.status === 'partial').length;
    setMessage(`Scraped all targets — ${ok}/${result.results.length} succeeded`);
    await load();
  }

  async function deleteTarget(id: string) {
    await apiClient(`/observability/scrape-targets/${id}`, { method: 'DELETE' });
    await load();
  }

  async function createChannel(e: React.FormEvent) {
    e.preventDefault();
    await apiClient('/observability/channels', {
      method: 'POST',
      body: JSON.stringify({
        name: channelForm.name,
        channelType: channelForm.channelType,
        config: { url: channelForm.webhookUrl },
      }),
    });
    setChannelForm({ name: '', channelType: 'webhook', webhookUrl: '' });
    setMessage('Notification channel created');
    await load();
  }

  async function createRule(e: React.FormEvent) {
    e.preventDefault();
    await apiClient('/observability/alert-rules', {
      method: 'POST',
      body: JSON.stringify(ruleForm),
    });
    setRuleForm({ name: '', metric: 'cpu_pct', operator: 'gt', threshold: 80, severity: 'warning', channelIds: [] });
    setMessage('Alert rule created');
    await load();
  }

  async function evaluateRules() {
    const result = await apiClient<{ evaluated: number; fired: number }>('/observability/alert-rules/evaluate', {
      method: 'POST',
      body: '{}',
    });
    setMessage(`Evaluated ${result.evaluated} rule(s) — ${result.fired} fired`);
    await load();
  }

  async function deleteRule(id: string) {
    await apiClient(`/observability/alert-rules/${id}`, { method: 'DELETE' });
    await load();
  }

  async function deleteChannel(id: string) {
    await apiClient(`/observability/channels/${id}`, { method: 'DELETE' });
    await load();
  }

  const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'hosts', label: 'Hosts', icon: Server },
    { id: 'network', label: 'Network', icon: Radio },
    { id: 'scrape', label: 'Scrape targets', icon: Target },
    { id: 'alerts', label: 'Alerts', icon: Bell },
  ];

  const hosts = infra?.hosts?.hosts ?? [];

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Infrastructure Monitoring</h1>
          <p className="text-sm text-slate-400">Prometheus scrape targets, host metrics, network, and alert rules</p>
        </div>
        <button type="button" onClick={() => load()} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-slate-600 bg-surface-elevated px-4 py-2 text-sm">
          {message}
          <button type="button" className="ml-3 text-slate-500" onClick={() => setMessage('')}>×</button>
        </div>
      )}

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-700">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-2 border-b-2 px-4 py-2 text-sm whitespace-nowrap',
              tab === id ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white',
            )}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && infra && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Hosts up', value: `${infra.hosts.upHosts}/${infra.hosts.totalHosts}` },
            { label: 'Avg CPU', value: `${infra.hosts.avgCpu}%` },
            { label: 'Avg memory', value: `${infra.hosts.avgMemory}%` },
            { label: 'Scrape targets', value: `${infra.enabledTargets}/${infra.scrapeTargets}` },
            { label: 'Alert rules', value: infra.alertRules },
            { label: 'Recent alerts', value: infra.recentAlerts },
            { label: 'Network flows (1h)', value: Number(infra.network.total_flows) },
            { label: 'Telemetry metrics', value: infra.telemetry.totalMetrics },
          ].map((k) => (
            <div key={k.label} className="kpi-card">
              <div className="text-xs text-slate-500">{k.label}</div>
              <div className="mt-1 text-2xl font-semibold">{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'hosts' && (
        <div className="overflow-hidden rounded-xl border border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated text-left text-xs text-slate-400">
              <tr>
                <th className="px-4 py-3">Host</th>
                <th className="px-4 py-3">CPU</th>
                <th className="px-4 py-3">Memory</th>
                <th className="px-4 py-3">Disk</th>
                <th className="px-4 py-3">Load</th>
                <th className="px-4 py-3">Net in/out</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {hosts.map((h) => (
                <tr key={h.id} className="border-t border-slate-700/50">
                  <td className="px-4 py-3 font-medium">{h.hostname}</td>
                  {(['cpuPct', 'memoryPct', 'diskPct'] as const).map((key) => (
                    <td key={key} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded bg-slate-700">
                          <div className={clsx('h-1.5 rounded', barColor(h[key]))} style={{ width: `${Math.min(100, h[key])}%` }} />
                        </div>
                        <span>{h[key].toFixed(0)}%</span>
                      </div>
                    </td>
                  ))}
                  <td className="px-4 py-3">{h.load1m.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {h.networkInMbps.toFixed(1)} / {h.networkOutMbps.toFixed(1)} Mbps
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('rounded-full px-2 py-0.5 text-xs', h.status === 'up' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                      {h.status}
                    </span>
                  </td>
                </tr>
              ))}
              {hosts.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No host metrics — add a scrape target and run scrape</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'network' && (
        <div>
          {infra && (
            <div className="mb-4 grid grid-cols-3 gap-4">
              <div className="kpi-card"><div className="text-xs text-slate-500">Flows (1h)</div><div className="text-xl font-semibold">{Number(infra.network.total_flows)}</div></div>
              <div className="kpi-card"><div className="text-xs text-slate-500">Avg latency</div><div className="text-xl font-semibold">{Number(infra.network.avg_latency).toFixed(1)} ms</div></div>
              <div className="kpi-card"><div className="text-xs text-slate-500">Bytes</div><div className="text-xl font-semibold">{Number(infra.network.total_bytes).toLocaleString()}</div></div>
            </div>
          )}
          <div className="overflow-hidden rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated text-left text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">Proto</th>
                  <th className="px-4 py-3">Bytes</th>
                  <th className="px-4 py-3">Latency</th>
                  <th className="px-4 py-3">Loss</th>
                </tr>
              </thead>
              <tbody>
                {flows.map((f) => (
                  <tr key={f.id} className="border-t border-slate-700/50">
                    <td className="px-4 py-3 font-mono text-xs">{f.src_ip}</td>
                    <td className="px-4 py-3 font-mono text-xs">{f.dst_ip}</td>
                    <td className="px-4 py-3">{f.protocol}</td>
                    <td className="px-4 py-3">{Number(f.bytes).toLocaleString()}</td>
                    <td className="px-4 py-3">{Number(f.latency_ms).toFixed(1)} ms</td>
                    <td className="px-4 py-3">{Number(f.packet_loss_pct).toFixed(2)}%</td>
                  </tr>
                ))}
                {flows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No network flows yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'scrape' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <form onSubmit={createTarget} className="space-y-3 rounded-xl border border-slate-700 bg-surface-elevated p-4">
            <h3 className="font-medium">Add scrape target</h3>
            <p className="text-xs text-slate-500">Live HTTP pull of Prometheus `/metrics` (e.g. node_exporter :9100)</p>
            <input required placeholder="Name" value={targetForm.name} onChange={(e) => setTargetForm({ ...targetForm, name: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
            <input placeholder="Job name" value={targetForm.jobName} onChange={(e) => setTargetForm({ ...targetForm, jobName: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
            <input required placeholder="Targets (host:9100, …)" value={targetForm.targets} onChange={(e) => setTargetForm({ ...targetForm, targets: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
            <input type="number" min={5} value={targetForm.interval} onChange={(e) => setTargetForm({ ...targetForm, interval: Number(e.target.value) })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm text-white">
              <Plus size={16} /> Create
            </button>
            <button type="button" onClick={() => scrapeAll()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 py-2 text-sm hover:bg-slate-800">
              <Play size={16} /> Scrape all (live)
            </button>
          </form>

          <div className="lg:col-span-2 space-y-3">
            {targets.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-surface-elevated px-4 py-3">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-slate-500">
                    job={t.job_name} · {t.targets.join(', ')} · every {t.scrape_interval_seconds}s
                    {t.last_scrape_at && <> · last {new Date(t.last_scrape_at).toLocaleString()} ({t.last_scrape_status})</>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => runScrape(t.id)} className="rounded border border-slate-600 p-2 hover:bg-slate-800" title="Live scrape">
                    <Play size={14} />
                  </button>
                  <button type="button" onClick={() => deleteTarget(t.id)} className="rounded border border-slate-600 p-2 text-red-400 hover:bg-slate-800">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {targets.length === 0 && <p className="text-slate-500">No scrape targets — add host:9100 for node_exporter</p>}

            <div className="rounded-xl border border-slate-700 bg-surface p-4 text-xs text-slate-400">
              <h4 className="mb-1 font-medium text-slate-300">Remote write (push)</h4>
              <p>POST <code className="text-slate-200">/api/v1/observability/prometheus/write</code> with Bearer JWT</p>
              <p className="mt-1">Body: <code className="text-slate-200">{`{ "metrics": "node_load1 0.5\\n..." }`}</code> or timeseries JSON</p>
            </div>

            {promConfig != null && (
              <div className="rounded-xl border border-slate-700 bg-surface p-4">
                <h4 className="mb-2 text-sm font-medium text-slate-400">Prometheus config / remote_write note</h4>
                <pre className="max-h-48 overflow-auto text-xs text-slate-300">{JSON.stringify(promConfig, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'alerts' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <form onSubmit={createChannel} className="space-y-3 rounded-xl border border-slate-700 bg-surface-elevated p-4">
              <h3 className="font-medium">Notification channel</h3>
              <input required placeholder="Name" value={channelForm.name} onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
              <select value={channelForm.channelType} onChange={(e) => setChannelForm({ ...channelForm, channelType: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm">
                <option value="webhook">Webhook</option>
                <option value="email">Email</option>
                <option value="slack">Slack</option>
                <option value="pagerduty">PagerDuty</option>
              </select>
              <input placeholder="Webhook URL / address" value={channelForm.webhookUrl} onChange={(e) => setChannelForm({ ...channelForm, webhookUrl: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
              <button type="submit" className="w-full rounded-lg bg-primary py-2 text-sm text-white">Add channel</button>
            </form>

            <div className="space-y-2">
              {channels.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-700 px-3 py-2 text-sm">
                  <span>{c.name} <span className="text-xs text-slate-500">({c.channel_type})</span></span>
                  <button type="button" onClick={() => deleteChannel(c.id)} className="text-red-400"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>

            <form onSubmit={createRule} className="space-y-3 rounded-xl border border-slate-700 bg-surface-elevated p-4">
              <h3 className="font-medium">Alert rule</h3>
              <input required placeholder="Rule name" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
              <div className="grid grid-cols-3 gap-2">
                <select value={ruleForm.metric} onChange={(e) => setRuleForm({ ...ruleForm, metric: e.target.value })} className="rounded-lg border border-slate-600 bg-surface px-2 py-2 text-sm">
                  <option value="cpu_pct">cpu_pct</option>
                  <option value="memory_pct">memory_pct</option>
                  <option value="disk_pct">disk_pct</option>
                  <option value="load_1m">load_1m</option>
                </select>
                <select value={ruleForm.operator} onChange={(e) => setRuleForm({ ...ruleForm, operator: e.target.value })} className="rounded-lg border border-slate-600 bg-surface px-2 py-2 text-sm">
                  <option value="gt">&gt;</option>
                  <option value="gte">&gt;=</option>
                  <option value="lt">&lt;</option>
                  <option value="lte">&lt;=</option>
                </select>
                <input type="number" value={ruleForm.threshold} onChange={(e) => setRuleForm({ ...ruleForm, threshold: Number(e.target.value) })} className="rounded-lg border border-slate-600 bg-surface px-2 py-2 text-sm" />
              </div>
              <select value={ruleForm.severity} onChange={(e) => setRuleForm({ ...ruleForm, severity: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm">
                <option value="info">info</option>
                <option value="warning">warning</option>
                <option value="critical">critical</option>
              </select>
              <select
                multiple
                value={ruleForm.channelIds}
                onChange={(e) => setRuleForm({
                  ...ruleForm,
                  channelIds: Array.from(e.target.selectedOptions).map((o) => o.value),
                })}
                className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm"
              >
                {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="submit" className="w-full rounded-lg bg-primary py-2 text-sm text-white">Create rule</button>
            </form>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Rules</h3>
              <button type="button" onClick={evaluateRules} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-800">
                <AlertTriangle size={14} /> Evaluate now
              </button>
            </div>
            {rules.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-surface-elevated px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-slate-500">
                    {r.metric} {r.operator} {r.threshold} · {r.severity}
                    {r.last_fired_at && <> · fired {new Date(r.last_fired_at).toLocaleString()}</>}
                  </div>
                </div>
                <button type="button" onClick={() => deleteRule(r.id)} className="text-red-400"><Trash2 size={14} /></button>
              </div>
            ))}

            <h3 className="font-medium">Recent events</h3>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {events.map((ev) => (
                <div key={ev.id} className="rounded-lg border border-slate-700 px-3 py-2 text-sm">
                  <div className="font-medium">{ev.title}</div>
                  <div className="text-xs text-slate-500">{ev.message}</div>
                  <div className="mt-1 text-[10px] text-slate-500">{ev.severity} · {new Date(ev.fired_at).toLocaleString()}</div>
                </div>
              ))}
              {events.length === 0 && <p className="text-slate-500 text-sm">No alert events yet</p>}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
