'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  Search,
  Bot,
  PanelLeftClose,
  PanelLeft,
  HelpCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { AUTH_COOKIE } from '@/lib/auth';
import { CopilotPanel } from '@/components/CopilotPanel';
import { EnvironmentBanner } from '@/components/EnvironmentBanner';
import { DemoDataBanner } from '@/components/ede/DemoDataBanner';
import { CommandPalette } from '@/components/CommandPalette';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { NotificationCenter } from '@/components/NotificationCenter';
import { UserMenu } from '@/components/UserMenu';
import { PageTransition } from '@/components/PageTransition';
import { WebVitalsReporter } from '@/components/WebVitalsReporter';
import { ApexModeControls } from '@/components/apex/ApexModeControls';
import { CvpAnalyticsListener } from '@/components/cvp/CvpAnalyticsListener';
import { ThemeToggle } from '@/components/shell/ThemeToggle';
import { QuickActions } from '@/components/shell/QuickActions';
import { OrgContextBadge } from '@/components/shell/OrgContextBadge';
import { apiClient } from '@/lib/api-client';
import { getNavSections, INTERNAL_NAV, type NavSection } from '@/lib/nav-config';
import { isDebugMode } from '@/lib/debug-mode';
import { isPresentationMode, syncApexDomFlags } from '@/lib/apex-mode';

const COLLAPSE_KEY = 'oe360_nav_collapsed';
const OPEN_SECTIONS_KEY = 'oe360_nav_sections';

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

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === '/dashboard') return false;
  return pathname.startsWith(href);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userLabel, setUserLabel] = useState('User');
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [debug, setDebug] = useState(false);
  const [presentation, setPresentation] = useState(false);
  const [sections, setSections] = useState<NavSection[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setUserLabel(readUserLabel());
    setDebug(isDebugMode());
    syncApexDomFlags();
    setPresentation(isPresentationMode());
    const nav = getNavSections();
    setSections(nav);
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
      const raw = localStorage.getItem(OPEN_SECTIONS_KEY);
      if (raw) {
        setOpenSections(JSON.parse(raw));
      } else {
        const defaults: Record<string, boolean> = {};
        for (const s of nav) {
          defaults[s.id] = !s.defaultCollapsed;
        }
        setOpenSections(defaults);
      }
    } catch {
      setOpenSections({
        home: true,
        estate: true,
        observe: true,
        assure: true,
        reports: true,
        administration: false,
      });
    }
    apiClient<{ theme?: string }>('/me/preferences')
      .then((p) => {
        const theme = p.theme === 'light' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
      })
      .catch(() => undefined);
    const onDebug = () => setDebug(isDebugMode());
    const onApex = () => setPresentation(isPresentationMode());
    window.addEventListener('opsedge:debug-mode', onDebug);
    window.addEventListener('opsedge:apex-mode', onApex);
    return () => {
      window.removeEventListener('opsedge:debug-mode', onDebug);
      window.removeEventListener('opsedge:apex-mode', onApex);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  };

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(OPEN_SECTIONS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const brandMark = (
    <div
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-sky-600 text-[10px] font-semibold tracking-tight text-white"
      aria-hidden
    >
      360
    </div>
  );

  const navBody = (
    <>
      <div className="flex items-center justify-between border-b border-[var(--eig-border)] px-3 py-3.5">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          {brandMark}
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight text-slate-100">OpsEdge360</div>
              <div className="truncate text-[10px] uppercase tracking-[0.12em] text-slate-500">Digital ops intelligence</div>
            </div>
          )}
        </Link>
        <button
          type="button"
          className="hidden rounded p-1 text-slate-400 hover:text-white lg:inline-flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={toggleCollapsed}
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-2" aria-label="Primary">
        {sections.map((section) => {
          const open = collapsed || openSections[section.id] !== false;
          const singleHome = section.id === 'home' && section.items.length === 1;
          return (
            <div key={section.id}>
              {!collapsed && !singleHome && (
                <button
                  type="button"
                  className="mb-0.5 flex w-full items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-300"
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={open}
                >
                  {section.label}
                  {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
              )}
              {open && (
                <div className="space-y-0.5">
                  {section.items.map(({ href, icon: Icon, label }) => (
                    <Link
                      key={href}
                      href={href}
                      title={label}
                      className={clsx(
                        'nav-link',
                        collapsed && 'justify-center px-2',
                        isActive(pathname, href) && 'nav-link-active',
                      )}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon size={17} aria-hidden />
                      {!collapsed && <span className="truncate">{singleHome ? 'Home' : label}</span>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {debug && !presentation && (
          <div>
            {!collapsed && (
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-amber-500/80">
                Internal / Debug
              </div>
            )}
            <div className="space-y-0.5">
              {INTERNAL_NAV.map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={clsx('nav-link', collapsed && 'justify-center px-2', isActive(pathname, href) && 'nav-link-active')}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={17} aria-hidden />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-[var(--eig-border)] p-3 text-[11px] text-slate-600">
        {!collapsed && <div>OpsEdge360 · Enterprise</div>}
        {collapsed && <div className="text-center">GA</div>}
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-sky-600 focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      <aside
        className={clsx(
          'fixed z-30 hidden h-full flex-col border-r border-[var(--eig-border)] bg-[var(--eig-glass-bg-strong)] lg:flex',
          collapsed ? 'w-[68px]' : 'w-60',
        )}
      >
        {navBody}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-[var(--eig-border)] bg-slate-950 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--eig-border)] p-3">
              <span className="text-sm font-semibold">Menu</span>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close">
                <ChevronLeft size={18} />
              </button>
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">{navBody}</div>
          </aside>
        </div>
      )}

      <div
        className={clsx(
          'flex flex-1 flex-col ml-0 lg:transition-[margin] lg:duration-200',
          collapsed ? 'lg:ml-[68px]' : 'lg:ml-60',
        )}
      >
        <EnvironmentBanner />
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-[var(--eig-border)] bg-[var(--eig-header-bg)] px-3 backdrop-blur-md sm:gap-3 sm:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className="rounded-[var(--eig-radius-sm)] border border-[var(--eig-border)] p-2 text-slate-300 lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={16} />
            </button>
            <Link href="/dashboard" className="hidden items-center gap-2 lg:flex xl:hidden" aria-label="OpsEdge360 home">
              {brandMark}
            </Link>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--eig-radius-sm)] border border-[var(--eig-border)] bg-black/20 px-3 py-1.5 text-sm text-slate-400 transition hover:border-sky-500/25 hover:text-slate-200 sm:max-w-lg"
              onClick={() => window.dispatchEvent(new Event('opsedge:command-palette'))}
              aria-label="Open universal search"
            >
              <Search size={14} aria-hidden />
              <span className="truncate">Search estate, incidents, services…</span>
              <kbd className="ml-auto hidden rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-500 sm:inline">
                Ctrl K
              </kbd>
            </button>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ApexModeControls />
            <QuickActions />
            <button
              type="button"
              onClick={() => setCopilotOpen(true)}
              className="flex items-center gap-1.5 rounded-[var(--eig-radius-sm)] border border-sky-500/35 bg-sky-500/10 px-2.5 py-1.5 text-sm text-sky-300 transition hover:bg-sky-500/20"
            >
              <Bot size={15} aria-hidden />
              <span className="hidden sm:inline">Copilot</span>
            </button>
            {!presentation && <NotificationCenter />}
            <OrgContextBadge />
            <ThemeToggle />
            <Link
              href="/help"
              className="hidden rounded-[var(--eig-radius-sm)] border border-[var(--eig-border)] p-2 text-slate-400 transition hover:border-sky-500/30 hover:text-white sm:inline-flex"
              aria-label="Help Center"
              title="Help Center"
            >
              <HelpCircle size={15} />
            </Link>
            <UserMenu label={userLabel} />
          </div>
        </header>
        <main id="main-content" className="flex-1 p-4 sm:p-6">
          {!presentation && <Breadcrumbs />}
          {presentation && (
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-violet-300/80">
              Presentation mode · Ctrl+Shift+P to exit
            </div>
          )}
          {!presentation && <DemoDataBanner />}
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
      <CommandPalette />
      <WebVitalsReporter />
      <CvpAnalyticsListener />
    </div>
  );
}
