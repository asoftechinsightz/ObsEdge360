import { INDUSTRIES } from '@/lib/site';

type IndustryCopy = {
  challenges: string[];
  outcomes: string[];
  products: string[];
  ai: string[];
  caseStudy: { title: string; body: string };
};

const sharedAi = [
  'Assistive summaries for executives and operators',
  'Agentic workflows with human approval gates',
  'Anomaly and exception highlighting',
];

export const INDUSTRY_COPY: Record<(typeof INDUSTRIES)[number]['slug'], IndustryCopy> = {
  banking: {
    challenges: ['Fragmented risk views', 'Slow incident-to-board narratives', 'Tool sprawl across channels'],
    outcomes: ['Executive command clarity', 'Faster service recovery', 'Audit-ready operational trails'],
    products: ['OpsEdge360', 'LeadEdge360'],
    ai: sharedAi,
    caseStudy: {
      title: 'Banking360 CIO journey',
      body: 'From Executive Dashboard to Digital Twin, blast radius, observability, and board-ready reporting in one path.',
    },
  },
  nbfc: {
    challenges: ['Lending ops blind spots', 'Collections vs IT disconnect', 'Compliance evidence lag'],
    outcomes: ['Unified service maps', 'Faster exception handling', 'Clearer growth funnel health'],
    products: ['OpsEdge360', 'LeadEdge360'],
    ai: sharedAi,
    caseStudy: {
      title: 'NBFC operations pack',
      body: 'Connect underwriting and servicing dependencies with executive KPIs and incident ownership.',
    },
  },
  retail: {
    challenges: ['Store vs e-comm silos', 'Inventory surprises', 'Inconsistent loyalty signals'],
    outcomes: ['Stock visibility', 'Faster checkout resilience', 'Local growth loops'],
    products: ['RetailEdge360', 'LeadEdge360', 'OpsEdge360'],
    ai: [...sharedAi, 'AI inventory recommendations'],
    caseStudy: {
      title: 'Multi-store retail',
      body: 'POS, GST, loyalty, and operations intelligence aligned under one suite identity.',
    },
  },
  manufacturing: {
    challenges: ['OT/IT gaps', 'Plant service opacity', 'Slow root-cause loops'],
    outcomes: ['Converged visibility', 'Reduced downtime risk', 'Clearer ownership'],
    products: ['OpsEdge360'],
    ai: sharedAi,
    caseStudy: {
      title: 'Plant digital twin',
      body: 'Map production services and blast radius before line stoppages escalate.',
    },
  },
  healthcare: {
    challenges: ['Uptime for clinical services', 'Fragmented ops tooling', 'Audit pressure'],
    outcomes: ['Service continuity', 'Faster incident response', 'Governed AI assist'],
    products: ['OpsEdge360'],
    ai: sharedAi,
    caseStudy: {
      title: 'Clinical service map',
      body: 'Prioritize patient-impacting services with twin and executive dashboards.',
    },
  },
  education: {
    challenges: ['Campus system sprawl', 'Student journey disconnect', 'Limited executive telemetry'],
    outcomes: ['Unified admin plane', 'Clearer digital service health', 'Growth program visibility'],
    products: ['OpsEdge360', 'LeadEdge360'],
    ai: sharedAi,
    caseStudy: {
      title: 'Campus platform',
      body: 'Stabilize learning and enrollment services with suite analytics.',
    },
  },
  logistics: {
    challenges: ['Delivery SLA risk', 'Warehouse vs fleet silos', 'Exception noise'],
    outcomes: ['End-to-end service view', 'Faster exception closure', 'Executive SLA clarity'],
    products: ['OpsEdge360', 'LeadEdge360'],
    ai: sharedAi,
    caseStudy: {
      title: 'Logistics control tower',
      body: 'Tie warehouse and last-mile dependencies into one operational narrative.',
    },
  },
  government: {
    challenges: ['Mission service uptime', 'Procurement tool sprawl', 'Hybrid deploy mandates'],
    outcomes: ['Governed operations', 'Audit-ready trails', 'Citizen-impact prioritization'],
    products: ['OpsEdge360'],
    ai: sharedAi,
    caseStudy: {
      title: 'Mission services',
      body: 'Hybrid deployment with executive visibility and secure development practices.',
    },
  },
};
