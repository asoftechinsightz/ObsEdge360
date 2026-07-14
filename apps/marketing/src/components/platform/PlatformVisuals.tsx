'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { SITE } from '@/lib/site';
import { usePrefersReducedMotion } from '@/lib/visual-prefs';

type Focus = 'suite' | 'lead' | 'retail' | 'ops' | 'shared';

const CAPS = [
  'Identity',
  'Analytics',
  'API Gateway',
  'Automation',
  'Security',
  'AI Intelligence',
];

/**
 * Interactive Business Suite ecosystem — SVG only, DOM-mutated pulses.
 * Explains suite → products → shared platform in one glance.
 */
export function PlatformEcosystemVisual({ className }: { className?: string }) {
  const reduce = usePrefersReducedMotion();
  const [focus, setFocus] = useState<Focus>('suite');
  const pulses = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const start = performance.now();
    const routes: [number, number, number, number][] = [
      [280, 58, 100, 140],
      [280, 58, 280, 140],
      [280, 58, 460, 140],
      [100, 180, 280, 240],
      [280, 180, 280, 240],
      [460, 180, 280, 240],
    ];
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      routes.forEach(([x1, y1, x2, y2], i) => {
        const el = pulses.current[i];
        if (!el) return;
        const p = ((t * 0.35 + i * 0.12) % 1 + 1) % 1;
        el.setAttribute('cx', String(x1 + (x2 - x1) * p));
        el.setAttribute('cy', String(y1 + (y2 - y1) * p));
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  const hot = (id: Focus) => focus === id || focus === 'suite';

  return (
    <div className={clsx('relative h-full w-full', className)}>
      <svg
        viewBox="0 0 560 360"
        className="h-full w-full"
        role="img"
        aria-label={`${SITE.suite} ecosystem — LeadEdge360, RetailEdge360, OpsEdge360 on a shared platform`}
      >
        <defs>
          <linearGradient id="pf-suite" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0d6e66" />
            <stop offset="100%" stopColor="#1a456e" />
          </linearGradient>
        </defs>

        {/* Links */}
        <g stroke="#8b9aab" strokeOpacity="0.35" fill="none">
          <path d="M280 78 L100 130" strokeWidth="1.5" />
          <path d="M280 78 L280 130" strokeWidth="1.5" />
          <path d="M280 78 L460 130" strokeWidth="1.5" />
          <path d="M100 190 L280 230" strokeWidth="1.5" />
          <path d="M280 190 L280 230" strokeWidth="1.5" />
          <path d="M460 190 L280 230" strokeWidth="1.5" />
        </g>

        {!reduce &&
          [0, 1, 2, 3, 4, 5].map((i) => (
            <circle
              key={i}
              ref={(el) => {
                pulses.current[i] = el;
              }}
              r="2.6"
              fill="#1a9a8f"
              opacity="0.75"
            />
          ))}

        {/* Suite */}
        <g
          className="cursor-pointer"
          onMouseEnter={() => setFocus('suite')}
          onFocus={() => setFocus('suite')}
          tabIndex={0}
          role="button"
          aria-label={SITE.suite}
        >
          <rect
            x="130"
            y="28"
            width="300"
            height="50"
            rx="8"
            fill="url(#pf-suite)"
            stroke="#e6edf4"
            strokeOpacity={focus === 'suite' ? 0.35 : 0.12}
          />
          <text x="280" y="52" textAnchor="middle" fill="#fff" style={{ fontSize: 13, fontWeight: 700 }}>
            {SITE.suite.toUpperCase()}
          </text>
          <text x="280" y="68" textAnchor="middle" fill="#ffffff" fillOpacity="0.7" style={{ fontSize: 9 }}>
            Shared identity · AI · analytics
          </text>
        </g>

        {/* Products */}
        {(
          [
            ['lead', 40, 'LeadEdge360', 'Growth & CRM'],
            ['retail', 220, 'RetailEdge360', 'Retail ops'],
            ['ops', 400, 'OpsEdge360', 'Operations'],
          ] as const
        ).map(([id, x, name, sub]) => (
          <g
            key={id}
            className="cursor-pointer"
            onMouseEnter={() => setFocus(id)}
            onFocus={() => setFocus(id)}
            tabIndex={0}
            role="button"
            aria-label={name}
          >
            <rect
              x={x}
              y="130"
              width="120"
              height="60"
              rx="8"
              fill={hot(id) ? '#1a456e' : '#152030'}
              stroke="#e6edf4"
              strokeOpacity={focus === id ? 0.4 : 0.12}
            />
            <text x={x + 60} y="155" textAnchor="middle" fill="#fff" style={{ fontSize: 11, fontWeight: 700 }}>
              {name}
            </text>
            <text x={x + 60} y="172" textAnchor="middle" fill="#8b9aab" style={{ fontSize: 9 }}>
              {sub}
            </text>
          </g>
        ))}

        {/* Shared platform */}
        <g
          className="cursor-pointer"
          onMouseEnter={() => setFocus('shared')}
          onFocus={() => setFocus('shared')}
          tabIndex={0}
          role="button"
          aria-label="Shared AI Platform"
        >
          <rect
            x="70"
            y="230"
            width="420"
            height="100"
            rx="10"
            fill={focus === 'shared' ? '#0d6e66' : '#0c1520'}
            fillOpacity="0.95"
            stroke="#1a9a8f"
            strokeOpacity="0.35"
          />
          <text x="280" y="252" textAnchor="middle" fill="#e6edf4" style={{ fontSize: 12, fontWeight: 700 }}>
            Shared AI Platform
          </text>
          {CAPS.map((c, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const cx = 130 + col * 120;
            const cy = 278 + row * 22;
            return (
              <text key={c} x={cx} y={cy} textAnchor="middle" fill="#8b9aab" style={{ fontSize: 9 }}>
                {c}
              </text>
            );
          })}
        </g>
      </svg>
      <p className="sr-only">Focused layer: {focus}</p>
    </div>
  );
}

/** Vertical product → outcome story with animated connectors */
export function ProductEcosystemFlow({ className }: { className?: string }) {
  const reduce = usePrefersReducedMotion();
  const steps = [
    { name: 'LeadEdge360', role: 'Generates and nurtures demand', tone: 'lead' },
    { name: 'RetailEdge360', role: 'Runs store and inventory operations', tone: 'retail' },
    { name: 'OpsEdge360', role: 'Monitors infrastructure & business services', tone: 'ops' },
    { name: 'Executive AI Dashboard', role: 'One view of risk, growth, and operations', tone: 'exec' },
  ];
  const pulseRefs = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      for (let i = 0; i < 3; i++) {
        const el = pulseRefs.current[i];
        if (!el) continue;
        const p = ((t * 0.4 + i * 0.2) % 1 + 1) % 1;
        const y0 = 72 + i * 88;
        el.setAttribute('cy', String(y0 + p * 28));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  return (
    <div className={clsx('w-full', className)}>
      <svg viewBox="0 0 640 380" className="mx-auto h-auto w-full max-w-3xl" role="img" aria-label="Product ecosystem flow">
        {steps.map((s, i) => {
          const y = 24 + i * 88;
          return (
            <g key={s.name}>
              <rect
                x="120"
                y={y}
                width="400"
                height="56"
                rx="8"
                fill={i === 3 ? '#0d6e66' : '#1a456e'}
                fillOpacity="0.92"
              />
              <text x="320" y={y + 24} textAnchor="middle" fill="#fff" style={{ fontSize: 14, fontWeight: 700 }}>
                {s.name}
              </text>
              <text x="320" y={y + 42} textAnchor="middle" fill="#c5d0dc" style={{ fontSize: 11 }}>
                {s.role}
              </text>
              {i < steps.length - 1 && (
                <>
                  <line x1="320" y1={y + 56} x2="320" y2={y + 88} stroke="#8b9aab" strokeOpacity="0.4" />
                  {!reduce && (
                    <circle
                      ref={(el) => {
                        pulseRefs.current[i] = el;
                      }}
                      cx="320"
                      cy={y + 56}
                      r="3"
                      fill="#1a9a8f"
                    />
                  )}
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const SHARED = [
  { t: 'Single Sign-On', d: 'One enterprise identity across products' },
  { t: 'Identity & Access', d: 'Roles, tenants, and policy enforcement' },
  { t: 'AI Engine', d: 'Scoped, reviewable assistive intelligence' },
  { t: 'Analytics', d: 'Executive and operational measures' },
  { t: 'API Gateway', d: 'Secure integration surface' },
  { t: 'Notifications', d: 'Consistent alerts and outreach' },
  { t: 'Workflow Automation', d: 'Repeatable cross-product processes' },
  { t: 'Security & Compliance', d: 'Controls designed for diligence' },
  { t: 'Audit Logs', d: 'Traceable change and access history' },
  { t: 'Reporting', d: 'Board-ready and operational reports' },
];

export function SharedServicesVisual({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'grid gap-px overflow-hidden rounded-xl border border-paper-line bg-paper-line dark:border-ink-muted dark:bg-ink-muted sm:grid-cols-2 lg:grid-cols-5',
        className,
      )}
      role="list"
      aria-label="Shared platform services"
    >
      {SHARED.map((s) => (
        <div
          key={s.t}
          role="listitem"
          className="group bg-paper-elev p-5 transition-colors hover:bg-teal-tint dark:bg-ink dark:hover:bg-ink-soft"
        >
          <div className="mb-3 h-8 w-8 rounded-md border border-accent/30 bg-accent/10" aria-hidden />
          <p className="font-display text-sm font-semibold text-ink dark:text-paper">{s.t}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-mist">{s.d}</p>
        </div>
      ))}
    </div>
  );
}

const OUTCOMES = [
  {
    t: 'Faster implementation',
    d: 'One identity and analytics fabric across products shortens integration programs.',
  },
  {
    t: 'Lower operational cost',
    d: 'Fewer consoles and duplicated admin planes reduce tool sprawl.',
  },
  {
    t: 'Unified customer experience',
    d: 'Growth, retail, and operations share context instead of reconciling exports.',
  },
  {
    t: 'AI-informed decisions',
    d: 'Assistive intelligence grounded in live suite data — not isolated bots.',
  },
  {
    t: 'Scalable architecture',
    d: 'Cloud, hybrid, and on-premises patterns for regulated and scale estates.',
  },
  {
    t: 'Enterprise-grade security',
    d: 'Shared security, audit, and responsible AI controls by design.',
  },
];

export function OutcomesVisual({ className }: { className?: string }) {
  return (
    <div className={clsx('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {OUTCOMES.map((o) => (
        <article
          key={o.t}
          className="rounded-xl border border-paper-line bg-paper-elev/90 p-5 shadow-glass transition-transform duration-300 hover:-translate-y-1 dark:border-ink-muted dark:bg-ink-soft"
        >
          <div className="h-1 w-10 rounded-full bg-accent" aria-hidden />
          <h3 className="font-display mt-4 text-base font-semibold">{o.t}</h3>
          <p className="mt-2 text-sm leading-relaxed text-mist">{o.d}</p>
        </article>
      ))}
    </div>
  );
}
