'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const LINKS = [
  { href: '/observability', label: 'Overview', exact: true },
  { href: '/observability/applications', label: 'Applications' },
  { href: '/observability/infrastructure', label: 'Infrastructure' },
  { href: '/observability/kubernetes', label: 'Kubernetes' },
  { href: '/observability/containers', label: 'Containers' },
  { href: '/observability/databases', label: 'Databases' },
  { href: '/observability/logs', label: 'Logs' },
  { href: '/observability/metrics', label: 'Metrics' },
  { href: '/observability/traces', label: 'Traces' },
  { href: '/observability/topology', label: 'Topology' },
];

export function ObserveSubnav() {
  const pathname = usePathname() || '';
  return (
    <nav
      aria-label="Unified Observability modules"
      className="mb-5 flex flex-wrap gap-1 border-b border-[var(--border)] pb-2"
    >
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={clsx(
              'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                : 'text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]',
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function healthTone(health: string) {
  if (health === 'critical') return 'text-red-400';
  if (health === 'degraded') return 'text-amber-400';
  if (health === 'healthy') return 'text-emerald-400';
  return 'text-slate-400';
}

export function HealthBadge({ health }: { health: string }) {
  return (
    <span className={clsx('text-xs font-semibold uppercase tracking-wide', healthTone(health))}>{health}</span>
  );
}
