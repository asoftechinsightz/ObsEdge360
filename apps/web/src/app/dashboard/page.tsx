import { DashboardShell } from '@/components/DashboardShell';
import { KpiGrid } from '@/components/KpiGrid';
import { ServiceHealthTable } from '@/components/ServiceHealthTable';
import { RiskList } from '@/components/RiskList';
import { SlaChart } from '@/components/SlaChart';

export default function ExecutiveHome() {
  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Enterprise Health Overview</h1>
        <p className="text-sm text-slate-400">Real-time intelligence across IT, OT, network, security, and business</p>
      </div>
      <KpiGrid />
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ServiceHealthTable />
        </div>
        <RiskList />
      </div>
      <div className="mt-6">
        <SlaChart />
      </div>
    </DashboardShell>
  );
}
