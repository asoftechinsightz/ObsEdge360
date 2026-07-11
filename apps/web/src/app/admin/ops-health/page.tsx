'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function OpsHealthPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    apiClient<Record<string, unknown>>('/admin/ops-health')
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }, []);
  const cards = [
    ['Deployment', data?.deployment],
    ['Cluster', data?.cluster],
    ['Storage', data?.storage],
    ['Secrets', data?.secrets],
    ['Certificates', data?.certificates],
    ['Backups', data?.backups],
    ['Restore', data?.restore],
    ['Nodes', data?.nodes],
    ['Pods', data?.pods],
    ['Namespaces', data?.namespaces],
  ];
  return (
    <AdminShell title="Operational Health">
      <p className="mb-3 text-sm text-slate-400">Deployment · cluster · storage · secrets · certificates · backups · restore</p>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([k, v]) => (
          <div key={String(k)} className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur">
            <div className="text-xs uppercase tracking-wide text-slate-400">{String(k)}</div>
            <pre className="mt-2 overflow-auto text-xs text-slate-200">{JSON.stringify(v, null, 2)}</pre>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
