'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GitBranch, Search, RefreshCw, FileText, Activity,
} from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import cytoscape from 'cytoscape';
import clsx from 'clsx';

type Tab = 'map' | 'traces' | 'logs';

interface ServiceNode {
  id: string;
  label: string;
  spanCount: number;
  avgDurationMs: number;
  errorCount: number;
  errorRate: number;
}

interface ServiceEdge {
  source: string;
  target: string;
  calls: number;
  avgDurationMs: number;
}

interface TraceRow {
  traceId: string;
  services: string;
  spanCount: number;
  durationMs: number;
  errorCount: number;
  startedAt: string;
}

interface LogRow {
  id: string;
  body: string;
  severity: string;
  serviceName: string;
  traceId?: string;
  recordedAt: string;
}

export default function ApmPage() {
  const [tab, setTab] = useState<Tab>('map');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [nodes, setNodes] = useState<ServiceNode[]>([]);
  const [edges, setEdges] = useState<ServiceEdge[]>([]);
  const [traces, setTraces] = useState<TraceRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [selectedService, setSelectedService] = useState<ServiceNode | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<{
    traceId: string;
    spans: Array<{
      spanId: string;
      parentSpanId?: string;
      name: string;
      serviceName: string;
      durationMs: number;
      statusCode: string;
    }>;
  } | null>(null);

  const [q, setQ] = useState('');
  const [severity, setSeverity] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [hours, setHours] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const renderMap = useCallback((mapNodes: ServiceNode[], mapEdges: ServiceEdge[]) => {
    if (!containerRef.current) return;
    if (cyRef.current) cyRef.current.destroy();

    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...mapNodes.map((n) => ({
          data: {
            id: n.id,
            label: n.label,
            spanCount: n.spanCount,
            errorRate: n.errorRate,
            avgDurationMs: n.avgDurationMs,
          },
        })),
        ...mapEdges.map((e, i) => ({
          data: {
            id: `e-${i}`,
            source: e.source,
            target: e.target,
            calls: e.calls,
            label: `${e.calls}`,
          },
        })),
      ],
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': '#8b5cf6',
            color: '#f8fafc',
            'font-size': 11,
            'text-valign': 'bottom',
            'text-margin-y': 6,
            width: 48,
            height: 48,
            'border-width': 2,
            'border-color': '#1e293b',
          },
        },
        {
          selector: 'node[errorRate > 5]',
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
            label: 'data(label)',
            'font-size': 9,
            color: '#94a3b8',
          },
        },
      ],
      layout: { name: 'cose', padding: 40, animate: false },
    });

    cy.on('tap', 'node', (evt) => {
      const d = evt.target.data();
      setSelectedService({
        id: d.id,
        label: d.label,
        spanCount: d.spanCount,
        avgDurationMs: d.avgDurationMs,
        errorCount: 0,
        errorRate: d.errorRate,
      });
    });

    cyRef.current = cy;
  }, []);

  const loadMap = useCallback(async () => {
    setLoading(true);
    try {
      const map = await apiClient<{ nodes: ServiceNode[]; edges: ServiceEdge[] }>(
        `/observability/apm/service-map?hours=${hours}`,
      );
      setNodes(map.nodes);
      setEdges(map.edges);
      renderMap(map.nodes, map.edges);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load service map');
    } finally {
      setLoading(false);
    }
  }, [hours, renderMap]);

  const loadTraces = useCallback(async () => {
    const data = await apiClient<{ traces: TraceRow[] }>('/observability/apm/traces');
    setTraces(data.traces);
  }, []);

  const searchLogs = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (severity) params.set('severity', severity);
    if (serviceFilter) params.set('service', serviceFilter);
    const data = await apiClient<{ logs: LogRow[]; total: number; source: string }>(
      `/observability/apm/logs?${params}`,
    );
    setLogs(data.logs);
    setLogTotal(data.total);
  }, [q, severity, serviceFilter]);

  useEffect(() => {
    loadMap();
  }, [loadMap]);

  useEffect(() => {
    if (tab === 'traces') loadTraces().catch(() => undefined);
    if (tab === 'logs') searchLogs().catch(() => undefined);
  }, [tab, loadTraces, searchLogs]);

  async function openTrace(traceId: string) {
    const detail = await apiClient<{
      traceId: string;
      spans: Array<{
        spanId: string;
        parentSpanId?: string;
        name: string;
        serviceName: string;
        durationMs: number;
        statusCode: string;
      }>;
    }>(`/observability/apm/traces/${traceId}`);
    setSelectedTrace(detail);
  }

  async function seedDemo() {
    const traceId = `trace-${Date.now()}`;
    await apiClient('/observability/otlp/traces', {
      method: 'POST',
      body: JSON.stringify({
        spans: [
          { traceId, spanId: 's1', name: 'HTTP GET /api/orders', serviceName: 'api-gateway', durationMs: 120, statusCode: 'OK' },
          { traceId, spanId: 's2', parentSpanId: 's1', name: 'getOrders', serviceName: 'orders-service', durationMs: 80, statusCode: 'OK' },
          { traceId, spanId: 's3', parentSpanId: 's2', name: 'SELECT orders', serviceName: 'orders-db', durationMs: 25, statusCode: 'OK' },
          { traceId, spanId: 's4', parentSpanId: 's1', name: 'authorize', serviceName: 'auth-service', durationMs: 15, statusCode: 'OK' },
        ],
      }),
    });
    await apiClient('/observability/otlp/logs', {
      method: 'POST',
      body: JSON.stringify({
        logs: [
          { body: 'Order list fetched successfully', severity: 'INFO', serviceName: 'orders-service', traceId },
          { body: 'Slow query on orders table', severity: 'WARN', serviceName: 'orders-db', traceId },
          { body: 'Auth token validated', severity: 'INFO', serviceName: 'auth-service', traceId },
        ],
      }),
    });
    await apiClient('/observability/otlp/metrics', {
      method: 'POST',
      body: JSON.stringify({
        metrics: [
          { name: 'http_request_duration_ms', value: 120, serviceName: 'api-gateway' },
          { name: 'db_query_duration_ms', value: 25, serviceName: 'orders-db' },
        ],
      }),
    });
    setMessage('Demo telemetry ingested');
    await loadMap();
    if (tab === 'traces') await loadTraces();
    if (tab === 'logs') await searchLogs();
  }

  const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
    { id: 'map', label: 'Service map', icon: GitBranch },
    { id: 'traces', label: 'Traces', icon: Activity },
    { id: 'logs', label: 'Logs', icon: FileText },
  ];

  function severityClass(s: string) {
    const v = s.toUpperCase();
    if (v === 'ERROR' || v === 'FATAL') return 'text-red-400';
    if (v === 'WARN' || v === 'WARNING') return 'text-amber-400';
    return 'text-slate-400';
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">APM & Telemetry</h1>
          <p className="text-sm text-slate-400">OTLP metrics, logs, traces — service map and log search</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => seedDemo()} className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
            Ingest demo data
          </button>
          <button type="button" onClick={() => loadMap()} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
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

      {tab === 'map' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center gap-3 text-sm">
              <label className="text-slate-400">
                Window
                <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className="ml-2 rounded-lg border border-slate-600 bg-surface px-2 py-1">
                  <option value={1}>1h</option>
                  <option value={6}>6h</option>
                  <option value={24}>24h</option>
                </select>
              </label>
              <span className="text-xs text-slate-500">{nodes.length} services · {edges.length} edges</span>
            </div>
            <div ref={containerRef} className="h-[520px] rounded-xl border border-slate-700 bg-surface-elevated" />
          </div>
          <div className="space-y-3">
            {selectedService ? (
              <div className="rounded-xl border border-slate-700 bg-surface-elevated p-4 text-sm">
                <div className="font-medium">{selectedService.label}</div>
                <div className="mt-2 space-y-1 text-slate-400">
                  <div className="flex justify-between"><span>Spans</span><span>{selectedService.spanCount}</span></div>
                  <div className="flex justify-between"><span>Avg duration</span><span>{selectedService.avgDurationMs} ms</span></div>
                  <div className="flex justify-between"><span>Error rate</span><span>{selectedService.errorRate}%</span></div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-700 bg-surface-elevated p-4 text-sm text-slate-400">
                Click a service node to inspect latency and error rate.
              </div>
            )}
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {nodes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelectedService(n)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-700 px-3 py-2 text-left text-sm hover:bg-slate-800/50"
                >
                  <span>{n.label}</span>
                  <span className={clsx('text-xs', n.errorRate > 5 ? 'text-red-400' : 'text-slate-500')}>
                    {n.avgDurationMs}ms
                  </span>
                </button>
              ))}
              {nodes.length === 0 && (
                <p className="text-sm text-slate-500">No services yet — use &quot;Ingest demo data&quot;</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'traces' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            {traces.map((t) => (
              <button
                key={t.traceId}
                type="button"
                onClick={() => openTrace(t.traceId)}
                className="w-full rounded-xl border border-slate-700 bg-surface-elevated px-4 py-3 text-left text-sm hover:bg-slate-800/40"
              >
                <div className="font-mono text-xs text-primary">{t.traceId}</div>
                <div className="mt-1 text-slate-300">{t.services}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {t.spanCount} spans · {t.durationMs} ms
                  {t.errorCount > 0 && <span className="ml-2 text-red-400">{t.errorCount} errors</span>}
                </div>
              </button>
            ))}
            {traces.length === 0 && <p className="text-slate-500">No traces in the last 24h</p>}
          </div>
          <div className="rounded-xl border border-slate-700 bg-surface-elevated p-4">
            {selectedTrace ? (
              <>
                <h3 className="mb-3 font-medium">Trace {selectedTrace.traceId}</h3>
                <div className="space-y-2">
                  {selectedTrace.spans.map((s) => (
                    <div key={s.spanId} className="rounded-lg border border-slate-700 px-3 py-2 text-sm">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-slate-500">
                        {s.serviceName} · {s.durationMs} ms · {s.statusCode}
                        {s.parentSpanId && <> · parent {s.parentSpanId.slice(0, 8)}</>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Select a trace to view spans</p>
            )}
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              searchLogs();
            }}
            className="mb-4 flex flex-wrap gap-2"
          >
            <div className="flex items-center gap-2 rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm">
              <Search size={14} className="text-slate-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search log body…"
                className="w-56 bg-transparent outline-none"
              />
            </div>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm">
              <option value="">All severities</option>
              <option value="ERROR">ERROR</option>
              <option value="WARN">WARN</option>
              <option value="INFO">INFO</option>
              <option value="DEBUG">DEBUG</option>
            </select>
            <input
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              placeholder="Service"
              className="rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm text-white">Search</button>
          </form>
          <p className="mb-2 text-xs text-slate-500">{logTotal} result(s) · Postgres{process.env.NEXT_PUBLIC_OPENSEARCH ? ' + OpenSearch' : ''}</p>
          <div className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="rounded-lg border border-slate-700 bg-surface-elevated px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={severityClass(l.severity)}>{l.severity}</span>
                  <span className="text-slate-500">{l.serviceName}</span>
                  <span className="text-slate-600">{new Date(l.recordedAt).toLocaleString()}</span>
                  {l.traceId && (
                    <button type="button" onClick={() => { setTab('traces'); openTrace(l.traceId!); }} className="text-primary hover:underline">
                      trace
                    </button>
                  )}
                </div>
                <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-slate-300">{l.body}</pre>
              </div>
            ))}
            {logs.length === 0 && <p className="text-slate-500">No logs match</p>}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
