'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from '../AdminShell';
import { CvpNav } from './CvpNav';
import { exportCvpJson, importCvpJson, loadCvpState } from '@/lib/cvp/store';
import { computeSuccessMetrics, type CvpState } from '@/lib/cvp/types';
import { TrustBar } from '@/components/apex/TrustBar';
import { SuccessBanner, ErrorState } from '@/components/UiStates';

export default function CvpOverviewPage() {
  const [state, setState] = useState<CvpState | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const reload = () => setState(loadCvpState());

  useEffect(() => {
    reload();
    const on = () => reload();
    window.addEventListener('opsedge:cvp', on);
    return () => window.removeEventListener('opsedge:cvp', on);
  }, []);

  const m = state ? computeSuccessMetrics(state) : null;

  return (
    <AdminShell
      title="Customer Validation Program"
      subtitle="Internal pilot management — Engineering Freeze · evidence over assumptions"
    >
      <CvpNav />
      <TrustBar
        lastUpdated={state?.updatedAt}
        freshness="recent"
        dataSource="Local CVP store (exportable)"
        coverageLabel="Admin-only · not customer-facing"
        integrationHealth="healthy"
      />
      {msg && <SuccessBanner message={msg} />}
      {err && <ErrorState message={err} />}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-sky-700 px-3 py-1.5 text-xs text-white"
          onClick={() => {
            const blob = new Blob([exportCvpJson()], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `opsedge360-cvp-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            setMsg('CVP export downloaded');
          }}
        >
          Export evidence pack
        </button>
        <label className="cursor-pointer rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5">
          Import JSON
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                importCvpJson(await file.text());
                reload();
                setMsg('CVP import applied');
                setErr('');
              } catch (ex) {
                setErr(ex instanceof Error ? ex.message : 'Import failed');
              }
            }}
          />
        </label>
        <Link href="/admin/cvp/pilots" className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-200">
          Register pilot
        </Link>
        <Link href="/docs" className="hidden" />
      </div>

      {m && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Active pilots', value: m.activePilots, href: '/admin/cvp/pilots' },
            { label: 'Avg health', value: `${m.avgHealth}/100`, href: '/admin/cvp/success' },
            { label: 'Open feedback', value: m.openFeedback, href: '/admin/cvp/feedback' },
            { label: 'Evidence-backed features', value: m.evidenceBacked, href: '/admin/cvp/feature-board' },
          ].map((c) => (
            <Link key={c.label} href={c.href} className="eig-glass block p-4 transition hover:-translate-y-0.5">
              <div className="text-xs text-slate-500">{c.label}</div>
              <div className="mt-1 text-2xl font-semibold text-slate-100">{c.value}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="eig-panel space-y-2 p-4 text-sm text-slate-300">
        <p className="font-medium text-slate-100">Product philosophy (CVP)</p>
        <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
          <li>Customer evidence outweighs assumptions.</li>
          <li>Quality outweighs quantity · Adoption outweighs feature count.</li>
          <li>Business outcomes outweigh engineering milestones.</li>
          <li>No speculative development — Engineering Freeze v1.0.</li>
          <li>
            Leadership focus recommendation: ~20% engineering oversight · ~80% enterprise sales, partnerships,
            discovery, pilots, and fundraising.
          </li>
        </ul>
        <p className="pt-2 text-xs text-slate-500">
          Docs: <code className="text-slate-400">docs/cvp/</code> · Pilot toolkit: <code className="text-slate-400">docs/pilot/</code>
        </p>
      </div>
    </AdminShell>
  );
}
