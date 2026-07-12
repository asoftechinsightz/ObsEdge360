'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { LoadingSkeleton, ErrorState } from '@/components/UiStates';

export default function AboutPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    apiClient<Record<string, unknown>>('/about')
      .then((d) => setData(d))
      .catch((e: Error) => setErr(e.message));
  }, []);
  return (
    <DashboardShell>
      <h1 className="mb-2 text-2xl font-semibold">About OpsEdge360</h1>
      <p className="mb-4 text-sm text-slate-400">Enterprise Digital Operations Intelligence — AsoftechInsightz</p>
      {err && <ErrorState message={err} />}
      {!data && !err && <LoadingSkeleton />}
      {data && <pre className="overflow-auto rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs backdrop-blur">{JSON.stringify(data, null, 2)}</pre>}
    </DashboardShell>
  );
}
