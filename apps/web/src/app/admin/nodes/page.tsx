'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminNodesPage() {
  const [nodes, setNodes] = useState<unknown[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    apiClient<{ nodes: unknown[] }>('/admin/ha')
      .then((d) => setNodes((d as { nodes?: unknown[] }).nodes || []))
      .catch((e: Error) => setErr(e.message));
  }, []);

  return (
    <AdminShell title="Cluster Nodes">
      {err && <p className="text-sm text-red-400">{err}</p>}
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(nodes, null, 2)}
      </pre>
    </AdminShell>
  );
}
