import { fetchApi } from '@/lib/api';

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
    <div className="rounded-xl border border-slate-700 bg-surface-elevated">
      <div className="border-b border-slate-700 px-5 py-4">
        <h2 className="font-semibold">Top Enterprise Risks</h2>
      </div>
      <div className="space-y-3 p-4">
        {risks.map((risk) => (
          <div key={risk.id} className={`rounded-lg border p-3 ${SEVERITY_COLORS[risk.severity] ?? ''}`}>
            <div className="text-sm font-medium">{risk.title}</div>
            <div className="mt-1 text-xs text-slate-400">{risk.affectedService}</div>
            {risk.revenueAtRisk > 0 && (
              <div className="mt-1 text-xs text-amber-400">
                Revenue at risk: ₹{(risk.revenueAtRisk / 1000).toFixed(0)}K/hr
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
