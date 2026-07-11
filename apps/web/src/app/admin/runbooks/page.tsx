'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminRunbooksPage() {
  const [runbooks, setRunbooks] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState('Restart service dry-run');
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<{ runbooks: Array<Record<string, unknown>> }>('/admin/runbooks').then((d) => setRunbooks(d.runbooks));

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function create() {
    try {
      await apiClient('/admin/runbooks', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: 'Wave 1 runbook metadata',
          steps: [{ action: 'validate', mode: 'dry_run' }, { action: 'approve' }, { action: 'execute' }],
          status: 'active',
        }),
      });
      setMsg('Runbook created');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Runbook Manager">
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 flex gap-2">
        <input
          className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-white" onClick={create}>
          Create runbook
        </button>
      </div>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(runbooks, null, 2)}
      </pre>
    </AdminShell>
  );
}
