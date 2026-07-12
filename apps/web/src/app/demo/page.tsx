'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { EmptyState, LoadingSkeleton, SuccessBanner } from '@/components/UiStates';

type Tour = { code: string; title: string; industry: string; steps: { path: string; title: string }[] };

export default function DemoTourPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [active, setActive] = useState<Tour | null>(null);
  const [step, setStep] = useState(0);
  const [msg, setMsg] = useState('');
  const [walkthrough, setWalkthrough] = useState<{ steps?: { title: string; talkTrack: string }[] } | null>(null);

  useEffect(() => {
    apiClient<{ tours: Tour[] }>('/demo/tours')
      .then((d) => setTours(d.tours || []))
      .catch(() => undefined);
    apiClient<{ steps?: { title: string; talkTrack: string }[] }>('/demo/walkthrough')
      .then(setWalkthrough)
      .catch(() => undefined);
  }, []);

  const resetDemo = async () => {
    await apiClient('/demo/reset', { method: 'POST', body: '{}' });
    setActive(null);
    setStep(0);
    setMsg('Demo progress reset — ready for the next walkthrough');
  };
  const start = async (t: Tour) => {
    setActive(t);
    setStep(0);
    await apiClient('/demo/tours/progress', {
      method: 'POST',
      body: JSON.stringify({ tourCode: t.code, stepIndex: 0, completed: false }),
    }).catch(() => undefined);
  };

  const next = async () => {
    if (!active) return;
    const nextIdx = step + 1;
    const done = nextIdx >= active.steps.length;
    setStep(Math.min(nextIdx, active.steps.length - 1));
    await apiClient('/demo/tours/progress', {
      method: 'POST',
      body: JSON.stringify({ tourCode: active.code, stepIndex: nextIdx, completed: done }),
    }).catch(() => undefined);
  };

  return (
    <DashboardShell>
      <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
        <strong>Presentation Mode</strong> — guided evaluation tours for Banking, Healthcare, Manufacturing, Retail, and Government.
      </div>
      <h1 className="mb-2 text-2xl font-semibold">Customer Evaluation Tours</h1>
      <p className="mb-4 text-sm text-slate-400">Understand platform value in under 10–15 minutes.</p>
      {msg && <SuccessBanner message={msg} />}
      <button type="button" className="mb-4 rounded border border-white/20 px-3 py-2 text-sm" onClick={() => resetDemo().catch(() => undefined)}>
        Reset demo progress
      </button>
      {walkthrough?.steps && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-xs text-slate-300">
          <div className="mb-2 font-medium text-slate-100">Executive walkthrough talk track</div>
          <ol className="list-decimal space-y-1 pl-4">
            {walkthrough.steps.map((s, i) => (
              <li key={i}>
                <strong>{s.title}</strong> — {s.talkTrack}
              </li>
            ))}
          </ol>
        </div>
      )}
      {!tours.length && <LoadingSkeleton />}
      {!active && (
        <div className="grid gap-3 md:grid-cols-2">
          {tours.map((t) => (
            <button
              key={t.code}
              type="button"
              className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-left backdrop-blur hover:border-sky-500/40"
              onClick={() => start(t)}
            >
              <div className="text-xs uppercase text-slate-500">{t.industry}</div>
              <div className="mt-1 font-medium text-white">{t.title}</div>
              <div className="mt-2 text-xs text-slate-400">{t.steps?.length || 0} steps</div>
            </button>
          ))}
          {!tours.length && <EmptyState title="No tours available" />}
        </div>
      )}
      {active && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur">
          <div className="text-xs text-slate-500">
            Step {step + 1} / {active.steps.length}
          </div>
          <h2 className="mt-2 text-xl font-semibold">{active.steps[step]?.title}</h2>
          <p className="mt-2 text-sm text-slate-400">Open the destination, then continue the tour.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="rounded bg-sky-600 px-4 py-2 text-sm text-white" href={active.steps[step]?.path || '/dashboard'}>
              Open screen
            </Link>
            <button type="button" className="rounded border border-slate-600 px-4 py-2 text-sm" onClick={() => next()}>
              {step + 1 >= active.steps.length ? 'Finish' : 'Next'}
            </button>
            <button type="button" className="rounded border border-slate-600 px-4 py-2 text-sm" onClick={() => setActive(null)}>
              Exit tour
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
