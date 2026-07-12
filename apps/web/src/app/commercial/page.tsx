'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiClient } from '@/lib/api-client';
import { EmptyState, ErrorState, LoadingSkeleton, SuccessBanner } from '@/components/UiStates';
import { PageHeader, DataTable, DescriptionList, JsonViewer, StatusBadge } from '@/components/eig/primitives';
import { isDebugMode } from '@/lib/debug-mode';

export default function CommercialPage() {
  const [data, setData] = useState<{ subscriptions?: Array<Record<string, unknown>> } | null>(null);
  const [ent, setEnt] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [debug, setDebug] = useState(false);

  const load = async () => {
    setErr('');
    setData(await apiClient<{ subscriptions?: Array<Record<string, unknown>> }>('/commercial'));
    setEnt(await apiClient<Record<string, unknown>>('/commercial/entitlements'));
  };

  useEffect(() => {
    setDebug(isDebugMode());
    load().catch((e: Error) => setErr(e.message));
  }, []);

  const trial = async () => {
    await apiClient('/commercial/trial', { method: 'POST', body: JSON.stringify({ days: 30, seats: 25 }) });
    setMsg('30-day trial activated');
    await load();
  };

  const subs = data?.subscriptions ?? [];
  const entItems = useMemo(() => {
    if (!ent) return [];
    return Object.entries(ent)
      .filter(([k]) => !k.toLowerCase().includes('token') && !k.toLowerCase().includes('sha'))
      .slice(0, 12)
      .map(([label, value]) => ({
        label: label.replace(/_/g, ' '),
        value:
          value == null
            ? 'None'
            : typeof value === 'object'
              ? Object.entries(value as Record<string, unknown>)
                  .map(([k, v]) => `${k}: ${v === true ? 'Yes' : v === false ? 'No' : String(v)}`)
                  .join(' · ') || 'None'
              : String(value),
      }));
  }, [ent]);

  return (
    <DashboardShell>
      <PageHeader
        title="License & Subscription"
        purpose="Manage trials, entitlements, and commercial usage for this tenant."
        actions={
          <button
            type="button"
            className="rounded-[var(--eig-radius-sm)] bg-sky-600 px-4 py-2 text-sm text-white"
            onClick={() => trial().catch((e: Error) => setErr(e.message))}
          >
            Activate 30-day trial
          </button>
        }
      />
      {msg && <SuccessBanner message={msg} />}
      {err && <ErrorState message={err} onRetry={() => load().catch((e: Error) => setErr(e.message))} />}
      {!data && !err && <LoadingSkeleton rows={4} />}
      {data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-200">Subscriptions</h2>
            <DataTable
              columns={[
                { key: 'plan', label: 'Plan', render: (r) => String(r.plan ?? r.name ?? r.sku ?? 'Plan') },
                { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status ?? 'info')} /> },
                { key: 'seats', label: 'Seats', render: (r) => String(r.seats ?? r.seatCount ?? '—') },
                { key: 'expiresAt', label: 'Renewal / expiry', render: (r) => String(r.expiresAt ?? r.endsAt ?? r.renewalAt ?? '—') },
              ]}
              rows={subs}
              empty={<EmptyState title="No active subscription" hint="Activate a trial or assign a license in Admin → Licenses." />}
            />
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-200">Entitlements</h2>
            {entItems.length ? (
              <DescriptionList items={entItems.map((i) => ({ label: i.label, value: i.value.length > 80 ? `${i.value.slice(0, 80)}…` : i.value }))} />
            ) : (
              <EmptyState title="No entitlement summary" hint="Entitlements appear after a trial or license is assigned." />
            )}
          </div>
        </div>
      )}
      {debug && (
        <>
          {data && <JsonViewer data={data} title="Commercial API payload" />}
          {ent && <JsonViewer data={ent} title="Entitlements API payload" />}
        </>
      )}
    </DashboardShell>
  );
}
