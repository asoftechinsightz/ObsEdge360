'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const LINKS = [
  { href: '/admin', label: 'Platform Dashboard', exact: true },
  { href: '/admin/platform', label: 'Platform Overview' },
  { href: '/admin/capacity', label: 'Capacity Dashboard' },
  { href: '/admin/storage', label: 'Storage Dashboard' },
  { href: '/admin/quotas', label: 'Quota Management' },
  { href: '/admin/security-policies', label: 'Security Policies' },
  { href: '/admin/sessions', label: 'Session Management' },
  { href: '/admin/password-policies', label: 'Password Policies' },
  { href: '/admin/licenses', label: 'License Center' },
  { href: '/admin/settings', label: 'Platform Settings' },
  { href: '/admin/governance', label: 'Governance Reports' },
  { href: '/admin/tenants', label: 'Tenant Management' },
  { href: '/admin/health', label: 'System Health' },
  { href: '/admin/cluster', label: 'Cluster Health' },
  { href: '/admin/ha', label: 'HA Overview' },
  { href: '/admin/nodes', label: 'Cluster Nodes' },
  { href: '/admin/replication', label: 'Replication Status' },
  { href: '/admin/failover', label: 'Failover Events' },
  { href: '/admin/backup', label: 'Backup' },
  { href: '/admin/backup-verify', label: 'Backup Verification' },
  { href: '/admin/restore', label: 'Restore' },
  { href: '/admin/upgrade', label: 'Upgrade' },
  { href: '/admin/upgrade-status', label: 'Upgrade Status' },
  { href: '/admin/audit', label: 'Audit' },
  { href: '/admin/integrations', label: 'Integrations' },
  { href: '/admin/automation-dashboard', label: 'Automation Dashboard' },
  { href: '/admin/workflows', label: 'Workflow Designer' },
  { href: '/admin/runbooks', label: 'Runbook Library' },
  { href: '/admin/policy-manager', label: 'Policy Manager' },
  { href: '/admin/approvals', label: 'Approval Queue' },
  { href: '/admin/executions', label: 'Execution History' },
  { href: '/admin/simulations', label: 'Simulation Results' },
  { href: '/admin/emergency-stop', label: 'Emergency Stop' },
  { href: '/admin/automation-history', label: 'Automation History' },
  { href: '/admin/automation', label: 'Automation Policies (legacy)' },
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
