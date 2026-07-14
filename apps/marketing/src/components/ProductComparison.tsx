'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { PRODUCTS } from '@/lib/site';

const ROWS = [
  { feature: 'Executive dashboards', ops: true, lead: true, retail: true },
  { feature: 'AI assist / copilot', ops: true, lead: true, retail: true },
  { feature: 'CRM & pipeline', ops: false, lead: true, retail: false },
  { feature: 'POS / inventory', ops: false, lead: false, retail: true },
  { feature: 'Observability (OTel)', ops: true, lead: false, retail: false },
  { feature: 'Digital Twin / BSI', ops: true, lead: false, retail: false },
  { feature: 'WhatsApp engagement', ops: false, lead: true, retail: true },
] as const;

export function ProductComparison() {
  const [focus, setFocus] = useState<(typeof PRODUCTS)[number]['slug']>('opsedge360');
  return (
    <div className="overflow-x-auto">
      <div className="mb-3 flex flex-wrap gap-2">
        {PRODUCTS.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => setFocus(p.slug)}
            className={clsx(
              'rounded-md px-3 py-1.5 text-xs font-medium',
              focus === p.slug ? 'bg-accent text-white' : 'border border-paper-line text-mist dark:border-ink-muted',
            )}
          >
            Focus: {p.name}
          </button>
        ))}
      </div>
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-paper-line dark:border-ink-muted">
            <th className="py-2 pr-4 font-medium">Capability</th>
            {PRODUCTS.map((p) => (
              <th
                key={p.slug}
                className={clsx('px-3 py-2 font-medium', focus === p.slug && 'text-accent')}
              >
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.feature} className="border-b border-paper-line/70 dark:border-ink-muted/70">
              <td className="py-2.5 pr-4">{r.feature}</td>
              <td className={clsx('px-3', focus === 'opsedge360' && 'font-semibold text-accent')}>
                {r.ops ? 'Yes' : '—'}
              </td>
              <td className={clsx('px-3', focus === 'leadedge360' && 'font-semibold text-accent')}>
                {r.lead ? 'Yes' : '—'}
              </td>
              <td className={clsx('px-3', focus === 'retailedge360' && 'font-semibold text-accent')}>
                {r.retail ? 'Yes' : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
