import { CtaBand } from '@/components/CtaBand';
import { PageHero } from '@/components/PageHero';
import { RETAIL_FEATURES, RETAIL_ROADMAP } from '@/lib/product-content';

export default function RetailEdgeProductPage() {
  return (
    <>
      <PageHero eyebrow="RetailEdge360" title="Smart Retail Operations Platform">
        POS, inventory, GST, loyalty, and AI inventory — currently in active development.
      </PageHero>
      <section className="section-pad mx-auto max-w-wide space-y-14">
        <div>
          <h2 className="font-display text-xl font-semibold">Planned capabilities</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RETAIL_FEATURES.map((f) => (
              <li key={f} className="border-l-2 border-accent/40 pl-3 text-sm text-mist">
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">Roadmap highlights</h2>
          <ul className="mt-4 space-y-2 text-sm text-mist">
            {RETAIL_ROADMAP.map((r) => (
              <li key={r}>· {r}</li>
            ))}
          </ul>
        </div>
      </section>
      <CtaBand
        title="Join the RetailEdge360 early conversation"
        primary={{ href: '/contact?intent=retail', label: 'Talk to Product' }}
        secondary={{ href: '/products', label: 'Back to Products' }}
      />
    </>
  );
}
