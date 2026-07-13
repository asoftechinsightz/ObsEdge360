'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    setTheme(current);
  }, []);

  const toggle = async () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      await apiClient('/me/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ theme: next }),
      });
    } catch {
      /* local theme still applied */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-[var(--eig-radius-sm)] border border-[var(--eig-border)] p-2 text-slate-400 transition hover:border-sky-500/30 hover:text-white"
      aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
      title="Theme"
    >
      {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}
