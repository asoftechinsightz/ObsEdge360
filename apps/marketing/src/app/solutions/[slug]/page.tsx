import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CtaBand } from '@/components/CtaBand';
import { PageHero } from '@/components/PageHero';
import { INDUSTRY_COPY } from '@/lib/industry-content';
import { INDUSTRIES } from '@/lib/site';

type Params = { params: { slug: string } };

export function generateStaticParams() {
  return INDUSTRIES.map((i) => ({ slug: i.slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const industry = INDUSTRIES.find((i) => i.slug === params.slug);
  if (!industry) return { title: 'Industry' };
  return {
    title: `${industry.name} · ${industry.pack}`,
    description: industry.blurb,
  };
}

export default function IndustryPage({ params }: Params) {
  const industry = INDUSTRIES.find((i) => i.slug === params.slug);
  const copy = INDUSTRY_COPY[params.slug as keyof typeof INDUSTRY_COPY];
  if (!industry || !copy) notFound();

  return (
    <>
      <PageHero eyebrow={industry.pack} title={`${industry.name} solutions`}>
        {industry.blurb}
      </PageHero>
      <section className="section-pad mx-auto max-w-wide space-y-14">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-display text-xl font-semibold">Industry challenges</h2>
            <ul className="mt-4 space-y-2 text-sm text-mist">
              {copy.challenges.map((c) => (
                <li key={c}>· {c}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">Business outcomes</h2>
            <ul className="mt-4 space-y-2 text-sm text-mist">
              {copy.outcomes.map((o) => (
                <li key={o}>· {o}</li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold">Recommended products</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {copy.products.map((p) => (
              <Link
                key={p}
                href={`/products/${p.toLowerCase()}`}
                className="rounded-md border border-paper-line px-4 py-2 text-sm hover:border-accent dark:border-ink-muted"
              >
                {p}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold">AI capabilities</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {copy.ai.map((a) => (
              <li key={a} className="border-l-2 border-accent/40 pl-3 text-sm text-mist">
                {a}
              </li>
            ))}
          </ul>
        </div>

        <article className="border border-paper-line p-6 dark:border-ink-muted">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Case-study style</p>
          <h2 className="font-display mt-2 text-xl font-semibold">{copy.caseStudy.title}</h2>
          <p className="mt-2 text-sm text-mist">{copy.caseStudy.body}</p>
        </article>
      </section>
      <CtaBand
        title={`Talk ${industry.name} outcomes with an architect`}
        primary={{ href: `/demo?industry=${industry.slug}`, label: 'Book a Demo' }}
        secondary={{ href: '/contact?intent=sales', label: 'Contact Sales' }}
      />
    </>
  );
}
