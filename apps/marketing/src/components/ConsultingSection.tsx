import type { ReactNode } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ScrollReveal } from './ScrollReveal';

export type SectionSurface = 'paper' | 'wash' | 'teal' | 'glass' | 'ink';

const SURFACE: Record<SectionSurface, string> = {
  paper: 'bg-paper text-ink dark:bg-ink dark:text-paper',
  wash: 'bg-section-wash text-ink dark:bg-ink-soft dark:text-paper',
  teal: 'bg-teal-tint text-ink dark:text-paper',
  glass: 'bg-glass-section text-ink dark:text-paper',
  ink: 'bg-ink text-paper',
};

type Cta = { href: string; label: string; variant?: 'primary' | 'secondary' };

type Props = {
  id: string;
  surface?: SectionSurface;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  visual?: ReactNode;
  benefits?: string[];
  cta?: Cta | Cta[];
  reverse?: boolean;
  className?: string;
};

/** Enterprise consulting section: heading → narrative → visual → benefits → CTA */
export function ConsultingSection({
  id,
  surface = 'paper',
  eyebrow,
  title,
  children,
  visual,
  benefits,
  cta,
  reverse = false,
  className,
}: Props) {
  const ctas = cta ? (Array.isArray(cta) ? cta : [cta]) : [];

  return (
    <section id={id} className={clsx('section-pad', SURFACE[surface], className)}>
      <div className="mx-auto max-w-wide">
        <ScrollReveal>
          {eyebrow && (
            <p className={clsx('eyebrow', surface === 'ink' && 'text-accent-bright')}>{eyebrow}</p>
          )}
          <h2 className="font-display mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-tight md:text-4xl lg:text-[2.65rem]">
            {title}
          </h2>
          <div
            className={clsx(
              'mt-6 max-w-2xl space-y-4 text-base leading-relaxed',
              surface === 'ink' ? 'text-paper/70' : 'text-mist',
            )}
          >
            {children}
          </div>
        </ScrollReveal>

        {visual && (
          <ScrollReveal delay={0.06} className="mt-12">
            <div
              className={clsx(
                'overflow-hidden rounded-xl border',
                surface === 'ink'
                  ? 'border-white/10 bg-ink-soft/50'
                  : 'border-paper-line bg-paper-elev/80 dark:border-ink-muted dark:bg-ink/40',
              )}
            >
              {visual}
            </div>
          </ScrollReveal>
        )}

        {benefits && benefits.length > 0 && (
          <ScrollReveal delay={0.1}>
            <ul
              className={clsx(
                'mt-12 grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3',
                reverse && 'lg:grid-cols-3',
              )}
            >
              {benefits.map((b) => (
                <li key={b} className="flex gap-3 text-sm leading-snug">
                  <span
                    className={clsx(
                      'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                      surface === 'ink' ? 'bg-accent-bright' : 'bg-accent',
                    )}
                    aria-hidden
                  />
                  <span className={surface === 'ink' ? 'text-paper/85' : 'text-ink dark:text-paper'}>
                    {b}
                  </span>
                </li>
              ))}
            </ul>
          </ScrollReveal>
        )}

        {ctas.length > 0 && (
          <ScrollReveal delay={0.12}>
            <div className="mt-10 flex flex-wrap gap-3">
              {ctas.map((c) => {
                const primary = (c.variant ?? 'primary') === 'primary';
                if (surface === 'ink') {
                  return (
                    <Link
                      key={c.href + c.label}
                      href={c.href}
                      className={
                        primary
                          ? 'btn-primary'
                          : 'inline-flex items-center rounded-md border border-white/20 px-5 py-3 text-sm font-medium transition-colors hover:bg-white/8'
                      }
                    >
                      {c.label}
                    </Link>
                  );
                }
                return (
                  <Link
                    key={c.href + c.label}
                    href={c.href}
                    className={primary ? 'btn-primary' : 'btn-secondary'}
                  >
                    {c.label}
                  </Link>
                );
              })}
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  );
}
