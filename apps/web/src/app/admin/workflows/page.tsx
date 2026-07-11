'use client';

import { useEffect, useState } from 'react';
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

export default function WorkflowDesignerPage() {
  const [workflows, setWorkflows] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState('Restart service workflow');
  const [msg, setMsg] = useState('');
  const [result, setResult] = useState('');

  const load = () =>
    apiClient<{ workflows: Array<Record<string, unknown>> }>('/automation/workflows').then((d) =>
      setWorkflows(d.workflows),
    );

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

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

  async function simulate(id: string) {
    try {
      const r = await apiClient(`/automation/workflows/${id}/start`, {
        method: 'POST',
        body: JSON.stringify({ mode: 'simulation' }),
      });
      setResult(JSON.stringify(r, null, 2));
      setMsg('Simulation completed — no production mutations');
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Workflow Designer">
      <p className="mb-3 text-sm text-slate-400">
        Multi-step workflows with retries, timeouts, and compensation paths. Persist + resume supported via
        executions API.
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
            <button
              type="button"
              className="rounded-md border border-slate-600 px-3 py-1 text-xs"
              onClick={() => simulate(String(w.id))}
            >
              Simulate
            </button>
          </div>
        ))}
      </div>
      {result && (
        <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">{result}</pre>
      )}
    </AdminShell>
  );
}
