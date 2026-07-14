'use client';

import { SITE } from '@/lib/site';

/** Compact industry / solution map for consulting sections */
export function IndustryMapVisual() {
  const items = [
    'Banking',
    'NBFC',
    'Retail',
    'Manufacturing',
    'Healthcare',
    'Education',
    'Logistics',
    'Government',
  ];
  return (
    <div
      className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 lg:gap-3 lg:p-6"
      aria-label="Industry solution packs"
    >
      {items.map((name) => (
        <div
          key={name}
          className="border border-white/10 bg-ink-soft px-3 py-4 text-center sm:px-4 sm:py-5"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-accent-bright">
            {name}360
          </p>
          <p className="font-display mt-1 text-sm font-semibold text-paper">{name}</p>
        </div>
      ))}
    </div>
  );
}

/** Simple implementation journey rail */
export function ImplementationVisual() {
  const steps = [
    { n: '01', t: 'Discover', d: 'Outcomes, constraints, and operating model' },
    { n: '02', t: 'Design', d: 'Identity, deployment, and integration blueprint' },
    { n: '03', t: 'Deploy', d: 'Pilot footprint with shared suite controls' },
    { n: '04', t: 'Operate', d: 'Runbooks, support, and continuous improvement' },
  ];
  return (
    <ol className="grid gap-0 md:grid-cols-4" aria-label={`${SITE.name} implementation journey`}>
      {steps.map((s, i) => (
        <li
          key={s.n}
          className="border-paper-line p-6 dark:border-ink-muted md:border-r md:last:border-r-0 border-b md:border-b-0"
        >
          <p className="font-display text-2xl text-accent/80">{s.n}</p>
          <p className="mt-3 font-display text-base font-semibold">{s.t}</p>
          <p className="mt-2 text-sm text-mist">{s.d}</p>
          {i < steps.length - 1 && <span className="sr-only">then</span>}
        </li>
      ))}
    </ol>
  );
}

/** Customer success outcome strip */
export function SuccessJourneyVisual() {
  const path = [
    'Executive question',
    'Business service',
    'Digital twin',
    'Risk & blast radius',
    'Observability',
    'AI assist',
    'Board report',
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 p-6 md:p-8" aria-label="Customer success journey">
      {path.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <span className="rounded-md border border-paper-line bg-paper px-3 py-2 text-sm dark:border-ink-muted dark:bg-ink">
            {step}
          </span>
          {i < path.length - 1 && (
            <span className="text-accent" aria-hidden>
              →
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/** Trust posture diagram */
export function TrustVisual() {
  const pillars = [
    { t: 'Security', d: 'Defense in depth across identity, network, and application' },
    { t: 'Privacy', d: 'Tenant isolation and purpose-limited processing' },
    { t: 'Resilience', d: 'Backup, recovery, and documented continuity patterns' },
    { t: 'Responsible AI', d: 'Human-governed, scoped, and reviewable assistance' },
  ];
  return (
    <div className="grid gap-px bg-paper-line dark:bg-ink-muted sm:grid-cols-2" aria-label="Trust pillars">
      {pillars.map((p) => (
        <div key={p.t} className="bg-paper-elev p-6 dark:bg-ink">
          <p className="font-display text-lg font-semibold">{p.t}</p>
          <p className="mt-2 text-sm text-mist">{p.d}</p>
        </div>
      ))}
    </div>
  );
}

/** AI capability ribbon */
export function AiPlatformVisual() {
  const lanes = [
    { t: 'Context', d: 'Suite data and service topology' },
    { t: 'Agents', d: 'Scoped assistive workflows' },
    { t: 'Governance', d: 'Policy, audit, and human review' },
    { t: 'Outcomes', d: 'Decisions tied to business services' },
  ];
  return (
    <div className="grid gap-4 p-6 md:grid-cols-4 md:p-8" aria-label="AI platform layers">
      {lanes.map((l) => (
        <div key={l.t} className="border-t-2 border-accent pt-4">
          <p className="font-display text-base font-semibold">{l.t}</p>
          <p className="mt-2 text-sm text-mist">{l.d}</p>
        </div>
      ))}
    </div>
  );
}
