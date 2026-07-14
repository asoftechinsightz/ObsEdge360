import { CtaBand } from '@/components/CtaBand';
import { PageHero } from '@/components/PageHero';

const INTEGRATIONS = [
  'OpenTelemetry',
  'Prometheus / Grafana ecosystems',
  'ITSM and incident tooling',
  'CRM and messaging channels',
  'Identity providers (SSO / OIDC)',
  'Cloud and on-prem collectors',
];

export default function IntegrationsPage() {
  return (
    <>
      <PageHero eyebrow="Integrations" title="Connect the estate you already run">
        Adapter-based integrations keep OpsEdge360 and the suite vendor-neutral.
      </PageHero>
      <section className="section-pad mx-auto max-w-wide">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATIONS.map((i) => (
            <li key={i} className="border-l-2 border-accent/40 pl-3 text-sm text-mist">
              {i}
            </li>
          ))}
        </ul>
      </section>
      <CtaBand
        title="Discuss your integration map"
        primary={{ href: '/demo', label: 'Book a Demo' }}
        secondary={{ href: '/contact?intent=integrations', label: 'Contact' }}
      />
    </>
  );
}
