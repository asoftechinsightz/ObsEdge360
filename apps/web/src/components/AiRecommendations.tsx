import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { fetchApi } from '@/lib/api';

type RecItem = {
  title: string;
  reason: string;
  href: string;
  action: string;
  owner?: string;
};

type RecPayload = {
  illustrative?: boolean;
  label?: string;
  items?: RecItem[];
};

const FALLBACK: RecItem[] = [
  {
    title: 'Revenue is at risk on payment rails',
    reason: 'Confirm UPI latency and CBS dependency before peak hours.',
    href: '/banking360',
    action: 'Open Banking360',
    owner: 'Payments Platform',
  },
  {
    title: 'Clear high-severity configuration drift',
    reason: 'Unauthorized firewall, cert, and IAM changes should clear before CAB.',
    href: '/cmdb/drift',
    action: 'Review CMDB Drift',
    owner: 'Security Operations',
  },
  {
    title: 'Validate blast radius in Digital Twin',
    reason: 'Walk the payment dependency path before approving further change.',
    href: '/twin',
    action: 'Open Digital Twin',
    owner: 'Platform Reliability',
  },
];

/** Proactive board recommendations from executive signals (presentation). */
export async function AiRecommendations() {
  let items = FALLBACK;
  let label: string | undefined;
  try {
    const data = await fetchApi<RecPayload>('/executive/recommendations');
    if (data.items?.length) {
      items = data.items;
      label = data.label;
    }
  } catch {
    /* keep fallback */
  }

  return (
    <div className="eig-glass p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={16} className="text-sky-400" aria-hidden />
        <h2 className="font-semibold">AI recommendations</h2>
        <span className="ml-auto text-[10px] uppercase text-slate-500">
          {label ?? 'Proactive · Medium confidence'}
        </span>
      </div>
      <ul className="space-y-3">
        {items.map((r) => (
          <li key={`${r.href}-${r.title}`} className="rounded-[var(--eig-radius-sm)] border border-white/5 bg-black/10 p-3">
            <div className="text-sm font-medium text-slate-100">{r.title}</div>
            <p className="mt-1 text-xs text-slate-400">{r.reason}</p>
            {r.owner ? <p className="mt-1 text-[11px] text-slate-500">Owner: {r.owner}</p> : null}
            <Link href={r.href} className="mt-2 inline-block text-xs text-sky-400 hover:underline">
              {r.action} →
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-slate-500">Copilot can expand any recommendation into a board talk track.</p>
    </div>
  );
}
