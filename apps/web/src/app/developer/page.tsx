'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader, StatusBadge } from '@/components/eig/primitives';
import { isDebugMode, setDebugMode } from '@/lib/debug-mode';
import { INTERNAL_NAV } from '@/lib/nav-config';

export default function DeveloperModePage() {
  const [debug, setDebug] = useState(false);
  const [vitals, setVitals] = useState<Record<string, unknown>>({});

  useEffect(() => {
    setDebug(isDebugMode());
    try {
      setVitals(JSON.parse(sessionStorage.getItem('oe360_vitals') || '{}'));
    } catch {
      setVitals({});
    }
  }, []);

  return (
    <DashboardShell>
      <PageHeader
        title="Developer Mode"
        purpose="Technical surfaces, release readiness, and diagnostics. Not for boardroom demos — enable Debug Mode to pin Internal nav."
        actions={
          <button
            type="button"
            className="rounded-[var(--eig-radius-sm)] bg-sky-600 px-4 py-2 text-sm text-white"
            onClick={() => {
              const next = !debug;
              setDebugMode(next);
              setDebug(next);
            }}
          >
            {debug ? 'Disable Debug Mode' : 'Enable Debug Mode'}
          </button>
        }
        meta={
          <span className="inline-flex items-center gap-2">
            Status: <StatusBadge status={debug ? 'success' : 'unknown'} /> {debug ? 'Debug on' : 'Standard UI'}
          </span>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTERNAL_NAV.map((item) => (
          <Link key={item.href} href={item.href} className="eig-glass p-4">
            <div className="font-medium text-slate-100">{item.label}</div>
            <div className="mt-1 text-xs text-slate-500">{item.href}</div>
          </Link>
        ))}
        <Link href="/admin/system/release-candidate" className="eig-glass p-4">
          <div className="font-medium text-slate-100">Admin Release Candidate</div>
          <div className="mt-1 text-xs text-slate-500">/admin/system/release-candidate</div>
        </Link>
      </div>

      <h2 className="mb-2 text-sm font-semibold text-slate-200">Session Web Vitals (local)</h2>
      <div className="eig-panel grid gap-3 p-4 sm:grid-cols-3">
        {['LCP', 'INP', 'CLS'].map((k) => {
          const row = vitals[k] as { value?: number } | undefined;
          return (
            <div key={k}>
              <div className="text-xs text-slate-500">{k}</div>
              <div className="text-lg font-semibold text-slate-100">{row?.value != null ? row.value : '—'}</div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Raw JSON payloads belong behind Debug details on business pages — never in the primary executive experience.
      </p>
    </DashboardShell>
  );
}
