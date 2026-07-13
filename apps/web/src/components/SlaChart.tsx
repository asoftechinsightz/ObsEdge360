'use client';

import type { ChartWidget } from '@opsedge360/shared-types';
import { ChartWidgetsLazy } from '@/components/dashboard/widgets/ChartWidgetsLazy';

/**
 * Trend charts from widget contracts — no API fetch (Wave 2).
 */
export function ExecutiveTrendCharts({ charts, dataMode }: { charts: ChartWidget[]; dataMode?: string }) {
  return <ChartWidgetsLazy charts={charts} dataMode={dataMode} />;
}

/** @deprecated use ExecutiveTrendCharts with chart widgets */
export function SlaChart() {
  return null;
}
