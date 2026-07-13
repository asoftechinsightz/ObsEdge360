'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Zap, FileText, Network, Shield, GitBranch, Bot } from 'lucide-react';

const ACTIONS = [
  { href: '/ops-intelligence', label: 'Investigate incident', icon: Bot },
  { href: '/cmdb/drift', label: 'Review CMDB drift', icon: GitBranch },
  { href: '/twin', label: 'Open Digital Twin', icon: Network },
  { href: '/security', label: 'Security findings', icon: Shield },
  { href: '/reports', label: 'Generate executive report', icon: FileText },
];

export function QuickActions() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-[var(--eig-radius-sm)] border border-[var(--eig-border)] px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-sky-500/30 hover:text-white"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Zap size={14} aria-hidden />
        <span>Actions</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-[var(--eig-radius-md)] border border-[var(--eig-border)] bg-slate-950/95 shadow-[var(--eig-shadow-md)] backdrop-blur"
        >
          {ACTIONS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              role="menuitem"
              href={href}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5"
              onClick={() => setOpen(false)}
            >
              <Icon size={14} className="text-slate-500" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
