'use client';

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded-lg bg-white/5" />
      ))}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/40 px-6 py-10 text-center">
      <div className="text-sm font-medium text-slate-200">{title}</div>
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      <div>{message}</div>
      {onRetry && (
        <button type="button" className="mt-2 text-xs underline" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
