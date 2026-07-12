'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../AdminShell';
import { CvpNav } from '../CvpNav';
import { loadCvpState, saveCvpState } from '@/lib/cvp/store';
import { uid, type CvpState, type FeatureDecision, type FeatureRequest, type Severity } from '@/lib/cvp/types';
import { DataTable, StatusBadge } from '@/components/eig/primitives';
import { EmptyState, SuccessBanner } from '@/components/UiStates';

export default function CvpGovernancePage() {
  const [state, setState] = useState<CvpState | null>(null);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    title: '',
    customer: '',
    industry: '',
    businessJustification: '',
    estimatedRoi: '',
    effort: 'M' as FeatureRequest['effort'],
    risk: 'medium' as Severity,
    targetRelease: 'v1.1',
    decision: 'needs_evidence' as FeatureDecision,
    evidenceNotes: '',
  });

  useEffect(() => setState(loadCvpState()), []);

  const save = () => {
    if (!state || !form.title.trim()) return;
    const hasCustomer = !!form.customer.trim();
    const decision: FeatureDecision = hasCustomer
      ? form.decision === 'needs_evidence'
        ? 'approved_v1_1'
        : form.decision
      : 'future_consideration';
    const now = new Date().toISOString();
    const row: FeatureRequest = {
      ...form,
      decision: hasCustomer ? decision : 'future_consideration',
      linkedFeedbackIds: [],
      id: uid('feat'),
      createdAt: now,
      updatedAt: now,
    };
    const next = { ...state, features: [row, ...state.features] };
    saveCvpState(next);
    setState(next);
    setMsg(hasCustomer ? 'Feature logged with customer evidence' : 'No customer evidence — classified Future Consideration');
    setForm({ ...form, title: '', businessJustification: '', estimatedRoi: '', evidenceNotes: '' });
  };

  return (
    <AdminShell title="Feature Review Board" subtitle="No customer evidence → Future Consideration">
      <CvpNav />
      {msg && <SuccessBanner message={msg} />}
      <div className="mb-4 eig-panel p-3 text-xs text-slate-400">
        Every enhancement must answer: customer · industry · justification · ROI · effort · risk · target release.
        <br />
        <strong className="text-slate-200">TITAN rule:</strong> major features need two independent pilot requests (or
        critical ops/security/compliance). See <code>docs/titan/09_ROADMAP_DISCIPLINE.md</code>.
      </div>
      <div className="mb-6 eig-panel grid gap-2 p-4 md:grid-cols-2">
        {(
          [
            ['title', 'Enhancement'],
            ['customer', 'Customer (required for v1.1)'],
            ['industry', 'Industry'],
            ['estimatedRoi', 'Estimated ROI'],
            ['targetRelease', 'Target release'],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="block text-xs text-slate-400">
            {label}
            <input className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          </label>
        ))}
        <label className="block text-xs text-slate-400">
          Effort
          <select className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm" value={form.effort} onChange={(e) => setForm({ ...form, effort: e.target.value as FeatureRequest['effort'] })}>
            {['S', 'M', 'L', 'XL'].map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-slate-400">
          Risk
          <select className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm" value={form.risk} onChange={(e) => setForm({ ...form, risk: e.target.value as Severity })}>
            {['critical', 'high', 'medium', 'low'].map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
        <label className="md:col-span-2 block text-xs text-slate-400">
          Business justification
          <textarea className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm" rows={2} value={form.businessJustification} onChange={(e) => setForm({ ...form, businessJustification: e.target.value })} />
        </label>
        <label className="md:col-span-2 block text-xs text-slate-400">
          Evidence notes
          <textarea className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm" rows={2} value={form.evidenceNotes} onChange={(e) => setForm({ ...form, evidenceNotes: e.target.value })} />
        </label>
        <button type="button" className="rounded bg-sky-700 px-3 py-2 text-xs text-white md:col-span-2" onClick={save}>
          Submit to board
        </button>
      </div>
      <DataTable
        columns={[
          { key: 'title', label: 'Request', render: (r) => String(r.title) },
          { key: 'customer', label: 'Customer', render: (r) => String(r.customer || '—') },
          { key: 'effort', label: 'Effort', render: (r) => String(r.effort) },
          { key: 'decision', label: 'Decision', render: (r) => <StatusBadge status={String(r.decision).includes('future') ? 'warning' : String(r.decision).includes('approved') ? 'success' : 'info'} /> },
          { key: 'targetRelease', label: 'Target', render: (r) => String(r.targetRelease) },
        ]}
        rows={(state?.features || []) as unknown as Array<Record<string, unknown>>}
        empty={<EmptyState title="No feature requests" hint="Only evidence-backed items enter Version 1.1." />}
      />
    </AdminShell>
  );
}
