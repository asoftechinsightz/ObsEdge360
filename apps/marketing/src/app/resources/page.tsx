import Link from 'next/link';
import { CtaBand } from '@/components/CtaBand';
import { PageHero } from '@/components/PageHero';

const RESOURCES = [
  ['Platform overview', '/platform', 'Architecture and suite shared services'],
  ['Trust Center', '/trust', 'Security, DPDP, and compliance posture'],
  ['Industry packs', '/solutions', 'Banking, NBFC, retail, and more'],
  ['Demo Center', '/demo', 'Book a guided walkthrough'],
];

export default function ResourcesPage() {
  return (
    <>
      <PageHero eyebrow="Resources" title="Buyer and architect resources">
        Start with platform, trust, and industry packs — then schedule a demo.
      </PageHero>
      <section className="section-pad mx-auto max-w-wide">
        <ul className="grid gap-4 md:grid-cols-2">
          {RESOURCES.map(([t, href, d]) => (
            <li key={href}>
              <Link href={href} className="block border border-paper-line p-6 hover:border-accent dark:border-ink-muted">
                <h2 className="font-display text-lg font-semibold">{t}</h2>
                <p className="mt-2 text-sm text-mist">{d}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <CtaBand
        title="Need a pack tailored to your RFP?"
        primary={{ href: '/contact?intent=resources', label: 'Contact us' }}
        secondary={{ href: '/demo', label: 'Book a Demo' }}
      />
    </>
  );
}
