'use client';

import { useState } from 'react';
import clsx from 'clsx';

type Tab = { id: string; label: string; title: string; body: string; metrics?: { label: string; value: string }[] };

export function DashboardPreview({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!current) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-paper-line bg-paper-elev shadow-elev dark:border-ink-muted dark:bg-ink-soft">
      <div className="flex flex-wrap gap-1 border-b border-paper-line bg-paper px-3 py-2 dark:border-ink-muted dark:bg-ink">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={clsx(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              active === t.id
                ? 'bg-accent text-white'
                : 'text-mist hover:bg-ink/5 hover:text-ink dark:hover:bg-paper/10 dark:hover:text-paper',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="grid gap-6 p-5 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Interactive preview</p>
          <h3 className="font-display mt-2 text-xl font-semibold">{current.title}</h3>
          <p className="mt-2 text-sm text-mist">{current.body}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(current.metrics ?? [
            { label: 'Health', value: '98%' },
            { label: 'Services', value: '42' },
            { label: 'Open risks', value: '3' },
            { label: 'MTTR', value: '18m' },
          ]).map((m) => (
            <div key={m.label} className="border border-paper-line p-3 dark:border-ink-muted">
              <p className="font-display text-lg font-semibold text-accent">{m.value}</p>
              <p className="text-[11px] uppercase tracking-wide text-mist">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
