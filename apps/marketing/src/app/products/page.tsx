import Link from 'next/link';
import { CtaBand } from '@/components/CtaBand';
import { PageHero } from '@/components/PageHero';
import { ProductComparison } from '@/components/ProductComparison';
import { PRODUCTS, SITE } from '@/lib/site';

export default function ProductsPage() {
  return (
    <>
      <PageHero eyebrow={SITE.suite} title="Product ecosystem">
        OpsEdge360, LeadEdge360, and RetailEdge360 — one suite for operations, growth, and retail.
      </PageHero>
      <section className="section-pad mx-auto max-w-wide">
        <div className="grid gap-6 md:grid-cols-3">
          {PRODUCTS.map((p) => (
            <article key={p.slug} className="border border-paper-line p-6 dark:border-ink-muted">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">{p.status}</p>
              <h2 className="font-display mt-2 text-2xl font-semibold">{p.name}</h2>
              <p className="mt-2 text-sm text-mist">{p.blurb}</p>
              <ul className="mt-4 space-y-1 text-sm text-mist">
                {p.highlights.map((h) => (
                  <li key={h}>· {h}</li>
                ))}
              </ul>
              <Link href={p.href} className="mt-6 inline-block text-sm font-semibold text-accent">
                Explore {p.name} →
              </Link>
            </article>
          ))}
        </div>
        <div className="mt-16">
          <h2 className="font-display text-xl font-semibold">Compare the suite</h2>
          <div className="mt-6">
            <ProductComparison />
          </div>
        </div>
      </section>
      <CtaBand
        title="See the suite on your estate"
        primary={{ href: '/demo', label: 'Book a Demo' }}
        secondary={{ href: '/contact?intent=sales', label: 'Contact Sales' }}
      />
    </>
  );
}
