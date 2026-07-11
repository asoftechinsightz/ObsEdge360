'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const LINKS = [
  { href: '/admin', label: 'Platform Dashboard', exact: true },
  { href: '/admin/tenants', label: 'Tenant Management' },
  { href: '/admin/licenses', label: 'License Management' },
  { href: '/admin/health', label: 'System Health' },
  { href: '/admin/cluster', label: 'Cluster Health' },
  { href: '/admin/backup', label: 'Backup' },
  { href: '/admin/restore', label: 'Restore' },
  { href: '/admin/upgrade', label: 'Upgrade' },
  { href: '/admin/audit', label: 'Audit' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/integrations', label: 'Integrations' },
  { href: '/admin/automation', label: 'Automation Policies' },
  { href: '/admin/runbooks', label: 'Runbook Manager' },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-700 pb-3">
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={clsx(
              'rounded-md px-2.5 py-1 text-xs',
              active ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
