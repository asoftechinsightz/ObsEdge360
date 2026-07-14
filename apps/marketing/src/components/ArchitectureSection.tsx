'use client';

import { ScrollReveal } from './ScrollReveal';
import { ArchitectureFlowVisual } from '@/components/viz/VisualGate';
import { SITE } from '@/lib/site';

const LAYERS = [
  'Asoftech Business Suite',
  'LeadEdge360',
  'RetailEdge360',
  'OpsEdge360',
  'AI Agents',
  'Cloud Infrastructure',
  'Customer Systems',
];

export function ArchitectureSection() {
  return (
    <section className="section-pad relative overflow-hidden bg-ink text-paper" id="architecture">
      <div className="mx-auto max-w-wide">
        <ScrollReveal>
          <p className="eyebrow text-accent-bright">Platform architecture</p>
          <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold md:text-4xl">
            How intelligence moves through the suite
          </h2>
          <p className="mt-3 max-w-xl text-sm text-paper/65">
            Suite → products → AI agents → cloud → customer systems. Animated connections illustrate
            governed data flow — not decorative motion.
          </p>
        </ScrollReveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <ol className="space-y-3">
            {LAYERS.map((layer, i) => (
              <li key={layer} className="flex items-start gap-4 border-b border-white/10 pb-3.5">
                <ScrollReveal delay={i * 0.04} className="flex w-full items-start gap-4">
                  <span className="font-display text-xl text-accent-bright/70">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-base font-medium">{layer}</p>
                    {i < LAYERS.length - 1 && (
                      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-paper/35">
                        flows to
                      </p>
                    )}
                  </div>
                </ScrollReveal>
              </li>
            ))}
          </ol>

          <ScrollReveal delay={0.1}>
            <div className="min-h-[360px] overflow-hidden rounded-xl border border-white/10 bg-ink-soft/50 p-2 backdrop-blur-sm">
              <ArchitectureFlowVisual className="h-[380px] w-full" />
              <p className="sr-only">
                {SITE.suite} interactive architecture diagram with animated data flow
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
