'use client';

import { useState } from 'react';

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-paper-line dark:divide-ink-muted">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="py-4">
            <button
              type="button"
              className="flex w-full items-start justify-between gap-4 text-left"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span className="font-display text-base font-semibold">{item.q}</span>
              <span className="text-accent" aria-hidden>
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {isOpen && <p className="mt-2 text-sm leading-relaxed text-mist">{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
