'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GitBranch, RefreshCw, Target, Link2, Activity, Plus, Trash2,
} from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import cytoscape from 'cytoscape';
import clsx from 'clsx';

type Tab = 'list' | 'flow' | 'correlate' | 'slos';

interface Tx {
  id: string;
  name: string;
  classification: string;
  p50LatencyMs?: number;
  p99LatencyMs?: number;
  volumePerHour?: number;
  status: string;
  steps?: Array<{
    id: string;
    name: string;
    stepOrder: number;
    stepType: string;
    avgLatencyMs: number;
    p99LatencyMs: number;
    status: string;
  }>;
}

interface FlowNode {
  id: string;
  label: string;
  stepOrder: number;
  avgLatencyMs: number;
  status: string;
}

interface Correlation {
  stepId: string;
  stepName: string;
  stepOrder: number;
  stepLatencyMs: number;
  correlatedSpans: number;
  liveAvgLatencyMs: number;
  deltaMs: number;
  recentTraces: string[];
}

interface SloRow {
  id: string;
  name: string;
  transactionId: string;
  transactionName: string;
  classification: string;
  metric: string;
  targetValue: number;
  currentValue: number;
  compliant: boolean;
  sampleCount: number;
  breachCount: number;
  errorBudgetPct: number;
  status: string;
}

export default function TransactionsPage() {
  const [tab, setTab] = useState<Tab>('list');
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [flow, setFlow] = useState<{ nodes: FlowNode[]; edges: Array<{ source: string; target: string }>; transaction: Tx } | null>(null);
  const [correlation, setCorrelation] = useState<{
    correlations: Correlation[];
    correlatedSteps: number;
    totalSteps: number;
    transactionName: string;
  } | null>(null);
  const [sloDash, setSloDash] = useState<{
    totalSlos: number;
    met: number;
    breached: number;
    compliancePct: number;
    slos: SloRow[];
  } | null>(null);
  const [latencySeries, setLatencySeries] = useState<Array<{ time: string; avgLatencyMs: number; p99LatencyMs: number; count: number }>>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sloForm, setSloForm] = useState({ name: '', targetValue: 200, metric: 'p99_latency_ms' });

  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<{ transactions: Tx[] }>('/transactions');
      setTransactions(data.transactions);
      if (!selectedId && data.transactions[0]) setSelectedId(data.transactions[0].id);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const renderFlow = useCallback((nodes: FlowNode[], edges: Array<{ source: string; target: string }>) => {
    if (!containerRef.current) return;
    if (cyRef.current) cyRef.current.destroy();

    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...nodes.map((n) => ({
          data: {
            id: n.id,
            label: n.label,
            latency: n.avgLatencyMs,
            status: n.status,
          },
        })),
        ...edges.map((e, i) => ({
          data: { id: `e-${i}`, source: e.source, target: e.target },
        })),
      ],
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': '#0ea5e9',
            color: '#f8fafc',
            'font-size': 10,
            'text-valign': 'bottom',
            'text-margin-y': 6,
            width: 44,
            height: 44,
            'border-width': 2,
            'border-color': '#1e293b',
          },
        },
        {
          selector: 'node[status = "warn"]',
          style: { 'background-color': '#f59e0b' },
        },
        {
          selector: 'node[status = "error"]',
          style: { 'background-color': '#ef4444' },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#64748b',
            'target-arrow-color': '#64748b',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
          },
        },
      ],
      layout: { name: 'breadthfirst', directed: true, padding: 40, animate: false },
    });
    cyRef.current = cy;
  }, []);

  async function loadFlow(id: string) {
    const data = await apiClient<{
      nodes: FlowNode[];
      edges: Array<{ source: string; target: string }>;
      transaction: Tx;
    }>(`/transactions/${id}/flow`);
    setFlow(data);
    renderFlow(data.nodes, data.edges);
  }

  async function loadCorrelate(id: string) {
    const data = await apiClient<{
      correlations: Correlation[];
      correlatedSteps: number;
      totalSteps: number;
      transactionName: string;
    }>(`/transactions/${id}/correlate`);
    setCorrelation(data);
  }

  async function loadSlos() {
    const data = await apiClient<NonNullable<typeof sloDash>>('/transactions/slos');
    setSloDash(data);
  }

  async function loadLatency(id: string) {
    const data = await apiClient<{ series: typeof latencySeries }>(`/transactions/${id}/latency?hours=24`);
    setLatencySeries(data.series);
  }

  useEffect(() => {
    if (!selectedId) return;
    if (tab === 'flow') loadFlow(selectedId).catch((e) => setMessage(e.message));
    if (tab === 'correlate') loadCorrelate(selectedId).catch((e) => setMessage(e.message));
    if (tab === 'slos') {
      loadSlos().catch((e) => setMessage(e.message));
      loadLatency(selectedId).catch(() => undefined);
    }
  }, [tab, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function discoverDemo() {
    const tx = await apiClient<Tx>('/transactions/discover', {
      method: 'POST',
      body: JSON.stringify({
        name: 'UPI payment checkout',
        spans: [
          { name: 'API Gateway', durationMs: 12, serviceName: 'api-gateway' },
          { name: 'Auth validate', durationMs: 18, serviceName: 'auth-service' },
          { name: 'UPI initiate', durationMs: 95, serviceName: 'payments' },
          { name: 'Ledger post', durationMs: 40, serviceName: 'ledger-db' },
          { name: 'Notify customer', durationMs: 22, serviceName: 'notifications' },
        ],
      }),
    });

    // Also ingest matching OTLP spans for correlation
    const traceId = `tx-demo-${Date.now()}`;
    await apiClient('/observability/otlp/traces', {
      method: 'POST',
      body: JSON.stringify({
        spans: [
          { traceId, spanId: 't1', name: 'API Gateway', serviceName: 'api-gateway', durationMs: 14 },
          { traceId, spanId: 't2', parentSpanId: 't1', name: 'Auth validate', serviceName: 'auth-service', durationMs: 20 },
          { traceId, spanId: 't3', parentSpanId: 't1', name: 'UPI initiate', serviceName: 'payments', durationMs: 110 },
          { traceId, spanId: 't4', parentSpanId: 't3', name: 'Ledger post', serviceName: 'ledger-db', durationMs: 45 },
          { traceId, spanId: 't5', parentSpanId: 't1', name: 'Notify customer', serviceName: 'notifications', durationMs: 25 },
        ],
      }),
    }).catch(() => undefined);

    // Extra samples for SLO chart
    for (const latency of [160, 175, 190, 210, 185, 170, 220, 155]) {
      await apiClient(`/transactions/${tx.id}/samples`, {
        method: 'POST',
        body: JSON.stringify({ latencyMs: latency, status: latency > 200 ? 'warn' : 'ok', stepCount: 5 }),
      });
    }

    setMessage(`Discovered ${tx.name}`);
    setSelectedId(tx.id);
    await loadList();
  }

  async function createSlo(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    await apiClient('/transactions/slos', {
      method: 'POST',
      body: JSON.stringify({
        transactionId: selectedId,
        name: sloForm.name,
        metric: sloForm.metric,
        targetValue: sloForm.targetValue,
      }),
    });
    setSloForm({ name: '', targetValue: 200, metric: 'p99_latency_ms' });
    setMessage('SLO created');
    await loadSlos();
  }

  async function deleteSlo(id: string) {
    await apiClient(`/transactions/slos/${id}`, { method: 'DELETE' });
    await loadSlos();
  }

  const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
    { id: 'list', label: 'Transactions', icon: Activity },
    { id: 'flow', label: 'Flow map', icon: GitBranch },
    { id: 'correlate', label: 'Correlation', icon: Link2 },
    { id: 'slos', label: 'SLA / SLO', icon: Target },
  ];

  const selected = transactions.find((t) => t.id === selectedId);

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Business Transactions</h1>
          <p className="text-sm text-slate-400">End-to-end flows, trace correlation, and latency SLOs</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => discoverDemo()} className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
            Discover demo UPI flow
          </button>
          <button type="button" onClick={() => loadList()} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-slate-600 bg-surface-elevated px-4 py-2 text-sm">
          {message}
          <button type="button" className="ml-3 text-slate-500" onClick={() => setMessage('')}>×</button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-400">
          Active transaction
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="ml-2 rounded-lg border border-slate-600 bg-surface px-3 py-1.5 text-slate-100"
          >
            {transactions.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        {selected && (
          <span className="text-xs text-slate-500">
            p50 {selected.p50LatencyMs ?? '—'}ms · p99 {selected.p99LatencyMs ?? '—'}ms · {selected.volumePerHour ?? 0}/hr
          </span>
        )}
      </div>

      <div className="mb-6 flex gap-1 border-b border-slate-700">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-2 border-b-2 px-4 py-2 text-sm',
              tab === id ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white',
            )}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <div className="grid gap-4 md:grid-cols-2">
          {transactions.map((tx) => (
            <button
              key={tx.id}
              type="button"
              onClick={() => { setSelectedId(tx.id); setTab('flow'); }}
              className={clsx(
                'kpi-card text-left transition hover:border-primary/50',
                selectedId === tx.id && 'border-primary/60',
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{tx.name}</h3>
                <span className="rounded bg-slate-700 px-2 py-0.5 text-xs">{tx.classification}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400">
                <div>p50: <span className="text-slate-200">{tx.p50LatencyMs ?? '—'}ms</span></div>
                <div>p99: <span className="text-slate-200">{tx.p99LatencyMs ?? '—'}ms</span></div>
                <div>Vol/hr: <span className="text-slate-200">{(tx.volumePerHour ?? 0).toLocaleString()}</span></div>
              </div>
            </button>
          ))}
          {transactions.length === 0 && (
            <p className="text-slate-500">No transactions — use &quot;Discover demo UPI flow&quot;</p>
          )}
        </div>
      )}

      {tab === 'flow' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div ref={containerRef} className="h-[480px] rounded-xl border border-slate-700 bg-surface-elevated" />
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">{flow?.transaction.name ?? 'Flow steps'}</h3>
            {(flow?.nodes ?? []).map((n) => (
              <div key={n.id} className={clsx(
                'rounded-lg border px-3 py-2 text-sm',
                n.status === 'warn' ? 'border-amber-500/40 bg-amber-500/10' :
                n.status === 'error' ? 'border-red-500/40 bg-red-500/10' :
                'border-slate-700 bg-surface-elevated',
              )}>
                <div className="font-medium">{n.stepOrder}. {n.label}</div>
                <div className="text-xs text-slate-500">{n.avgLatencyMs} ms · {n.status}</div>
              </div>
            ))}
            {!flow && <p className="text-sm text-slate-500">Select a transaction with steps</p>}
          </div>
        </div>
      )}

      {tab === 'correlate' && (
        <div>
          {correlation && (
            <p className="mb-4 text-sm text-slate-400">
              {correlation.transactionName}: {correlation.correlatedSteps}/{correlation.totalSteps} steps linked to live OTLP spans
            </p>
          )}
          <div className="space-y-3">
            {(correlation?.correlations ?? []).map((c) => (
              <div key={c.stepId} className="rounded-xl border border-slate-700 bg-surface-elevated px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{c.stepOrder}. {c.stepName}</div>
                    <div className="text-xs text-slate-500">
                      Modelled {c.stepLatencyMs}ms · Live {c.liveAvgLatencyMs}ms · Δ {c.deltaMs}ms
                    </div>
                  </div>
                  <span className={clsx(
                    'rounded-full px-2 py-0.5 text-xs',
                    c.correlatedSpans > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400',
                  )}>
                    {c.correlatedSpans} span(s)
                  </span>
                </div>
                {c.recentTraces.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.recentTraces.map((t) => (
                      <span key={t} className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-primary">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {!correlation && <p className="text-slate-500">No correlation data</p>}
          </div>
        </div>
      )}

      {tab === 'slos' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            {sloDash && (
              <div className="grid grid-cols-2 gap-3">
                <div className="kpi-card"><div className="text-xs text-slate-500">Compliance</div><div className="text-2xl font-semibold">{sloDash.compliancePct}%</div></div>
                <div className="kpi-card"><div className="text-xs text-slate-500">Met / Breached</div><div className="text-2xl font-semibold">{sloDash.met}/{sloDash.breached}</div></div>
              </div>
            )}
            <form onSubmit={createSlo} className="space-y-3 rounded-xl border border-slate-700 bg-surface-elevated p-4">
              <h3 className="font-medium">Add SLO</h3>
              <input required placeholder="Name (e.g. UPI p99)" value={sloForm.name} onChange={(e) => setSloForm({ ...sloForm, name: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
              <select value={sloForm.metric} onChange={(e) => setSloForm({ ...sloForm, metric: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm">
                <option value="p99_latency_ms">p99 latency</option>
                <option value="p50_latency_ms">p50 latency</option>
              </select>
              <input type="number" min={1} value={sloForm.targetValue} onChange={(e) => setSloForm({ ...sloForm, targetValue: Number(e.target.value) })} className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm" />
              <button type="submit" disabled={!selectedId} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm text-white disabled:opacity-50">
                <Plus size={16} /> Create SLO
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-3">
            {(sloDash?.slos ?? []).map((s) => (
              <div key={s.id} className={clsx(
                'flex items-center justify-between rounded-xl border px-4 py-3',
                s.compliant ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5',
              )}>
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-slate-500">
                    {s.transactionName} · {s.metric} target {s.targetValue}ms · current {s.currentValue}ms
                    · budget {s.errorBudgetPct}%
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={clsx('text-xs font-medium uppercase', s.compliant ? 'text-emerald-400' : 'text-red-400')}>
                    {s.status}
                  </span>
                  <button type="button" onClick={() => deleteSlo(s.id)} className="text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}

            {latencySeries.length > 0 && (
              <div className="rounded-xl border border-slate-700 bg-surface-elevated p-4">
                <h4 className="mb-3 text-sm font-medium text-slate-400">Latency (24h)</h4>
                <div className="space-y-1">
                  {latencySeries.map((p) => (
                    <div key={p.time} className="flex items-center gap-3 text-xs">
                      <span className="w-40 text-slate-500">{new Date(p.time).toLocaleString()}</span>
                      <div className="h-2 flex-1 rounded bg-slate-800">
                        <div
                          className="h-2 rounded bg-primary"
                          style={{ width: `${Math.min(100, (p.p99LatencyMs / (sloForm.targetValue || 200)) * 100)}%` }}
                        />
                      </div>
                      <span className="w-24 text-right text-slate-300">p99 {p.p99LatencyMs}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!sloDash || sloDash.slos.length === 0) && (
              <p className="text-slate-500">No SLOs yet — create one for the selected transaction</p>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
