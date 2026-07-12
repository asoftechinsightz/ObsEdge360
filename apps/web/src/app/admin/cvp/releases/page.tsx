'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../AdminShell';
import { CvpNav } from '../CvpNav';
import { loadCvpState, saveCvpState } from '@/lib/cvp/store';
import { uid, type CvpState, type ReleaseItem } from '@/lib/cvp/types';
import { DataTable } from '@/components/eig/primitives';
import { EmptyState, SuccessBanner } from '@/components/UiStates';

export default function CvpReleasesPage() {
  const [state, setState] = useState<CvpState | null>(null);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    title: '',
    type: 'backlog' as ReleaseItem['type'],
    version: 'v1.1',
    status: 'planned',
    notes: '',
    customerEvidence: '',
  });

  useEffect(() => setState(loadCvpState()), []);

  const save = () => {
    if (!state || !form.title.trim()) return;
    if (!form.customerEvidence.trim()) {
      setMsg('Customer evidence required — otherwise keep as Future Consideration in Feature Board');
      return;
    }
    const row: ReleaseItem = {
      ...form,
      id: uid('rel'),
      updatedAt: new Date().toISOString(),
    };
    const next = { ...state, releases: [row, ...state.releases] };
    saveCvpState(next);
    setState(next);
    setMsg('Release item added');
    setForm({ ...form, title: '', notes: '', customerEvidence: '' });
  };

  return (
    <AdminShell title="Release Planning Workspace" subtitle="Backlog · sprints · versions · flags · customer comms">
      <CvpNav />
      {msg && <SuccessBanner message={msg} />}
      <div className="mb-6 eig-panel grid gap-2 p-4 md:grid-cols-2">
        <label className="block text-xs text-slate-400">
          Title
          <input className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label className="block text-xs text-slate-400">
          Type
          <select className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ReleaseItem['type'] })}>
            {['backlog', 'sprint', 'version', 'flag', 'comms'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-slate-400">
          Version
          <input className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
        </label>
        <label className="block text-xs text-slate-400">
          Status
          <input className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
        </label>
        <label className="md:col-span-2 block text-xs text-slate-400">
          Customer evidence
          <textarea className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm" rows={2} value={form.customerEvidence} onChange={(e) => setForm({ ...form, customerEvidence: e.target.value })} />
        </label>
        <label className="md:col-span-2 block text-xs text-slate-400">
          Notes / changelog draft
          <textarea className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>
        <button type="button" className="rounded bg-sky-700 px-3 py-2 text-xs text-white md:col-span-2" onClick={save}>
          Add to release plan
        </button>
      </div>
      <DataTable
        columns={[
          { key: 'title', label: 'Item', render: (r) => String(r.title) },
          { key: 'type', label: 'Type', render: (r) => String(r.type) },
          { key: 'version', label: 'Version', render: (r) => String(r.version) },
          { key: 'status', label: 'Status', render: (r) => String(r.status) },
          { key: 'customerEvidence', label: 'Evidence', render: (r) => String(r.customerEvidence).slice(0, 80) },
        ]}
        rows={(state?.releases || []) as unknown as Array<Record<string, unknown>>}
        empty={<EmptyState title="Empty release plan" hint="Only evidence-backed items. See docs/cvp/V1_1_BACKLOG.md." />}
      />
    </AdminShell>
  );
}
