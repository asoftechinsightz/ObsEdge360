'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function ExecutionHistoryPage() {
  const [executions, setExecutions] = useState<Array<Record<string, unknown>>>([]);
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => {
    const q = filter ? `?status=${encodeURIComponent(filter)}` : '';
    return apiClient<{ executions: Array<Record<string, unknown>> }>(`/automation/executions${q}`).then((d) =>
      setExecutions(d.executions),
    );
  };

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  return (
    <AdminShell title="Execution History">
      <p className="mb-3 text-sm text-slate-400">Timeline of workflow executions with status indicators.</p>
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex gap-2">
        <input
          className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          placeholder="Filter status (optional)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button type="button" className="rounded-md border border-slate-600 px-3 py-2 text-sm" onClick={() => load()}>
          Refresh
        </button>
      </div>
      <div className="space-y-2">
        {executions.map((e) => (
          <div key={String(e.id)} className="rounded-xl border border-slate-700 bg-surface-elevated px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">{String(e.id).slice(0, 8)}…</span>
              <span className="text-xs uppercase text-slate-300">{String(e.status)}</span>
            </div>
            <div className="text-xs text-slate-400">
              mode={String(e.mode)} · step={String(e.current_step)} · started={String(e.started_at)}
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
