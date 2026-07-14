import Link from 'next/link';
import { SITE } from '@/lib/site';
import { POSITIONING_SIGNALS } from '@/lib/trust-content';
import { ConsultingSection } from './ConsultingSection';
import {
  AiPlatformVisual,
  IndustryMapVisual,
  SuccessJourneyVisual,
} from './ConsultingVisuals';
import { HeroSection } from './HeroSection';
import {
  OutcomesVisual,
  PlatformEcosystemVisual,
  ProductEcosystemFlow,
  SharedServicesVisual,
} from '@/components/platform/PlatformVisuals';
import { ArchitectureFlowVisual } from '@/components/viz/VisualGate';
import { BenefitIcons, SecurityCapabilityGrid } from '@/components/trust/TrustVisuals';
import { ScrollReveal } from './ScrollReveal';

export function HomePage() {
  return (
    <>
      <HeroSection />

      <ConsultingSection
        id="challenges"
        surface="paper"
        eyebrow="Business Challenges"
        title="Separate systems create separate truths"
        visual={
          <div className="grid gap-4 p-6 md:grid-cols-3 md:p-8">
            {[
              ['Tool sprawl', 'Too many consoles, too little shared context.'],
              ['Operational blind spots', 'Business services fail without a single view of risk.'],
              ['Disconnected growth', 'CRM and retail move without operations confidence.'],
            ].map(([t, d]) => (
              <article key={t} className="border-t-2 border-accent pt-4">
                <h3 className="font-display text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-mist">{d}</p>
              </article>
            ))}
          </div>
        }
        benefits={[
          'One operating picture for executives',
          'Fewer reconciling spreadsheets',
          'Risk visible before customers feel it',
          'Growth aligned to service readiness',
        ]}
        cta={{ href: '/platform', label: 'See How We Solve It', variant: 'secondary' }}
      >
        <p>
          CIOs and transformation leaders inherit a patchwork of CRM, retail tools, and monitoring
          stacks. Each answers a local question. None explains how the enterprise actually runs.
        </p>
        <p>
          {SITE.name} exists to replace that fragmentation with a governed Business Suite —
          specialized products on one identity, analytics, and AI foundation.
        </p>
      </ConsultingSection>

      <ConsultingSection
        id="suite"
        surface="teal"
        eyebrow="Asoftech Business Suite"
        title="One Intelligent Business Suite for Modern Enterprises"
        visual={
          <div className="bg-ink p-2 md:p-4">
            <div className="h-[320px] md:h-[400px]">
              <PlatformEcosystemVisual className="h-full w-full" />
            </div>
          </div>
        }
        benefits={[
          'Unified Platform',
          'AI Powered',
          'Enterprise Security',
          'Real-Time Analytics',
          'API First',
          'Multi-Tenant',
        ]}
        cta={[
          { href: '/platform', label: 'Explore Platform' },
          { href: '/demo', label: 'Book Demo', variant: 'secondary' },
        ]}
      >
        <p>
          The {SITE.suite} is how we package enterprise AI for business outcomes — not as isolated
          products sold separately with no shared control plane.
        </p>
        <p>
          LeadEdge360, RetailEdge360, and OpsEdge360 specialize where teams need depth. Identity,
          AI, security, and analytics stay shared so programs compound over time.
        </p>
      </ConsultingSection>

      <ConsultingSection
        id="architecture"
        surface="wash"
        eyebrow="Architecture"
        title="Platform architecture executives can understand at a glance"
        visual={
          <div className="h-[360px] bg-ink md:h-[440px]">
            <ArchitectureFlowVisual className="h-full w-full" />
          </div>
        }
        benefits={[
          'Suite → products → AI → cloud → customer systems',
          'Animated governed data flow',
          'OpenTelemetry and API-first edge',
          'Hybrid and on-premises ready',
        ]}
        cta={{ href: '/platform#architecture', label: 'View Architecture' }}
      >
        <p>
          Architecture should explain relationships, not bury them in feature lists. Our suite
          diagram shows how value and control move through the platform.
        </p>
      </ConsultingSection>

      <ConsultingSection
        id="ecosystem"
        surface="glass"
        eyebrow="Product Ecosystem"
        title="Products that work as one operating loop"
        visual={
          <div className="bg-ink px-2 py-8 md:py-10">
            <ProductEcosystemFlow />
          </div>
        }
        benefits={[
          'LeadEdge360 — demand and CRM',
          'RetailEdge360 — store and inventory ops',
          'OpsEdge360 — visibility and risk',
          'Executive AI dashboard — shared outcomes',
        ]}
        cta={[
          { href: '/products', label: 'Explore Products' },
          { href: '/demo', label: 'Book Demo', variant: 'secondary' },
        ]}
      >
        <p>
          We do not present products as disconnected catalogue cards. Demand, retail execution, and
          operations intelligence feed a shared executive view.
        </p>
      </ConsultingSection>

      <ConsultingSection
        id="shared"
        surface="paper"
        eyebrow="Shared Services"
        title="Capabilities every product inherits"
        visual={<SharedServicesVisual />}
        benefits={[
          'Faster Deployment',
          'Lower Operational Cost',
          'Unified Identity',
          'Enterprise-Grade Security',
        ]}
        cta={{ href: '/platform#shared', label: 'Shared Platform Layer' }}
      >
        <p>
          Buy specialized workflows. Inherit SSO, AI engine, analytics, API gateway, automation,
          audit, and reporting from the platform.
        </p>
      </ConsultingSection>

      <ConsultingSection
        id="ai"
        surface="ink"
        eyebrow="AI"
        title="Assistive intelligence with enterprise governance"
        visual={<AiPlatformVisual />}
        benefits={[
          'Scoped agents',
          'Human review by design',
          'Audit-friendly recommendations',
          'Context from live suite data',
        ]}
        cta={[
          { href: '/trust#rai', label: 'Responsible AI' },
          { href: '/platform', label: 'Platform AI', variant: 'secondary' },
        ]}
      >
        <p>
          AI that sits outside identity and policy creates risk for regulated buyers. Our AI
          platform is part of the suite contract — useful, bounded, and reviewable.
        </p>
      </ConsultingSection>

      <ConsultingSection
        id="industries"
        surface="teal"
        eyebrow="Industries"
        title="Solution packs for regulated and scale enterprises"
        visual={<IndustryMapVisual />}
        benefits={[
          'Banking & NBFC packs',
          'Retail and manufacturing',
          'Healthcare & education',
          'Government-ready governance',
        ]}
        cta={{ href: '/solutions', label: 'Browse Industries' }}
      >
        <p>
          Industry programs need vocabulary and controls that match how risk is already governed.
          Solution packs extend the same Business Suite — they do not fork a new platform.
        </p>
      </ConsultingSection>

      <ConsultingSection
        id="trust"
        surface="wash"
        eyebrow="Security & Trust"
        title="Security, trust, and compliance-aware by design"
        visual={<SecurityCapabilityGrid />}
        benefits={[
          'Secure by Design',
          'Privacy by Design',
          'DPDP-aligned capabilities',
          'Clear capability vs roadmap status',
        ]}
        cta={[
          { href: '/trust', label: 'Open Trust Center' },
          { href: '/trust#dpdp', label: 'DPDP Section', variant: 'secondary' },
        ]}
      >
        <p>
          Enterprise diligence starts early. We publish security posture, DPDP-aligned capabilities,
          and compliance status without unverified certification claims.
        </p>
      </ConsultingSection>

      <ConsultingSection
        id="success"
        surface="glass"
        eyebrow="Customer Success"
        title="From risk question to board-ready report"
        visual={<SuccessJourneyVisual />}
        benefits={[
          'Executive dashboards',
          'Business service clarity',
          'Twin and blast radius',
          'Governed AI assist',
        ]}
        cta={{ href: '/solutions/banking', label: 'See a Regulated Journey' }}
      >
        <p>
          Success is the ability for a CIO or business leader to move from a risk question to an
          evidence-based answer — without reconciling five tools.
        </p>
      </ConsultingSection>

      <ConsultingSection
        id="outcomes"
        surface="paper"
        eyebrow="Business Outcomes"
        title="Why executives choose a suite partner"
        visual={<OutcomesVisual />}
        cta={{ href: '/services', label: 'Talk to an Expert', variant: 'secondary' }}
      >
        <p>
          Outcomes are measured in time-to-value, operating cost, clarity, and trust — not feature
          count.
        </p>
      </ConsultingSection>

      <section id="contact" className="section-pad bg-ink text-paper">
        <div className="mx-auto max-w-wide">
          <ScrollReveal>
            <p className="eyebrow text-accent-bright">Contact & Demo</p>
            <h2 className="font-display mt-3 max-w-[22ch] text-3xl font-semibold md:text-4xl">
              Start with a conversation that respects your operating model
            </h2>
            <p className="mt-5 max-w-[40ch] text-base leading-relaxed text-paper/65">
              Book a demo, request an architecture walkthrough, or open a security discussion with
              {` ${SITE.name}`}.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.08} className="mt-10">
            <BenefitIcons
              items={[
                'Enterprise Ready',
                'AI Powered',
                'Secure',
                'Compliance Aware',
                'API First',
                'Business Outcome Driven',
              ]}
            />
          </ScrollReveal>
          <ScrollReveal delay={0.12}>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/demo" className="btn-primary">
                Book Demo
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center rounded-md border border-white/20 px-5 py-3 text-sm font-medium hover:bg-white/8"
              >
                Talk to an Expert
              </Link>
              <Link
                href="/resources#whitepapers"
                className="inline-flex items-center rounded-md border border-white/20 px-5 py-3 text-sm font-medium hover:bg-white/8"
              >
                Download Solution Brief
              </Link>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.14}>
            <ul className="mt-10 flex flex-wrap gap-2">
              {POSITIONING_SIGNALS.map((s) => (
                <li
                  key={s}
                  className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-paper/55"
                >
                  {s}
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
