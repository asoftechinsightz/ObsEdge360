import Link from 'next/link';
import { CtaBand } from '@/components/CtaBand';
import { FaqList } from '@/components/FaqList';
import { PageHero } from '@/components/PageHero';
import { OPS_FAQS, OPS_FEATURES } from '@/lib/product-content';

export default function OpsEdgeProductPage() {
  return (
    <>
      <PageHero eyebrow="OpsEdge360" title="Enterprise Digital Operations Intelligence">
        Unified observability, Digital Twin, and Business Service Intelligence for executive command.
      </PageHero>
      <section className="section-pad mx-auto max-w-wide space-y-14">
        <div>
          <h2 className="font-display text-xl font-semibold">Capabilities</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {OPS_FEATURES.map((f) => (
              <li key={f} className="border-l-2 border-accent/40 pl-3 text-sm text-mist">
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">FAQ</h2>
          <div className="mt-4">
            <FaqList items={[...OPS_FAQS]} />
          </div>
        </div>
        <p className="text-sm text-mist">
          Deploy path:{' '}
          <Link className="text-accent" href="https://opsedge360.asoftechinsightz.com">
            opsedge360.asoftechinsightz.com
          </Link>
        </p>
      </section>
      <CtaBand
        title="Run an OpsEdge360 discovery session"
        primary={{ href: '/demo?product=opsedge360', label: 'Book a Demo' }}
        secondary={{ href: '/platform', label: 'Explore Platform' }}
      />
    </>
  );
}
