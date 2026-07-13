'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

type Approval = { id: string; action: string; riskTier: string; status: string };

export function AgentApprovalsPanel({ initial }: { initial: Approval[] }) {
  const [approvals, setApprovals] = useState(initial);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!approvals.length) return null;

  const refresh = async () => {
    const data = await apiClient<{ approvals: Approval[] }>('/agents/approvals');
    setApprovals(data.approvals ?? []);
  };

  const approve = async (id: string) => {
    setBusyId(id);
    setErr('');
    try {
      await apiClient(`/agents/approvals/${id}/approve`, { method: 'POST', body: '{}' });
      setMsg(`Approved ${id}`);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    setErr('');
    try {
      await apiClient(`/agents/approvals/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Rejected from Agents workspace' }),
      });
      setMsg(`Rejected ${id}`);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
      <h2 className="mb-3 font-semibold text-amber-400">Pending Approvals</h2>
      {msg && <p className="mb-2 text-xs text-emerald-300">{msg}</p>}
      {err && <p className="mb-2 text-xs text-red-300">{err}</p>}
      {approvals.map((a) => (
        <div key={a.id} className="mb-2 flex items-center justify-between rounded-lg bg-surface-elevated p-4">
          <div>
            <div className="text-sm font-medium">{a.action}</div>
            <div className="text-xs text-slate-400">
              Risk: {a.riskTier} · Status: {a.status} · ID: {a.id}
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={`/ops-intelligence?approval=${a.id}`}
              className="rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-sky-500/40"
            >
              View details
            </a>
            <button
              type="button"
              disabled={busyId === a.id}
              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white disabled:opacity-50"
              onClick={() => void approve(a.id)}
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busyId === a.id}
              className="rounded-lg border border-slate-600 px-3 py-1 text-xs disabled:opacity-50"
              onClick={() => void reject(a.id)}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
