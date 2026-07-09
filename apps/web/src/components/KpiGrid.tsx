import { fetchApi } from '@/lib/api';
import type { ExecutiveKpis } from '@opsedge360/shared-types';
import { Activity, IndianRupee, Shield, Leaf, AlertTriangle } from 'lucide-react';

const FALLBACK: ExecutiveKpis = {
  availability: 99.94,
  revenueAtRisk: 240000,
  complianceScore: 87,
  securityPosture: 'medium',
  sustainabilityScore: 72,
  activeIncidents: 4,
  totalAssets: 1247,
  openAlerts: 23,
};

export async function KpiGrid() {
  let kpis = FALLBACK;
  try {
    kpis = await fetchApi<ExecutiveKpis>('/executive/kpis');
    const [compliance, sustainability] = await Promise.all([
      fetchApi<{ overallScore: number }>('/compliance/score').catch(() => ({ overallScore: kpis.complianceScore })),
      fetchApi<{ efficiency_score: string }>('/sustainability/summary').catch(() => ({ efficiency_score: String(kpis.sustainabilityScore) })),
    ]);
    kpis.complianceScore = compliance.overallScore;
    kpis.sustainabilityScore = Number(sustainability.efficiency_score) || kpis.sustainabilityScore;
  } catch {
    // use fallback when API unavailable
  }

  const cards = [
    { label: 'Availability', value: `${kpis.availability}%`, icon: Activity, color: 'text-emerald-400', sub: '▲ 0.02% vs yesterday' },
    { label: 'Revenue at Risk', value: `₹${(kpis.revenueAtRisk / 1000).toFixed(0)}K/hr`, icon: IndianRupee, color: 'text-amber-400', sub: '▼ 12% vs last week' },
    { label: 'Compliance', value: `${kpis.complianceScore}/100`, icon: Shield, color: 'text-sky-400', sub: '▲ 3 points' },
    { label: 'Sustainability', value: `${kpis.sustainabilityScore}/100`, icon: Leaf, color: 'text-green-400', sub: '▲ 5 points' },
    { label: 'Active Incidents', value: String(kpis.activeIncidents), icon: AlertTriangle, color: 'text-red-400', sub: `${kpis.openAlerts} open alerts` },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="kpi-card">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">{card.label}</span>
            <card.icon size={16} className={card.color} />
          </div>
          <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
          <div className="mt-1 text-xs text-slate-500">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}
