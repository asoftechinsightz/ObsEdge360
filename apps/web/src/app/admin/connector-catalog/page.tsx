'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function ConnectorCatalogPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    apiClient<Record<string, unknown>>('/integrations/connectors/catalog')
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }, []);
  const list = ((data?.connectors as Array<Record<string, unknown>>) || []).filter((c) =>
    q ? String(c.name).toLowerCase().includes(q.toLowerCase()) || String(c.type).includes(q.toLowerCase()) : true,
  );
  return (
    <AdminShell title="Connector Catalog">
      <p className="mb-3 text-sm text-slate-400">Hot-pluggable connector types with versioned capabilities.</p>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <input
        className="mb-4 w-full max-w-md rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
        placeholder="Search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="space-y-2">
        {list.map((c) => (
          <div key={String(c.type)} className="rounded-xl border border-slate-700 bg-surface-elevated px-4 py-3 text-sm">
            <div className="font-medium">
              {String(c.name)} <span className="text-xs text-slate-400">v{String(c.version)}</span>
            </div>
            <div className="text-xs text-slate-400">
              {String(c.type)} · {(c.capabilities as string[])?.join(', ')}
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
