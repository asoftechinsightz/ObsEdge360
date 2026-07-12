import { DashboardShell } from '@/components/DashboardShell';
import { KpiGrid } from '@/components/KpiGrid';
import { ServiceHealthTable } from '@/components/ServiceHealthTable';
import { RiskList } from '@/components/RiskList';
import { ExecutiveTrendCharts } from '@/components/SlaChart';
import { AiRecommendations } from '@/components/AiRecommendations';
import Link from 'next/link';

export default function ExecutiveHome() {
  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Enterprise command center</h1>
          <p className="text-sm text-slate-400">
            Health, risk, SLA, and recommended actions — decision support for executives and operators.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link href="/ops-intelligence" className="rounded-[var(--eig-radius-sm)] border border-[var(--eig-border)] px-3 py-1.5 text-slate-300 hover:bg-white/5">
            Drill: Incidents
          </Link>
          <Link href="/reports" className="rounded-[var(--eig-radius-sm)] border border-[var(--eig-border)] px-3 py-1.5 text-slate-300 hover:bg-white/5">
            Drill: Reports
          </Link>
          <Link href="/compliance" className="rounded-[var(--eig-radius-sm)] border border-[var(--eig-border)] px-3 py-1.5 text-slate-300 hover:bg-white/5">
            Drill: Compliance
          </Link>
        </div>
      </div>
      <KpiGrid />
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ServiceHealthTable />
        </div>
        <div className="space-y-6">
          <RiskList />
          <AiRecommendations />
        </div>
      </div>
      <div className="mt-6">
        <ExecutiveTrendCharts />
      </div>
    </DashboardShell>
  );
}
