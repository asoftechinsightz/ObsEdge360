'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Network, Database, GitBranch, Activity,
  Shield, CheckCircle, Bot, Search, User, Radio, Leaf, Factory,
  TrendingUp, Atom, Globe, LogOut, Radar, Waypoints, Building2, KeyRound, Server,
  BrainCircuit,
} from 'lucide-react';
import clsx from 'clsx';
import { AUTH_COOKIE, logout } from '@/lib/auth';
import { CopilotPanel } from '@/components/CopilotPanel';
import { EnvironmentBanner } from '@/components/EnvironmentBanner';
import { CommandPalette } from '@/components/CommandPalette';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { NotificationCenter } from '@/components/NotificationCenter';
import { apiClient } from '@/lib/api-client';

const CORE_NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Executive Home' },
  { href: '/reports', icon: TrendingUp, label: 'Executive Reports' },
  { href: '/demo', icon: Globe, label: 'Evaluation Tours' },
  { href: '/security', icon: Shield, label: 'Security Center' },
  { href: '/pilot', icon: Building2, label: 'Pilot Package' },
  { href: '/rc2', icon: CheckCircle, label: 'RC2 Readiness' },
  { href: '/commercial', icon: Building2, label: 'License & Trial' },
  { href: '/rc1', icon: CheckCircle, label: 'RC1 Readiness' },
  { href: '/about', icon: Globe, label: 'About' },
  { href: '/discovery', icon: Radar, label: 'Discovery' },
  { href: '/discovery-ops', icon: Radar, label: 'Discovery Ops' },
  { href: '/twin', icon: Network, label: 'Digital Twin' },
  { href: '/topology', icon: Waypoints, label: 'Topology' },
  { href: '/ops-intelligence', icon: Bot, label: 'Ops Intelligence' },
  { href: '/dashboards', icon: LayoutDashboard, label: 'Ops Dashboards' },
  { href: '/aiops', icon: BrainCircuit, label: 'AIOps / LLM RCA' },
  { href: '/cmdb', icon: Database, label: 'CMDB' },
  { href: '/cmdb/drift', icon: Database, label: 'CMDB Drift' },
  { href: '/itsm', icon: CheckCircle, label: 'ITSM' },
  { href: '/transactions', icon: GitBranch, label: 'Transactions' },
  { href: '/observability', icon: Activity, label: 'Observability' },
  { href: '/synthetics', icon: Activity, label: 'Synthetics' },
  { href: '/fleet', icon: Server, label: 'Universal Agents' },
  { href: '/apm', icon: Waypoints, label: 'APM' },
  { href: '/network', icon: Radio, label: 'Network' },
  { href: '/ot', icon: Factory, label: 'OT / Industrial' },
  { href: '/security', icon: Shield, label: 'Security' },
  { href: '/compliance', icon: CheckCircle, label: 'Compliance' },
  { href: '/sustainability', icon: Leaf, label: 'Sustainability' },
  { href: '/analytics', icon: TrendingUp, label: 'Predictive Analytics' },
  { href: '/marketplace', icon: Globe, label: 'Marketplace' },
  { href: '/quantum', icon: Atom, label: 'Quantum Ready' },
  { href: '/governance', icon: Globe, label: 'Governance / HA-DR' },
  { href: '/admin', icon: Building2, label: 'Enterprise Admin' },
  { href: '/preferences', icon: User, label: 'Preferences' },
  { href: '/agents', icon: Bot, label: 'AI Agents' },
  { href: '/settings/sso', icon: KeyRound, label: 'SSO settings' },
];

/** Banking360 is an optional Solution Pack (ADR-001). Default enabled for backward compatibility. */
function isBanking360PackEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_PACK_BANKING360_ENABLED;
  if (raw === undefined || raw === '') return true;
  return raw !== 'false' && raw !== '0';
}

function buildNav() {
  const nav = [...CORE_NAV];
  if (isBanking360PackEnabled()) {
    const complianceIdx = nav.findIndex((n) => n.href === '/compliance');
    nav.splice(complianceIdx + 1, 0, {
      href: '/banking360',
      icon: Building2,
      label: 'Banking360',
    });
  }
  return nav;
}

const NAV = buildNav();

function readUserLabel(): string {
  if (typeof document === 'undefined') return 'User';
  const match = document.cookie.match(new RegExp(`(?:^|; )${AUTH_COOKIE}=([^;]*)`));
  if (!match) return 'User';
  try {
    const token = decodeURIComponent(match[1]);
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.name ?? payload.email ?? 'User';
  } catch {
    return 'User';
  }
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userLabel, setUserLabel] = useState('User');
  const [copilotOpen, setCopilotOpen] = useState(false);

  useEffect(() => {
    setUserLabel(readUserLabel());
    apiClient<{ theme?: string }>('/me/preferences')
      .then((p) => {
        const theme = p.theme === 'light' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="flex min-h-screen">
      <aside className="fixed flex h-full w-60 flex-col border-r border-slate-700 bg-surface-elevated">
        <div className="border-b border-slate-700 p-5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-white">O</div>
            <div>
              <div className="text-sm font-semibold">OpsEdge360</div>
              <div className="text-xs text-slate-500">Enterprise Observability</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx('nav-link', (pathname === href || (href !== '/dashboard' && pathname.startsWith(href))) && 'nav-link-active')}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-700 p-3">
          <button
            type="button"
            onClick={() => logout()}
            className="nav-link w-full text-left text-red-400 hover:text-red-300"
          >
            <LogOut size={18} />
            Sign out
          </button>
          <div className="mt-2 text-xs text-slate-500">v1.0.0</div>
        </div>
      </aside>

      <div className="ml-60 flex flex-1 flex-col">
        <EnvironmentBanner />
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-700 bg-surface/95 px-6 backdrop-blur">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-surface-elevated px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
            onClick={() => window.dispatchEvent(new Event('opsedge:command-palette'))}
          >
            <Search size={14} />
            <span>Search / jump…</span>
            <kbd className="ml-2 rounded border border-slate-600 px-1 text-[10px]">Ctrl K</kbd>
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setCopilotOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/20"
            >
              <Bot size={16} />
              Copilot
            </button>
            <NotificationCenter />
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <User size={18} />
              {userLabel}
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Breadcrumbs />
          {children}
        </main>
      </div>

      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
      <CommandPalette />
    </div>
  );
}
