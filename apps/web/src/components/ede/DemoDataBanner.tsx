'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Sparkles, Loader2 } from 'lucide-react';

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

const AUTOLOAD_KEY = 'oe360_ede_autoload_attempted';

/** Amber strip: show pack status when loaded, or a one-click load CTA when the workspace is empty. */
export function DemoDataBanner() {
  const [status, setStatus] = useState<EdeStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState(false);

  const refresh = () =>
    apiClient<EdeStatus>('/demo/ede/status')
      .then((s) => {
        setStatus(s);
        setChecked(true);
        return s;
      })
      .catch(() => {
        setStatus(null);
        setChecked(true);
        return null;
      });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await refresh();
      if (cancelled || !s || s.loaded) return;
      try {
        if (sessionStorage.getItem(AUTOLOAD_KEY) === '1') return;
        sessionStorage.setItem(AUTOLOAD_KEY, '1');
      } catch {
        /* ignore */
      }
      setBusy(true);
      try {
        const res = await apiClient<{ ok?: boolean; error?: string }>('/demo/ede/load', {
          method: 'POST',
          body: '{}',
        });
        if (res?.ok === false) {
          // Non-admin workspaces: keep calm CTA without scary auth errors
          setError('');
        } else {
          await refresh();
          window.dispatchEvent(new Event('opsedge:ede-loaded'));
        }
      } catch {
        setError('');
      } finally {
        setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadNow = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await apiClient<{ ok?: boolean; error?: string }>('/demo/ede/load', {
        method: 'POST',
        body: '{}',
      });
      if (res?.ok === false) {
        setError(res.error || 'Load failed');
        return;
      }
      await refresh();
      window.dispatchEvent(new Event('opsedge:ede-loaded'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setBusy(false);
    }
  };

  if (!checked) return null;

  if (status?.loaded) {
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
          <Link
            href="/demo/guided"
            className="rounded border border-amber-400/40 px-2.5 py-1 text-xs text-amber-50 hover:bg-amber-500/20"
          >
            15-min guided eval
          </Link>
          <Link
            href="/demo"
            className="rounded border border-amber-400/40 px-2.5 py-1 text-xs text-amber-50 hover:bg-amber-500/20"
          >
            Demo controls
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--eig-radius-md)] border border-sky-500/35 bg-sky-500/10 px-4 py-2.5 text-sm text-sky-50"
      role="status"
    >
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden />
        <div>
          <div className="font-medium">Workspace has no illustrative demo estate yet</div>
          <div className="text-xs text-sky-100/80">
            Load the Enterprise Demo pack (services, apps, servers, incidents) so Discovery, CMDB, Twin, and Executive Home
            populate — or open the dedicated Global Bank demo from Sign in.
          </div>
          {error ? <div className="mt-1 text-xs text-rose-300">{error}</div> : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={loadNow}
          className="inline-flex items-center gap-1.5 rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          {busy ? 'Loading pack…' : 'Load illustrative demo data'}
        </button>
        <Link
          href="/login?demo=1"
          className="rounded border border-sky-400/40 px-2.5 py-1.5 text-xs text-sky-50 hover:bg-sky-500/20"
        >
          Open Global Bank demo
        </Link>
      </div>
    </div>
  );
}
