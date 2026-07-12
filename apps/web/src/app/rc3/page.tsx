'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { ErrorState, LoadingSkeleton, SuccessBanner } from '@/components/UiStates';

type Overview = {
  release?: { status?: string; version?: string; production_sha?: string | null };
  security?: { mfaSecretsEncryptedAtRest?: boolean; jwtSessionBinding?: boolean };
  channel?: string;
};

export default function Rc3Page() {
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => setData(await apiClient<Overview>('/rc3'));

  useEffect(() => {
    load().catch((e: Error) => setErr(e.message));
  }, []);

  const approve = async () => {
    await apiClient('/rc3/approve', {
      method: 'PUT',
      body: JSON.stringify({
        validationToken: 'RC3_EPP_VALIDATION_OK',
        security: { encryptedMfa: true, jwtSessionBind: true },
        performance: { guidance: true },
        auditSummary: { epp: true },
      }),
    });
    setMsg('RC3 approved');
    await load();
  };

  return (
    <DashboardShell>
      <h1 className="mb-2 text-2xl font-semibold">RC3 — Enterprise Pilot Program</h1>
      <p className="mb-4 text-sm text-slate-400">
        Internal EPP gate (Developer Mode). Security posture summarized without tokens or SHA strings.
      </p>
      {msg && <SuccessBanner message={msg} />}
      {err && <ErrorState message={err} onRetry={() => load().catch((e: Error) => setErr(e.message))} />}
      {!data && !err && <LoadingSkeleton rows={3} />}
      {data && (
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
            <div className="text-xs uppercase text-slate-500">Status</div>
            <div className="mt-1 font-medium">{data.release?.status || 'pending'}</div>
            <div className="text-xs text-slate-400">{data.channel}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
            <div className="text-xs uppercase text-slate-500">MFA encryption</div>
            <div className="mt-1 font-medium">{data.security?.mfaSecretsEncryptedAtRest ? 'On' : '—'}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
            <div className="text-xs uppercase text-slate-500">JWT session bind</div>
            <div className="mt-1 font-medium">{data.security?.jwtSessionBinding ? 'On' : '—'}</div>
          </div>
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="rounded bg-sky-600 px-3 py-2 text-sm text-white" onClick={() => approve().catch((e: Error) => setErr(e.message))}>
          Approve RC3
        </button>
        <Link className="rounded border border-white/20 px-3 py-2 text-sm" href="/security">
          Security
        </Link>
        <Link className="rounded border border-white/20 px-3 py-2 text-sm" href="/pilot">
          Pilot
        </Link>
        <Link className="rounded border border-white/20 px-3 py-2 text-sm" href="/banking360">
          Banking360
        </Link>
      </div>
    </DashboardShell>
  );
}
