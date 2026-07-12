'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { EmptyState, ErrorState, LoadingSkeleton, SuccessBanner } from '@/components/UiStates';

type Dash = {
  mfaPolicy?: { mode?: string; grace_days?: number };
  openAlerts?: { id: string; severity: string; title: string; status: string; created_at: string }[];
  recentLogins?: { id: string; email: string; event: string; success: boolean; risk_score: number; created_at: string }[];
  counts?: { activeSessions?: number; activeApiTokens?: number; activeMfaFactors?: number };
  riskBasedAuth?: { framework?: boolean; note?: string };
};

type Session = {
  id: string;
  user_id: string;
  device_label: string | null;
  last_seen_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

type Rotation = {
  passwordChangedAt: string | null;
  mustRotate: boolean;
  maxAgeDays: number;
};

function SecurityCenterInner() {
  const search = useSearchParams();
  const [data, setData] = useState<Dash | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [rotation, setRotation] = useState<Rotation | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [factorId, setFactorId] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [backup, setBackup] = useState<string[]>([]);
  const [mfaStatus, setMfaStatus] = useState<Record<string, unknown> | null>(null);

  const load = async () => {
    const [dash, sess, rot, status] = await Promise.all([
      apiClient<Dash>('/security/dashboard'),
      apiClient<{ sessions: Session[] }>('/security/sessions').catch(() => ({ sessions: [] })),
      apiClient<Rotation>('/me/password/rotation').catch(() => null),
      apiClient<Record<string, unknown>>('/me/mfa/status').catch(() => null),
    ]);
    setData(dash);
    setSessions(sess.sessions || []);
    setRotation(rot);
    setMfaStatus(status);
  };

  useEffect(() => {
    load().catch((e: Error) => setErr(e.message));
    if (search.get('enroll') === '1') setMsg('Organization requires MFA — enroll an authenticator below.');
    if (search.get('rotate') === '1') setMsg('Password rotation is due — update your password per org policy.');
  }, [search]);

  const enroll = async () => {
    const r = await apiClient<{ factor: { id: string }; secret: string }>('/me/mfa/enroll-totp', {
      method: 'POST',
      body: '{}',
    });
    setFactorId(r.factor.id);
    setSecret(r.secret);
    setMsg('TOTP enrolled — scan the secret in your authenticator, then verify with a 6-digit code.');
  };

  const verify = async () => {
    const r = await apiClient<{ backupCodes?: string[] }>('/me/mfa/verify-totp', {
      method: 'POST',
      body: JSON.stringify({ factorId, code }),
    });
    setBackup(r.backupCodes || []);
    setMsg('MFA verified — store backup codes securely.');
    setSecret('');
    await load();
  };

  const revokeAll = async () => {
    await apiClient('/security/sessions/revoke-all', { method: 'POST', body: '{}' });
    setMsg('All sessions revoked (tokens expire at JWT TTL — residual risk documented).');
    await load();
  };

  const revokeOne = async (id: string) => {
    await apiClient(`/security/sessions/${id}/revoke`, { method: 'POST', body: '{}' });
    setMsg('Session revoked');
    await load();
  };

  const markRotated = async () => {
    await apiClient('/me/password/rotated', { method: 'POST', body: '{}' });
    setMsg('Password rotation marked complete');
    await load();
  };

  return (
    <DashboardShell>
      <h1 className="mb-2 text-2xl font-semibold">Security Center</h1>
      <p className="mb-4 text-sm text-slate-400">
        MFA, sessions, login history, and alerts — OpsEdge360 RC2 enterprise posture.
      </p>
      {msg && <SuccessBanner message={msg} />}
      {err && <ErrorState message={err} onRetry={() => load().catch((e: Error) => setErr(e.message))} />}
      {!data && !err && <LoadingSkeleton rows={5} />}

      {data && (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
            <div className="text-xs uppercase text-slate-500">MFA policy</div>
            <div className="mt-1 text-lg font-medium">{data.mfaPolicy?.mode || 'optional'}</div>
            <div className="text-xs text-slate-400">Grace {data.mfaPolicy?.grace_days ?? 14} days</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
            <div className="text-xs uppercase text-slate-500">Active sessions</div>
            <div className="mt-1 text-lg font-medium">{data.counts?.activeSessions ?? 0}</div>
            <div className="text-xs text-slate-400">{data.counts?.activeMfaFactors ?? 0} MFA factors</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
            <div className="text-xs uppercase text-slate-500">API tokens</div>
            <div className="mt-1 text-lg font-medium">{data.counts?.activeApiTokens ?? 0}</div>
            <div className="text-xs text-slate-400">Rotate via admin tokens UI</div>
          </div>
        </div>
      )}

      <section className="mb-8 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-100">MFA enrollment</h2>
        {mfaStatus && (
          <p className="mb-3 text-xs text-slate-400">
            Compliant: {String((mfaStatus as { compliant?: boolean }).compliant ?? '—')} · Enforced:{' '}
            {String((mfaStatus as { enforced?: boolean }).enforced ?? false)}
          </p>
        )}
        <div className="mb-3 flex flex-wrap gap-2">
          <button type="button" className="rounded bg-sky-600 px-3 py-2 text-sm text-white" onClick={() => enroll().catch((e: Error) => setErr(e.message))}>
            Enroll TOTP
          </button>
          <button type="button" className="rounded bg-amber-700 px-3 py-2 text-sm text-white" onClick={() => revokeAll().catch((e: Error) => setErr(e.message))}>
            Revoke all sessions
          </button>
          {rotation?.mustRotate && (
            <button type="button" className="rounded border border-amber-500/40 px-3 py-2 text-sm text-amber-100" onClick={() => markRotated().catch((e: Error) => setErr(e.message))}>
              Mark password rotated
            </button>
          )}
        </div>
        {secret && (
          <p className="mb-2 break-all text-xs text-slate-400">
            Secret: <code className="text-slate-200">{secret}</code>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded border border-white/10 bg-slate-900 px-3 py-2 text-sm"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="button" className="rounded bg-emerald-700 px-3 py-2 text-sm text-white" onClick={() => verify().catch((e: Error) => setErr(e.message))}>
            Verify TOTP
          </button>
        </div>
        {backup.length > 0 ? (
          <pre className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4 text-xs">{JSON.stringify(backup, null, 2)}</pre>
        ) : (
          <div className="mt-3">
            <EmptyState title="No backup codes shown" hint="Backup codes appear once after successful MFA verification." />
          </div>
        )}
        {rotation && (
          <p className="mt-3 text-xs text-slate-500">
            Password changed: {rotation.passwordChangedAt || 'never'} · Must rotate: {String(rotation.mustRotate)} · Max age{' '}
            {rotation.maxAgeDays}d
          </p>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold text-slate-100">Sessions</h2>
        {!sessions.length ? (
          <EmptyState title="No sessions" hint="Sessions appear after successful login." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400">
                <tr>
                  <th className="px-3 py-2">Device</th>
                  <th className="px-3 py-2">Last seen</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 20).map((s) => (
                  <tr key={s.id} className="border-t border-white/5">
                    <td className="px-3 py-2">{s.device_label || 'web'}</td>
                    <td className="px-3 py-2">{s.last_seen_at ? new Date(s.last_seen_at).toLocaleString() : '—'}</td>
                    <td className="px-3 py-2">{s.revoked_at ? 'revoked' : 'active'}</td>
                    <td className="px-3 py-2 text-right">
                      {!s.revoked_at && (
                        <button type="button" className="text-amber-300 underline" onClick={() => revokeOne(s.id).catch((e: Error) => setErr(e.message))}>
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold text-slate-100">Recent login events</h2>
        {!data?.recentLogins?.length ? (
          <EmptyState title="No login history yet" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Risk</th>
                </tr>
              </thead>
              <tbody>
                {data.recentLogins.slice(0, 25).map((e) => (
                  <tr key={e.id} className="border-t border-white/5">
                    <td className="px-3 py-2">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2">{e.email}</td>
                    <td className="px-3 py-2">
                      {e.event}
                      {!e.success ? ' (fail)' : ''}
                    </td>
                    <td className="px-3 py-2">{e.risk_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-100">Open security alerts</h2>
        {!data?.openAlerts?.length ? (
          <EmptyState title="No open alerts" hint="Alerts can be created via POST /security/alerts." />
        ) : (
          <ul className="space-y-2">
            {data.openAlerts.map((a) => (
              <li key={a.id} className="rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2 text-sm">
                <span className="mr-2 text-xs uppercase text-slate-500">{a.severity}</span>
                {a.title}
              </li>
            ))}
          </ul>
        )}
        {data?.riskBasedAuth?.note && (
          <p className="mt-3 text-xs text-slate-500">{data.riskBasedAuth.note}</p>
        )}
      </section>
    </DashboardShell>
  );
}

export default function SecurityCenterPage() {
  return (
    <Suspense fallback={<DashboardShell><LoadingSkeleton rows={5} /></DashboardShell>}>
      <SecurityCenterInner />
    </Suspense>
  );
}
