'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { bump } from '@/lib/cvp/analytics';

export function DashboardClick({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => bump('dashboardClicks')}
    >
      {children}
    </Link>
  );
}
