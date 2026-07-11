'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function IntegrationDashboardPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    apiClient<Record<string, unknown>>('/integrations')
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }, []);
  const counts = (data?.counts ?? {}) as Record<string, unknown>;
  return (
    <AdminShell title="Integration Dashboard">
      <p className="mb-3 text-sm text-slate-400">
        Enterprise integrations & identity — Wave {String(data?.wave ?? '…')}. Secrets by reference only.
      </p>
      {err && <p className="mb-3 text-sm text-red-400">{err}</p>}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(counts).map(([k, v]) => (
          <div key={k} className="rounded-xl border border-slate-700 bg-surface-elevated px-4 py-3">
            <div className="text-xs text-slate-400">{k}</div>
            <div className="text-lg font-medium text-slate-100">{String(v)}</div>
          </div>
        ))}
      </div>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </AdminShell>
  );
}
