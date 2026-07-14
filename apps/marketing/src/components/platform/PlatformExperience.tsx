'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { SITE } from '@/lib/site';
import { ScrollReveal } from '@/components/ScrollReveal';
import {
  OutcomesVisual,
  PlatformEcosystemVisual,
  ProductEcosystemFlow,
  SharedServicesVisual,
} from '@/components/platform/PlatformVisuals';
import { ArchitectureFlowVisual, EnterpriseNetworkBackdrop } from '@/components/viz/VisualGate';

function SectionShell({
  id,
  surface,
  children,
}: {
  id: string;
  surface: 'paper' | 'teal' | 'wash' | 'glass' | 'ink';
  children: ReactNode;
}) {
  const map = {
    paper: 'bg-paper text-ink dark:bg-ink dark:text-paper',
    teal: 'bg-teal-tint text-ink dark:bg-ink-soft dark:text-paper',
    wash: 'bg-section-wash text-ink dark:bg-ink-soft dark:text-paper',
    glass: 'bg-glass-section text-ink dark:bg-ink-soft dark:text-paper',
    ink: 'bg-ink text-paper',
  } as const;
  return (
    <section id={id} className={`section-pad ${map[surface]}`}>
      <div className="mx-auto max-w-wide">{children}</div>
    </section>
  );
}

export function PlatformExperience() {
  return (
    <>
      {/* Hero */}
      <section
        id="platform-hero"
        className="relative isolate overflow-hidden bg-hero-mesh text-paper"
      >
        <EnterpriseNetworkBackdrop className="opacity-28" />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-[var(--bg)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-wide items-center gap-12 px-6 pb-20 pt-28 md:grid-cols-2 md:gap-14 md:px-10 md:pt-32 lg:px-16 lg:pb-24">
          <div className="animate-fade-up">
            <span className="inline-flex rounded-full border border-accent-bright/40 bg-accent/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-bright">
              Enterprise Platform
            </span>
            <h1 className="font-display mt-6 max-w-[18ch] text-[2rem] font-semibold leading-[1.12] tracking-tight md:text-[2.55rem] lg:text-[2.85rem]">
              {SITE.suite}
            </h1>
            <p className="mt-5 max-w-[36ch] text-base leading-relaxed text-paper/68">
              {SITE.name} builds one governed platform for growth, retail, and digital operations —
              so executives see products as a system, not three separate purchases.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/demo" className="btn-primary">
                Book Demo
              </Link>
              <Link
                href="#architecture"
                className="inline-flex items-center rounded-md border border-paper/20 bg-paper/5 px-5 py-3 text-sm font-medium text-paper/90 transition-colors hover:bg-paper/10"
              >
                Explore Architecture
              </Link>
            </div>
            <p className="mt-8 text-xs text-paper/45">
              LeadEdge360 · RetailEdge360 · OpsEdge360 — shared identity, AI, and analytics
            </p>
          </div>
          <div className="min-h-[300px] overflow-hidden rounded-xl border border-paper/10 bg-ink-soft/50 p-2 shadow-elev backdrop-blur-sm md:min-h-[380px]">
            <PlatformEcosystemVisual className="h-full min-h-[300px] md:min-h-[360px]" />
          </div>
        </div>
      </section>

      {/* Business challenge */}
      <SectionShell id="challenge" surface="paper">
        <ScrollReveal>
          <p className="eyebrow">Business challenge</p>
          <h2 className="font-display mt-3 max-w-[22ch] text-3xl font-semibold leading-tight md:text-4xl">
            Separate tools create separate truths
          </h2>
          <p className="mt-5 max-w-[42ch] text-base leading-relaxed text-mist">
            CRM, retail systems, and operations monitors answer local questions. Leadership still
            reconciles risk, growth, and service health by hand.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.08}>
          <ul className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              ['Tool sprawl', 'Multiple consoles, fragmented identity and admin.'],
              ['Late risk visibility', 'Outages and customer impact surface after the fact.'],
              ['Disconnected growth', 'Revenue motion ignores operational readiness.'],
            ].map(([t, d]) => (
              <li key={t} className="border-t border-paper-line pt-5 dark:border-ink-muted">
                <p className="font-display text-lg font-semibold">{t}</p>
                <p className="mt-2 text-sm text-mist">{d}</p>
              </li>
            ))}
          </ul>
        </ScrollReveal>
      </SectionShell>

      {/* Unified platform */}
      <SectionShell id="unified" surface="teal">
        <ScrollReveal>
          <p className="eyebrow">Our unified platform</p>
          <h2 className="font-display mt-3 max-w-[24ch] text-3xl font-semibold leading-tight md:text-4xl">
            One suite. Three products. Shared intelligence.
          </h2>
          <p className="mt-5 max-w-[42ch] text-base leading-relaxed text-mist">
            Specialize where teams need depth. Keep identity, AI, analytics, and security on a
            common plane — the difference between a platform and a catalog of tools.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.08} className="mt-12">
          <div className="overflow-hidden rounded-xl border border-paper-line bg-ink shadow-elev dark:border-ink-muted">
            <div className="h-[320px] md:h-[400px]">
              <PlatformEcosystemVisual className="h-full w-full" />
            </div>
          </div>
        </ScrollReveal>
      </SectionShell>

      {/* How products connect */}
      <SectionShell id="ecosystem" surface="wash">
        <ScrollReveal>
          <p className="eyebrow">How products connect</p>
          <h2 className="font-display mt-3 max-w-[22ch] text-3xl font-semibold leading-tight md:text-4xl">
            A connected operating loop — not isolated cards
          </h2>
          <p className="mt-5 max-w-[40ch] text-base leading-relaxed text-mist">
            Demand, retail execution, and operations intelligence feed one executive view.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.08} className="mt-12">
          <div className="rounded-xl border border-paper-line bg-ink px-2 py-6 dark:border-ink-muted md:py-10">
            <ProductEcosystemFlow />
          </div>
        </ScrollReveal>
      </SectionShell>

      {/* Architecture */}
      <SectionShell id="architecture" surface="glass">
        <ScrollReveal>
          <p className="eyebrow">Platform architecture</p>
          <h2 className="font-display mt-3 max-w-[24ch] text-3xl font-semibold leading-tight md:text-4xl">
            How value flows through the suite
          </h2>
          <p className="mt-5 max-w-[42ch] text-base leading-relaxed text-mist">
            From the Business Suite through products, AI agents, cloud, and customer systems —
            animated to show governed movement, not decoration.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.08} className="mt-12">
          <div className="overflow-hidden rounded-xl border border-paper-line bg-ink dark:border-ink-muted">
            <div className="h-[380px] md:h-[440px]">
              <ArchitectureFlowVisual className="h-full w-full" />
            </div>
          </div>
        </ScrollReveal>
      </SectionShell>

      {/* Shared services */}
      <SectionShell id="shared" surface="paper">
        <ScrollReveal>
          <p className="eyebrow">Shared platform layer</p>
          <h2 className="font-display mt-3 max-w-[22ch] text-3xl font-semibold leading-tight md:text-4xl">
            Capabilities every product inherits
          </h2>
          <p className="mt-5 max-w-[40ch] text-base leading-relaxed text-mist">
            Buy the specialty. Inherit the control plane.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.08} className="mt-12">
          <SharedServicesVisual />
        </ScrollReveal>
      </SectionShell>

      {/* Outcomes */}
      <SectionShell id="outcomes" surface="teal">
        <ScrollReveal>
          <p className="eyebrow">Business outcomes</p>
          <h2 className="font-display mt-3 max-w-[20ch] text-3xl font-semibold leading-tight md:text-4xl">
            Why executives choose a suite
          </h2>
          <p className="mt-5 max-w-[40ch] text-base leading-relaxed text-mist">
            Outcomes measured in time-to-value, operating cost, clarity, and trust — not feature
            count.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.08} className="mt-12">
          <OutcomesVisual />
        </ScrollReveal>
      </SectionShell>

      {/* CTA */}
      <SectionShell id="cta" surface="ink">
        <ScrollReveal>
          <h2 className="font-display max-w-[20ch] text-3xl font-semibold md:text-4xl">
            See the platform with your operating model
          </h2>
          <p className="mt-5 max-w-[38ch] text-base leading-relaxed text-paper/65">
            Book an executive demo, or walk the architecture with an {SITE.name} specialist.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/demo" className="btn-primary">
              Book Demo
            </Link>
            <Link
              href="/trust"
              className="inline-flex items-center rounded-md border border-white/20 px-5 py-3 text-sm font-medium transition-colors hover:bg-white/8"
            >
              Trust Center
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center rounded-md border border-white/20 px-5 py-3 text-sm font-medium transition-colors hover:bg-white/8"
            >
              View Products
            </Link>
          </div>
        </ScrollReveal>
      </SectionShell>
    </>
  );
}
