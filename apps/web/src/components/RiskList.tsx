/**
 * @deprecated Wave 2 — replaced by dashboard payload insights.topRisks.
 */
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { DemoAwareEmptyState } from '@/components/ede/DemoAwareEmptyState';

interface Risk {
  id: string;
  title: string;
  severity: string;
  revenueAtRisk: number;
  affectedService: string;
  recommendedAction?: string;
  owner?: string;
  illustrative?: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'border-red-500/60 bg-red-500/15',
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
        <p className="mt-1 text-xs text-slate-500">What happened · impact · owner · next action</p>
      </div>
      <div className="space-y-3 p-4">
        {!risks.length ? (
          <DemoAwareEmptyState
            title="No elevated risks in this workspace yet"
            hint="Load Illustrative Demo Data to see drift-backed business risks with owners and recommended actions."
            setupHref="/cmdb/drift"
          />
        ) : (
          risks.map((risk) => (
            <div key={risk.id} className={`rounded-[var(--eig-radius-sm)] border p-3 ${SEVERITY_COLORS[risk.severity] ?? ''}`}>
              <div className="text-sm font-medium">{risk.title}</div>
              <div className="mt-1 text-xs text-slate-400">{risk.affectedService}</div>
              {risk.owner ? <div className="mt-1 text-xs text-slate-500">Owner: {risk.owner}</div> : null}
              {risk.revenueAtRisk > 0 && (
                <div className="mt-1 text-xs text-amber-400">
                  Business impact: ₹{(risk.revenueAtRisk / 1000).toFixed(0)}K/hr
                </div>
              )}
              <Link href="/cmdb/drift" className="mt-2 inline-block text-xs text-sky-400 hover:underline">
                {risk.recommendedAction ? `${risk.recommendedAction} →` : 'Recommended: review in CMDB Drift →'}
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
