'use client';

import { Clock, Database, Radio, Sparkles, Activity } from 'lucide-react';

export type TrustBarProps = {
  lastUpdated?: Date | string | null;
  freshness?: 'live' | 'recent' | 'stale' | 'unknown';
  dataSource?: string;
  aiConfidence?: number | null;
  coverageLabel?: string;
  integrationHealth?: 'healthy' | 'degraded' | 'unknown';
  className?: string;
};

function freshnessLabel(f: TrustBarProps['freshness']) {
  if (f === 'live') return 'Live';
  if (f === 'recent') return 'Recent';
  if (f === 'stale') return 'Stale';
  return 'Unknown';
}

function freshnessClass(f: TrustBarProps['freshness']) {
  if (f === 'live') return 'text-emerald-300';
  if (f === 'recent') return 'text-sky-300';
  if (f === 'stale') return 'text-amber-300';
  return 'text-slate-400';
}

/** Operational trust strip — APEX Workstream 5. */
export function TrustBar({
  lastUpdated,
  freshness = 'unknown',
  dataSource = 'Platform APIs',
  aiConfidence,
  coverageLabel,
  integrationHealth = 'unknown',
  className = '',
}: TrustBarProps) {
  const ts =
    lastUpdated == null
      ? '—'
      : typeof lastUpdated === 'string'
        ? new Date(lastUpdated).toLocaleString()
        : lastUpdated.toLocaleString();

  return (
    <div
      className={`mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--eig-radius-md)] border border-[var(--eig-border)] bg-black/20 px-3 py-2 text-[11px] text-slate-400 ${className}`}
      role="status"
      aria-label="Data trust indicators"
    >
      <span className="inline-flex items-center gap-1.5">
        <Clock size={12} aria-hidden />
        Updated {ts}
      </span>
      <span className={`inline-flex items-center gap-1.5 ${freshnessClass(freshness)}`}>
        <Radio size={12} aria-hidden />
        Freshness: {freshnessLabel(freshness)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Database size={12} aria-hidden />
        Source: {dataSource}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Activity size={12} aria-hidden />
        Integrations: {integrationHealth}
      </span>
      {coverageLabel && (
        <span className="inline-flex items-center gap-1.5">
          Coverage: {coverageLabel}
        </span>
      )}
      {aiConfidence != null && (
        <span className="inline-flex items-center gap-1.5 text-sky-300">
          <Sparkles size={12} aria-hidden />
          AI confidence: {Math.round(aiConfidence)}%
        </span>
      )}
    </div>
  );
}
