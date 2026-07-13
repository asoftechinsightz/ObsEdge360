'use client';

import type { ReactNode } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { ObserveSubnav } from './ObserveSubnav';

export function ObservePageFrame({ children }: { children: ReactNode }) {
  return (
    <DashboardShell>
      <ObserveSubnav />
      {children}
    </DashboardShell>
  );
}
