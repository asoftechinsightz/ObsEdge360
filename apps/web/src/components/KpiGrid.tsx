import { fetchApi } from '@/lib/api';
import type { ExecutiveKpis } from '@opsedge360/shared-types';
import { Activity, IndianRupee, Shield, Leaf, AlertTriangle } from 'lucide-react';
import { ErrorState } from '@/components/UiStates';
import { DashboardClick } from '@/components/cvp/DashboardClick';

export async function KpiGrid() {
  let kpis: ExecutiveKpis | null = null;
  let err = '';
  let source: 'live' | 'partial' = 'live';
  const fetchedAt = new Date().toISOString();

  try {
    kpis = await fetchApi<ExecutiveKpis>('/executive/kpis');
    try {
      const [compliance, sustainability] = await Promise.all([
        fetchApi<{ overallScore: number }>('/compliance/score'),
        fetchApi<{ efficiency_score: string }>('/sustainability/summary'),
      ]);
      kpis.complianceScore = compliance.overallScore;
      kpis.sustainabilityScore = Number(sustainability.efficiency_score) || kpis.sustainabilityScore;
    } catch {
      source = 'partial';
    }
  } catch {
    err = 'Executive KPIs are temporarily unavailable.';
  }

  if (!kpis) {
    return <ErrorState message={err || 'Unable to load executive KPIs.'} />;
  }

  const cards = [
    {
      label: 'Availability',
      value: `${kpis.availability}%`,
      icon: Activity,
      color: 'text-emerald-400',
      trend: 'Live platform availability',
      href: '/observability',
    },
    {
      label: 'Revenue at Risk',
      value: `₹${(kpis.revenueAtRisk / 1000).toFixed(0)}K/hr`,
      icon: IndianRupee,
      color: 'text-amber-400',
      trend: 'Business impact estimate',
      href: '/ops-intelligence',
    },
    {
      label: 'Compliance',
      value: `${kpis.complianceScore}/100`,
      icon: Shield,
      color: 'text-sky-400',
      trend: 'Control posture score',
      href: '/compliance',
    },
    {
      label: 'Sustainability',
      value: `${kpis.sustainabilityScore}/100`,
      icon: Leaf,
      color: 'text-green-400',
      trend: 'Efficiency score',
      href: '/sustainability',
    },
    {
      label: 'Active Incidents',
      value: String(kpis.activeIncidents),
      icon: AlertTriangle,
      color: 'text-red-400',
      trend: `${kpis.openAlerts} open alerts`,
      href: '/ops-intelligence',
    },
  ];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span>Freshness: {new Date(fetchedAt).toLocaleTimeString()}</span>
        <span>·</span>
        <span>Source: {source === 'live' ? 'Live APIs' : 'Partial (core KPIs live)'}</span>
        <span>·</span>
        <span>Confidence: High (telemetry){source === 'partial' ? ' · Medium on enrichment' : ''}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <DashboardClick key={card.label} href={card.href} className="kpi-card block hover:-translate-y-0.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">{card.label}</span>
              <card.icon size={16} className={card.color} aria-hidden />
            </div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="mt-1 text-xs text-slate-500">{card.trend}</div>
          </DashboardClick>
        ))}
      </div>
    </div>
  );
}
