'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminCapacityPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    apiClient<Record<string, unknown>>('/admin/capacity')
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }, []);
  return (
    <AdminShell title="Capacity Dashboard">
      {err && <p className="text-sm text-red-400">{err}</p>}
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </AdminShell>
  );
}
