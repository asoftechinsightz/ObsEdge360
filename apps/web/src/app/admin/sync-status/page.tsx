'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function SyncStatusPage() {
  const [jobs, setJobs] = useState<Array<Record<string, unknown>>>([]);
  const [providers, setProviders] = useState<Array<Record<string, unknown>>>([]);
  const [msg, setMsg] = useState('');
  const load = async () => {
    const [j, p] = await Promise.all([
      apiClient<{ jobs: Array<Record<string, unknown>> }>('/integrations/sync'),
      apiClient<{ providers: Array<Record<string, unknown>> }>('/integrations/identity'),
    ]);
    setJobs(j.jobs);
    setProviders(p.providers);
  };
  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);
  async function sync(id: string) {
    try {
      const r = await apiClient('/integrations/sync', { method: 'POST', body: JSON.stringify({ providerId: id }) });
      setMsg(JSON.stringify(r));
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  return (
    <AdminShell title="Synchronization Status">
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="mb-4 space-y-2">
        {providers.map((p) => (
          <div key={String(p.id)} className="flex items-center justify-between rounded-xl border border-slate-700 bg-surface-elevated px-4 py-3 text-sm">
            <div>
              <div className="font-medium">{String(p.name)}</div>
              <div className="text-xs text-slate-400">{String(p.protocol)} · last={String(p.last_sync_at ?? 'never')}</div>
            </div>
            <button type="button" className="rounded-md border border-slate-600 px-3 py-1 text-xs" onClick={() => sync(String(p.id))}>
              Sync now
            </button>
          </div>
        ))}
      </div>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">{JSON.stringify(jobs, null, 2)}</pre>
    </AdminShell>
  );
}
