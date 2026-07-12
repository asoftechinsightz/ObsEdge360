'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Building2, Shield, CreditCard, RefreshCw, CheckCircle2, XCircle, Play,
} from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { EmptyState, ErrorState, LoadingSkeleton, SuccessBanner } from '@/components/UiStates';
import { PageHeader } from '@/components/eig/primitives';
import { TrustBar } from '@/components/apex/TrustBar';
import { ExecutiveNarrative } from '@/components/apex/ExecutiveNarrative';
import { DemoAwareEmptyState } from '@/components/ede/DemoAwareEmptyState';
import { friendlyError } from '@/lib/friendly-error';
import clsx from 'clsx';
import Link from 'next/link';

type Tab = 'pack' | 'rbi' | 'pci' | 'payments';

interface Control {
  controlId: string;
  framework: string;
  title: string;
  status: string;
  lastChecked?: string;
}

interface PaymentTemplate {
  code: string;
  name: string;
  classification: string;
  description?: string;
  steps: Array<{ order: number; name: string; service: string }>;
  sloP99Ms: number;
}

interface Dashboard {
  enabled: boolean;
  bankingScore: number;
  pack: {
    code: string;
    name: string;
    description?: string;
    frameworkCodes: string[];
    controlCount: number;
    enabled: boolean;
  };
  frameworks: {
    rbi: { code: string; name: string; score: number; controlsTotal: number; controlsPassed: number };
    pci: { code: string; name: string; score: number; controlsTotal: number; controlsPassed: number };
  };
  controls: {
    rbi: { total: number; passed: number; failed: number; pending: number };
    pci: { total: number; passed: number; failed: number; pending: number };
    rbiList: Control[];
    pciList: Control[];
  };
  payments: {
    transactions: Array<{
      id: string;
      name: string;
      classification: string;
      p50LatencyMs?: number;
      p99LatencyMs?: number;
      volumePerHour: number;
      status: string;
    }>;
    templates: PaymentTemplate[];
    sloTotal: number;
    sloMet: number;
  };
}

function statusColor(status: string) {
  if (status === 'pass') return 'text-emerald-400';
  if (status === 'fail') return 'text-red-400';
  if (status === 'partial') return 'text-amber-400';
  return 'text-slate-400';
}

export default function Banking360Page() {
  const [tab, setTab] = useState<Tab>('pack');
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const dash = await apiClient<Dashboard>('/compliance/banking360');
      setData(dash);
    } catch (err) {
      setError(friendlyError(err, 'Banking360 signals are unavailable. Activate the pack or load Illustrative Demo Data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function activate() {
    setBusy(true);
    try {
      const dash = await apiClient<Dashboard>('/compliance/banking360/activate', {
        method: 'POST',
        body: '{}',
      });
      setData(dash);
      setMessage('Banking360 activated — BFSI pack enabled, payment templates applied');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Activation failed');
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    setBusy(true);
    try {
      const dash = await apiClient<Dashboard>('/compliance/banking360/deactivate', {
        method: 'POST',
        body: '{}',
      });
      setData(dash);
      setMessage('Banking360 deactivated');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Deactivation failed');
    } finally {
      setBusy(false);
    }
  }

  async function validate() {
    setBusy(true);
    try {
      const result = await apiClient<{ overallScore: number; rbi: { score: number }; pci: { score: number } }>(
        '/compliance/banking360/validate',
        { method: 'POST', body: '{}' },
      );
      setMessage(`Validation complete — overall ${result.overallScore}% (RBI ${result.rbi.score}% · PCI ${result.pci.score}%)`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setBusy(false);
    }
  }

  async function applyTemplate(code: string) {
    setBusy(true);
    try {
      const tx = await apiClient<{ name: string }>(`/compliance/banking360/payment-templates/${code}/apply`, {
        method: 'POST',
        body: '{}',
      });
      setMessage(`Applied monitoring template: ${tx.name}`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Apply failed');
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof Building2 }[] = [
    { id: 'pack', label: 'BFSI Pack', icon: Building2 },
    { id: 'rbi', label: 'RBI Controls', icon: Shield },
    { id: 'pci', label: 'PCI-DSS', icon: Shield },
    { id: 'payments', label: 'UPI / Payments', icon: CreditCard },
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="Banking360"
        purpose="UPI · IMPS · RTGS · NEFT · CBS · payment gateway · fraud — latency, TPS, revenue, and regulatory posture."
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => load()} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            {data?.enabled ? (
              <>
                <button type="button" disabled={busy} onClick={validate} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-50">
                  <Play size={16} /> Run validation
                </button>
                <button type="button" disabled={busy} onClick={deactivate} className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50">
                  Deactivate
                </button>
              </>
            ) : (
              <button type="button" disabled={busy} onClick={activate} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                Activate Banking360
              </button>
            )}
          </div>
        }
      />
      <TrustBar
        lastUpdated={new Date()}
        freshness={data ? 'recent' : 'unknown'}
        dataSource="BFSI pack · RBI · PCI · payment rails"
        coverageLabel={data ? `Score ${data.bankingScore}% · ${data.payments?.templates?.length ?? 0} payment templates` : 'Banking industry pack'}
        integrationHealth={error ? 'degraded' : 'healthy'}
      />
      {data && (
        <ExecutiveNarrative
          happening={`Banking360 is ${data.enabled ? 'active' : 'inactive'} with overall score ${data.bankingScore}%`}
          whyItMatters="Payment-rail latency and RBI/PCI control gaps translate directly into revenue and regulatory exposure."
          affectedService="UPI · IMPS · RTGS · NEFT · CBS · Payment Gateway"
          impact={`${data.payments?.sloMet ?? 0}/${data.payments?.sloTotal ?? 0} payment SLOs met · RBI ${data.frameworks.rbi.score}% · PCI ${data.frameworks.pci.score}%`}
          nextAction={{
            label: data.enabled ? 'Review UPI / Payments rails' : 'Activate Banking360 pack',
            href: data.enabled ? '#payments' : '/banking360',
          }}
          aiConfidence={84}
        />
      )}

      {message && <SuccessBanner message={message} />}
      {error && <ErrorState message={error} onRetry={() => load()} />}
      {loading && !data && <LoadingSkeleton rows={4} />}
      {!loading && !data && !error && (
        <DemoAwareEmptyState
          title="Banking360 not loaded"
          hint="Activate the BFSI pack to seed RBI/PCI controls and payment templates for UPI, IMPS, RTGS, NEFT, and CBS."
          setupHref="/demo/guided"
        />
      )}

      {data && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="kpi-card">
            <div className="text-xs text-slate-500">Status</div>
            <div className={clsx('mt-1 text-lg font-semibold', data.enabled ? 'text-emerald-400' : 'text-slate-400')}>
              {data.enabled ? 'Active' : 'Inactive'}
            </div>
          </div>
          <div className="kpi-card">
            <div className="text-xs text-slate-500">Banking score</div>
            <div className="mt-1 text-2xl font-semibold text-sky-400">{data.bankingScore}%</div>
          </div>
          <div className="kpi-card">
            <div className="text-xs text-slate-500">Payment SLOs</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-400">
              {data.payments?.sloMet ?? 0}/{data.payments?.sloTotal ?? 0}
            </div>
          </div>
          <div className="kpi-card">
            <div className="text-xs text-slate-500">Monitored journeys</div>
            <div className="mt-1 text-2xl font-semibold text-amber-300">
              {data.payments?.transactions?.length ?? data.payments?.templates?.length ?? 0}
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-700">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-2 border-b-2 px-4 py-2 text-sm whitespace-nowrap',
              tab === id ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white',
            )}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'pack' && data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-surface-elevated p-6">
            <div className="mb-2 flex items-center gap-2">
              <Building2 className="text-primary" size={22} />
              <h2 className="text-lg font-semibold">{data.pack.name}</h2>
            </div>
            <p className="text-sm text-slate-400">
              {data.pack.description ?? 'RBI-CSF, PCI-DSS, and payment monitoring for regulated BFSI workloads.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.pack.frameworkCodes.map((fw) => (
                <span key={fw} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{fw}</span>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm">
              {data.enabled ? (
                <><CheckCircle2 className="text-emerald-400" size={18} /> Pack enabled for this tenant</>
              ) : (
                <><XCircle className="text-slate-500" size={18} /> Pack not enabled — activate to enforce RBI/PCI controls</>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-surface-elevated p-6 text-sm text-slate-400">
            <h3 className="mb-3 font-medium text-slate-200">What activation does</h3>
            <ul className="list-disc space-y-2 pl-5">
              <li>Enables BFSI industry pack and RBI-CSF / PCI-DSS frameworks</li>
              <li>Seeds payment monitoring for UPI, NEFT, and IMPS flows</li>
              <li>Creates default p99 latency SLOs for payment templates</li>
              <li>Runs initial compliance validation</li>
            </ul>
            <p className="mt-4">
              Payment flows also appear under{' '}
              <Link href="/transactions" className="text-primary hover:underline">Business Transactions</Link>.
            </p>
          </div>
        </div>
      )}

      {(tab === 'rbi' || tab === 'pci') && data && (
        <div>
          {!data.enabled && (
            <p className="mb-4 text-sm text-amber-400">Activate Banking360 to enable framework controls.</p>
          )}
          <div className="mb-4 grid grid-cols-3 gap-3">
            {(['passed', 'failed', 'pending'] as const).map((k) => {
              const summary = tab === 'rbi' ? data.controls.rbi : data.controls.pci;
              return (
                <div key={k} className="kpi-card">
                  <div className="text-xs capitalize text-slate-500">{k}</div>
                  <div className="text-xl font-semibold">{summary[k]}</div>
                </div>
              );
            })}
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated text-left text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-3">Control</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last checked</th>
                </tr>
              </thead>
              <tbody>
                {(tab === 'rbi' ? data.controls.rbiList : data.controls.pciList).map((c) => (
                  <tr key={c.controlId} className="border-t border-slate-700/50">
                    <td className="px-4 py-3 font-mono text-xs">{c.controlId}</td>
                    <td className="px-4 py-3">{c.title}</td>
                    <td className={clsx('px-4 py-3 capitalize', statusColor(c.status))}>{c.status}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {c.lastChecked ? new Date(c.lastChecked).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
                {(tab === 'rbi' ? data.controls.rbiList : data.controls.pciList).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No controls — activate Banking360 and run validation
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'payments' && data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 font-medium">Monitored payment flows</h3>
            <div className="space-y-2">
              {data.payments.transactions.map((t) => (
                <div key={t.id} className="rounded-xl border border-slate-700 bg-surface-elevated px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t.name}</span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-xs">{t.classification}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    p50 {t.p50LatencyMs ?? '—'}ms · p99 {t.p99LatencyMs ?? '—'}ms · {t.volumePerHour}/hr
                  </div>
                </div>
              ))}
              {data.payments.transactions.length === 0 && (
                <p className="text-sm text-slate-500">No payment flows yet — apply a template below</p>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Payment SLOs met: {data.payments.sloMet}/{data.payments.sloTotal}
            </p>
          </div>

          <div>
            <h3 className="mb-3 font-medium">Payment flow templates</h3>
            <div className="space-y-3">
              {data.payments.templates.map((tpl) => (
                <div key={tpl.code} className="rounded-xl border border-slate-700 bg-surface-elevated p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{tpl.name}</div>
                      <div className="text-xs text-slate-500">{tpl.code} · SLO p99 {tpl.sloP99Ms}ms</div>
                      {tpl.description && <p className="mt-1 text-xs text-slate-400">{tpl.description}</p>}
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => applyTemplate(tpl.code)}
                      className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs text-white disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1 text-xs text-slate-500">
                    {tpl.steps.map((s, i) => (
                      <span key={s.order} className="flex items-center gap-1">
                        <span className="rounded bg-slate-800 px-2 py-0.5">{s.name}</span>
                        {i < tpl.steps.length - 1 && <span>→</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
