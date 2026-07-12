/**
 * Buyer-facing navigation — CIO/evaluator path first.
 * Admin, Developer, Quantum, Marketplace live behind Debug Mode only.
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
  Building2,
  HelpCircle,
  BookOpen,
  Sparkles,
  GitBranch,
  Activity,
  Server,
  Radio,
  Factory,
  Leaf,
  Globe,
  Atom,
  User,
  KeyRound,
  Code2,
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
  defaultCollapsed?: boolean;
};

function bankingEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_PACK_BANKING360_ENABLED;
  if (raw === undefined || raw === '') return true;
  return raw !== 'false' && raw !== '0';
}

/** Business-facing navigation (default). */
export function getNavSections(): NavSection[] {
  const assurance: NavItem[] = [
    { href: '/security', label: 'Security', icon: Shield },
    { href: '/itsm', label: 'ITSM', icon: CheckCircle },
    { href: '/aiops', label: 'AIOps / RCA', icon: BrainCircuit },
  ];
  if (bankingEnabled()) {
    assurance.splice(2, 0, { href: '/banking360', label: 'Banking360', icon: Building2 });
  }

  return [
    {
      id: 'overview',
      label: 'Overview',
      items: [
        { href: '/dashboard', label: 'Executive Home', icon: LayoutDashboard },
        { href: '/ops-intelligence', label: 'Ops Intelligence', icon: Bot },
        { href: '/reports', label: 'Reports', icon: TrendingUp },
        { href: '/demo/guided', label: 'Guided Evaluation', icon: Sparkles },
      ],
    },
    {
      id: 'estate',
      label: 'Estate',
      items: [
        { href: '/discovery', label: 'Discovery', icon: Radar },
        { href: '/cmdb', label: 'CMDB', icon: Database },
        { href: '/cmdb/drift', label: 'CMDB Drift', icon: Database },
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
      items: [
        { href: '/dashboards', label: 'Ops Dashboards', icon: LayoutDashboard },
        { href: '/transactions', label: 'Transactions', icon: GitBranch },
        { href: '/observability', label: 'Observability', icon: Activity },
        { href: '/synthetics', label: 'Synthetics', icon: Activity },
        { href: '/fleet', label: 'Universal Agents', icon: Server },
        { href: '/apm', label: 'APM', icon: Waypoints },
        { href: '/network', label: 'Network', icon: Radio },
        { href: '/ot', label: 'OT / Industrial', icon: Factory },
        { href: '/compliance', label: 'Compliance', icon: CheckCircle },
        { href: '/governance', label: 'Governance / HA-DR', icon: Globe },
        { href: '/sustainability', label: 'Sustainability', icon: Leaf },
        { href: '/analytics', label: 'Predictive Analytics', icon: TrendingUp },
        { href: '/preferences', label: 'Preferences', icon: User },
        { href: '/settings/sso', label: 'SSO settings', icon: KeyRound },
        { href: '/demo', label: 'Demo Controls', icon: Sparkles },
        { href: '/help', label: 'Help Center', icon: HelpCircle },
        { href: '/about', label: 'About', icon: BookOpen },
      ],
    },
  ];
}

/** Internal engineering / release surfaces — Debug Mode only in nav. */
export const INTERNAL_NAV: NavItem[] = [
  { href: '/admin', label: 'Enterprise Admin', icon: Building2 },
  { href: '/commercial', label: 'License & Trial', icon: Building2 },
  { href: '/marketplace', label: 'Marketplace', icon: Globe },
  { href: '/quantum', label: 'Quantum Ready', icon: Atom },
  { href: '/developer', label: 'Developer Mode', icon: Code2 },
  { href: '/discovery-ops', label: 'Discovery Ops', icon: Radar },
  { href: '/agents', label: 'AI Agents', icon: Bot },
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
  guided: 'Guided Evaluation',
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
  preferences: 'Preferences',
  agents: 'AI Agents',
  settings: 'Settings',
  sso: 'SSO',
};
