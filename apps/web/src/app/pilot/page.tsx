'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { ErrorState, LoadingSkeleton } from '@/components/UiStates';

export default function PilotPackagePage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    apiClient<Record<string, unknown>>('/pilot/package')
      .then((d) => setData(d))
      .catch((e: Error) => setErr(e.message));
  }, []);
  return (
    <DashboardShell>
      <h1 className="mb-2 text-2xl font-semibold">Customer Pilot Package</h1>
      <p className="mb-4 text-sm text-slate-400">Installation, acceptance, SLA, and escalation guides for enterprise pilots.</p>
      {err && <ErrorState message={err} />}
      {!data && !err && <LoadingSkeleton />}
      {data && <pre className="overflow-auto rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs">{JSON.stringify(data, null, 2)}</pre>}
    </DashboardShell>
  );
}
