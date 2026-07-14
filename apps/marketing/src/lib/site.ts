export const SITE = {
  name: 'AsoftechInsightz',
  legal: 'AsoftechInsightz',
  tagline: 'Engineering Intelligent Enterprise Software',
  positioning: 'Enterprise AI Business Platform',
  url: 'https://www.asoftechinsightz.com',
  suite: 'Asoftech Business Suite',
  email: 'hello@asoftechinsightz.com',
  demoEmail: 'demo@asoftechinsightz.com',
  salesEmail: 'sales@asoftechinsightz.com',
} as const;

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/platform', label: 'Platform' },
  { href: '/products', label: 'Products' },
  { href: '/solutions', label: 'Industries' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/integrations', label: 'Integrations' },
  { href: '/trust', label: 'Trust' },
  { href: '/resources', label: 'Resources' },
  { href: '/services', label: 'Services' },
  { href: '/demo', label: 'Demo' },
  { href: '/company', label: 'Company' },
  { href: '/contact', label: 'Contact' },
] as const;

export const NAV_PRIMARY = [
  { href: '/platform', label: 'Platform' },
  { href: '/products', label: 'Products' },
  { href: '/solutions', label: 'Industries' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/trust', label: 'Trust' },
  { href: '/resources', label: 'Resources' },
  { href: '/demo', label: 'Demo' },
] as const;

export const PRODUCTS = [
  {
    slug: 'opsedge360',
    name: 'OpsEdge360',
    status: 'Available' as const,
    blurb: 'Enterprise Digital Operations Intelligence Platform',
    highlights: [
      'Executive Command Center',
      'Unified Observability',
      'Digital Twin',
      'Business Service Intelligence',
    ],
    href: '/products/opsedge360',
    launchUrl: 'https://opsedge360.asoftechinsightz.com',
  },
  {
    slug: 'leadedge360',
    name: 'LeadEdge360',
    status: 'Available' as const,
    blurb: 'AI-powered Lead Management & Growth Platform',
    highlights: ['AI Sales Copilot', 'CRM', 'Marketing Automation', 'WhatsApp CRM'],
    href: '/products/leadedge360',
    launchUrl: 'https://leadedge360.asoftechinsightz.com',
  },
  {
    slug: 'retailedge360',
    name: 'RetailEdge360',
    status: 'In Development' as const,
    blurb: 'Smart Retail Operations Platform',
    highlights: ['Smart POS', 'Inventory & GST', 'Loyalty', 'AI Inventory'],
    href: '/products/retailedge360',
    launchUrl: undefined,
  },
] as const;

export const INDUSTRIES = [
  {
    slug: 'banking',
    name: 'Banking',
    pack: 'Banking360',
    blurb: 'Regulated digital operations, service risk, and executive visibility for banks.',
  },
  {
    slug: 'nbfc',
    name: 'NBFC',
    pack: 'NBFC360',
    blurb: 'Lending operations intelligence with compliance-aware workflows.',
  },
  {
    slug: 'retail',
    name: 'Retail',
    pack: 'Retail360',
    blurb: 'Store-to-cloud retail operations, inventory, and customer growth.',
  },
  {
    slug: 'manufacturing',
    name: 'Manufacturing',
    pack: 'Manufacturing360',
    blurb: 'OT/IT convergence for plant reliability and production services.',
  },
  {
    slug: 'healthcare',
    name: 'Healthcare',
    pack: 'Healthcare360',
    blurb: 'Clinical and operational continuity with audit-ready controls.',
  },
  {
    slug: 'education',
    name: 'Education',
    pack: 'Education360',
    blurb: 'Campus and digital learning operations with unified administration.',
  },
  {
    slug: 'logistics',
    name: 'Logistics',
    pack: 'Logistics360',
    blurb: 'Fleet, warehouse, and delivery service intelligence.',
  },
  {
    slug: 'government',
    name: 'Government',
    pack: 'Government360',
    blurb: 'Mission services with governance, audit trails, and hybrid deploy.',
  },
] as const;

export const POSITIONING_PILLARS = [
  'Unified Business Suite',
  'Governed AI Agents',
  'Operations Intelligence',
  'Growth & CRM',
  'Retail Operations',
  'Hybrid Cloud Deployment',
] as const;

export const ENTERPRISE_CREDIBILITY = [
  {
    title: 'Security & Trust',
    body: 'Tenant isolation, encryption in transit and at rest, audit-ready change control, and a published Trust Center.',
    href: '/trust',
  },
  {
    title: 'Hybrid Deployment',
    body: 'Cloud, on-premises, and hybrid patterns for regulated estates — without fragmenting identity or analytics.',
    href: '/#deploy',
  },
  {
    title: 'Enterprise Support',
    body: 'Architect-led onboarding, clear escalation paths, and managed services when you need operating partners.',
    href: '/services',
  },
  {
    title: 'Open Integration',
    body: 'OpenTelemetry, REST, and webhooks first — plus a transparent roadmap for enterprise connectors.',
    href: '/integrations',
  },
] as const;

export const CHALLENGES = [
  { title: 'Tool Sprawl', body: 'Too many consoles, too little shared context for executives and operators.' },
  { title: 'Operational Blind Spots', body: 'Critical business services fail without a single authoritative view.' },
  { title: 'Alert Fatigue', body: 'Noise overwhelms signal—teams react late, repeatedly.' },
  { title: 'Disconnected Business Systems', body: 'Growth, retail, and ops data live in separate worlds.' },
  { title: 'Slow Decision Making', body: 'Leaders wait on slide decks instead of live operational truth.' },
  { title: 'Security Complexity', body: 'Identity, access, and risk are fragmented across products.' },
] as const;

export const OUTCOMES = [
  { title: 'Improve Executive Visibility', body: 'One command surface for risk, services, and outcomes.' },
  { title: 'Reduce Operational Risk', body: 'See blast radius before customers feel the outage.' },
  { title: 'Accelerate Incident Resolution', body: 'Connect twin, observability, and ownership in one path.' },
  { title: 'Increase Business Growth', body: 'Unify lead and customer motion with operational confidence.' },
  { title: 'Enable AI-driven Decisions', body: 'Assistive intelligence grounded in live enterprise context.' },
  { title: 'Reduce Tool Sprawl', body: 'One suite identity, administration, and analytics layer.' },
] as const;

export const STATS = [
  { label: 'Platform Architecture', value: 'Unified' },
  { label: 'Enterprise Ready', value: 'Yes' },
  { label: 'Hybrid Deployment', value: 'Cloud · On-Prem' },
  { label: 'AI First', value: 'Native' },
  { label: 'Multi Tenant', value: 'Yes' },
  { label: 'Open Integration', value: 'OTel · REST' },
  { label: 'Scalable', value: 'HA Ready' },
] as const;

export const JOURNEY = [
  'Executive Dashboard',
  'Business Service',
  'Digital Twin',
  'Blast Radius',
  'Observability',
  'AI',
  'Automation',
  'Executive Report',
] as const;

export const ECOSYSTEM = [
  'OpenTelemetry',
  'Kubernetes',
  'Microsoft Azure',
  'AWS',
  'Google Cloud',
  'REST APIs',
  'Enterprise Identity',
  'Cloud Native',
] as const;

export const DEPLOYMENTS = [
  { title: 'Cloud', body: 'Managed SaaS with enterprise controls and regional options.' },
  { title: 'On-Premises', body: 'Air-gap capable stacks for regulated environments.' },
  { title: 'Hybrid', body: 'Bridge cloud control planes with private data planes.' },
  { title: 'Managed Services', body: 'Architect-led operations with AsoftechInsightz experts.' },
] as const;

export const INTEGRATIONS = [
  { name: 'Microsoft 365', status: 'Planned' as const },
  { name: 'Google Workspace', status: 'Planned' as const },
  { name: 'WhatsApp Business', status: 'Available' as const },
  { name: 'Microsoft Teams', status: 'Planned' as const },
  { name: 'Slack', status: 'Planned' as const },
  { name: 'Zoom', status: 'Planned' as const },
  { name: 'Razorpay', status: 'Planned' as const },
  { name: 'Stripe', status: 'Planned' as const },
  { name: 'OpenTelemetry', status: 'Available' as const },
  { name: 'REST APIs', status: 'Available' as const },
  { name: 'Webhooks', status: 'Available' as const },
] as const;

export const PRICING_TIERS = [
  {
    name: 'Starter',
    blurb: 'For teams validating suite outcomes on a focused footprint.',
    points: ['Core product access', 'Standard support', 'Cloud deployment'],
    cta: { label: 'Request Pricing', href: '/demo?intent=pricing' },
  },
  {
    name: 'Professional',
    blurb: 'For growing enterprises needing AI, automation, and integrations.',
    points: ['Advanced analytics', 'AI assist features', 'Priority support', 'Hybrid options'],
    cta: { label: 'Book a Demo', href: '/demo' },
    featured: true,
  },
  {
    name: 'Enterprise',
    blurb: 'For regulated and multi-tenant estates with governance requirements.',
    points: ['SSO / enterprise identity', 'HA & DR patterns', 'Dedicated success', 'Custom SLAs'],
    cta: { label: 'Contact Sales', href: '/contact?intent=sales' },
  },
  {
    name: 'Custom',
    blurb: 'Architected for unique industry packs, air-gap, or multi-product programs.',
    points: ['Solution packs', 'Professional services', 'Managed operations'],
    cta: { label: 'Schedule Consultation', href: '/demo?intent=consultation' },
  },
] as const;

export const MOBILE_APPS = [
  { name: 'Android App', status: 'Coming Soon' as const, blurb: 'Native Android experience for suite workflows.' },
  { name: 'iPhone App', status: 'Coming Soon' as const, blurb: 'iOS companion for executives and field teams.' },
  { name: 'Field Sales App', status: 'Coming Soon' as const, blurb: 'LeadEdge360 field capture and pipeline updates.' },
  { name: 'Manager Dashboard', status: 'Coming Soon' as const, blurb: 'Mobile KPI and exception views for managers.' },
  { name: 'AI Voice Assistant', status: 'Coming Soon' as const, blurb: 'Voice-assisted queries across suite context.' },
] as const;

export const TRUST_TOPICS = [
  { id: 'security', title: 'Security', body: 'Defense-in-depth controls across identity, network, and application layers.' },
  { id: 'privacy', title: 'Privacy', body: 'Data minimization, tenant isolation, and clear processing purposes.' },
  { id: 'encryption', title: 'Encryption', body: 'TLS in transit; encryption at rest for platform data stores.' },
  { id: 'backup', title: 'Backup & Recovery', body: 'Automated backups with verified restore procedures.' },
  { id: 'dr', title: 'Disaster Recovery', body: 'Documented RTO/RPO patterns for hybrid and cloud deployments.' },
  { id: 'compliance', title: 'Compliance Roadmap', body: 'Mapped controls toward enterprise assurance programs.' },
  { id: 'sdlc', title: 'Secure Development Lifecycle', body: 'Review gates, dependency hygiene, and change control.' },
  { id: 'rai', title: 'Responsible AI Principles', body: 'Human-in-the-loop, transparency, and scoped agentic behavior.' },
] as const;

export const RESOURCE_LINKS = [
  { id: 'blog', title: 'Blog', body: 'Perspectives on AI platforms, operations, and growth.' },
  { id: 'whitepapers', title: 'Whitepapers', body: 'Executive briefs and architecture narratives.' },
  { id: 'updates', title: 'Product Updates', body: 'What shipped across the Business Suite.' },
  { id: 'releases', title: 'Release Notes', body: 'Versioned changes for products and packs.' },
  { id: 'guides', title: 'Implementation Guides', body: 'Deploy and operate with confidence.' },
  { id: 'docs', title: 'Documentation', body: 'Product and API documentation hubs.' },
  { id: 'faqs', title: 'FAQs', body: 'Common enterprise buyer and admin questions.' },
  { id: 'videos', title: 'Videos', body: 'Demo recordings and journey walkthroughs.' },
  { id: 'webinars', title: 'Webinars', body: 'Live and on-demand sessions with architects.' },
] as const;

export const DEMO_ACTIONS = [
  { title: 'Book a Demo', href: '/demo', body: 'Live executive walkthrough of the Business Suite.' },
  { title: 'Request Pricing', href: '/demo?intent=pricing', body: 'Get tier guidance aligned to your footprint.' },
  { title: 'Download Brochure', href: '/resources#whitepapers', body: 'Shareable overview for stakeholders.' },
  { title: 'Contact Sales', href: '/contact?intent=sales', body: 'Talk commercial terms and packaging.' },
  { title: 'Schedule Consultation', href: '/demo?intent=consultation', body: 'Architect-led discovery workshop.' },
] as const;
