import { CtaBand } from '@/components/CtaBand';
import { PageHero } from '@/components/PageHero';
import {
  BenefitIcons,
  ComplianceMatrix,
  SecurityCapabilityGrid,
} from '@/components/trust/TrustVisuals';
import {
  COMPLIANCE_GLOBAL,
  COMPLIANCE_INDIA,
  DPDP_CAPABILITIES,
  POSITIONING_SIGNALS,
  SECURITY_CAPABILITIES,
  TRUST_CENTER_NAV,
} from '@/lib/trust-content';

export default function TrustPage() {
  return (
    <>
      <PageHero eyebrow="Trust Center" title="Security, privacy, and compliance posture">
        Capability-led trust for enterprise buyers — India-first compliance clarity without overclaiming certifications.
      </PageHero>
      <section className="section-pad mx-auto max-w-wide space-y-16">
        <nav className="flex flex-wrap gap-3 text-sm">
          {TRUST_CENTER_NAV.map((item) => (
            <a key={item.href} href={item.href} className="text-accent hover:underline">
              {item.label}
            </a>
          ))}
        </nav>

        <div id="security">
          <h2 className="font-display text-xl font-semibold">Security capabilities</h2>
          <p className="mt-2 max-w-2xl text-sm text-mist">
            Controls and platform behaviors buyers can evaluate during diligence.
          </p>
          <div className="mt-6">
            <SecurityCapabilityGrid items={SECURITY_CAPABILITIES} />
          </div>
        </div>

        <div id="privacy">
          <h2 className="font-display text-xl font-semibold">DPDP-aligned privacy controls</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {DPDP_CAPABILITIES.map((c) => (
              <li key={c} className="border-l-2 border-accent/40 pl-3 text-sm text-mist">
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div id="compliance">
          <h2 className="font-display text-xl font-semibold">Compliance matrix</h2>
          <div className="mt-6 space-y-10">
            <ComplianceMatrix title="India" rows={COMPLIANCE_INDIA} />
            <ComplianceMatrix title="Global alignment" rows={COMPLIANCE_GLOBAL} />
          </div>
        </div>

        <div id="positioning">
          <h2 className="font-display text-xl font-semibold">Buyer positioning signals</h2>
          <div className="mt-6">
            <BenefitIcons items={POSITIONING_SIGNALS} />
          </div>
        </div>
      </section>
      <CtaBand
        title="Request a trust review with our architects"
        primary={{ href: '/contact?intent=trust', label: 'Contact Trust' }}
        secondary={{ href: '/demo', label: 'Book a Demo' }}
      />
    </>
  );
}
