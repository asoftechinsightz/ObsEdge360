'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminClusterPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    apiClient<Record<string, unknown>>('/admin/health/cluster')
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }, []);

  return (
    <AdminShell title="Cluster Health">
      {err && <p className="text-sm text-red-400">{err}</p>}
      <div className="mb-3 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-slate-300">
        Wave 1 reports single-replica baseline honesty. Multi-node HA validation is Wave 2+.
      </div>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs text-slate-300">
        {JSON.stringify(data, null, 2)}
      </pre>
    </AdminShell>
  );
}
