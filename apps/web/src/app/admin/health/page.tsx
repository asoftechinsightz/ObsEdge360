'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function AdminHealthPage() {
  const [sys, setSys] = useState<Record<string, unknown> | null>(null);
  const [plat, setPlat] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([
      apiClient<Record<string, unknown>>('/admin/health/system'),
      apiClient<Record<string, unknown>>('/health'),
    ])
      .then(([s, p]) => {
        setSys(s);
        setPlat(p);
      })
      .catch((e: Error) => setErr(e.message));
  }, []);

  return (
    <AdminShell title="System Health">
      {err && <p className="text-sm text-red-400">{err}</p>}
      <pre className="overflow-auto rounded-xl border border-slate-700 bg-surface-elevated p-4 text-xs text-slate-300">
        {JSON.stringify({ system: sys, platform: plat }, null, 2)}
      </pre>
    </AdminShell>
  );
}
