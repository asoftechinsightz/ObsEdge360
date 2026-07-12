'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/UiStates';

type PilotPkg = { guides?: string[]; token?: string };

const GUIDE_LABELS: Record<string, string> = {
  'docs/rc2/PILOT_INSTALLATION_GUIDE.md': 'Pilot Installation Guide',
  'docs/rc2/PILOT_SUCCESS_CHECKLIST.md': 'Pilot Success Checklist',
  'docs/rc2/CUSTOMER_ACCEPTANCE_CHECKLIST.md': 'Customer Acceptance Checklist',
  'docs/rc2/PILOT_FEEDBACK_TEMPLATE.md': 'Pilot Feedback Template',
  'docs/rc2/ISSUE_ESCALATION_GUIDE.md': 'Issue Escalation Guide',
  'docs/rc2/OPERATIONS_RUNBOOK.md': 'Operations Runbook',
  'docs/rc2/SUPPORT_HANDBOOK.md': 'Support Handbook',
  'docs/rc2/SLA_GUIDE.md': 'SLA Guide',
  'docs/rc2/KNOWN_LIMITATIONS.md': 'Known Limitations',
};

export default function PilotPackagePage() {
  const [data, setData] = useState<PilotPkg | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    apiClient<PilotPkg>('/pilot/package')
      .then((d) => setData(d))
      .catch((e: Error) => setErr(e.message));
  }, []);
  return (
    <DashboardShell>
      <h1 className="mb-2 text-2xl font-semibold">Customer Pilot Package</h1>
      <p className="mb-4 text-sm text-slate-400">
        Installation, acceptance, SLA, and escalation guides for enterprise pilots. Documents live under{' '}
        <code className="text-slate-300">docs/rc2/</code>.
      </p>
      {err && <ErrorState message={err} />}
      {!data && !err && <LoadingSkeleton />}
      {data?.guides?.length ? (
        <ul className="space-y-2">
          {data.guides.map((g) => (
            <li key={g} className="rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm">
              <div className="font-medium text-slate-100">{GUIDE_LABELS[g] || g}</div>
              <div className="mt-1 text-xs text-slate-500">{g}</div>
            </li>
          ))}
        </ul>
      ) : (
        data && <EmptyState title="No guides listed" />
      )}
      {data?.token && (
        <p className="mt-4 text-xs text-slate-500">
          Validation token (after green VPS run): <code className="text-slate-300">{data.token}</code>
        </p>
      )}
    </DashboardShell>
  );
}
