'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { apiClient } from '@/lib/api-client';
import { InlineAiAssist } from '@/components/apex/InlineAiAssist';
import { StatusBadge } from '@/components/eig/primitives';

export type WorkspacePayload = {
  incident: {
    id: string;
    title: string;
    severity: string;
    status: string;
    priority: string;
    ownerId?: string | null;
    ownerEmail?: string | null;
    ownerName?: string | null;
    primaryCiId?: string | null;
    primaryCi?: Record<string, unknown> | null;
    signalCounts?: Record<string, unknown>;
    blastSummary?: Record<string, unknown>;
    businessImpact: {
      businessService: string;
      customersImpacted: number;
      revenueAtRisk: number;
      revenueAtRiskLabel: string;
      slaBreach: boolean;
      regulatoryImpact: string;
      criticality: string;
      affectedAssets: number;
      criticalAssets: number;
    };
    workspaceState?: Record<string, unknown>;
    slaDueAt?: string | null;
    createdAt?: string;
    closureReportId?: string | null;
  };
  members: Array<Record<string, unknown>>;
  ciLinks: Array<Record<string, unknown>>;
  comments: Array<Record<string, unknown>>;
  watchers: Array<Record<string, unknown>>;
  activity: Array<Record<string, unknown>>;
  rca: Record<string, unknown> | null;
  remediations: Array<Record<string, unknown>>;
  remediationAudit: Array<Record<string, unknown>>;
  telemetry: Record<string, number | null>;
  nextStatuses: string[];
  lifecycle: string[];
  links: {
    topology: string;
    twin: string;
    cmdb: string;
    drift: string;
    automation: string;
    reports: string;
  };
};

type Props = {
  incidentId: string;
  onMessage?: (msg: string) => void;
  onClosed?: () => void;
};

export function IncidentWorkspace({ incidentId, onMessage, onClosed }: Props) {
  const [ws, setWs] = useState<WorkspacePayload | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');
  const [tab, setTab] = useState<'timeline' | 'ai' | 'evidence' | 'audit'>('timeline');

  const load = useCallback(async () => {
    try {
      const data = await apiClient<WorkspacePayload>(`/ops-intelligence/incidents/${incidentId}/workspace`);
      setWs(data);
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load workspace');
    }
  }, [incidentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) onMessage?.(ok);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Action failed');
      onMessage?.(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (err && !ws) {
    return <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{err}</div>;
  }
  if (!ws) {
    return <div className="rounded-lg border border-slate-800 p-6 text-sm text-slate-500">Loading incident workspace…</div>;
  }

  const inc = ws.incident;
  const impact = inc.businessImpact;
  const lifecycle = ws.lifecycle;
  const statusIdx = Math.max(0, lifecycle.indexOf(inc.status === 'open' ? 'correlated' : inc.status));

  return (
    <div className="space-y-3 rounded-xl border border-violet-500/30 bg-slate-950/80 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">Incident Workspace</div>
          <h2 className="text-lg font-semibold text-slate-50">{inc.title}</h2>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
            <StatusBadge status={inc.severity} />
            <StatusBadge status={inc.status} />
            <span className="uppercase">{inc.priority}</span>
            <span>ID {inc.id.slice(0, 8)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {ws.nextStatuses.map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy}
              className="rounded bg-slate-800 px-2 py-1 text-[11px] capitalize text-slate-200 hover:bg-slate-700 disabled:opacity-50"
              onClick={() =>
                void act(
                  async () => {
                    await apiClient(`/ops-intelligence/incidents/${incidentId}/transition`, {
                      method: 'POST',
                      body: JSON.stringify({
                        status: s,
                        ownerId: s === 'assigned' ? undefined : undefined,
                        note: `Transitioned to ${s}`,
                      }),
                    });
                  },
                  `Status → ${s}`,
                )
              }
            >
              {s}
            </button>
          ))}
          <button
            type="button"
            disabled={busy}
            className="rounded bg-sky-700 px-2 py-1 text-[11px] text-white disabled:opacity-50"
            onClick={() =>
              void act(async () => {
                await apiClient(`/ops-intelligence/incidents/${incidentId}/transition`, {
                  method: 'POST',
                  body: JSON.stringify({ status: 'assigned', note: 'Assigned to current operator' }),
                });
                await apiClient(`/ops-intelligence/incidents/${incidentId}/transition`, {
                  method: 'POST',
                  body: JSON.stringify({ status: 'acknowledged', note: 'Acknowledged' }),
                }).catch(() => undefined);
              }, 'Assigned & acknowledged')
            }
          >
            Assign & Ack
          </button>
        </div>
      </div>

      {/* Lifecycle strip */}
      <div className="flex flex-wrap gap-1">
        {lifecycle.map((step, i) => (
          <span
            key={step}
            className={clsx(
              'rounded px-1.5 py-0.5 text-[10px] capitalize',
              i <= statusIdx ? 'bg-violet-600/40 text-violet-100' : 'bg-slate-900 text-slate-600',
            )}
          >
            {step}
          </span>
        ))}
      </div>

      {/* Business impact first */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        {[
          ['Business service', impact.businessService],
          ['Customers', String(impact.customersImpacted)],
          ['Revenue at risk', impact.revenueAtRiskLabel],
          ['SLA breach', impact.slaBreach ? 'Yes' : 'No'],
          ['Criticality', impact.criticality],
          ['Regulatory', impact.regulatoryImpact],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2 py-2">
            <div className="text-[10px] uppercase text-amber-200/70">{k}</div>
            <div className="mt-0.5 truncate text-xs font-medium text-slate-100" title={String(v)}>
              {v}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        {/* Left */}
        <aside className="space-y-2 xl:col-span-3">
          <Panel title="Summary">
            <Row label="Owner" value={String(inc.ownerName || inc.ownerEmail || 'Unassigned')} />
            <Row label="Priority" value={inc.priority} />
            <Row label="Signals" value={String(inc.signalCounts?.total ?? ws.members.length)} />
            <Row label="SLA due" value={inc.slaDueAt ? String(inc.slaDueAt).slice(0, 19) : '—'} />
            <Row label="Opened" value={inc.createdAt ? String(inc.createdAt).slice(0, 19) : '—'} />
          </Panel>
          <Panel title="Telemetry">
            {Object.entries(ws.telemetry).map(([k, v]) => (
              <Row key={k} label={k} value={v == null ? '—' : `${v}m`} />
            ))}
          </Panel>
        </aside>

        {/* Center */}
        <section className="space-y-2 xl:col-span-5">
          <div className="flex flex-wrap gap-1">
            {(
              [
                ['timeline', 'Timeline'],
                ['ai', 'AI Analysis'],
                ['evidence', 'Evidence'],
                ['audit', 'Audit'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={clsx(
                  'rounded px-2 py-1 text-[11px]',
                  tab === id ? 'bg-violet-600 text-white' : 'bg-slate-900 text-slate-400',
                )}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'timeline' && (
            <Panel title="Activity timeline">
              <ul className="max-h-64 space-y-1 overflow-auto text-xs text-slate-400">
                {ws.activity.length === 0 && <li>No activity yet — advance lifecycle or add a comment.</li>}
                {ws.activity.map((a) => (
                  <li key={String(a.id)} className="border-b border-white/5 py-1">
                    <span className="text-slate-200">{String(a.event_type)}</span>
                    <span className="text-slate-600"> · {String(a.actor_id ?? '').slice(0, 8)}</span>
                    <span className="text-slate-600"> · {String(a.created_at ?? '').slice(0, 19)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {tab === 'ai' && (
            <Panel title="AI investigation">
              {ws.rca ? (
                <div className="space-y-2 text-xs text-slate-300">
                  <div>Confidence {String(ws.rca.confidence_pct ?? ws.rca.confidencePct ?? '—')}%</div>
                  <pre className="whitespace-pre-wrap text-slate-200">{String(ws.rca.summary ?? '')}</pre>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Run RCA to populate root cause.</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  disabled={busy}
                  className="rounded bg-sky-700 px-2 py-1 text-[11px] text-white disabled:opacity-50"
                  onClick={() =>
                    void act(async () => {
                      await apiClient('/ops-intelligence/rca', {
                        method: 'POST',
                        body: JSON.stringify({
                          incidentId,
                          question: `Root cause and recovery for: ${inc.title}`,
                        }),
                      });
                      await apiClient(`/ops-intelligence/incidents/${incidentId}/transition`, {
                        method: 'POST',
                        body: JSON.stringify({ status: 'investigating', note: 'AI RCA started' }),
                      }).catch(() => undefined);
                    }, 'RCA complete')
                  }
                >
                  Run AI RCA
                </button>
              </div>
              <div className="mt-2">
                <InlineAiAssist
                  title="Executive summary"
                  prompt="Produce an executive summary, root cause, blast radius, recommended automation, and ETA to recover."
                  context={JSON.stringify({
                    title: inc.title,
                    severity: inc.severity,
                    impact,
                    rca: ws.rca,
                    blast: inc.blastSummary,
                  }).slice(0, 3500)}
                />
              </div>
            </Panel>
          )}

          {tab === 'evidence' && (
            <Panel title="Correlated alerts & CI evidence">
              <ul className="max-h-40 space-y-1 overflow-auto text-xs text-slate-400">
                {ws.members.map((m) => (
                  <li key={String(m.id)}>
                    {String(m.source_type)} · {String(m.title ?? m.source_id)} · {String(m.severity ?? '')}
                  </li>
                ))}
                {ws.members.length === 0 && <li>No correlated members</li>}
              </ul>
              <div className="mt-2 text-[11px] font-medium text-slate-300">Affected assets</div>
              <ul className="max-h-32 space-y-1 overflow-auto text-xs text-slate-400">
                {ws.ciLinks.map((c) => (
                  <li key={String(c.id)}>
                    {String(c.ci_name ?? c.ci_id)} · {String(c.ci_type ?? '')} · health {String(c.health_score ?? '—')}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {tab === 'audit' && (
            <Panel title="Audit trail">
              <ul className="max-h-64 space-y-1 overflow-auto text-xs text-slate-400">
                {[...ws.activity, ...ws.remediationAudit].slice(0, 40).map((a, i) => (
                  <li key={String(a.id ?? i)} className="border-b border-white/5 py-1">
                    <div className="text-slate-200">{String(a.event_type ?? a.eventType ?? 'event')}</div>
                    <div>
                      actor {String(a.actor_id ?? a.actor ?? '—')} · role {String(a.actor_role ?? '—')} ·{' '}
                      {String(a.created_at ?? '').slice(0, 19)}
                    </div>
                    {a.api_path ? <div className="text-slate-600">{String(a.api_path)}</div> : null}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </section>

        {/* Right */}
        <aside className="space-y-2 xl:col-span-4">
          <Panel title="Investigate">
            <div className="flex flex-col gap-1 text-xs">
              <Link className="text-sky-400 hover:underline" href={ws.links.topology}>
                Open Topology →
              </Link>
              <Link className="text-sky-400 hover:underline" href={ws.links.twin}>
                Launch Digital Twin (blast radius) →
              </Link>
              <Link className="text-sky-400 hover:underline" href={ws.links.cmdb}>
                Affected assets in CMDB →
              </Link>
              <Link className="text-sky-400 hover:underline" href={ws.links.drift}>
                Configuration drift →
              </Link>
            </div>
          </Panel>

          <Panel title="Automation">
            <div className="mb-2 flex flex-wrap gap-1">
              <button
                type="button"
                disabled={busy}
                className="rounded bg-rose-800 px-2 py-1 text-[11px] text-white disabled:opacity-50"
                onClick={() =>
                  void act(async () => {
                    await apiClient('/ops-intelligence/remediation/request', {
                      method: 'POST',
                      body: JSON.stringify({
                        action: 'restart_service',
                        actionKey: 'restart_service',
                        incidentId,
                        riskTier: 'medium',
                        executionMode: 'dry_run',
                      }),
                    });
                  }, 'Dry-run requested')
                }
              >
                Preview (dry-run)
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded bg-orange-800 px-2 py-1 text-[11px] text-white disabled:opacity-50"
                onClick={() =>
                  void act(async () => {
                    const req = await apiClient<{ id?: string; request?: { id: string } }>(
                      '/ops-intelligence/remediation/request',
                      {
                        method: 'POST',
                        body: JSON.stringify({
                          action: 'restart_service',
                          actionKey: 'restart_service',
                          incidentId,
                          riskTier: 'medium',
                          executionMode: 'live',
                        }),
                      },
                    );
                    const id = req.id ?? req.request?.id;
                    if (id) {
                      await apiClient(`/ops-intelligence/remediation/approvals/${id}/approve`, {
                        method: 'POST',
                        body: '{}',
                      }).catch(() => undefined);
                      await apiClient(`/ops-intelligence/remediation/approvals/${id}/execute`, {
                        method: 'POST',
                        body: '{}',
                      }).catch(() => undefined);
                      await apiClient(`/ops-intelligence/incidents/${incidentId}/automation`, {
                        method: 'POST',
                        body: JSON.stringify({ automationId: id, mode: 'live', result: req }),
                      });
                    }
                  }, 'Automation executed')
                }
              >
                Execute
              </button>
              <Link
                href={ws.links.automation}
                className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200 hover:border-sky-500/40"
              >
                Catalog
              </Link>
            </div>
            <ul className="max-h-28 space-y-1 overflow-auto text-[11px] text-slate-400">
              {ws.remediations.map((r) => (
                <li key={String(r.id)}>
                  {String(r.action ?? r.action_key)} · {String(r.status)} · {String(r.execution_mode)}
                </li>
              ))}
              {ws.remediations.length === 0 && <li>No remediations yet</li>}
            </ul>
          </Panel>

          <Panel title="Verify & close">
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                disabled={busy}
                className="rounded bg-emerald-700 px-2 py-1 text-[11px] text-white disabled:opacity-50"
                onClick={() =>
                  void act(async () => {
                    await apiClient(`/ops-intelligence/incidents/${incidentId}/verify`, {
                      method: 'POST',
                      body: '{}',
                    });
                  }, 'Verification complete')
                }
              >
                Verify recovery
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded bg-violet-700 px-2 py-1 text-[11px] text-white disabled:opacity-50"
                onClick={() =>
                  void act(async () => {
                    const r = await apiClient<{ report?: { id?: string }; workspace?: WorkspacePayload }>(
                      `/ops-intelligence/incidents/${incidentId}/close-and-report`,
                      { method: 'POST', body: '{}' },
                    );
                    onClosed?.();
                    if (r.report?.id) {
                      onMessage?.(`Closed — report ${r.report.id}`);
                    }
                  }, 'Incident closed + report generated')
                }
              >
                Close + Report
              </button>
              {inc.closureReportId && (
                <Link href={`/reports?id=${inc.closureReportId}`} className="text-[11px] text-sky-400 hover:underline">
                  Open report →
                </Link>
              )}
            </div>
            {inc.workspaceState?.lastVerification ? (
              <pre className="mt-2 max-h-24 overflow-auto text-[10px] text-slate-500">
                {JSON.stringify(inc.workspaceState.lastVerification, null, 2)}
              </pre>
            ) : null}
          </Panel>
        </aside>
      </div>

      {/* Bottom collaboration */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <Panel title="Comments">
          <div className="mb-2 flex gap-2">
            <input
              className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add comment… use @mentions"
            />
            <button
              type="button"
              disabled={busy || !comment.trim()}
              className="rounded bg-slate-700 px-2 py-1 text-xs text-white disabled:opacity-50"
              onClick={() =>
                void act(async () => {
                  await apiClient(`/ops-intelligence/incidents/${incidentId}/comments`, {
                    method: 'POST',
                    body: JSON.stringify({ body: comment }),
                  });
                  setComment('');
                }, 'Comment added')
              }
            >
              Post
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded border border-slate-600 px-2 py-1 text-xs disabled:opacity-50"
              onClick={() =>
                void act(async () => {
                  await apiClient(`/ops-intelligence/incidents/${incidentId}/watchers`, {
                    method: 'POST',
                    body: JSON.stringify({ userId: 'self' }),
                  });
                }, 'Watcher added')
              }
            >
              Watch
            </button>
          </div>
          <ul className="max-h-28 space-y-1 overflow-auto text-xs text-slate-400">
            {ws.comments.map((c) => (
              <li key={String(c.id)}>
                <span className="text-slate-300">{String(c.author_name ?? c.author_id)}</span>: {String(c.body)}
              </li>
            ))}
            {ws.comments.length === 0 && <li>No comments</li>}
          </ul>
        </Panel>
        <Panel title="History / watchers">
          <div className="text-[11px] text-slate-500">Watchers: {ws.watchers.length}</div>
          <ul className="mt-1 max-h-28 space-y-1 overflow-auto text-xs text-slate-400">
            {ws.watchers.map((w) => (
              <li key={String(w.user_id)}>{String(w.user_id)}</li>
            ))}
            {ws.activity.slice(0, 8).map((a) => (
              <li key={`h-${String(a.id)}`}>
                {String(a.event_type)} · {String(a.created_at ?? '').slice(0, 19)}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {err && <p className="text-xs text-amber-300">{err}</p>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-white/5 py-1 text-[11px]">
      <span className="text-slate-500">{label}</span>
      <span className="truncate text-right text-slate-200">{value}</span>
    </div>
  );
}
