'use client';

import Link from 'next/link';

export type NarrativeProps = {
  happening: string;
  whyItMatters: string;
  affectedService?: string;
  impact?: string;
  nextAction: { label: string; href: string };
  aiConfidence?: number | null;
};

/** 30-second executive storytelling block — APEX Workstream 1. */
export function ExecutiveNarrative({
  happening,
  whyItMatters,
  affectedService,
  impact,
  nextAction,
  aiConfidence,
}: NarrativeProps) {
  return (
    <div className="eig-glass mb-6 p-5">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Executive narrative · 30-second brief
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-[11px] text-slate-500">What is happening</dt>
          <dd className="mt-1 text-sm font-medium text-slate-100">{happening}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-slate-500">Why it matters</dt>
          <dd className="mt-1 text-sm text-slate-200">{whyItMatters}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-slate-500">Affected service</dt>
          <dd className="mt-1 text-sm text-slate-200">{affectedService || 'Enterprise services (see table)'}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-slate-500">Financial / SLA impact</dt>
          <dd className="mt-1 text-sm text-amber-200">{impact || 'See revenue-at-risk and SLA trend'}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-slate-500">What to do next</dt>
          <dd className="mt-1">
            <Link href={nextAction.href} className="text-sm font-medium text-sky-400 hover:underline">
              {nextAction.label} →
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-slate-500">AI confidence</dt>
          <dd className="mt-1 text-sm text-slate-200">
            {aiConfidence != null ? `${Math.round(aiConfidence)}% · guidance` : 'Guidance · verify in Ops Intelligence'}
          </dd>
        </div>
      </dl>
    </div>
  );
}
