'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

type Note = { id: string; title: string; body?: string; href?: string; read_at?: string | null };

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[]>([]);

  const load = () => {
    apiClient<{ notifications: Note[] }>('/me/notifications')
      .then((d) => setItems(d.notifications || []))
      .catch(() => setItems([]));
  };

  useEffect(() => {
    load();
  }, []);

  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="relative">
      <button type="button" className="relative text-slate-400 hover:text-white" aria-label="Notifications" onClick={() => { setOpen((v) => !v); load(); }}>
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-white/10 bg-slate-900 p-2 shadow-xl">
          <div className="px-2 py-1 text-xs font-semibold uppercase text-slate-500">Notifications</div>
          <ul className="max-h-72 overflow-auto">
            {items.map((n) => (
              <li key={n.id} className="border-t border-white/5 px-2 py-2 text-sm">
                <div className="font-medium text-slate-100">{n.title}</div>
                {n.body && <div className="text-xs text-slate-400">{n.body}</div>}
                {n.href && (
                  <Link href={n.href} className="text-xs text-sky-400" onClick={() => setOpen(false)}>
                    Open
                  </Link>
                )}
              </li>
            ))}
            {!items.length && <li className="px-2 py-3 text-xs text-slate-500">No notifications</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
