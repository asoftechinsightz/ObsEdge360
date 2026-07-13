'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { EmptyState, ErrorState, LoadingSkeleton, SuccessBanner } from '@/components/UiStates';
import { TrustBar } from '@/components/apex/TrustBar';
import { InlineAiAssist } from '@/components/apex/InlineAiAssist';
import { ExecutiveNarrative } from '@/components/apex/ExecutiveNarrative';
import { PageHeader } from '@/components/eig/primitives';

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

type Finding = {
  id: string;
  title: string;
  severity?: string;
  status?: string;
  source?: string;
  subtitle?: string;
  href?: string;
  mitre?: { tactic: string; technique: string; id: string };
  evidence?: string[];
  relatedAssets?: string[];
  timeline?: string;
};

function mapMitre(source: string, title: string): { tactic: string; technique: string; id: string } {
  const s = `${source} ${title}`.toLowerCase();
  if (s.includes('fraud') || s.includes('payment')) {
    return { tactic: 'Impact', technique: 'Resource Hijacking / Fraud', id: 'T1496' };
  }
  if (s.includes('anomaly') || s.includes('lateral')) {
    return { tactic: 'Discovery', technique: 'Network Service Discovery', id: 'T1046' };
  }
  if (s.includes('siem') || s.includes('auth') || s.includes('login') || s.includes('mfa')) {
    return { tactic: 'Credential Access', technique: 'Brute Force', id: 'T1110' };
  }
  if (s.includes('exfil') || s.includes('data')) {
    return { tactic: 'Exfiltration', technique: 'Exfiltration Over Web Service', id: 'T1567' };
  }
  return { tactic: 'Initial Access', technique: 'Exploit Public-Facing Application', id: 'T1190' };
}

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
  const [findings, setFindings] = useState<Finding[]>([]);
  const [posture, setPosture] = useState<Record<string, unknown> | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  const load = async () => {
    const [dash, sess, rot, status, postureRes, fraudRes, anomaliesRes, siemRes] = await Promise.all([
      apiClient<Dash>('/security/dashboard'),
      apiClient<{ sessions: Session[] }>('/security/sessions').catch(() => ({ sessions: [] })),
      apiClient<Rotation>('/me/password/rotation').catch(() => null),
      apiClient<Record<string, unknown>>('/me/mfa/status').catch(() => null),
      apiClient<Record<string, unknown>>('/security/posture').catch(() => null),
      apiClient<{ alerts?: Array<Record<string, unknown>>; items?: Array<Record<string, unknown>> }>('/security/fraud').catch(() => null),
      apiClient<{ anomalies?: Array<Record<string, unknown>>; items?: Array<Record<string, unknown>> }>('/security/anomalies').catch(() => null),
      apiClient<{ events?: Array<Record<string, unknown>>; items?: Array<Record<string, unknown>> }>('/security/siem/events').catch(() => null),
    ]);
    setData(dash);
    setSessions(sess.sessions || []);
    setRotation(rot);
    setMfaStatus(status);
    setPosture(postureRes);

    const next: Finding[] = [];
    const fraudItems = fraudRes?.alerts ?? fraudRes?.items ?? [];
    for (const f of fraudItems.slice(0, 8)) {
      const title = String(f.title ?? f.alertType ?? 'Fraud alert');
      const source = 'Fraud';
      next.push({
        id: String(f.id ?? `fraud-${next.length}`),
        title,
        severity: String(f.severity ?? 'medium'),
        status: String(f.status ?? 'open'),
        source,
        subtitle: String(f.description ?? ''),
        href: `/ops-intelligence?workflow=create-incident&source=fraud&id=${encodeURIComponent(String(f.id ?? ''))}`,
        mitre: mapMitre(source, title),
        evidence: [String(f.description ?? title), `reasonCodes: ${JSON.stringify(f.reasonCodes ?? [])}`],
        relatedAssets: f.ciId ? [String(f.ciId)] : ['Payment services'],
        timeline: String(f.detectedAt ?? f.created_at ?? new Date().toISOString()),
      });
    }
    const anomalies = anomaliesRes?.anomalies ?? anomaliesRes?.items ?? [];
    for (const a of anomalies.slice(0, 8)) {
      const title = String(a.anomalyType ?? a.title ?? 'Anomaly');
      const source = 'Anomaly';
      next.push({
        id: String(a.id ?? `anom-${next.length}`),
        title,
        severity: String(a.severity ?? 'medium'),
        status: String(a.status ?? 'open'),
        source,
        subtitle: a.ciId ? `Asset ${String(a.ciId)}` : undefined,
        href: `/ops-intelligence?workflow=create-incident&source=anomaly&id=${encodeURIComponent(String(a.id ?? ''))}`,
        mitre: mapMitre(source, title),
        evidence: [
          `metric=${String(a.metricName ?? a.metric_name ?? 'n/a')}`,
          `observed=${String(a.observedValue ?? a.observed_value ?? 'n/a')}`,
          `baseline=${String(a.baselineValue ?? a.baseline_value ?? 'n/a')}`,
        ],
        relatedAssets: a.ciId ? [String(a.ciId)] : ['Infrastructure'],
        timeline: String(a.detectedAt ?? a.detected_at ?? new Date().toISOString()),
      });
    }
    const events = siemRes?.events ?? siemRes?.items ?? [];
    for (const e of events.slice(0, 8)) {
      const title = String(e.title ?? e.eventType ?? 'SIEM event');
      const source = String(e.source ?? 'SIEM');
      next.push({
        id: String(e.id ?? `siem-${next.length}`),
        title,
        severity: String(e.severity ?? 'info'),
        status: String(e.status ?? 'open'),
        source,
        href: `/ops-intelligence?workflow=create-incident&source=siem&id=${encodeURIComponent(String(e.id ?? ''))}`,
        mitre: mapMitre(source, title),
        evidence: [JSON.stringify(e).slice(0, 280)],
        relatedAssets: ['Identity plane', 'SIEM correlation'],
        timeline: String(e.receivedAt ?? e.created_at ?? new Date().toISOString()),
      });
    }
    for (const a of dash.openAlerts ?? []) {
      next.push({
        id: a.id,
        title: a.title,
        severity: a.severity,
        status: a.status,
        source: 'Identity alert',
        href: `/ops-intelligence?workflow=create-incident&source=alert&id=${encodeURIComponent(a.id)}`,
        mitre: mapMitre('Identity alert', a.title),
        evidence: [`alert=${a.title}`, `created=${a.created_at}`],
        relatedAssets: ['User sessions', 'MFA factors'],
        timeline: a.created_at,
      });
    }
    setFindings(next);
    if (next[0]) setSelectedFinding(next[0]);
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
      <PageHeader
        title="Security Operations"
        purpose="Findings, posture, evidence, affected assets, and identity controls — investigate and remediate from one workspace."
      />
      <TrustBar
        lastUpdated={new Date()}
        freshness={data ? 'live' : 'unknown'}
        dataSource="Security posture · fraud · anomalies · SIEM · identity"
        coverageLabel={`${findings.length} findings · ${data?.counts?.activeMfaFactors ?? 0} MFA · ${data?.counts?.activeSessions ?? 0} sessions`}
        integrationHealth={data ? 'healthy' : 'unknown'}
      />
      {posture && (
        <div className="mb-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-500">Security posture</div>
          <pre className="mt-2 max-h-40 overflow-auto text-xs text-slate-300">{JSON.stringify(posture, null, 2)}</pre>
        </div>
      )}
      <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-100">Findings</h2>
          <a href="/ops-intelligence?workflow=create-incident" className="text-xs text-sky-400 hover:underline">
            Open incident queue →
          </a>
        </div>
        {findings.length === 0 ? (
          <p className="text-xs text-slate-500">No open findings from posture, fraud, anomalies, or SIEM for this tenant.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <ul className="space-y-2">
              {findings.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedFinding(f)}
                    className={`flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left ${
                      selectedFinding?.id === f.id ? 'border-sky-500/40 bg-sky-500/10' : 'border-white/5 bg-black/20'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-100">{f.title}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {f.source}
                        {f.severity ? ` · ${f.severity}` : ''}
                        {f.mitre ? ` · ${f.mitre.id}` : ''}
                      </div>
                    </div>
                    {f.href && (
                      <a
                        href={f.href}
                        className="shrink-0 text-xs text-sky-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Investigate →
                      </a>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            {selectedFinding && (
              <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                <div>
                  <div className="text-[10px] uppercase text-slate-500">MITRE ATT&CK</div>
                  <div className="mt-1 font-medium text-slate-100">
                    {selectedFinding.mitre?.id} · {selectedFinding.mitre?.tactic} / {selectedFinding.mitre?.technique}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-500">Evidence</div>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {(selectedFinding.evidence ?? []).map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-500">Threat timeline</div>
                  <div className="mt-1">{selectedFinding.timeline ?? '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-500">Related assets</div>
                  <div className="mt-1">{(selectedFinding.relatedAssets ?? []).join(' · ') || '—'}</div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a className="text-sky-400 hover:underline" href={selectedFinding.href ?? '/ops-intelligence'}>
                    Remediate via incident →
                  </a>
                  <a className="text-sky-400 hover:underline" href="/admin/workflows?workflow=run">
                    Run automation →
                  </a>
                  <a className="text-sky-400 hover:underline" href="/twin?workflow=impact">
                    Twin impact →
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
      {data && (
        <ExecutiveNarrative
          happening={`${findings.length} security finding(s) · MFA policy ${data.mfaPolicy?.mode || 'optional'}`}
          whyItMatters="SOC and CISO workflows require findings, evidence, and remediation — not identity alone."
          affectedService="Security operations plane"
          impact={`${data.counts?.activeSessions ?? 0} active sessions · ${data.counts?.activeApiTokens ?? 0} API tokens`}
          nextAction={{
            label: findings.length > 0 ? 'Investigate top finding' : 'Review MFA enrollment',
            href: findings[0]?.href ?? '/security',
          }}
          aiConfidence={80}
        />
      )}
      {data && (data.openAlerts?.length ?? 0) > 0 && (
        <div className="mb-4">
          <InlineAiAssist
            title="Explain top security alert"
            prompt="Explain this security alert for a CISO. Include risk, likely cause, and recommended response."
            context={JSON.stringify(data.openAlerts?.[0] ?? {})}
          />
        </div>
      )}
      {msg && <SuccessBanner message={msg} />}
      {err && (
        <ErrorState
          message={/internal server error/i.test(err) ? 'Security signals are temporarily unavailable. Retry or load Illustrative Demo Data.' : err}
          onRetry={() => load().catch((e: Error) => setErr(e.message))}
        />
      )}
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
          <div className="mb-3 rounded-xl border border-sky-500/30 bg-sky-950/30 p-3">
            <div className="text-xs font-medium text-sky-100">Authenticator setup key</div>
            <p className="mt-1 break-all font-mono text-sm text-sky-50">{secret}</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Add this key in your authenticator app, then enter a 6-digit code to verify. The key clears after verification.
            </p>
          </div>
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
          <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4">
            <div className="text-sm font-medium text-amber-100">Recovery codes — store securely (shown once)</div>
            <p className="mt-1 text-xs text-amber-100/70">
              Each code can be used once if you lose access to your authenticator.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {backup.map((codeValue) => (
                <code
                  key={codeValue}
                  className="rounded-lg border border-amber-500/20 bg-black/30 px-3 py-2 font-mono text-sm text-amber-50"
                >
                  {codeValue}
                </code>
              ))}
            </div>
            <button
              type="button"
              className="mt-3 rounded border border-amber-400/40 px-3 py-1.5 text-xs text-amber-50 hover:bg-amber-500/20"
              onClick={() => {
                void navigator.clipboard?.writeText(backup.join('\n'));
                setMsg('Recovery codes copied to clipboard');
              }}
            >
              Copy recovery codes
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <EmptyState title="No recovery codes shown" hint="Recovery codes appear once after successful MFA verification." />
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
