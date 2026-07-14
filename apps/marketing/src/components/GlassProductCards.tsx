'use client';

import Link from 'next/link';
import { PRODUCTS } from '@/lib/site';
import { ScrollReveal } from './ScrollReveal';

/** Glass product cards with subtle CSS depth (no Framer / Three.js required). */
export function GlassProductCards() {
  return (
    <div className="mt-12 grid gap-6 md:grid-cols-3" style={{ perspective: '1100px' }}>
      {PRODUCTS.map((p, i) => (
        <ScrollReveal key={p.slug} delay={i * 0.06}>
          <article className="group relative h-full overflow-hidden rounded-xl border border-paper-line bg-paper-elev/90 p-6 shadow-glass backdrop-blur-sm transition-transform duration-300 ease-out will-change-transform hover:-translate-y-1.5 hover:[transform:rotateX(2deg)_rotateY(-2deg)_translateY(-6px)] dark:border-white/10 dark:bg-white/[0.04]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
            <div className="relative">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-xl font-semibold text-ink dark:text-paper">{p.name}</h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">{p.status}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-mist">{p.blurb}</p>
              <ul className="mt-5 space-y-2">
                {p.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-xs text-ink/75 dark:text-paper/65">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                    {h}
                  </li>
                ))}
              </ul>
              <Link
                href={p.href}
                className="mt-6 inline-flex text-sm font-medium text-accent transition-colors hover:text-accent-deep dark:text-accent-bright dark:hover:text-paper"
              >
                Explore {p.name} →
              </Link>
            </div>
          </article>
        </ScrollReveal>
      ))}
    </div>
  );
}
