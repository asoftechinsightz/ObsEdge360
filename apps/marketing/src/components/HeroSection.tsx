'use client';

import Link from 'next/link';
import { SITE } from '@/lib/site';
import { POSITIONING_SIGNALS } from '@/lib/trust-content';
import { PlatformEcosystemVisual } from '@/components/platform/PlatformVisuals';
import { EnterpriseNetworkBackdrop } from '@/components/viz/VisualGate';

export function HeroSection() {
  return (
    <section id="hero" className="relative isolate overflow-hidden bg-hero-mesh text-paper">
      <EnterpriseNetworkBackdrop className="opacity-28" />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[var(--bg)]"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-wide items-center gap-12 px-6 pb-24 pt-28 md:grid-cols-2 md:gap-14 md:px-10 md:pb-28 md:pt-32 lg:px-16">
        <div className="animate-fade-up">
          <p className="font-display text-lg font-semibold text-paper/85 md:text-xl">{SITE.name}</p>
          <span className="mt-4 inline-flex rounded-full border border-accent-bright/35 bg-accent/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-bright">
            Enterprise AI Platform
          </span>
          <h1 className="font-display mt-6 max-w-[18ch] text-[2rem] font-semibold leading-[1.1] tracking-tight md:text-[2.5rem] lg:text-[2.85rem]">
            One Intelligent Business Suite for Modern Enterprises
          </h1>
          <div className="mt-6 max-w-[38ch] space-y-3 text-base leading-relaxed text-paper/68">
            <p>
              Enterprises struggle when growth, retail, and operations run on disconnected tools —
              leadership loses a single view of risk and outcomes.
            </p>
            <p>
              {SITE.name} delivers the {SITE.suite}: LeadEdge360, RetailEdge360, and OpsEdge360 on a
              shared AI, identity, and analytics platform built for regulated and scale businesses.
            </p>
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/demo" className="btn-primary">
              Book Demo
            </Link>
            <Link
              href="/platform"
              className="inline-flex items-center rounded-md border border-paper/20 bg-paper/5 px-5 py-3 text-sm font-medium transition-colors hover:bg-paper/10"
            >
              Explore Platform
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-2">
            {POSITIONING_SIGNALS.slice(0, 5).map((s) => (
              <li
                key={s}
                className="rounded-full border border-paper/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-paper/55"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="min-h-[300px] overflow-hidden rounded-xl border border-paper/10 bg-ink-soft/50 p-2 shadow-elev md:min-h-[380px]">
          <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper/40">
            Platform architecture
          </p>
          <PlatformEcosystemVisual className="h-[280px] md:h-[360px]" />
        </div>
      </div>
    </section>
  );
}
