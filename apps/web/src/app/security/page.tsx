'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { EmptyState, ErrorState, LoadingSkeleton, SuccessBanner } from '@/components/UiStates';

export default function SecurityCenterPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [factorId, setFactorId] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [backup, setBackup] = useState<string[]>([]);

  const load = async () => {
    setData(await apiClient<Record<string, unknown>>('/security/dashboard'));
  };

  useEffect(() => {
    load().catch((e: Error) => setErr(e.message));
  }, []);

  const enroll = async () => {
    const r = await apiClient<{ factor: { id: string }; secret: string }>('/me/mfa/enroll-totp', {
      method: 'POST',
      body: '{}',
    });
    setFactorId(r.factor.id);
    setSecret(r.secret);
    setMsg('TOTP enrolled — enter authenticator code to verify');
  };

  const verify = async () => {
    const r = await apiClient<{ backupCodes?: string[] }>('/me/mfa/verify-totp', {
      method: 'POST',
      body: JSON.stringify({ factorId, code }),
    });
    setBackup(r.backupCodes || []);
    setMsg('MFA verified');
    await load();
  };

  const revokeAll = async () => {
    await apiClient('/security/sessions/revoke-all', { method: 'POST', body: '{}' });
    setMsg('All sessions revoked');
    await load();
  };

  return (
    <DashboardShell>
      <h1 className="mb-2 text-2xl font-semibold">Security Center</h1>
      <p className="mb-4 text-sm text-slate-400">MFA, sessions, login history, and security alerts — OpsEdge360 RC2.</p>
      {msg && <SuccessBanner message={msg} />}
      {err && <ErrorState message={err} onRetry={() => load().catch((e: Error) => setErr(e.message))} />}
      {!data && !err && <LoadingSkeleton rows={5} />}
      {data && (
        <pre className="mb-4 overflow-auto rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="rounded bg-sky-600 px-3 py-2 text-sm text-white" onClick={() => enroll().catch((e: Error) => setErr(e.message))}>
          Enroll TOTP
        </button>
        <button type="button" className="rounded bg-amber-700 px-3 py-2 text-sm text-white" onClick={() => revokeAll().catch((e: Error) => setErr(e.message))}>
          Revoke all sessions
        </button>
      </div>
      {secret && <p className="mb-2 text-xs text-slate-400">Secret: <code>{secret}</code></p>}
      <div className="mb-4 flex gap-2">
        <input className="rounded border border-white/10 bg-slate-900 px-3 py-2 text-sm" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
        <button type="button" className="rounded bg-emerald-700 px-3 py-2 text-sm text-white" onClick={() => verify().catch((e: Error) => setErr(e.message))}>
          Verify TOTP
        </button>
      </div>
      {backup.length > 0 ? (
        <pre className="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4 text-xs">{JSON.stringify(backup, null, 2)}</pre>
      ) : (
        <EmptyState title="No backup codes shown" hint="Backup codes appear once after successful MFA verification." />
      )}
    </DashboardShell>
  );
}
