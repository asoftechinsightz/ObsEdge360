'use client';

import Link from 'next/link';
import { LoadingSkeleton } from '@/components/UiStates';

export function DashboardLoadingState() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading executive dashboard">
      <LoadingSkeleton rows={2} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="eig-shimmer kpi-card h-24 animate-pulse" />
        ))}
      </div>
      <LoadingSkeleton rows={5} />
    </div>
  );
}

export function DashboardErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="eig-panel border-red-500/30 bg-red-500/10 p-6 text-center">
      <h2 className="text-sm font-semibold text-red-100">Executive dashboard unavailable</h2>
      <p className="mt-2 text-xs text-red-200/80">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-[var(--eig-radius-sm)] bg-red-600/80 px-3 py-1.5 text-xs text-white hover:bg-red-500"
        >
          Retry
        </button>
      )}
      <Link href="/demo/guided" className="mt-3 block text-xs text-sky-400 hover:underline">
        Load guided evaluation data →
      </Link>
    </div>
  );
}

export function DashboardEmptyState() {
  return (
    <div className="eig-panel border-dashed p-8 text-center">
      <h2 className="text-sm font-semibold text-slate-200">No executive data yet</h2>
      <p className="mt-2 text-xs text-slate-500">Load Illustrative Demo Data to populate the command center.</p>
      <Link
        href="/demo/guided"
        className="mt-4 inline-block rounded-[var(--eig-radius-sm)] bg-sky-600 px-3 py-1.5 text-xs text-white hover:bg-sky-500"
      >
        15-min guided eval
      </Link>
    </div>
  );
}

export function DashboardCachedBadge({ cacheHit }: { cacheHit?: boolean }) {
  if (!cacheHit) return null;
  return (
    <span className="rounded border border-slate-600/50 px-1.5 py-0.5 text-[10px] text-slate-500" title="Served from dashboard cache">
      Cached
    </span>
  );
}
