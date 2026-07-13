'use client';

import dynamic from 'next/dynamic';
import type { ChartWidget } from '@opsedge360/shared-types';
import { LoadingSkeleton } from '@/components/UiStates';

const ChartWidgetsInner = dynamic(
  () => import('./ChartWidgets').then((m) => m.ChartWidgets),
  {
    loading: () => (
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="eig-panel p-4">
          <LoadingSkeleton rows={4} />
        </div>
        <div className="eig-panel p-4">
          <LoadingSkeleton rows={4} />
        </div>
      </div>
    ),
    ssr: false,
  },
);

export function ChartWidgetsLazy({ charts, dataMode }: { charts: ChartWidget[]; dataMode?: string }) {
  if (!charts.length) return null;
  return <ChartWidgetsInner charts={charts} dataMode={dataMode} />;
}
