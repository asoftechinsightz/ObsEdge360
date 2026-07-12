'use client';

import { DashboardShell } from '@/components/DashboardShell';
import { AdminNav } from './AdminNav';

export function AdminShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <DashboardShell>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-slate-400">
          {subtitle ?? 'Enterprise Administration Center — OpsEdge360 v1.0.0'}
        </p>
      </div>
      <AdminNav />
      {children}
    </DashboardShell>
  );
}
