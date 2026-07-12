'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { EmptyState, ErrorState, LoadingSkeleton, SuccessBanner } from '@/components/UiStates';
import { PageHeader } from '@/components/eig/primitives';
import { setExecutiveDemoMode, setPresentationMode } from '@/lib/apex-mode';
import { TrustBar } from '@/components/apex/TrustBar';

type Tour = { code: string; title: string; industry: string; steps: { path: string; title: string }[] };
type Walkthrough = {
  durationMinutes?: string;
  steps?: { order?: number; path?: string; title: string; talkTrack: string }[];
  incidentSimulation?: { approach?: string; path?: string; script?: string[] };
};

export default function DemoTourPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [active, setActive] = useState<Tour | null>(null);
  const [step, setStep] = useState(0);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [walkthrough, setWalkthrough] = useState<Walkthrough | null>(null);

  useEffect(() => {
    apiClient<{ tours: Tour[] }>('/demo/tours')
      .then((d) => setTours(d.tours || []))
      .catch((e: Error) => setErr(e.message));
    apiClient<Walkthrough>('/demo/walkthrough')
      .then(setWalkthrough)
      .catch(() => undefined);
  }, []);

  const resetDemo = async () => {
    await apiClient('/demo/ede/reset', { method: 'POST', body: '{}' });
    setActive(null);
    setStep(0);
    setConfirmReset(false);
    setMsg('Demo reset complete — Illustrative Demo Data reloaded and tour progress cleared.');
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
      <PageHeader
        title="Executive Demo Mode"
        purpose="Boardroom-safe guided tours. Engineering gates stay in Developer Mode — not on this path."
        actions={
          <button
            type="button"
            className="rounded-[var(--eig-radius-sm)] bg-violet-600 px-3 py-2 text-sm text-white"
            onClick={() => {
              setExecutiveDemoMode(true);
              setPresentationMode(true);
              setMsg('Presentation + Executive Demo modes enabled (Ctrl+Shift+P toggles presentation).');
            }}
          >
            Enter presentation mode
          </button>
        }
      />
      <TrustBar
        lastUpdated={new Date()}
        freshness="live"
        dataSource="Demo tour APIs"
        coverageLabel={`${tours.length} industry tours`}
        integrationHealth="healthy"
      />
      <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
        <strong>Demo excellence</strong> — Banking, Healthcare, Manufacturing, Retail, and Government flows. Reset between sessions.
      </div>
      <p className="mb-4 text-sm text-slate-400">
        Demonstrate platform value in {walkthrough?.durationMinutes || '10–15'} minutes.
      </p>
      {msg && <SuccessBanner message={msg} />}
      {err && <ErrorState message={err} />}

      <div className="mb-4 flex flex-wrap gap-2">
        {!confirmReset ? (
          <button type="button" className="rounded border border-white/20 px-3 py-2 text-sm" onClick={() => setConfirmReset(true)}>
            Reset demo (reload pack)
          </button>
        ) : (
          <>
            <button type="button" className="rounded bg-amber-700 px-3 py-2 text-sm text-white" onClick={() => resetDemo().catch((e: Error) => setErr(e.message))}>
              Confirm full demo reset
            </button>
            <button type="button" className="rounded border border-white/20 px-3 py-2 text-sm" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </>
        )}
        <Link className="rounded border border-sky-500/40 px-3 py-2 text-sm text-sky-100" href="/dashboard">
          Executive Home
        </Link>
        <Link className="rounded border border-sky-500/40 px-3 py-2 text-sm text-sky-100" href="/banking360">
          Banking360
        </Link>
        <Link className="rounded border border-sky-500/40 px-3 py-2 text-sm text-sky-100" href="/synthetics">
          Synthetics
        </Link>
        <Link className="rounded border border-sky-500/40 px-3 py-2 text-sm text-sky-100" href="/ops-intelligence">
          Ops Intelligence
        </Link>
        <Link className="rounded border border-sky-500/40 px-3 py-2 text-sm text-sky-100" href="/itsm">
          ITSM
        </Link>
      </div>

      {walkthrough?.steps && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-xs text-slate-300">
          <div className="mb-2 font-medium text-slate-100">Executive walkthrough talk track</div>
          <ol className="list-decimal space-y-2 pl-4">
            {walkthrough.steps.map((s, i) => (
              <li key={i}>
                <strong>{s.title}</strong> — {s.talkTrack}{' '}
                {s.path && (
                  <Link className="text-sky-400 underline" href={s.path}>
                    open
                  </Link>
                )}
              </li>
            ))}
          </ol>
          {walkthrough.incidentSimulation?.script && (
            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="mb-1 font-medium text-slate-100">Incident simulation (talk-track)</div>
              <ul className="list-disc space-y-1 pl-4 text-slate-400">
                {walkthrough.incidentSimulation.script.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!tours.length && !err && <LoadingSkeleton />}
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
          {!tours.length && !err && <EmptyState title="No tours available" hint="Run demo seed or check demo_tours migration." />}
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
