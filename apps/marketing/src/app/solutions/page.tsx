import Link from 'next/link';
import { CtaBand } from '@/components/CtaBand';
import { PageHero } from '@/components/PageHero';
import { INDUSTRIES, SITE } from '@/lib/site';

export default function SolutionsPage() {
  return (
    <>
      <PageHero eyebrow="Industries" title="Industry solutions">
        Packaged journeys across {SITE.suite} for regulated and high-volume operations.
      </PageHero>
      <section className="section-pad mx-auto max-w-wide">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((i) => (
            <Link
              key={i.slug}
              href={`/solutions/${i.slug}`}
              className="border border-paper-line p-6 transition hover:border-accent dark:border-ink-muted"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">{i.pack}</p>
              <h2 className="font-display mt-2 text-xl font-semibold">{i.name}</h2>
              <p className="mt-2 text-sm text-mist">{i.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
      <CtaBand
        title="Map your industry pack"
        primary={{ href: '/demo', label: 'Book a Demo' }}
        secondary={{ href: '/contact?intent=sales', label: 'Contact Sales' }}
      />
    </>
  );
}
