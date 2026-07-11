'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminHaPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    apiClient<Record<string, unknown>>('/admin/ha')
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }, []);

  return (
    <AdminShell title="HA Overview" subtitle="High Availability foundation (Wave 2)">
      {err && <p className="text-sm text-red-400">{err}</p>}
      <div className="mb-3 rounded-lg border border-amber-700/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
        gaClaim must remain false until P5_GA_VALIDATION_OK. Single-node VPS reports topologyMode
        single_node_ha_ready unless HA_MULTI_NODE=true.
      </div>
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </AdminShell>
  );
}
