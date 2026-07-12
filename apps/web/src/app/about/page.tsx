'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { LoadingSkeleton, ErrorState } from '@/components/UiStates';
import { PageHeader, DescriptionList, JsonViewer, StatusBadge } from '@/components/eig/primitives';
import { isDebugMode } from '@/lib/debug-mode';

export default function AboutPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState('');
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    setDebug(isDebugMode());
    apiClient<Record<string, unknown>>('/about')
      .then((d) => setData(d))
      .catch((e: Error) => setErr(e.message));
  }, []);

  const product = String(data?.product ?? data?.name ?? 'OpsEdge360');
  const version = String(data?.version ?? data?.release ?? '1.0.0');
  const vendor = String(data?.vendor ?? data?.company ?? 'AsoftechInsightz');
  const description = String(
    data?.description ?? data?.summary ?? 'Enterprise digital operations intelligence platform.',
  );

  return (
    <DashboardShell>
      <PageHeader
        title="About OpsEdge360"
        purpose="Enterprise Digital Operations Intelligence — flagship product of AsoftechInsightz."
        actions={
          <Link href="/help" className="rounded-[var(--eig-radius-sm)] border border-[var(--eig-border)] px-3 py-2 text-sm text-slate-200 hover:bg-white/5">
            Help Center
          </Link>
        }
      />
      {err && <ErrorState message={err} />}
      {!data && !err && <LoadingSkeleton />}
      {data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="eig-glass p-5">
            <div className="mb-3 flex items-center gap-2">
              <StatusBadge status="healthy" />
              <span className="text-sm text-slate-300">Platform status</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-50">{product}</h2>
            <p className="mt-2 text-sm text-slate-400">{description}</p>
          </div>
          <DescriptionList
            items={[
              { label: 'Vendor', value: vendor },
              { label: 'Version', value: version },
              { label: 'Edition', value: String(data?.edition ?? 'Enterprise') },
              { label: 'Experience', value: 'Enterprise Intelligence Glass (EIG)' },
            ]}
          />
        </div>
      )}
      {debug && data && <JsonViewer data={data} title="About API payload" />}
    </DashboardShell>
  );
}
