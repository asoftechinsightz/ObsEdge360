import { LeadForm } from '@/components/LeadForm';
import { PageHero } from '@/components/PageHero';

export default function DemoPage() {
  return (
    <>
      <PageHero eyebrow="Demo Center" title="Book a guided product demo">
        See OpsEdge360, LeadEdge360, and the suite journey on a scenario that matches your industry.
      </PageHero>
      <section className="section-pad mx-auto max-w-wide">
        <div className="mx-auto max-w-xl">
          <LeadForm intent="demo" title="Request a demo" submitLabel="Request demo" />
        </div>
      </section>
    </>
  );
}
