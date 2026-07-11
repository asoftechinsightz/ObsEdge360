'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminRunbooksPage() {
  const [runbooks, setRunbooks] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState('Custom controlled runbook');
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<{ runbooks: Array<Record<string, unknown>> }>('/automation/runbooks').then((d) => setRunbooks(d.runbooks));

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function create() {
    try {
      await apiClient('/automation/runbooks', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: 'Wave 4 versioned runbook',
          steps: [
            { key: 'validate', action: 'validate_target' },
            { key: 'execute', action: 'restart_service', compensate: 'verify_health' },
          ],
          linkedActionCode: 'restart_service',
          status: 'active',
          version: 1,
        }),
      });
      setMsg('Runbook created');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  const filtered = runbooks.filter((r) =>
    filter ? String(r.name).toLowerCase().includes(filter.toLowerCase()) : true,
  );

  return (
    <AdminShell title="Runbook Library">
      <p className="mb-3 text-sm text-slate-400">
        Enterprise catalog (restart, scale, cache, cert/secret rotate, queue cleanup, logs). Versioned definitions.
      </p>
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="min-w-[180px] flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={create}>
          Create runbook
        </button>
        <input
          className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          placeholder="Filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        {filtered.map((r) => (
          <div key={String(r.id)} className="rounded-xl border border-slate-700 bg-surface-elevated px-4 py-3 text-sm">
            <div className="font-medium">
              {String(r.name)} <span className="text-xs text-slate-400">v{String(r.version)}</span>
            </div>
            <div className="text-xs text-slate-400">
              {String(r.linked_action_code ?? '—')} · {String(r.status)} · {String(r.description ?? '')}
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
