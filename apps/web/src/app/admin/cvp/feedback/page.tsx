'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../AdminShell';
import { CvpNav } from '../CvpNav';
import { loadCvpState, saveCvpState } from '@/lib/cvp/store';
import {
  uid,
  type CvpState,
  type FeedbackCategory,
  type FeedbackItem,
  type FeedbackStatus,
  type Severity,
} from '@/lib/cvp/types';
import { DataTable, StatusBadge } from '@/components/eig/primitives';
import { EmptyState, SuccessBanner } from '@/components/UiStates';

const CATS: FeedbackCategory[] = ['ui', 'performance', 'missing_capability', 'bug', 'workflow', 'documentation', 'ai_copilot'];
const SEV: Severity[] = ['critical', 'high', 'medium', 'low'];
const STAT: FeedbackStatus[] = ['new', 'triaged', 'planned', 'in_progress', 'done', 'wont_fix'];

export default function CvpFeedbackPage() {
  const [state, setState] = useState<CvpState | null>(null);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    customer: '',
    role: 'NOC',
    category: 'ui' as FeedbackCategory,
    title: '',
    detail: '',
    severity: 'medium' as Severity,
    businessImpact: '',
    frequency: 'weekly',
    status: 'new' as FeedbackStatus,
    plannedRelease: 'v1.1',
  });

  useEffect(() => setState(loadCvpState()), []);

  const save = () => {
    if (!state || !form.title.trim() || !form.customer.trim()) return;
    const now = new Date().toISOString();
    const row: FeedbackItem = { ...form, id: uid('fb'), createdAt: now, updatedAt: now };
    const next = { ...state, feedback: [row, ...state.feedback] };
    saveCvpState(next);
    setState(next);
    setMsg('Feedback captured');
    setForm({ ...form, title: '', detail: '', businessImpact: '' });
  };

  const setStatus = (id: string, status: FeedbackStatus) => {
    if (!state) return;
    const next = {
      ...state,
      feedback: state.feedback.map((f) => (f.id === id ? { ...f, status, updatedAt: new Date().toISOString() } : f)),
    };
    saveCvpState(next);
    setState(next);
  };

  return (
    <AdminShell title="Feedback Management" subtitle="Structured, actionable pilot feedback">
      <CvpNav />
      {msg && <SuccessBanner message={msg} />}
      <div className="mb-6 eig-panel grid gap-2 p-4 md:grid-cols-2">
        {(
          [
            ['customer', 'Customer'],
            ['role', 'Role'],
            ['title', 'Title'],
            ['businessImpact', 'Business impact'],
            ['frequency', 'Frequency'],
            ['plannedRelease', 'Planned release'],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="block text-xs text-slate-400">
            {label}
            <input
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm"
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            />
          </label>
        ))}
        <label className="block text-xs text-slate-400">
          Category
          <select className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as FeedbackCategory })}>
            {CATS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-slate-400">
          Severity
          <select className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as Severity })}>
            {SEV.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="md:col-span-2 block text-xs text-slate-400">
          Detail
          <textarea className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm" rows={3} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} />
        </label>
        <button type="button" className="rounded bg-sky-700 px-3 py-2 text-xs text-white md:col-span-2" onClick={save}>
          Add feedback
        </button>
      </div>

      <DataTable
        columns={[
          { key: 'title', label: 'Item', render: (r) => String(r.title) },
          { key: 'customer', label: 'Customer', render: (r) => `${r.customer} · ${r.role}` },
          { key: 'category', label: 'Category', render: (r) => String(r.category) },
          { key: 'severity', label: 'Severity', render: (r) => <StatusBadge status={String(r.severity)} /> },
          { key: 'status', label: 'Status', render: (r) => String(r.status) },
          { key: 'plannedRelease', label: 'Release', render: (r) => String(r.plannedRelease) },
          {
            key: 'actions',
            label: 'Update',
            render: (r) => (
              <select
                className="rounded border border-slate-600 bg-slate-950 px-1 py-0.5 text-[11px]"
                value={String(r.status)}
                onChange={(e) => setStatus(String(r.id), e.target.value as FeedbackStatus)}
              >
                {STAT.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            ),
          },
        ]}
        rows={(state?.feedback || []) as unknown as Array<Record<string, unknown>>}
        empty={<EmptyState title="No feedback yet" hint="Capture UI, performance, bugs, workflow, docs, and Copilot feedback from pilots." />}
      />
    </AdminShell>
  );
}
