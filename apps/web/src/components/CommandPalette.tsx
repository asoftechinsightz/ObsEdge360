'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const ROUTES = [
  { href: '/dashboard', label: 'Executive Home' },
  { href: '/reports', label: 'Executive Reports' },
  { href: '/synthetics', label: 'Synthetic Monitoring' },
  { href: '/itsm', label: 'ITSM' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/preferences', label: 'Preferences' },
  { href: '/observability', label: 'Observability' },
  { href: '/ops-intelligence', label: 'Ops Intelligence' },
  { href: '/cmdb', label: 'CMDB' },
  { href: '/topology', label: 'Topology' },
  { href: '/aiops', label: 'AIOps' },
  { href: '/security', label: 'Security' },
  { href: '/compliance', label: 'Compliance' },
  { href: '/banking360', label: 'Banking360' },
  { href: '/admin', label: 'Enterprise Admin' },
  { href: '/admin/automation-dashboard', label: 'Automation Dashboard' },
  { href: '/admin/system/ga', label: 'General Availability' },
  { href: '/agents', label: 'AI Agents' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('opsedge:command-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('opsedge:command-palette', onOpen);
    };
  }, []);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ROUTES.slice(0, 8);
    return ROUTES.filter((r) => r.label.toLowerCase().includes(s) || r.href.includes(s)).slice(0, 12);
  }, [q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh]" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Jump to… (Ctrl/Cmd+K)"
          className="w-full border-b border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none"
        />
        <ul className="max-h-72 overflow-auto p-2">
          {items.map((item) => (
            <li key={item.href}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                onClick={() => {
                  setOpen(false);
                  router.push(item.href);
                }}
              >
                <span>{item.label}</span>
                <span className="text-xs text-slate-500">{item.href}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
