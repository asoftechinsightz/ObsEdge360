import { CtaBand } from '@/components/CtaBand';
import { FaqList } from '@/components/FaqList';
import { PageHero } from '@/components/PageHero';
import { LEAD_FAQS, LEAD_FEATURES } from '@/lib/product-content';

export default function LeadEdgeProductPage() {
  return (
    <>
      <PageHero eyebrow="LeadEdge360" title="AI-powered Lead Management & Growth">
        CRM, marketing automation, WhatsApp CRM, and an AI sales copilot for pipeline command.
      </PageHero>
      <section className="section-pad mx-auto max-w-wide space-y-14">
        <div>
          <h2 className="font-display text-xl font-semibold">Capabilities</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LEAD_FEATURES.map((f) => (
              <li key={f} className="border-l-2 border-accent/40 pl-3 text-sm text-mist">
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">FAQ</h2>
          <div className="mt-4">
            <FaqList items={[...LEAD_FAQS]} />
          </div>
        </div>
      </section>
      <CtaBand
        title="See LeadEdge360 on a live funnel"
        primary={{ href: '/demo?product=leadedge360', label: 'Book a Demo' }}
        secondary={{ href: '/contact?intent=sales', label: 'Contact Sales' }}
      />
    </>
  );
}
