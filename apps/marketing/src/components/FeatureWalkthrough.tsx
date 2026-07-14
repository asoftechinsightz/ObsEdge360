'use client';

import { useState } from 'react';
import clsx from 'clsx';

export function FeatureWalkthrough({
  steps,
}: {
  steps: { title: string; body: string }[];
}) {
  const [i, setI] = useState(0);
  const step = steps[i];
  return (
    <div className="rounded-lg border border-paper-line p-5 dark:border-ink-muted">
      <div className="flex flex-wrap gap-2">
        {steps.map((s, idx) => (
          <button
            key={s.title}
            type="button"
            onClick={() => setI(idx)}
            className={clsx(
              'rounded-md px-2.5 py-1 text-xs font-medium',
              idx === i ? 'bg-ink text-paper dark:bg-paper dark:text-ink' : 'bg-paper text-mist dark:bg-ink-soft',
            )}
          >
            {idx + 1}. {s.title}
          </button>
        ))}
      </div>
      <h3 className="font-display mt-5 text-lg font-semibold">{step.title}</h3>
      <p className="mt-2 text-sm text-mist">{step.body}</p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="rounded-md border border-paper-line px-3 py-1.5 text-xs dark:border-ink-muted"
          disabled={i === 0}
          onClick={() => setI((v) => Math.max(0, v - 1))}
        >
          Previous
        </button>
        <button
          type="button"
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          disabled={i === steps.length - 1}
          onClick={() => setI((v) => Math.min(steps.length - 1, v + 1))}
        >
          Next
        </button>
      </div>
    </div>
  );
}
