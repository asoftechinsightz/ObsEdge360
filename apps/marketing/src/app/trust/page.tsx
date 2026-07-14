import { CtaBand } from '@/components/CtaBand';
import { PageHero } from '@/components/PageHero';
import {
  BenefitIcons,
  ComplianceMatrix,
  DpdpSection,
  SecurityCapabilityGrid,
} from '@/components/trust/TrustVisuals';
import { POSITIONING_SIGNALS, TRUST_CENTER_NAV } from '@/lib/trust-content';

export default function TrustPage() {
  return (
    <>
      <PageHero eyebrow="Trust Center" title="Security, privacy, and compliance posture">
        Capability-led trust for enterprise buyers — India-first compliance clarity without overclaiming certifications.
      </PageHero>
      <section className="section-pad mx-auto max-w-wide space-y-16">
        <nav className="flex flex-wrap gap-3 text-sm">
          {TRUST_CENTER_NAV.map((item) => (
            <a key={item.id} href={`#${item.id}`} className="text-accent hover:underline">
              {item.title}
            </a>
          ))}
        </nav>

        <div id="overview" className="scroll-mt-28">
          <h2 className="font-display text-xl font-semibold">Security overview</h2>
          <p className="mt-2 max-w-2xl text-sm text-mist">
            Controls and platform behaviors buyers can evaluate during diligence.
          </p>
          <div className="mt-6">
            <SecurityCapabilityGrid />
          </div>
        </div>

        <div id="privacy" className="scroll-mt-28">
          <DpdpSection />
        </div>

        <ComplianceMatrix />

        <div id="rai" className="scroll-mt-28">
          <h2 className="font-display text-xl font-semibold">Buyer positioning signals</h2>
          <div className="mt-6">
            <BenefitIcons items={[...POSITIONING_SIGNALS]} />
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
