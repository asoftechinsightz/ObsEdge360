'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const LABELS: Record<string, string> = {
  dashboard: 'Executive Home',
  synthetics: 'Synthetics',
  itsm: 'ITSM',
  reports: 'Executive Reports',
  marketplace: 'Marketplace',
  admin: 'Admin',
  observability: 'Observability',
  banking360: 'Banking360',
  preferences: 'Preferences',
};

export function Breadcrumbs() {
  const pathname = usePathname() || '/';
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  let href = '';
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-slate-500">
      <Link href="/dashboard" className="hover:text-slate-300">
        Home
      </Link>
      {parts.map((p) => {
        href += `/${p}`;
        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight size={12} />
            <Link href={href} className="hover:text-slate-300">
              {LABELS[p] || p}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
