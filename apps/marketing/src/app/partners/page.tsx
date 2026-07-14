import { CtaBand } from '@/components/CtaBand';
import { PageHero } from '@/components/PageHero';

export default function PartnersPage() {
  return (
    <>
      <PageHero eyebrow="Partners" title="Technology and delivery partners">
        Build with Asoftech Business Suite — co-sell, implement, and integrate across cloud and on-prem estates.
      </PageHero>
      <section className="section-pad mx-auto max-w-wide text-sm text-mist">
        <p className="max-w-2xl">
          We collaborate with systems integrators, cloud providers, and specialist observability/security partners.
          Reach out to discuss enablement, marketplace architecture, and joint solutions.
        </p>
      </section>
      <CtaBand
        title="Become a partner"
        primary={{ href: '/contact?intent=partners', label: 'Partner inquiry' }}
        secondary={{ href: '/demo', label: 'See the platform' }}
      />
    </>
  );
}
