import Link from 'next/link';
import { Sparkles } from 'lucide-react';

const RECS = [
  {
    title: 'Review open revenue-impacting incidents',
    reason: 'Active incidents may be driving revenue-at-risk.',
    href: '/ops-intelligence',
    action: 'Open Ops Intelligence',
  },
  {
    title: 'Confirm synthetic coverage on tier-1 journeys',
    reason: 'Synthetics reduce blind spots before customers report issues.',
    href: '/synthetics',
    action: 'View Synthetics',
  },
  {
    title: 'Check compliance posture before the next QBR',
    reason: 'Control gaps are easier to close before executive reviews.',
    href: '/compliance',
    action: 'Open Compliance',
  },
];

/** Presentation-only recommendations from existing product areas (UX-1C). */
export function AiRecommendations() {
  return (
    <div className="eig-glass p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={16} className="text-sky-400" aria-hidden />
        <h2 className="font-semibold">Recommended actions</h2>
        <span className="ml-auto text-[10px] uppercase text-slate-500">Guidance · Medium confidence</span>
      </div>
      <ul className="space-y-3">
        {RECS.map((r) => (
          <li key={r.href} className="rounded-[var(--eig-radius-sm)] border border-white/5 bg-black/10 p-3">
            <div className="text-sm font-medium text-slate-100">{r.title}</div>
            <p className="mt-1 text-xs text-slate-400">{r.reason}</p>
            <Link href={r.href} className="mt-2 inline-block text-xs text-sky-400 hover:underline">
              {r.action} →
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-slate-500">For conversational guidance, open Copilot from the header.</p>
    </div>
  );
}
