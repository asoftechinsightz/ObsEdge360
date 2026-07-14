import { CtaBand } from '@/components/CtaBand';
import { LeadForm } from '@/components/LeadForm';
import { PageHero } from '@/components/PageHero';
import { SITE } from '@/lib/site';

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Talk to AsoftechInsightz">
        Sales, security questionnaires, and partnership conversations — {SITE.email}
      </PageHero>
      <section className="section-pad mx-auto max-w-wide">
        <div className="mx-auto max-w-xl">
          <LeadForm intent="sales" title="How can we help?" submitLabel="Send message" />
        </div>
      </section>
    </>
  );
}
