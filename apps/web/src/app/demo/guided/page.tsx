'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/eig/primitives';
import { TrustBar } from '@/components/apex/TrustBar';
import { DemoDataBanner } from '@/components/ede/DemoDataBanner';
import { ErrorState, LoadingSkeleton, SuccessBanner } from '@/components/UiStates';
import { friendlyError } from '@/lib/friendly-error';
import { setExecutiveDemoMode, setPresentationMode } from '@/lib/apex-mode';

type Step = {
  code: string;
  title: string;
  path: string;
  businessValue: string;
  talkTrack: string;
  order: number;
};

export default function GuidedEvaluationPage() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setExecutiveDemoMode(true);
    apiClient<{ steps: Step[]; copilotPrompts?: string[]; durationMinutes?: number }>('/demo/ede/guided')
      .then((d) => {
        setSteps(d.steps || []);
        setPrompts(d.copilotPrompts || []);
      })
      .catch((e) => setErr(friendlyError(e)))
      .finally(() => setLoading(false));
  }, []);

  const step = steps[idx];

  const loadPack = async () => {
    try {
      await apiClient('/demo/ede/load', { method: 'POST', body: JSON.stringify({}) });
      setMsg('Illustrative Demo Data loaded for this tenant.');
    } catch (e) {
      setErr(friendlyError(e, 'Admin role required to load the demo pack.'));
    }
  };

  return (
    <DashboardShell>
      <PageHeader
        title="15-minute Guided Evaluation"
        purpose="Executive walkthrough of OpsEdge360 value — Discovery through Reports — using Illustrative Demo Data."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded bg-violet-600 px-3 py-2 text-sm text-white"
              onClick={() => {
                setPresentationMode(true);
                setMsg('Presentation mode on (Ctrl+Shift+P to exit).');
              }}
            >
              Presentation mode
            </button>
            <button type="button" className="rounded border border-sky-500/40 px-3 py-2 text-sm" onClick={() => void loadPack()}>
              Load demo pack
            </button>
          </div>
        }
      />
      <DemoDataBanner />
      <TrustBar
        lastUpdated={new Date()}
        freshness="live"
        dataSource="EDE guided evaluation"
        coverageLabel={`${steps.length} steps`}
        integrationHealth="healthy"
      />
      {msg && <SuccessBanner message={msg} />}
      {err && <ErrorState message={err} />}
      {loading && <LoadingSkeleton rows={4} />}

      {!loading && step && (
        <div className="eig-glass space-y-4 p-6">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Step {idx + 1} of {steps.length}
          </div>
          <h2 className="text-xl font-semibold text-slate-50">{step.title}</h2>
          <p className="text-sm text-sky-100/90">
            <strong>Business value:</strong> {step.businessValue}
          </p>
          <p className="text-sm text-slate-300">
            <strong>Talk track:</strong> {step.talkTrack}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={step.path} className="rounded bg-sky-600 px-4 py-2 text-sm text-white">
              Open {step.title}
            </Link>
            <button
              type="button"
              className="rounded border border-white/20 px-3 py-2 text-sm"
              disabled={idx === 0}
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded border border-white/20 px-3 py-2 text-sm"
              disabled={idx >= steps.length - 1}
              onClick={() => setIdx((i) => Math.min(steps.length - 1, i + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {prompts.length > 0 && (
        <div className="mt-6 eig-glass p-5">
          <h3 className="mb-2 font-semibold">AI Copilot — suggested prompts</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            {prompts.map((p) => (
              <li key={p} className="rounded border border-white/10 px-3 py-2">
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">Open Copilot from the header and paste any prompt — answers use platform APIs and demo context.</p>
        </div>
      )}

      <ol className="mt-6 space-y-2 text-sm text-slate-400">
        {steps.map((s, i) => (
          <li key={s.code}>
            <button type="button" className={i === idx ? 'text-sky-300' : 'hover:text-slate-200'} onClick={() => setIdx(i)}>
              {s.order}. {s.title}
            </button>
          </li>
        ))}
      </ol>
    </DashboardShell>
  );
}
