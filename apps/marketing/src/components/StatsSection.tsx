'use client';

import { useEffect, useRef, useState } from 'react';
import { STATS } from '@/lib/site';
import { Reveal } from './Reveal';

export function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { rootMargin: '-40px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      className="section-pad border-y border-paper-line bg-paper-elev dark:border-ink-muted dark:bg-ink-soft"
      ref={ref}
    >
      <div className="mx-auto max-w-wide">
        <Reveal>
          <p className="eyebrow">Enterprise posture</p>
          <h2 className="font-display mt-3 text-3xl font-semibold md:text-4xl">Built for serious platforms</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="border-l border-paper-line pl-4 dark:border-ink-muted"
              style={{
                opacity: shown ? 1 : 0,
                transform: shown ? 'translateY(0)' : 'translateY(12px)',
                transition: `all 0.5s ease ${i * 0.06}s`,
              }}
            >
              <p className="font-display text-xl font-semibold text-accent">{s.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-mist">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
