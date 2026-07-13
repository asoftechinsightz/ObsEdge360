'use client';

import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { AUTH_COOKIE } from '@/lib/auth';
import { useEffect, useState } from 'react';

function readTenantLabel(): string {
  if (typeof document === 'undefined') return 'Organization';
  const match = document.cookie.match(new RegExp(`(?:^|; )${AUTH_COOKIE}=([^;]*)`));
  if (!match) return 'Organization';
  try {
    const token = decodeURIComponent(match[1]);
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.tenantName ?? payload.orgName ?? payload.tenantId ?? 'Organization';
  } catch {
    return 'Organization';
  }
}

/** Displays current tenant context. Multi-org switching requires backend support — link to preferences. */
export function OrgContextBadge() {
  const [label, setLabel] = useState('Organization');

  useEffect(() => {
    setLabel(readTenantLabel());
  }, []);

  return (
    <Link
      href="/preferences"
      className="hidden max-w-[160px] items-center gap-1.5 truncate rounded-[var(--eig-radius-sm)] border border-[var(--eig-border)] px-2.5 py-1.5 text-xs text-slate-400 transition hover:border-sky-500/30 hover:text-slate-200 md:inline-flex"
      title="Organization context"
    >
      <Building2 size={13} className="shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}
