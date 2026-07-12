/**
 * Shared navigation config — sidebar + command palette (UX-1A).
 * Primary surfaces stay short; long-tail lives under More (collapsed by default).
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
  /** When true, section starts collapsed in the sidebar. */
  defaultCollapsed?: boolean;
};

function bankingEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_PACK_BANKING360_ENABLED;
  if (raw === undefined || raw === '') return true;
  return raw !== 'false' && raw !== '0';
}

/** Business-facing navigation (default) — enterprise primary + overflow. */
export function getNavSections(): NavSection[] {
  const assurance: NavItem[] = [
    { href: '/security', label: 'Security', icon: Shield },
    { href: '/itsm', label: 'ITSM', icon: CheckCircle },
    { href: '/aiops', label: 'AIOps / RCA', icon: BrainCircuit },
  ];
  if (bankingEnabled()) {
    assurance.splice(2, 0, { href: '/banking360', label: 'Banking360', icon: Building2 });
  }

  const more: NavItem[] = [
    { href: '/dashboards', label: 'Ops Dashboards', icon: LayoutDashboard },
    { href: '/discovery-ops', label: 'Discovery Ops', icon: Radar },
    { href: '/cmdb/drift', label: 'CMDB Drift', icon: Database },
    { href: '/transactions', label: 'Transactions', icon: GitBranch },
    { href: '/observability', label: 'Observability', icon: Activity },
    { href: '/synthetics', label: 'Synthetics', icon: Activity },
    { href: '/fleet', label: 'Universal Agents', icon: Server },
    { href: '/apm', label: 'APM', icon: Waypoints },
    { href: '/network', label: 'Network', icon: Radio },
    { href: '/ot', label: 'OT / Industrial', icon: Factory },
    { href: '/agents', label: 'AI Agents', icon: Bot },
    { href: '/compliance', label: 'Compliance', icon: CheckCircle },
    { href: '/governance', label: 'Governance / HA-DR', icon: Globe },
    { href: '/sustainability', label: 'Sustainability', icon: Leaf },
    { href: '/analytics', label: 'Predictive Analytics', icon: TrendingUp },
    { href: '/marketplace', label: 'Marketplace', icon: Globe },
    { href: '/quantum', label: 'Quantum Ready', icon: Atom },
    { href: '/admin', label: 'Enterprise Admin', icon: Building2 },
    { href: '/commercial', label: 'License & Trial', icon: Building2 },
    { href: '/preferences', label: 'Preferences', icon: User },
    { href: '/settings/sso', label: 'SSO settings', icon: KeyRound },
    { href: '/demo/guided', label: 'Guided Evaluation', icon: Sparkles },
    { href: '/demo', label: 'Demo Controls', icon: Sparkles },
    { href: '/help', label: 'Help Center', icon: HelpCircle },
    { href: '/about', label: 'About', icon: BookOpen },
    { href: '/developer', label: 'Developer Mode', icon: Code2 },
  ];

  return [
    {
      id: 'overview',
      label: 'Overview',
      items: [
        { href: '/dashboard', label: 'Executive Home', icon: LayoutDashboard },
        { href: '/ops-intelligence', label: 'Ops Intelligence', icon: Bot },
        { href: '/reports', label: 'Reports', icon: TrendingUp },
      ],
    },
    {
      id: 'estate',
      label: 'Estate',
      items: [
        { href: '/discovery', label: 'Discovery', icon: Radar },
        { href: '/cmdb', label: 'CMDB', icon: Database },
        { href: '/twin', label: 'Digital Twin', icon: Network },
        { href: '/topology', label: 'Topology', icon: Waypoints },
      ],
    },
    {
      id: 'assurance',
      label: 'Assurance',
      items: assurance,
    },
    {
      id: 'more',
      label: 'More',
      defaultCollapsed: true,
      items: more,
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
