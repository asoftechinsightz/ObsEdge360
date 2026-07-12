'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { flattenNav } from '@/lib/nav-config';
import { isDebugMode } from '@/lib/debug-mode';
import { trackSearch } from '@/lib/cvp/analytics';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [debug, setDebug] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setDebug(isDebugMode());
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    const onOpen = () => setOpen(true);
    const onDebug = () => setDebug(isDebugMode());
    window.addEventListener('keydown', onKey);
    window.addEventListener('opsedge:command-palette', onOpen);
    window.addEventListener('opsedge:debug-mode', onDebug);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('opsedge:command-palette', onOpen);
      window.removeEventListener('opsedge:debug-mode', onDebug);
    };
  }, []);

  const routes = useMemo(() => flattenNav(debug), [debug]);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return routes.slice(0, 10);
    return routes
      .filter((r) => r.label.toLowerCase().includes(s) || r.href.includes(s) || r.keywords?.some((k) => k.includes(s)))
      .slice(0, 14);
  }, [q, routes]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-[var(--eig-radius-lg)] border border-[var(--eig-border)] bg-slate-950/95 shadow-[var(--eig-shadow-md)]"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            const v = e.target.value;
            setQ(v);
            if (v.trim().length > 1) trackSearch(v);
          }}
          placeholder="Jump to page… (Ctrl/Cmd+K)"
          className="w-full border-b border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
          aria-label="Filter pages"
        />
        <ul className="max-h-80 overflow-auto p-2" role="listbox">
          {items.map((item) => (
            <li key={item.href} role="option">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-[var(--eig-radius-sm)] px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                onClick={() => {
                  setOpen(false);
                  setQ('');
                  router.push(item.href);
                }}
              >
                <span>{item.label}</span>
                <span className="text-xs text-slate-500">{item.href}</span>
              </button>
            </li>
          ))}
          {!items.length && <li className="px-3 py-6 text-center text-sm text-slate-500">No matches</li>}
        </ul>
      </div>
    </div>
  );
}
