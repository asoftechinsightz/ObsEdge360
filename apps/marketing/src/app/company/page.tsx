import { CtaBand } from '@/components/CtaBand';
import { PageHero } from '@/components/PageHero';
import { SITE } from '@/lib/site';

export default function CompanyPage() {
  return (
    <>
      <PageHero eyebrow="Company" title={SITE.name}>
        {SITE.tagline}. We build the Asoftech Business Suite for enterprise operators and growth teams.
      </PageHero>
      <section className="section-pad mx-auto max-w-wide max-w-3xl space-y-6 text-mist">
        <p>
          AsoftechInsightz designs governed AI platforms — OpsEdge360 for digital operations intelligence,
          LeadEdge360 for growth, and RetailEdge360 for store operations.
        </p>
        <p>
          We work with CIOs, CISOs, and revenue leaders who need executive clarity without tool sprawl.
        </p>
      </section>
      <CtaBand
        title="Partner with our team"
        primary={{ href: '/contact', label: 'Contact' }}
        secondary={{ href: '/partners', label: 'Partners' }}
      />
    </>
  );
}
