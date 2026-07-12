import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { EmptyState } from '@/components/UiStates';

interface Risk {
  id: string;
  title: string;
  severity: string;
  revenueAtRisk: number;
  affectedService: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  high: 'border-red-500/50 bg-red-500/10',
  medium: 'border-amber-500/50 bg-amber-500/10',
  low: 'border-slate-500/50 bg-slate-500/10',
};

export async function RiskList() {
  let risks: Risk[] = [];
  try {
    risks = await fetchApi<Risk[]>('/executive/risks');
  } catch {
    risks = [];
  }

  return (
    <div className="eig-glass overflow-hidden">
      <div className="border-b border-[var(--eig-border)] px-5 py-4">
        <h2 className="font-semibold">Top enterprise risks</h2>
      </div>
      <div className="space-y-3 p-4">
        {!risks.length ? (
          <EmptyState title="No elevated risks right now" hint="Risks appear when services or incidents cross impact thresholds." />
        ) : (
          risks.map((risk) => (
            <div key={risk.id} className={`rounded-[var(--eig-radius-sm)] border p-3 ${SEVERITY_COLORS[risk.severity] ?? ''}`}>
              <div className="text-sm font-medium">{risk.title}</div>
              <div className="mt-1 text-xs text-slate-400">{risk.affectedService}</div>
              {risk.revenueAtRisk > 0 && (
                <div className="mt-1 text-xs text-amber-400">
                  Revenue at risk: ₹{(risk.revenueAtRisk / 1000).toFixed(0)}K/hr
                </div>
              )}
              <Link href="/ops-intelligence" className="mt-2 inline-block text-xs text-sky-400 hover:underline">
                Recommended: investigate in Ops Intelligence →
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
