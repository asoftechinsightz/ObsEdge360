'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Sparkles } from 'lucide-react';

type EdeStatus = {
  loaded?: boolean;
  label?: string;
  organizationName?: string;
  inventory?: {
    businessServices?: number;
    applications?: number;
    servers?: number;
  } | null;
};

/** Amber strip when Enterprise Demo pack is loaded — never confuse with live production telemetry. */
export function DemoDataBanner() {
  const [status, setStatus] = useState<EdeStatus | null>(null);

  useEffect(() => {
    apiClient<EdeStatus>('/demo/ede/status')
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!status?.loaded) return null;

  const inv = status.inventory;
  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--eig-radius-md)] border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-50"
      role="status"
    >
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
        <div>
          <div className="font-medium">{status.label ?? 'Illustrative Demo Data'}</div>
          <div className="text-xs text-amber-100/80">
            {status.organizationName ?? 'Enterprise demo estate'}
            {inv
              ? ` · ${inv.businessServices ?? 0} services · ${inv.applications ?? 0} apps · ${inv.servers ?? 0} servers`
              : null}
            {' — '}not live customer telemetry.
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/demo/guided" className="rounded border border-amber-400/40 px-2.5 py-1 text-xs text-amber-50 hover:bg-amber-500/20">
          15-min guided eval
        </Link>
        <Link href="/demo" className="rounded border border-amber-400/40 px-2.5 py-1 text-xs text-amber-50 hover:bg-amber-500/20">
          Reset demo
        </Link>
      </div>
    </div>
  );
}
