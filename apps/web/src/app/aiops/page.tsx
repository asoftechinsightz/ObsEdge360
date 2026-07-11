'use client';

import { useCallback, useEffect, useState } from 'react';
import { BrainCircuit, RefreshCw, Send, BookOpen, Sparkles } from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';

interface AiHealth {
  configured: boolean;
  provider: string;
  model: string;
  fallback: string;
}

export default function AiOpsPage() {
  const [health, setHealth] = useState<AiHealth | null>(null);
  const [question, setQuestion] = useState('Why is Service A degraded?');
  const [reply, setReply] = useState('');
  const [rca, setRca] = useState<Record<string, unknown> | null>(null);
  const [correlations, setCorrelations] = useState<Array<Record<string, unknown>>>([]);
  const [docs, setDocs] = useState<Array<Record<string, unknown>>>([]);
  const [message, setMessage] = useState('');
  const [ragTitle, setRagTitle] = useState('NOC runbook');
  const [ragContent, setRagContent] = useState(
    'If API latency spikes, check database connections, recent deployments, and blast radius of the primary database CI.',
  );

  const load = useCallback(async () => {
    try {
      const [h, c, d] = await Promise.all([
        apiClient<AiHealth>('/ai/health'),
        apiClient<{ events: Array<Record<string, unknown>> }>('/ai/correlations'),
        apiClient<{ documents: Array<Record<string, unknown>> }>('/ai/rag/documents'),
      ]);
      setHealth(h);
      setCorrelations(c.events ?? []);
      setDocs(d.documents ?? []);
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
    try {
      await apiClient('/ai/correlate', { method: 'POST', body: '{}' });
      setMessage('Correlation completed');
      await load();
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
              Grounded Copilot and RCA via LLM Gateway · RAG corpus · multi-signal correlation.
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
              <button type="button" onClick={() => void correlate()} className="rounded-md bg-sky-700/80 px-3 py-1.5 text-sm text-white">
                Correlate
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
              <h2 className="text-sm font-medium text-slate-200 mb-2">Correlations</h2>
              <ul className="space-y-1 text-xs text-slate-400 max-h-40 overflow-auto">
                {correlations.slice(0, 8).map((e) => (
                  <li key={String(e.id)} className="truncate">
                    {String(e.severity)} · {String(e.title)}
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
