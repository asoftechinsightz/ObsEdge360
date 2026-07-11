'use client';

import { useCallback, useEffect, useState } from 'react';
import { BrainCircuit, RefreshCw, Send, BookOpen, Sparkles, GitMerge, Activity } from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';

interface AiHealth {
  configured: boolean;
  provider: string;
  model: string;
  fallback: string;
}

interface CorrelationRow {
  id: string;
  title?: string;
  severity?: string;
  score?: number;
  signal_types?: string[];
  primary_service?: string | null;
  summary?: string | null;
  created_at?: string;
}

interface CorrelationDetail {
  id: string;
  title: string;
  severity: string;
  score?: number;
  signalTypes?: string[];
  primaryService?: string | null;
  summary?: string | null;
  members?: Array<Record<string, unknown>>;
}

interface SignalSnapshot {
  metrics_count?: number;
  logs_count?: number;
  traces_count?: number;
  alerts_count?: number;
  anomalies_count?: number;
  changes_count?: number;
  collected_at?: string;
  window_minutes?: number;
}

export default function AiOpsPage() {
  const [health, setHealth] = useState<AiHealth | null>(null);
  const [question, setQuestion] = useState('Why is Service A degraded?');
  const [reply, setReply] = useState('');
  const [rca, setRca] = useState<Record<string, unknown> | null>(null);
  const [correlations, setCorrelations] = useState<CorrelationRow[]>([]);
  const [detail, setDetail] = useState<CorrelationDetail | null>(null);
  const [snapshot, setSnapshot] = useState<SignalSnapshot | null>(null);
  const [docs, setDocs] = useState<Array<Record<string, unknown>>>([]);
  const [message, setMessage] = useState('');
  const [ragTitle, setRagTitle] = useState('NOC runbook');
  const [ragContent, setRagContent] = useState(
    'If API latency spikes, check database connections, recent deployments, and blast radius of the primary database CI.',
  );

  const load = useCallback(async () => {
    try {
      const [h, c, d, snap] = await Promise.all([
        apiClient<AiHealth>('/ai/health'),
        apiClient<{ events: CorrelationRow[] }>('/ai/correlations'),
        apiClient<{ documents: Array<Record<string, unknown>> }>('/ai/rag/documents'),
        apiClient<{ snapshot: SignalSnapshot | null }>('/ai/signals/snapshot'),
      ]);
      setHealth(h);
      setCorrelations(c.events ?? []);
      setDocs(d.documents ?? []);
      setSnapshot(snap.snapshot ?? null);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function askCopilot() {
    setMessage('Asking Copilot…');
    try {
      const r = await apiClient<{ reply: string; model: string; mode: string }>('/ai/copilot', {
        method: 'POST',
        body: JSON.stringify({ question }),
      });
      setReply(r.reply);
      setMessage(`Copilot · ${r.model} (${r.mode})`);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function runRca() {
    setMessage('Running grounded RCA…');
    try {
      const r = await apiClient<Record<string, unknown>>('/ai/rca', {
        method: 'POST',
        body: JSON.stringify({ question }),
      });
      setRca(r);
      setReply(String(r.summary ?? ''));
      setMessage(`RCA · ${String(r.model)} (${String(r.mode)}) · confidence ${String(r.confidencePct)}%`);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function correlate() {
    setMessage('Running multi-signal correlation…');
    try {
      const r = await apiClient<{
        clustersCreated?: number;
        signalCounts?: Record<string, number>;
        clusters?: Array<{ id?: string }>;
      }>('/ai/correlate', {
        method: 'POST',
        body: JSON.stringify({ windowMinutes: 30, minSignals: 2 }),
      });
      const topId = r.clusters?.[0]?.id;
      setMessage(
        `Correlation · ${r.clustersCreated ?? 0} new clusters · signals ${JSON.stringify(r.signalCounts ?? {})}`,
      );
      await load();
      if (topId) await openDetail(topId);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function collectSignals() {
    setMessage('Collecting signal window…');
    try {
      const r = await apiClient<{ counts: Record<string, number>; signalCount: number }>(
        '/ai/signals/collect',
        { method: 'POST', body: JSON.stringify({ windowMinutes: 30 }) },
      );
      setMessage(`Signals collected · ${r.signalCount} · ${JSON.stringify(r.counts)}`);
      await load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function openDetail(id: string) {
    try {
      const d = await apiClient<CorrelationDetail>(`/ai/correlations/${id}`);
      setDetail(d);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function ingestRag() {
    try {
      await apiClient('/ai/rag/documents', {
        method: 'POST',
        body: JSON.stringify({ title: ragTitle, content: ragContent, sourceType: 'runbook' }),
      });
      setMessage('RAG document ingested');
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
              <BrainCircuit className="h-6 w-6 text-fuchsia-400" /> AIOps / LLM RCA
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Grounded Copilot and RCA · RAG · advanced multi-signal correlation (metrics/logs/traces/alerts/changes).
            </p>
          </div>
          <button type="button" onClick={() => void load()} className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <div className="text-xs text-slate-500">Provider</div>
            <div className="text-sm text-slate-100">{health?.provider ?? '—'}</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <div className="text-xs text-slate-500">Model</div>
            <div className="text-sm text-slate-100">{health?.model ?? '—'}</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <div className="text-xs text-slate-500">LLM key</div>
            <div className="text-sm text-slate-100">{health?.configured ? 'configured' : 'fallback mode'}</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <div className="text-xs text-slate-500">Fallback</div>
            <div className="text-sm text-slate-100">{health?.fallback ?? '—'}</div>
          </div>
        </div>

        {snapshot && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-400 flex flex-wrap gap-3 items-center">
            <Activity className="h-3.5 w-3.5 text-sky-400" />
            <span>Last signal snapshot</span>
            <span>metrics {snapshot.metrics_count ?? 0}</span>
            <span>logs {snapshot.logs_count ?? 0}</span>
            <span>traces {snapshot.traces_count ?? 0}</span>
            <span>alerts {snapshot.alerts_count ?? 0}</span>
            <span>anomalies {snapshot.anomalies_count ?? 0}</span>
            <span>changes {snapshot.changes_count ?? 0}</span>
          </div>
        )}

        {message && (
          <div className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">{message}</div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
            <label className="text-sm text-slate-300">Natural language query</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void askCopilot()} className="inline-flex items-center gap-1 rounded-md bg-fuchsia-600/80 px-3 py-1.5 text-sm text-white">
                <Send className="h-4 w-4" /> Copilot
              </button>
              <button type="button" onClick={() => void runRca()} className="inline-flex items-center gap-1 rounded-md bg-violet-600/80 px-3 py-1.5 text-sm text-white">
                <Sparkles className="h-4 w-4" /> Grounded RCA
              </button>
              <button type="button" onClick={() => void collectSignals()} className="inline-flex items-center gap-1 rounded-md bg-teal-700/80 px-3 py-1.5 text-sm text-white">
                <Activity className="h-4 w-4" /> Collect signals
              </button>
              <button type="button" onClick={() => void correlate()} className="inline-flex items-center gap-1 rounded-md bg-sky-700/80 px-3 py-1.5 text-sm text-white">
                <GitMerge className="h-4 w-4" /> Correlate
              </button>
            </div>
            {reply && (
              <pre className="whitespace-pre-wrap rounded-md border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-300 max-h-80 overflow-auto">
                {reply}
              </pre>
            )}
            {rca && (
              <div className="text-xs text-slate-500">
                Session {String(rca.id)} · citations {Array.isArray(rca.citations) ? rca.citations.length : 0}
              </div>
            )}

            {detail && (
              <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3 space-y-2">
                <div className="text-sm font-medium text-slate-200">{detail.title}</div>
                <div className="text-xs text-slate-500">
                  {detail.severity}
                  {detail.score != null ? ` · score ${Number(detail.score).toFixed(1)}` : ''}
                  {detail.primaryService ? ` · ${detail.primaryService}` : ''}
                  {detail.signalTypes?.length ? ` · ${detail.signalTypes.join('+')}` : ''}
                </div>
                {detail.summary && <p className="text-xs text-slate-400">{detail.summary}</p>}
                <ul className="max-h-48 overflow-auto space-y-1 text-xs text-slate-400">
                  {(detail.members ?? []).slice(0, 40).map((m) => (
                    <li key={String(m.id ?? `${m.signal_type}-${m.source_id}`)}>
                      <span className="text-sky-400">{String(m.signal_type)}</span>
                      {' · '}
                      {String(m.severity ?? '')}
                      {' · '}
                      {String(m.title ?? m.source_id)}
                    </li>
                  ))}
                  {(detail.members?.length ?? 0) === 0 && <li>No members</li>}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <h2 className="text-sm font-medium text-slate-200 flex items-center gap-1.5 mb-2">
                <BookOpen className="h-4 w-4" /> RAG ingest
              </h2>
              <input
                value={ragTitle}
                onChange={(e) => setRagTitle(e.target.value)}
                className="mb-2 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
              />
              <textarea
                value={ragContent}
                onChange={(e) => setRagContent(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
              />
              <button type="button" onClick={() => void ingestRag()} className="mt-2 rounded-md bg-emerald-700/80 px-2 py-1 text-xs text-white">
                Ingest
              </button>
              <ul className="mt-2 space-y-1 text-xs text-slate-400 max-h-24 overflow-auto">
                {docs.slice(0, 5).map((d) => (
                  <li key={String(d.id)} className="truncate">{String(d.title)}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <h2 className="text-sm font-medium text-slate-200 mb-2 flex items-center gap-1.5">
                <GitMerge className="h-4 w-4" /> Correlations
              </h2>
              <ul className="space-y-1.5 text-xs text-slate-400 max-h-56 overflow-auto">
                {correlations.slice(0, 12).map((e) => (
                  <li key={String(e.id)}>
                    <button
                      type="button"
                      onClick={() => void openDetail(String(e.id))}
                      className="w-full text-left truncate hover:text-slate-200"
                    >
                      {String(e.severity ?? '')}
                      {e.score != null ? ` · ${Number(e.score).toFixed(0)}` : ''}
                      {' · '}
                      {String(e.title ?? e.id)}
                    </button>
                  </li>
                ))}
                {correlations.length === 0 && <li>None yet</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
