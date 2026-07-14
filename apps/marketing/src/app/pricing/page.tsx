import { CtaBand } from '@/components/CtaBand';
import { PageHero } from '@/components/PageHero';
import { PRODUCTS } from '@/lib/site';

export default function PricingPage() {
  return (
    <>
      <PageHero eyebrow="Pricing" title="Transparent commercial packaging">
        Starter, Professional, and Enterprise packaging by product — final quotes follow discovery of estate size and modules.
      </PageHero>
      <section className="section-pad mx-auto max-w-wide">
        <div className="grid gap-6 md:grid-cols-3">
          {PRODUCTS.map((p) => (
            <article key={p.slug} className="border border-paper-line p-6 dark:border-ink-muted">
              <h2 className="font-display text-xl font-semibold">{p.name}</h2>
              <p className="mt-2 text-sm text-mist">{p.blurb}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-accent">{p.status}</p>
              <ul className="mt-4 space-y-1 text-sm text-mist">
                <li>· Starter — focused rollout</li>
                <li>· Professional — multi-team scale</li>
                <li>· Enterprise — governance & hybrid</li>
              </ul>
            </article>
          ))}
        </div>
      </section>
      <CtaBand
        title="Get a quote for your estate"
        primary={{ href: '/contact?intent=pricing', label: 'Request pricing' }}
        secondary={{ href: '/demo', label: 'Book a Demo' }}
      />
    </>
  );
}
