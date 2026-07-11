'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../../AdminShell';

export default function GaCenterPage() {
  const [data, setData] = useState<unknown>(null);
  const [ready, setReady] = useState<unknown>(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setData(await apiClient('/admin/system/ga'));
    setReady(await apiClient('/admin/system/ga/readiness'));
  };

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  return (
    <AdminShell title="General Availability">
      <p className="mb-3 text-sm text-slate-400">v1.0.0 GA — regression · sign-off · readiness. Enterprise final release.</p>
      {msg && <p className="mb-3 text-sm text-slate-200">{msg}</p>}
      <button type="button" className="mb-4 rounded-md border border-slate-600 px-4 py-2 text-sm" onClick={() => load()}>
        Refresh
      </button>
      <div className="grid gap-4 lg:grid-cols-2">
        <pre className="overflow-auto rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs text-slate-300 backdrop-blur-md">
          {JSON.stringify(data, null, 2)}
        </pre>
        <pre className="overflow-auto rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs text-slate-300 backdrop-blur-md">
          {JSON.stringify(ready, null, 2)}
        </pre>
      </div>
    </AdminShell>
  );
}
