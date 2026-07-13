'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import clsx from 'clsx';

export function PageHeader({
  title,
  purpose,
  actions,
  meta,
}: {
  title: string;
  purpose?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">{title}</h1>
        {purpose && <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">{purpose}</p>}
        {meta && <div className="mt-2 text-xs text-slate-500">{meta}</div>}
      </div>
      {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  id,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Optional id for aria-labelledby on parent section */
  id?: string;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{eyebrow}</div>
        )}
        <h2 id={id} className="text-base font-semibold tracking-tight text-slate-100">
          {title}
        </h2>
        {description && <p className="mt-0.5 max-w-2xl text-xs text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Consistent inset panel title — intelligence sub-panels */
export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-[var(--eig-border)] px-3 py-2.5">
      <div>
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        {description && <p className="text-[11px] text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** One-line narrative bridge between dashboard sections */
export function StoryBridge({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 border-l-2 border-sky-500/40 pl-3 text-xs leading-relaxed text-slate-400">{children}</p>
  );
}

export function Panel({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return <div className={clsx('eig-panel', padded && 'p-5', className)}>{children}</div>;
}

export function Glass({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return <div className={clsx('eig-glass', padded && 'p-5', className)}>{children}</div>;
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-sky-600 text-white hover:bg-sky-500 border-transparent',
  secondary: 'border-[var(--eig-border)] bg-white/[0.03] text-slate-200 hover:border-sky-500/35 hover:bg-white/[0.06]',
  ghost: 'border-transparent text-slate-300 hover:bg-white/[0.05] hover:text-white',
  danger: 'border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm',
};

export function Button({
  children,
  variant = 'secondary',
  size = 'sm',
  className,
  href,
  ...rest
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  href?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = clsx(
    'inline-flex items-center justify-center gap-1.5 rounded-[var(--eig-radius-sm)] border font-medium transition',
    buttonVariants[variant],
    buttonSizes[size],
    className,
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}

export function StatusBadge({
  status,
}: {
  status: 'healthy' | 'degraded' | 'critical' | 'unknown' | 'success' | 'warning' | 'info' | string;
}) {
  const map: Record<string, string> = {
    healthy: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    success: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    degraded: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
    warning: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
    at_risk: 'bg-red-500/15 text-red-300 ring-red-500/30',
    critical: 'bg-red-500/15 text-red-300 ring-red-500/30',
    info: 'bg-sky-500/15 text-sky-200 ring-sky-500/30',
    unknown: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
    low: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    medium: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
    high: 'bg-orange-500/15 text-orange-200 ring-orange-500/30',
  };
  const cls = map[status] || map.unknown;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${cls}`}>
      {String(status).replace(/_/g, ' ')}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  trend,
  status,
  href,
  sparkline,
  hint,
}: {
  label: string;
  value: string;
  trend?: string;
  status?: 'healthy' | 'degraded' | 'critical' | 'unknown';
  href?: string;
  sparkline?: number[];
  hint?: string;
}) {
  const statusDot =
    status === 'healthy'
      ? 'bg-emerald-400'
      : status === 'degraded'
        ? 'bg-amber-400'
        : status === 'critical'
          ? 'bg-red-400'
          : 'bg-slate-500';

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
        {status && <span className={clsx('mt-1 h-1.5 w-1.5 rounded-full', statusDot)} aria-label={status} />}
      </div>
      <div className="mt-1.5 text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">{value}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {trend && <div className="truncate text-xs text-slate-400">{trend}</div>}
          {hint && <div className="mt-0.5 truncate text-[11px] text-slate-600">{hint}</div>}
        </div>
        {sparkline && sparkline.length > 1 && <MiniSparkline values={sparkline} />}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="kpi-card block transition hover:border-sky-500/30"
        aria-label={`${label}: ${value}${trend ? `, ${trend}` : ''}`}
      >
        {body}
      </Link>
    );
  }
  return <div className="kpi-card">{body}</div>;
}

export function MiniSparkline({ values, className }: { values: number[]; className?: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 64;
  const h = 24;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 2) - 1;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} className={clsx('shrink-0 text-sky-400/80', className)} aria-hidden>
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={points} />
    </svg>
  );
}

export function DomainCard({
  title,
  summary,
  status,
  href,
  meta,
  trend,
  criticalCount,
  warningCount,
  healthLabel,
}: {
  title: string;
  summary: string;
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  href?: string;
  meta?: string;
  trend?: string;
  criticalCount?: number;
  warningCount?: number;
  healthLabel?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-slate-100">{title}</div>
        <StatusBadge status={status} />
      </div>
      {(trend || summary) && <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{trend ?? summary}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        {healthLabel && <span>Health: {healthLabel}</span>}
        {criticalCount != null && (
          <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-300">{criticalCount} critical</span>
        )}
        {warningCount != null && (
          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-200">{warningCount} warning</span>
        )}
        {meta && <span>{meta}</span>}
      </div>
    </>
  );

  if (!href || href === '#') {
    return <div className="eig-panel p-3.5 opacity-80">{body}</div>;
  }

  return (
    <Link
      href={href}
      className="eig-panel block p-3.5 transition hover:border-sky-500/30 hover:shadow-[var(--eig-shadow-hover)]"
    >
      {body}
    </Link>
  );
}

export function ActionCard({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="eig-panel flex flex-col p-4 transition hover:border-sky-500/35 hover:bg-sky-500/[0.04]"
    >
      <div className="text-sm font-medium text-slate-100">{title}</div>
      <p className="mt-1 flex-1 text-xs text-slate-400">{description}</p>
      <span className="mt-3 text-xs font-medium text-sky-400">{cta} →</span>
    </Link>
  );
}

export function EigTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-[var(--eig-border)] pb-px" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={clsx(
            'rounded-t-[var(--eig-radius-sm)] px-3 py-2 text-xs font-medium transition',
            active === tab.id
              ? 'border-b-2 border-sky-500 text-slate-100'
              : 'text-slate-500 hover:text-slate-300',
          )}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function DescriptionList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="eig-panel divide-y divide-white/5 overflow-hidden">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-4">
          <dt className="text-xs font-medium text-slate-400">{item.label}</dt>
          <dd className="text-sm text-slate-100 sm:col-span-2">{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function JsonViewer({ data, title = 'Technical details' }: { data: unknown; title?: string }) {
  return (
    <details className="eig-panel mt-4 overflow-hidden">
      <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-slate-400 hover:text-slate-200">
        {title} (Debug)
      </summary>
      <pre className="max-h-96 overflow-auto border-t border-white/5 bg-black/20 p-4 text-xs text-slate-400">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}

export function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: Array<{ key: string; label: string; render?: (row: Record<string, unknown>) => ReactNode }>;
  rows: Array<Record<string, unknown>>;
  empty?: ReactNode;
}) {
  if (!rows.length) return <>{empty}</>;
  return (
    <div className="eig-panel overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs text-slate-400">
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={String(row.id ?? i)} className="border-b border-white/5 hover:bg-white/[0.03]">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-slate-200">
                  {c.render ? c.render(row) : String(row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
