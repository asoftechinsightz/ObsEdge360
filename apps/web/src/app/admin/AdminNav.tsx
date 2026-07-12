'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const GROUPS: { title: string; links: { href: string; label: string; exact?: boolean }[] }[] = [
  {
    title: 'Platform',
    links: [
      { href: '/admin', label: 'Dashboard', exact: true },
      { href: '/admin/platform', label: 'Overview' },
      { href: '/admin/capacity', label: 'Capacity' },
      { href: '/admin/storage', label: 'Storage' },
      { href: '/admin/quotas', label: 'Quotas' },
      { href: '/admin/licenses', label: 'Licenses' },
      { href: '/admin/settings', label: 'Settings' },
      { href: '/admin/tenants', label: 'Tenants' },
    ],
  },
  {
    title: 'Security',
    links: [
      { href: '/admin/security-policies', label: 'Policies' },
      { href: '/admin/sessions', label: 'Sessions' },
      { href: '/admin/password-policies', label: 'Passwords' },
      { href: '/admin/system/security', label: 'System Security' },
      { href: '/admin/audit', label: 'Audit' },
      { href: '/admin/secret-validation', label: 'Secrets' },
    ],
  },
  {
    title: 'Reliability',
    links: [
      { href: '/admin/ops-health', label: 'Ops Health' },
      { href: '/admin/health', label: 'Health' },
      { href: '/admin/ha', label: 'HA' },
      { href: '/admin/cluster', label: 'Cluster' },
      { href: '/admin/nodes', label: 'Nodes' },
      { href: '/admin/replication', label: 'Replication' },
      { href: '/admin/failover', label: 'Failover' },
      { href: '/admin/backup', label: 'Backup' },
      { href: '/admin/restore', label: 'Restore' },
      { href: '/admin/deployment', label: 'Deployment' },
    ],
  },
  {
    title: 'ITSM',
    links: [
      { href: '/itsm', label: 'ITSM Center' },
      { href: '/admin/runbooks', label: 'Runbooks' },
      { href: '/admin/approvals', label: 'Approvals' },
    ],
  },
  {
    title: 'Automation',
    links: [
      { href: '/admin/automation-dashboard', label: 'Dashboard' },
      { href: '/admin/workflows', label: 'Workflows' },
      { href: '/admin/runbooks', label: 'Runbooks' },
      { href: '/admin/approvals', label: 'Approvals' },
      { href: '/admin/emergency-stop', label: 'E-Stop' },
    ],
  },
  {
    title: 'Integrations',
    links: [
      { href: '/admin/integrations', label: 'Hub' },
      { href: '/admin/connector-catalog', label: 'Catalog' },
      { href: '/admin/notification-channels', label: 'Notifications' },
      { href: '/admin/identity-providers', label: 'IdP' },
    ],
  },
  {
    title: 'Release',
    links: [
      { href: '/admin/system/certification', label: 'Certification' },
      { href: '/admin/system/release-candidate', label: 'RC' },
      { href: '/admin/system/ga', label: 'GA' },
      { href: '/admin/governance', label: 'Governance' },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="mb-6 space-y-3 border-b border-slate-700 pb-4">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{g.title}</div>
          <div className="flex flex-wrap gap-1.5">
            {g.links.map((l) => {
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
        </div>
      ))}
    </div>
  );
}
