import { DashboardShell } from '@/components/DashboardShell';
import { fetchApi } from '@/lib/api';
import type { BusinessTransaction } from '@opsedge360/shared-types';
import Link from 'next/link';

export default async function TransactionDetailPage({ params }: { params: { classification: string } }) {
  let tx: BusinessTransaction | null = null;
  try {
    tx = await fetchApi<BusinessTransaction>(`/transactions/by-classification/${params.classification}`);
  } catch {
    tx = null;
  }

  if (!tx) {
    return (
      <DashboardShell>
        <p className="text-slate-400">Transaction not found.</p>
        <Link href="/transactions" className="mt-4 text-primary hover:underline">← Back</Link>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mb-6">
        <Link href="/transactions" className="text-sm text-slate-400 hover:text-primary">← All Transactions</Link>
        <h1 className="mt-2 text-2xl font-semibold">{tx.name}</h1>
        <p className="text-sm text-slate-400">
          End-to-end mapping · p99: {tx.p99LatencyMs ?? '—'}ms · {tx.volumePerHour?.toLocaleString() ?? 0} tx/hr
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-surface-elevated p-6">
        {(tx.steps ?? []).map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <div className={`rounded-lg border px-4 py-3 text-center text-xs ${
              step.status === 'warn' ? 'border-amber-500/50 bg-amber-500/10' :
              step.status === 'error' ? 'border-red-500/50 bg-red-500/10' :
              'border-slate-600 bg-slate-800'
            }`}>
              <div className="font-medium">{step.name}</div>
              <div className="text-slate-500">{step.stepType}</div>
              <div className={step.status === 'warn' ? 'text-amber-400' : 'text-slate-400'}>
                {step.avgLatencyMs}ms
              </div>
            </div>
            {i < (tx.steps?.length ?? 0) - 1 && <span className="text-slate-600">→</span>}
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
