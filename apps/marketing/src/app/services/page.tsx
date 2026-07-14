import { CtaBand } from '@/components/CtaBand';
import { PageHero } from '@/components/PageHero';

const SERVICES = [
  ['Advisory', 'Architecture and operating-model design for digital operations and growth platforms.'],
  ['Implementation', 'Deploy Asoftech Business Suite with hybrid, cloud, or on-prem patterns.'],
  ['Integration', 'Adapters, OpenTelemetry, CRM, and ITSM connectors aligned to your estate.'],
  ['Managed uplift', 'Enablement, runbooks, and executive reporting cadence after go-live.'],
];

export default function ServicesPage() {
  return (
    <>
      <PageHero eyebrow="Services" title="Consulting and delivery">
        Outcome-led services that accompany the suite — not a separate generic SI catalog.
      </PageHero>
      <section className="section-pad mx-auto max-w-wide">
        <div className="grid gap-6 md:grid-cols-2">
          {SERVICES.map(([t, d]) => (
            <article key={t} className="border-t-2 border-accent pt-4">
              <h2 className="font-display text-xl font-semibold">{t}</h2>
              <p className="mt-2 text-sm text-mist">{d}</p>
            </article>
          ))}
        </div>
      </section>
      <CtaBand
        title="Scope a delivery engagement"
        primary={{ href: '/contact?intent=services', label: 'Contact Services' }}
        secondary={{ href: '/demo', label: 'Book a Demo' }}
      />
    </>
  );
}
