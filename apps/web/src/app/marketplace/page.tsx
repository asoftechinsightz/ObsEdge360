'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';

export default function MarketplacePage() {
  const [data, setData] = useState<unknown>(null);
  useEffect(() => {
    apiClient('/marketplace/extensions').then(setData).catch(() => undefined);
  }, []);
  return (
    <DashboardShell>
      <h1 className="mb-2 text-2xl font-semibold">Marketplace Foundation</h1>
      <p className="mb-4 text-sm text-slate-400">Extension registry for plugins, connectors, and packs. Public marketplace not enabled in Phase 3.</p>
      <pre className="overflow-auto rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs">{JSON.stringify(data, null, 2)}</pre>
    </DashboardShell>
  );
}
