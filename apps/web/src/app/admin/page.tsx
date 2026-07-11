'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from './AdminShell';

interface Overview {
  tenant?: { name: string; slug: string; region: string };
  counts: {
    users: number;
    configurationItems: number;
    activeLicenses: number;
    enabledPolicies: number;
    emergencyStoppedPolicies: number;
    backupRuns: number;
  };
  gaClaim: boolean;
  releaseTrack: string;
  note: string;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient<Overview>('/admin/overview')
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <AdminShell title="Platform Dashboard">
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {data && (
        <>
          <div className="mb-4 rounded-lg border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
            {data.note} · track <code>{data.releaseTrack}</code> · gaClaim={String(data.gaClaim)}
          </div>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {[
              ['Users', data.counts.users],
              ['CIs', data.counts.configurationItems],
              ['Licenses', data.counts.activeLicenses],
              ['Policies', data.counts.enabledPolicies],
              ['E-Stop', data.counts.emergencyStoppedPolicies],
              ['Backups', data.counts.backupRuns],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-slate-700 bg-surface-elevated p-4">
                <div className="text-xs text-slate-400">{label}</div>
                <div className="mt-1 text-2xl font-semibold">{value}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-700 bg-surface-elevated p-5 text-sm">
            <div className="font-medium">{data.tenant?.name}</div>
            <div className="text-slate-400">
              slug={data.tenant?.slug} · region={data.tenant?.region}
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
