/**
 * Shared navigation config — sidebar + command palette (UX-1A).
 * Internal/RC routes are excluded from default nav; available in Debug Mode.
 */
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  TrendingUp,
  Shield,
  Radar,
  Network,
  Waypoints,
  Bot,
  BrainCircuit,
  Database,
  CheckCircle,
  GitBranch,
  Activity,
  Server,
  Radio,
  Factory,
  Leaf,
  Globe,
  Atom,
  Building2,
  User,
  KeyRound,
  HelpCircle,
  Code2,
  BookOpen,
  Sparkles,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  keywords?: string[];
};

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

function bankingEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_PACK_BANKING360_ENABLED;
  if (raw === undefined || raw === '') return true;
  return raw !== 'false' && raw !== '0';
}

/** Business-facing navigation (default). */
export function getNavSections(): NavSection[] {
  const industry: NavItem[] = [
    { href: '/compliance', label: 'Compliance', icon: CheckCircle },
    { href: '/sustainability', label: 'Sustainability', icon: Leaf },
    { href: '/analytics', label: 'Predictive Analytics', icon: TrendingUp },
    { href: '/marketplace', label: 'Marketplace', icon: Globe },
    { href: '/quantum', label: 'Quantum Ready', icon: Atom },
  ];
  if (bankingEnabled()) {
    industry.unshift({ href: '/banking360', label: 'Banking360', icon: Building2 });
  }

  return [
    {
      id: 'executive',
      label: 'Executive',
      items: [
        { href: '/dashboard', label: 'Executive Home', icon: LayoutDashboard },
        { href: '/reports', label: 'Executive Reports', icon: TrendingUp },
      ],
    },
    {
      id: 'operations',
      label: 'Operations',
      items: [
        { href: '/ops-intelligence', label: 'Ops Intelligence', icon: Bot },
        { href: '/dashboards', label: 'Ops Dashboards', icon: LayoutDashboard },
        { href: '/discovery', label: 'Discovery', icon: Radar },
        { href: '/discovery-ops', label: 'Discovery Ops', icon: Radar },
        { href: '/twin', label: 'Digital Twin', icon: Network },
        { href: '/topology', label: 'Topology', icon: Waypoints },
        { href: '/cmdb', label: 'CMDB', icon: Database },
        { href: '/cmdb/drift', label: 'CMDB Drift', icon: Database },
        { href: '/transactions', label: 'Transactions', icon: GitBranch },
        { href: '/observability', label: 'Observability', icon: Activity },
        { href: '/synthetics', label: 'Synthetics', icon: Activity },
        { href: '/fleet', label: 'Universal Agents', icon: Server },
        { href: '/apm', label: 'APM', icon: Waypoints },
        { href: '/network', label: 'Network', icon: Radio },
        { href: '/ot', label: 'OT / Industrial', icon: Factory },
      ],
    },
    {
      id: 'ai',
      label: 'AI & Automation',
      items: [
        { href: '/aiops', label: 'AIOps / RCA', icon: BrainCircuit },
        { href: '/agents', label: 'AI Agents', icon: Bot },
      ],
    },
    {
      id: 'itsm',
      label: 'ITSM',
      items: [{ href: '/itsm', label: 'ITSM Center', icon: CheckCircle }],
    },
    {
      id: 'industry',
      label: 'Industry Solutions',
      items: industry,
    },
    {
      id: 'security',
      label: 'Security',
      items: [
        { href: '/security', label: 'Security Center', icon: Shield },
        { href: '/governance', label: 'Governance / HA-DR', icon: Globe },
      ],
    },
    {
      id: 'admin',
      label: 'Administration',
      items: [
        { href: '/admin', label: 'Enterprise Admin', icon: Building2 },
        { href: '/commercial', label: 'License & Trial', icon: Building2 },
        { href: '/preferences', label: 'Preferences', icon: User },
        { href: '/settings/sso', label: 'SSO settings', icon: KeyRound },
      ],
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        { href: '/help', label: 'Help Center', icon: HelpCircle },
        { href: '/demo', label: 'Executive Demo', icon: Sparkles },
        { href: '/about', label: 'About', icon: BookOpen },
        { href: '/developer', label: 'Developer Mode', icon: Code2 },
      ],
    },
  ];
}

/** Internal engineering / release surfaces — Debug Mode only in nav. */
export const INTERNAL_NAV: NavItem[] = [
  { href: '/pilot', label: 'Pilot Package', icon: Building2 },
  { href: '/rc1', label: 'RC1 Readiness', icon: CheckCircle },
  { href: '/rc2', label: 'RC2 Readiness', icon: CheckCircle },
  { href: '/rc3', label: 'RC3 / EPP', icon: CheckCircle },
];

export function flattenNav(includeInternal: boolean): NavItem[] {
  const items = getNavSections().flatMap((s) => s.items);
  if (includeInternal) return [...items, ...INTERNAL_NAV];
  return items;
}

export const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: 'Executive Home',
  reports: 'Executive Reports',
  demo: 'Evaluation Tours',
  security: 'Security Center',
  pilot: 'Pilot Package',
  rc1: 'RC1 Readiness',
  rc2: 'RC2 Readiness',
  rc3: 'RC3 / EPP',
  commercial: 'License & Trial',
  about: 'About',
  help: 'Help Center',
  developer: 'Developer Mode',
  discovery: 'Discovery',
  'discovery-ops': 'Discovery Ops',
  twin: 'Digital Twin',
  topology: 'Topology',
  'ops-intelligence': 'Ops Intelligence',
  dashboards: 'Ops Dashboards',
  aiops: 'AIOps',
  cmdb: 'CMDB',
  drift: 'Drift',
  itsm: 'ITSM',
  transactions: 'Transactions',
  observability: 'Observability',
  synthetics: 'Synthetics',
  fleet: 'Universal Agents',
  apm: 'APM',
  network: 'Network',
  ot: 'OT / Industrial',
  compliance: 'Compliance',
  banking360: 'Banking360',
  sustainability: 'Sustainability',
  analytics: 'Predictive Analytics',
  marketplace: 'Marketplace',
  quantum: 'Quantum Ready',
  governance: 'Governance / HA-DR',
  admin: 'Enterprise Admin',
  titan: 'Program TITAN',
  cvp: 'Customer Validation',
  pilots: 'Pilots',
  feedback: 'Feedback',
  'feature-board': 'Feature Board',
  success: 'Customer Success',
  releases: 'Releases',
  monitoring: 'Monitoring',
  knowledge: 'Knowledge',
  preferences: 'Preferences',
  agents: 'AI Agents',
  settings: 'Settings',
  sso: 'SSO',
  platform: 'Platform',
  capacity: 'Capacity',
  storage: 'Storage',
  quotas: 'Quotas',
  licenses: 'Licenses',
  tenants: 'Tenants',
  sessions: 'Sessions',
  audit: 'Audit',
  health: 'Health',
  ha: 'High Availability',
  cluster: 'Cluster',
  backup: 'Backup',
  restore: 'Restore',
  deployment: 'Deployment',
  workflows: 'Workflows',
  integrations: 'Integrations',
};
