'use client';

import Link from 'next/link';
import clsx from 'clsx';
import {
  COMPLIANCE_GLOBAL,
  COMPLIANCE_INDIA,
  DPDP_CAPABILITIES,
  SECURITY_CAPABILITIES,
  type ComplianceStatus,
} from '@/lib/trust-content';
import { ScrollReveal } from '@/components/ScrollReveal';

const STATUS_LABEL: Record<ComplianceStatus, string> = {
  capability: 'Current capability',
  alignment: 'Alignment',
  roadmap: 'Roadmap',
};

const STATUS_TONE: Record<ComplianceStatus, string> = {
  capability: 'bg-accent/15 text-accent-deep dark:text-accent-bright',
  alignment: 'bg-cobalt/10 text-cobalt dark:text-cobalt-soft',
  roadmap: 'bg-ink/5 text-mist dark:bg-paper/10',
};

export function SecurityCapabilityGrid({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'grid gap-px overflow-hidden rounded-xl border border-paper-line bg-paper-line dark:border-ink-muted dark:bg-ink-muted sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {SECURITY_CAPABILITIES.map((c) => (
        <div key={c.t} className="bg-paper-elev p-5 dark:bg-ink">
          <div className="mb-3 h-1 w-8 rounded-full bg-accent" aria-hidden />
          <p className="font-display text-sm font-semibold">{c.t}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-mist">{c.d}</p>
        </div>
      ))}
    </div>
  );
}

export function DpdpSection() {
  return (
    <div id="dpdp" className="scroll-mt-28">
      <ScrollReveal>
        <p className="eyebrow">India · Privacy</p>
        <h2 className="font-display mt-3 max-w-[28ch] text-3xl font-semibold leading-tight md:text-4xl">
          Digital Personal Data Protection (DPDP) Act Ready
        </h2>
        <div className="mt-5 max-w-[42ch] space-y-3 text-base leading-relaxed text-mist">
          <p>
            The Asoftech Business Suite includes platform capabilities that help organizations
            implement DPDP-aligned practices across identity, access, retention, rights, and audit.
          </p>
          <p className="text-sm">
            This is not a legal compliance or certification claim. Customers remain responsible for
            their own regulatory programs. We provide enabling controls and architecture patterns.
          </p>
        </div>
      </ScrollReveal>
      <ScrollReveal delay={0.08} className="mt-10">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DPDP_CAPABILITIES.map((item) => (
            <li
              key={item}
              className="flex gap-2 rounded-lg border border-paper-line bg-paper-elev px-4 py-3 text-sm dark:border-ink-muted dark:bg-ink"
            >
              <span className="mt-1 text-accent" aria-hidden>
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </ScrollReveal>
    </div>
  );
}

function ComplianceTable({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; status: ComplianceStatus; note: string }[];
}) {
  return (
    <div>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <div className="mt-5 overflow-hidden rounded-xl border border-paper-line dark:border-ink-muted">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper dark:bg-ink-soft">
            <tr className="border-b border-paper-line dark:border-ink-muted">
              <th className="px-4 py-3 font-semibold">Framework</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="hidden px-4 py-3 font-semibold md:table-cell">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-paper-line last:border-0 dark:border-ink-muted">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3">
                  <span className={clsx('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', STATUS_TONE[r.status])}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-mist md:table-cell">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ComplianceMatrix() {
  return (
    <div id="compliance" className="scroll-mt-28 space-y-12">
      <ScrollReveal>
        <p className="eyebrow">Compliance framework</p>
        <h2 className="font-display mt-3 max-w-[26ch] text-3xl font-semibold md:text-4xl">
          Clear status — capability, alignment, or roadmap
        </h2>
        <p className="mt-4 max-w-[42ch] text-mist">
          We distinguish what the platform supports today, how we align to frameworks, and what
          remains on the assurance roadmap. No unverified certification claims.
        </p>
      </ScrollReveal>
      <ComplianceTable title="India" rows={COMPLIANCE_INDIA} />
      <ComplianceTable title="Global" rows={COMPLIANCE_GLOBAL} />
      <p className="text-xs text-mist">
        Need a security questionnaire?{' '}
        <Link href="/contact?intent=security" className="font-medium text-accent hover:text-accent-deep">
          Contact security
        </Link>
        .
      </p>
    </div>
  );
}

export function BenefitIcons({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((b) => (
        <li
          key={b}
          className="flex items-start gap-2 rounded-xl border border-paper-line bg-paper-elev px-4 py-3 text-sm shadow-glass dark:border-ink-muted dark:bg-ink-soft"
        >
          <span className="mt-0.5 font-semibold text-accent" aria-hidden>
            ✓
          </span>
          <span className="font-medium text-ink dark:text-paper">{b}</span>
        </li>
      ))}
    </ul>
  );
}
