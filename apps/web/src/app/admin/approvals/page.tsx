'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AdminShell } from '../AdminShell';

export default function ApprovalQueuePage() {
  const [approvals, setApprovals] = useState<Array<Record<string, unknown>>>([]);
  const [msg, setMsg] = useState('');

  const load = () =>
    apiClient<{ approvals: Array<Record<string, unknown>> }>('/automation/approvals?status=pending').then((d) =>
      setApprovals(d.approvals),
    );

  useEffect(() => {
    load().catch((e: Error) => setMsg(e.message));
  }, []);

  async function decide(id: string, decision: 'approved' | 'rejected' | 'emergency_approved') {
    try {
      await apiClient(`/automation/approvals/${id}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision, comment: `UI ${decision}` }),
      });
      setMsg(`Decision: ${decision}`);
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <AdminShell title="Approval Queue">
      <p className="mb-3 text-sm text-slate-400">
        Single / multi-level / emergency approvals with expiration and audit trail.
      </p>
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
      <div className="space-y-2">
        {approvals.length === 0 && <p className="text-sm text-slate-500">No pending approvals</p>}
        {approvals.map((a) => (
          <div
            key={String(a.id)}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700 bg-surface-elevated px-4 py-3 text-sm"
          >
            <div>
              <div className="font-medium">
                Level {String(a.level)} · {String(a.mode)} · exec {String(a.execution_id).slice(0, 8)}…
              </div>
              <div className="text-xs text-slate-400">expires {String(a.expires_at ?? '—')}</div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md bg-emerald-700 px-3 py-1 text-xs text-white"
                onClick={() => decide(String(a.id), 'approved')}
              >
                Approve
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-600 px-3 py-1 text-xs"
                onClick={() => decide(String(a.id), 'rejected')}
              >
                Reject
              </button>
              <button
                type="button"
                className="rounded-md bg-amber-700 px-3 py-1 text-xs text-white"
                onClick={() => decide(String(a.id), 'emergency_approved')}
              >
                Emergency
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
