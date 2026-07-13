'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { flattenNav } from '@/lib/nav-config';
import { isDebugMode } from '@/lib/debug-mode';
import { trackSearch } from '@/lib/cvp/analytics';
import { apiClient } from '@/lib/api-client';

type SearchHit = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  category: string;
};

type SearchCategory = {
  id: string;
  label: string;
  results: SearchHit[];
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [debug, setDebug] = useState(false);
  const [categories, setCategories] = useState<SearchCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setCategories([]);
      setErr('');
      setLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setErr('');
      trackSearch(term);
      apiClient<{ categories: SearchCategory[] }>(`/search?q=${encodeURIComponent(term)}&limit=8`)
        .then((data) => setCategories(data.categories ?? []))
        .catch((e: Error) => {
          setCategories([]);
          setErr(e.message);
        })
        .finally(() => setLoading(false));
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, open]);

  const navFallback = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return routes.slice(0, 8).map((r) => ({ id: r.href, title: r.label, subtitle: r.href, href: r.href, category: 'navigation' }));
    return routes
      .filter((r) => r.label.toLowerCase().includes(s) || r.href.includes(s) || r.keywords?.some((k) => k.includes(s)))
      .slice(0, 8)
      .map((r) => ({ id: r.href, title: r.label, subtitle: r.href, href: r.href, category: 'navigation' }));
  }, [q, routes]);

  const showLive = q.trim().length >= 2;
  const hasLive = categories.some((c) => c.results.length > 0);

  if (!open) return null;

  const go = (href: string) => {
    setOpen(false);
    setQ('');
    router.push(href);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Enterprise search"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-[var(--eig-radius-lg)] border border-[var(--eig-border)] bg-slate-950/95 shadow-[var(--eig-shadow-md)]"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search applications, servers, incidents, CMDB, reports… (Ctrl/Cmd+K)"
          className="w-full border-b border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
          aria-label="Enterprise search"
        />
        <div className="max-h-[28rem] overflow-auto p-2" role="listbox">
          {loading && <p className="px-3 py-2 text-xs text-slate-500">Searching live estate…</p>}
          {err && <p className="px-3 py-2 text-xs text-amber-300">{err}</p>}

          {showLive && hasLive &&
            categories.map((cat) => (
              <div key={cat.id} className="mb-2">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{cat.label}</div>
                <ul>
                  {cat.results.map((item) => (
                    <li key={`${cat.id}-${item.id}`} role="option">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-[var(--eig-radius-sm)] px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                        onClick={() => go(item.href)}
                      >
                        <span>
                          <span className="block">{item.title}</span>
                          {item.subtitle && <span className="block text-[11px] text-slate-500">{item.subtitle}</span>}
                        </span>
                        <span className="text-[10px] uppercase text-slate-600">{item.category}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

          {(!showLive || !hasLive) && (
            <div>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {showLive && !loading ? 'No live matches · pages' : 'Pages'}
              </div>
              <ul>
                {navFallback.map((item) => (
                  <li key={item.id} role="option">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-[var(--eig-radius-sm)] px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                      onClick={() => go(item.href)}
                    >
                      <span>{item.title}</span>
                      <span className="text-xs text-slate-500">{item.subtitle}</span>
                    </button>
                  </li>
                ))}
                {!navFallback.length && <li className="px-3 py-6 text-center text-sm text-slate-500">No matches</li>}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
