import type { DashboardFetchResult } from '@/lib/dashboard-api';
import { fetchDashboardExecutive } from '@/lib/dashboard-api';
import { DemoAwareEmptyState } from '@/components/ede/DemoAwareEmptyState';
import { ExecutiveDashboardClient } from '@/components/dashboard/ExecutiveDashboardClient';
import { DashboardErrorState } from '@/components/dashboard/DashboardStates';

export async function ExecutiveDashboard() {
  let result: DashboardFetchResult;
  try {
    result = await fetchDashboardExecutive();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Dashboard aggregation failed';
    return <DashboardErrorState message={message} />;
  }

  const { data, metadata, requestId, apiDurationMs, cacheHit } = result;

  if (!data.health.length && !data.kpis.totalAssets) {
    return (
      <DemoAwareEmptyState
        title="Executive command center is not populated yet"
        hint="Load Illustrative Demo Data to populate health KPIs, domains, risks, and recommended actions."
        setupHref="/demo/guided"
      />
    );
  }

  return (
    <ExecutiveDashboardClient
      payload={data}
      metadata={metadata}
      requestId={requestId}
      apiDurationMs={apiDurationMs}
      cacheHit={cacheHit}
    />
  );
}
