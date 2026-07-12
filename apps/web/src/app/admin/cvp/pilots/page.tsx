'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../AdminShell';
import { CvpNav } from '../CvpNav';
import { loadCvpState, saveCvpState } from '@/lib/cvp/store';
import {
  uid,
  type Industry,
  type PilotRecord,
  type PilotStatus,
  type CvpState,
} from '@/lib/cvp/types';
import { StatusBadge } from '@/components/eig/primitives';
import { EmptyState, SuccessBanner } from '@/components/UiStates';

const INDUSTRIES: Industry[] = ['Banking', 'Healthcare', 'Manufacturing', 'Retail', 'Government', 'Other'];
const STATUSES: PilotStatus[] = ['prospect', 'signed', 'onboarding', 'deployed', 'live', 'exited', 'churn_risk'];

const blank = (): Omit<PilotRecord, 'id' | 'createdAt' | 'updatedAt'> => ({
  customerName: '',
  industry: 'Other',
  primaryContact: '',
  role: 'CIO',
  deploymentStatus: 'prospect',
  successCriteria: '',
  openIssues: '',
  featureRequests: '',
  risks: '',
  meetingNotes: '',
  goLiveChecklistDone: false,
  exitChecklistDone: false,
  healthScore: 70,
  targetGoLive: '',
});

export default function CvpPilotsPage() {
  const [state, setState] = useState<CvpState | null>(null);
  const [form, setForm] = useState(blank());
  const [msg, setMsg] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const reload = () => setState(loadCvpState());
  useEffect(() => {
    reload();
  }, []);

  const persist = (next: CvpState) => {
    saveCvpState(next);
    setState(next);
  };

  const save = () => {
    if (!state || !form.customerName.trim()) return;
    const now = new Date().toISOString();
    if (editId) {
      persist({
        ...state,
        pilots: state.pilots.map((p) => (p.id === editId ? { ...p, ...form, updatedAt: now } : p)),
      });
      setMsg('Pilot updated');
    } else {
      const row: PilotRecord = { ...form, id: uid('pilot'), createdAt: now, updatedAt: now };
      persist({ ...state, pilots: [row, ...state.pilots] });
      setMsg('Pilot registered');
    }
    setForm(blank());
    setEditId(null);
  };

  return (
    <AdminShell title="Enterprise Pilot Portal" subtitle="Internal registry — track 3–5 pilots end-to-end">
      <CvpNav />
      {msg && <SuccessBanner message={msg} />}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="eig-panel space-y-2 p-4">
          <h2 className="text-sm font-semibold text-slate-100">{editId ? 'Edit pilot' : 'Register pilot'}</h2>
          {(
            [
              ['customerName', 'Customer'],
              ['primaryContact', 'Primary contact'],
              ['role', 'Role'],
              ['targetGoLive', 'Target go-live (ISO date)'],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="block text-xs text-slate-400">
              {label}
              <input
                className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
                value={String(form[k] ?? '')}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </label>
          ))}
          <label className="block text-xs text-slate-400">
            Industry
            <select
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value as Industry })}
            >
              {INDUSTRIES.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Deployment status
            <select
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm"
              value={form.deploymentStatus}
              onChange={(e) => setForm({ ...form, deploymentStatus: e.target.value as PilotStatus })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Health score (0–100)
            <input
              type="number"
              min={0}
              max={100}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm"
              value={form.healthScore}
              onChange={(e) => setForm({ ...form, healthScore: Number(e.target.value) })}
            />
          </label>
          {(
            [
              ['successCriteria', 'Success criteria'],
              ['openIssues', 'Open issues'],
              ['featureRequests', 'Feature requests'],
              ['risks', 'Risks'],
              ['meetingNotes', 'Meeting notes'],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="block text-xs text-slate-400">
              {label}
              <textarea
                className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
                rows={2}
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </label>
          ))}
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={form.goLiveChecklistDone}
              onChange={(e) => setForm({ ...form, goLiveChecklistDone: e.target.checked })}
            />
            Go-live checklist complete
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={form.exitChecklistDone}
              onChange={(e) => setForm({ ...form, exitChecklistDone: e.target.checked })}
            />
            Exit checklist complete
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" className="rounded bg-sky-700 px-3 py-1.5 text-xs text-white" onClick={save}>
              Save
            </button>
            {editId && (
              <button
                type="button"
                className="rounded border border-slate-600 px-3 py-1.5 text-xs"
                onClick={() => {
                  setEditId(null);
                  setForm(blank());
                }}
              >
                Cancel
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Checklists align with <code>docs/pilot/GO_LIVE_CHECKLIST.md</code> and <code>EXIT_CRITERIA.md</code>.
          </p>
        </div>

        <div className="space-y-3">
          {!state?.pilots.length && <EmptyState title="No pilots yet" hint="Register the first enterprise pilot to begin evidence collection." />}
          {state?.pilots.map((p) => (
            <div key={p.id} className="eig-glass p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-slate-100">{p.customerName}</div>
                  <div className="text-xs text-slate-500">
                    {p.industry} · {p.primaryContact} ({p.role})
                  </div>
                </div>
                <StatusBadge status={p.deploymentStatus === 'live' ? 'healthy' : p.deploymentStatus === 'churn_risk' ? 'critical' : 'info'} />
              </div>
              <div className="mt-2 text-xs text-slate-400">Health {p.healthScore}/100 · Status {p.deploymentStatus}</div>
              <p className="mt-2 line-clamp-2 text-xs text-slate-300">{p.successCriteria || 'No success criteria yet'}</p>
              <button
                type="button"
                className="mt-3 text-xs text-sky-400 hover:underline"
                onClick={() => {
                  setEditId(p.id);
                  setForm({ ...blank(), ...p });
                }}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
