/**
 * @deprecated Wave 2 — replaced by GET /dashboard/executive HealthWidget[].
 * Retained for backward compatibility; not used on /dashboard.
 */
import type { ExecutiveKpis } from '@opsedge360/shared-types';
import { fetchApi } from '@/lib/api';
import { Activity, IndianRupee, Shield, Leaf, AlertTriangle } from 'lucide-react';
import { DashboardClick } from '@/components/cvp/DashboardClick';
import { DemoAwareEmptyState } from '@/components/ede/DemoAwareEmptyState';

type KpiPayload = ExecutiveKpis & { illustrative?: boolean; label?: string; coverageLabel?: string };

export async function KpiGrid() {
  let kpis: KpiPayload | null = null;
  let source: 'live' | 'partial' | 'illustrative' = 'live';
  const fetchedAt = new Date().toISOString();

  try {
    kpis = await fetchApi<KpiPayload>('/executive/kpis');
    if (kpis.illustrative) source = 'illustrative';
    try {
      const [compliance, sustainability] = await Promise.all([
        fetchApi<{ overallScore: number }>('/compliance/score'),
        fetchApi<{ efficiency_score: string }>('/sustainability/summary'),
      ]);
      if (typeof compliance.overallScore === 'number' && compliance.overallScore > 0) {
        kpis.complianceScore = compliance.overallScore;
      }
      const sus = Number(sustainability.efficiency_score);
      if (Number.isFinite(sus) && sus > 0) {
        kpis.sustainabilityScore = sus;
      }
    } catch {
      if (source === 'live') source = 'partial';
    }
  } catch {
    kpis = null;
  }

  if (!kpis) {
    return (
      <DemoAwareEmptyState
        title="Executive KPIs are not available yet"
        hint="Load Illustrative Demo Data to populate availability, revenue-at-risk, and incident posture for the board brief."
        setupHref="/demo/guided"
      />
    );
  }

  const cards = [
    {
      label: 'Availability',
      value: `${Number(kpis.availability).toFixed(2)}%`,
      icon: Activity,
      color: 'text-emerald-400',
      trend: 'Enterprise service continuity',
      href: '/observability',
    },
    {
      label: 'Revenue at Risk',
      value: `₹${(kpis.revenueAtRisk / 1000).toFixed(0)}K/hr`,
      icon: IndianRupee,
      color: 'text-amber-400',
      trend: 'Business impact estimate',
      href: '/banking360',
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
        <span>
          Source:{' '}
          {source === 'illustrative'
            ? kpis.label ?? 'Illustrative Demo Data'
            : source === 'live'
              ? 'Live APIs'
              : 'Partial (core KPIs available)'}
        </span>
        <span>·</span>
        <span>{kpis.coverageLabel ?? `${kpis.totalAssets.toLocaleString()} assets in scope`}</span>
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
