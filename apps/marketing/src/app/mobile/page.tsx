import { CtaBand } from '@/components/CtaBand';
import { PageHero } from '@/components/PageHero';

export default function MobilePage() {
  return (
    <>
      <PageHero eyebrow="Mobile" title="Mobile experiences across the suite">
        Executive-ready views and field workflows — with RetailEdge360 mobile POS on the roadmap.
      </PageHero>
      <section className="section-pad mx-auto max-w-wide text-sm text-mist">
        <p className="max-w-2xl">
          Mobile surfaces prioritize decision clarity for operators and store teams. Contact us for roadmap timing
          on native POS and executive mobile packs.
        </p>
      </section>
      <CtaBand
        title="Ask about mobile roadmap"
        primary={{ href: '/contact?intent=mobile', label: 'Contact product' }}
        secondary={{ href: '/products/retailedge360', label: 'RetailEdge360' }}
      />
    </>
  );
}
