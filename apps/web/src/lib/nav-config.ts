/**
 * Domain-first navigation — primary product domains only.
 * Nested capabilities live in page tabs / command palette / drill-downs.
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
  Settings,
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
  const assure: NavItem[] = [
    { href: '/security', label: 'Security', icon: Shield, keywords: ['threats', 'posture', 'ciso'] },
    { href: '/compliance', label: 'Compliance', icon: CheckCircle, keywords: ['iso', 'pci', 'soc2', 'rbi'] },
    { href: '/itsm', label: 'ITSM', icon: CheckCircle, keywords: ['incident', 'change'] },
    { href: '/aiops', label: 'AIOps / RCA', icon: BrainCircuit, keywords: ['root cause'] },
  ];
  if (bankingEnabled()) {
    assure.splice(2, 0, {
      href: '/banking360',
      label: 'Banking360',
      icon: Building2,
      keywords: ['payments', 'upi', 'cbs'],
    });
  }

  return [
    {
      id: 'home',
      label: 'Home',
      items: [{ href: '/dashboard', label: 'Executive Home', icon: LayoutDashboard, keywords: ['cio', 'kpis'] }],
    },
    {
      id: 'estate',
      label: 'Estate',
      items: [
        { href: '/discovery', label: 'Discovery', icon: Radar },
        { href: '/cmdb', label: 'CMDB', icon: Database },
        { href: '/cmdb/drift', label: 'CMDB Drift', icon: Database, keywords: ['drift', 'change'] },
        { href: '/twin', label: 'Digital Twin', icon: Network },
        { href: '/topology', label: 'Topology', icon: Waypoints },
      ],
    },
    {
      id: 'observe',
      label: 'Observe',
      items: [
        { href: '/ops-intelligence', label: 'Ops Intelligence', icon: Bot },
        {
          href: '/observability',
          label: 'Observability',
          icon: Activity,
          keywords: ['logs', 'metrics', 'traces', 'apps', 'kubernetes', 'containers'],
        },
        { href: '/synthetics', label: 'Synthetics', icon: Activity },
        { href: '/network', label: 'Network', icon: Radio },
        { href: '/transactions', label: 'Transactions', icon: GitBranch },
      ],
    },
    {
      id: 'assure',
      label: 'Assure',
      items: assure,
    },
    {
      id: 'reports',
      label: 'Reports',
      items: [
        { href: '/reports', label: 'Executive Reports', icon: TrendingUp },
        { href: '/demo/guided', label: 'Guided Evaluation', icon: Sparkles },
      ],
    },
    {
      id: 'administration',
      label: 'Administration',
      defaultCollapsed: true,
      items: [
        { href: '/admin', label: 'Enterprise Admin', icon: Settings },
        { href: '/preferences', label: 'Preferences', icon: User },
        { href: '/settings/sso', label: 'SSO settings', icon: KeyRound },
        { href: '/help', label: 'Help Center', icon: HelpCircle },
        { href: '/about', label: 'About', icon: BookOpen },
      ],
    },
  ];
}

/** Long-tail surfaces — Debug Mode / command palette only. */
export const INTERNAL_NAV: NavItem[] = [
  { href: '/apm', label: 'APM (legacy)', icon: Waypoints },
  { href: '/dashboards', label: 'Ops Dashboards', icon: LayoutDashboard },
  { href: '/fleet', label: 'Universal Agents', icon: Server },
  { href: '/ot', label: 'OT / Industrial', icon: Factory },
  { href: '/governance', label: 'Governance / HA-DR', icon: Globe },
  { href: '/sustainability', label: 'Sustainability', icon: Leaf },
  { href: '/analytics', label: 'Predictive Analytics', icon: TrendingUp },
  { href: '/commercial', label: 'License & Trial', icon: Building2 },
  { href: '/marketplace', label: 'Marketplace', icon: Globe },
  { href: '/quantum', label: 'Quantum Ready', icon: Atom },
  { href: '/developer', label: 'Developer Mode', icon: Code2 },
  { href: '/discovery-ops', label: 'Discovery Ops', icon: Radar },
  { href: '/agents', label: 'AI Agents', icon: Bot },
  { href: '/demo', label: 'Demo Controls', icon: Sparkles },
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
  observability: 'Unified Observability',
  applications: 'Applications',
  infrastructure: 'Infrastructure',
  kubernetes: 'Kubernetes',
  containers: 'Containers',
  databases: 'Databases',
  logs: 'Logs',
  metrics: 'Metrics',
  traces: 'Traces',
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
