'use client';

import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/eig/primitives';
import { BookOpen, Keyboard, LifeBuoy, Shield } from 'lucide-react';

const LINKS = [
  { href: '/demo', title: 'Evaluation Tours', desc: 'Guided product walkthroughs for evaluators (Debug/Internal).', icon: BookOpen },
  { href: '/security', title: 'Security Center', desc: 'MFA, sessions, and security alerts.', icon: Shield },
  { href: '/preferences', title: 'Preferences', desc: 'Theme and landing page.', icon: LifeBuoy },
];

export default function HelpPage() {
  return (
    <DashboardShell>
      <PageHeader
        title="Help Center"
        purpose="Find your way around OpsEdge360. Use Ctrl/Cmd+K anytime to jump to a page."
      />
      <div className="mb-6 eig-panel p-4 text-sm text-slate-300">
        <div className="mb-2 flex items-center gap-2 font-medium text-slate-100">
          <Keyboard size={16} /> Keyboard
        </div>
        <ul className="list-inside list-disc space-y-1 text-slate-400">
          <li>
            <kbd className="rounded border border-slate-600 px-1 text-xs">Ctrl</kbd> /{' '}
            <kbd className="rounded border border-slate-600 px-1 text-xs">Cmd</kbd> +{' '}
            <kbd className="rounded border border-slate-600 px-1 text-xs">K</kbd> — Command palette
          </li>
          <li>Skip link — jump to main content (keyboard focus)</li>
        </ul>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="eig-glass block p-4 transition hover:-translate-y-0.5">
            <l.icon size={18} className="mb-2 text-sky-400" />
            <div className="font-medium text-slate-100">{l.title}</div>
            <p className="mt-1 text-xs text-slate-400">{l.desc}</p>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-xs text-slate-500">
        Support: use your enterprise support channel or contact AsoftechInsightz. Technical JSON and release gates live under Developer Mode.
      </p>
    </DashboardShell>
  );
}
