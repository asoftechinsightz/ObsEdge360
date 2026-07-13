import { DashboardShell } from '@/components/DashboardShell';
import { ExecutiveDashboard } from '@/components/executive/ExecutiveDashboard';

export default function ExecutiveHome() {
  return (
    <DashboardShell>
      <ExecutiveDashboard />
    </DashboardShell>
  );
}
