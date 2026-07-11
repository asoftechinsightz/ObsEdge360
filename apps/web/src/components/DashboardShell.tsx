'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Network, Database, GitBranch, Activity,
  Shield, CheckCircle, Bot, Search, Bell, User, Radio, Leaf, Factory,
  TrendingUp, Atom, Globe, LogOut, Radar, Waypoints, Building2, KeyRound, Server,
} from 'lucide-react';
import clsx from 'clsx';
import { AUTH_COOKIE, logout } from '@/lib/auth';
import { CopilotPanel } from '@/components/CopilotPanel';

const CORE_NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Executive Home' },
  { href: '/discovery', icon: Radar, label: 'Discovery' },
  { href: '/discovery-ops', icon: Radar, label: 'Discovery Ops' },
  { href: '/twin', icon: Network, label: 'Digital Twin' },
  { href: '/topology', icon: Waypoints, label: 'Topology' },
  { href: '/ops-intelligence', icon: Bot, label: 'Ops Intelligence' },
  { href: '/dashboards', icon: LayoutDashboard, label: 'Ops Dashboards' },
  { href: '/cmdb', icon: Database, label: 'CMDB' },
  { href: '/cmdb/drift', icon: Database, label: 'CMDB Drift' },
  { href: '/transactions', icon: GitBranch, label: 'Transactions' },
  { href: '/observability', icon: Activity, label: 'Observability' },
  { href: '/fleet', icon: Server, label: 'Universal Agents' },
  { href: '/apm', icon: Waypoints, label: 'APM' },
  { href: '/network', icon: Radio, label: 'Network' },
  { href: '/ot', icon: Factory, label: 'OT / Industrial' },
  { href: '/security', icon: Shield, label: 'Security' },
  { href: '/compliance', icon: CheckCircle, label: 'Compliance' },
  { href: '/sustainability', icon: Leaf, label: 'Sustainability' },
  { href: '/analytics', icon: TrendingUp, label: 'Predictive Analytics' },
  { href: '/quantum', icon: Atom, label: 'Quantum Ready' },
  { href: '/governance', icon: Globe, label: 'Governance / HA-DR' },
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
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-700 bg-surface/95 px-6 backdrop-blur">
          <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-surface-elevated px-3 py-1.5 text-sm text-slate-400">
            <Search size={14} />
            <span>Search assets, services, transactions...</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setCopilotOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/20"
            >
              <Bot size={16} />
              Copilot
            </button>
            <button type="button" className="relative text-slate-400 hover:text-white">
              <Bell size={20} />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">4</span>
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <User size={18} />
              {userLabel}
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>

      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </div>
  );
}
