'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from '../../AdminShell';
import { CvpNav } from '../CvpNav';
import { loadCvpState } from '@/lib/cvp/store';
import { computeSuccessMetrics, type CvpState } from '@/lib/cvp/types';
import { TrustBar } from '@/components/apex/TrustBar';
import { EmptyState } from '@/components/UiStates';

export default function CvpSuccessPage() {
  const [state, setState] = useState<CvpState | null>(null);
  useEffect(() => setState(loadCvpState()), []);
  const m = state ? computeSuccessMetrics(state) : null;

  return (
    <AdminShell title="Customer Success Dashboard" subtitle="Pilot health, issues, adoption signals">
      <CvpNav />
      <TrustBar lastUpdated={state?.updatedAt} freshness="recent" dataSource="CVP store" coverageLabel="Internal CS view" />
      {m && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Active pilots', value: m.activePilots },
            { label: 'Avg health score', value: m.avgHealth },
            { label: 'Open feedback', value: m.openFeedback },
            { label: 'Critical feedback', value: m.criticalFeedback },
            { label: 'Pilots with issues', value: m.openIssuesApprox },
            { label: 'Feature requests', value: m.featureRequests },
            { label: 'Evidence-backed', value: m.evidenceBacked },
            { label: 'Future consideration', value: m.futureOnly },
          ].map((c) => (
            <div key={c.label} className="eig-glass p-4">
              <div className="text-xs text-slate-500">{c.label}</div>
              <div className="mt-1 text-2xl font-semibold">{c.value}</div>
            </div>
          ))}
        </div>
      )}
      <div className="mb-4 eig-panel p-4 text-xs text-slate-400">
        SLA adherence, support tickets, training completion: link pilots to external CS tools; track meeting notes and health scores here.
        Upcoming milestones: see <Link className="text-sky-400 hover:underline" href="/admin/cvp/releases">Release Planning</Link>.
      </div>
      <h2 className="mb-2 text-sm font-semibold">Pilot health</h2>
      <div className="space-y-2">
        {!state?.pilots.length && <EmptyState title="No pilots" hint="Register pilots to see health scores." />}
        {state?.pilots.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded border border-white/10 px-3 py-2 text-sm">
            <div>
              <div className="font-medium text-slate-100">{p.customerName}</div>
              <div className="text-xs text-slate-500">{p.deploymentStatus} · {p.industry}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-sky-300">{p.healthScore}</div>
              <div className="text-[10px] text-slate-500">health</div>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
