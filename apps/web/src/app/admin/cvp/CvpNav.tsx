'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const LINKS = [
  { href: '/admin/cvp', label: 'Overview', exact: true },
  { href: '/admin/cvp/pilots', label: 'Pilots' },
  { href: '/admin/cvp/feedback', label: 'Feedback' },
  { href: '/admin/cvp/feature-board', label: 'Feature Board' },
  { href: '/admin/cvp/success', label: 'Customer Success' },
  { href: '/admin/cvp/analytics', label: 'Analytics' },
  { href: '/admin/cvp/releases', label: 'Releases' },
  { href: '/admin/cvp/monitoring', label: 'Monitoring' },
  { href: '/admin/cvp/knowledge', label: 'Knowledge' },
];

export function CvpNav() {
  const pathname = usePathname();
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={clsx(
              'rounded-[var(--eig-radius-sm)] px-3 py-1.5 text-xs',
              active ? 'bg-sky-700 text-white' : 'border border-slate-600 text-slate-300 hover:bg-white/5',
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
