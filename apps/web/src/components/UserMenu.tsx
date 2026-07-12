'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Settings, User, Code2, HelpCircle, Building2 } from 'lucide-react';
import { logout } from '@/lib/auth';
import { isDebugMode, setDebugMode } from '@/lib/debug-mode';

export function UserMenu({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const [debug, setDebug] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDebug(isDebugMode());
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex items-center gap-2 rounded-[var(--eig-radius-sm)] border border-[var(--eig-border)] bg-[var(--eig-glass-bg)] px-2.5 py-1.5 text-sm text-slate-300 transition hover:border-sky-500/30 hover:text-white"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <User size={16} aria-hidden />
        <span className="hidden max-w-[140px] truncate sm:inline">{label}</span>
        <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-[var(--eig-radius-md)] border border-[var(--eig-border)] bg-slate-950/95 shadow-[var(--eig-shadow-md)] backdrop-blur"
        >
          <Link role="menuitem" href="/preferences" className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5" onClick={() => setOpen(false)}>
            <Settings size={14} /> Preferences
          </Link>
          <Link role="menuitem" href="/commercial" className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5" onClick={() => setOpen(false)}>
            <Building2 size={14} /> License & Trial
          </Link>
          <Link role="menuitem" href="/help" className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5" onClick={() => setOpen(false)}>
            <HelpCircle size={14} /> Help Center
          </Link>
          <Link role="menuitem" href="/developer" className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5" onClick={() => setOpen(false)}>
            <Code2 size={14} /> Developer Mode
          </Link>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-white/5"
            onClick={() => {
              const next = !debug;
              setDebugMode(next);
              setDebug(next);
            }}
          >
            <Code2 size={14} />
            {debug ? 'Disable Debug Mode' : 'Enable Debug Mode'}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 border-t border-white/5 px-3 py-2.5 text-left text-sm text-red-300 hover:bg-white/5"
            onClick={() => logout()}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
