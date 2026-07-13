'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

const DEFAULT_DEF = {
  steps: [
    { key: 'validate', action: 'validate_target', timeoutMs: 3000, retries: 1 },
    {
      key: 'act',
      action: 'restart_service',
      compensate: 'verify_health',
      timeoutMs: 5000,
      retries: 1,
    },
    { key: 'verify', action: 'verify_health' },
  ],
};

function WorkflowDesignerInner() {
  const search = useSearchParams();
  const workflowRan = useRef(false);
  const [workflows, setWorkflows] = useState<Array<Record<string, unknown>>>([]);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState('Restart service workflow');
  const [msg, setMsg] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [wf, hist] = await Promise.all([
      apiClient<{ workflows: Array<Record<string, unknown>> }>('/automation/workflows'),
      apiClient<Record<string, unknown>>('/automation/history?limit=20').catch(() => ({})),
    ]);
    setWorkflows(wf.workflows ?? []);
    const histObj = hist as { history?: Array<Record<string, unknown>>; items?: Array<Record<string, unknown>> };
    setHistory(histObj.history ?? histObj.items ?? []);
  };

  useEffect(() => {
    void load()
      .then(async () => {
        if (search.get('workflow') === 'run' && !workflowRan.current) {
          workflowRan.current = true;
          const list = await apiClient<{ workflows: Array<Record<string, unknown>> }>('/automation/workflows');
          const first = list.workflows?.[0];
          if (first?.id) {
            await execute(String(first.id), 'live');
          } else {
            setMsg('No workflows in catalog — create one, then run again.');
          }
        }
      })
      .catch((e: Error) => setMsg(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function create() {
    try {
      await apiClient('/automation/workflows', {
        method: 'POST',
        body: JSON.stringify({ name, definition: DEFAULT_DEF, status: 'active' }),
      });
      setMsg('Workflow created (signed definition)');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function execute(id: string, mode: 'simulation' | 'live') {
    setBusy(true);
    try {
      const r = await apiClient(`/automation/workflows/${id}/start`, {
        method: 'POST',
        body: JSON.stringify({ mode }),
      });
      setResult(JSON.stringify(r, null, 2));
      setMsg(mode === 'live' ? 'Workflow execution started' : 'Simulation completed — no production mutations');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Automation Catalog">
      <p className="mb-3 text-sm text-slate-400">
        Multi-step workflows with retries, timeouts, and compensation. Execute live remediations or run simulations
        first. History is loaded from the automation audit trail.
      </p>
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex gap-2">
        <input
          className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={create}>
          Create workflow
        </button>
      </div>
      <div className="mb-4 space-y-2">
        {workflows.map((w) => (
          <div
            key={String(w.id)}
            className="flex items-center justify-between rounded-xl border border-slate-700 bg-surface-elevated px-4 py-3 text-sm"
          >
            <div>
              <div className="font-medium">{String(w.name)}</div>
              <div className="text-xs text-slate-400">
                v{String(w.version)} · {String(w.status)} · sig={String(w.signature_hash).slice(0, 12)}…
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                className="rounded-md border border-slate-600 px-3 py-1 text-xs disabled:opacity-50"
                onClick={() => void execute(String(w.id), 'simulation')}
              >
                Simulate
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-md bg-emerald-700 px-3 py-1 text-xs text-white disabled:opacity-50"
                onClick={() => void execute(String(w.id), 'live')}
              >
                Execute
              </button>
            </div>
          </div>
        ))}
        {!workflows.length && (
          <p className="rounded-lg border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-500">
            No workflows yet — create one to enable Run automation from the executive dashboard.
          </p>
        )}
      </div>
      {result && (
        <pre className="mb-4 max-h-64 overflow-auto rounded-lg border border-slate-700 bg-black/30 p-3 text-xs text-slate-300">
          {result}
        </pre>
      )}
      <div className="rounded-xl border border-slate-700 bg-surface-elevated">
        <div className="border-b border-slate-700 px-4 py-3 text-sm font-semibold">Execution history</div>
        <div className="divide-y divide-slate-800">
          {history.length === 0 && <div className="px-4 py-4 text-xs text-slate-500">No history yet.</div>}
          {history.slice(0, 15).map((h, i) => (
            <div key={String(h.id ?? i)} className="px-4 py-2 text-xs text-slate-300">
              {String(h.eventType ?? h.action ?? h.status ?? 'event')} · {String(h.created_at ?? h.timestamp ?? '')}
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

export default function WorkflowDesignerPage() {
  return (
    <Suspense fallback={<AdminShell title="Automation Catalog"><p className="text-sm text-slate-400">Loading…</p></AdminShell>}>
      <WorkflowDesignerInner />
    </Suspense>
  );
}
