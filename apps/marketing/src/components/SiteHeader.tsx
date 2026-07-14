'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import clsx from 'clsx';
import { NAV, NAV_PRIMARY, SITE } from '@/lib/site';
import { useTheme } from './ThemeProvider';

export function SiteHeader() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isHome = pathname === '/';
  const isPlatform = pathname === '/platform';
  const overHero = (isHome || isPlatform) && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const active = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={clsx(
        'sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300',
        overHero
          ? 'border-b border-transparent bg-ink/75 text-paper backdrop-blur-md'
          : 'border-b border-paper-line/80 bg-paper/92 text-ink shadow-sm backdrop-blur-md dark:border-ink-muted dark:bg-ink/92 dark:text-paper dark:shadow-none',
      )}
    >
      <div className="mx-auto flex max-w-wide items-center justify-between gap-4 px-6 py-3.5 md:px-10 lg:px-16">
        <Link href="/" className="group flex min-w-0 flex-col">
          <span
            className={clsx(
              'font-display text-lg font-semibold tracking-tight',
              overHero ? 'text-paper' : 'text-ink dark:text-paper',
            )}
          >
            {SITE.name}
          </span>
          <span
            className={clsx(
              'truncate text-[11px]',
              overHero ? 'text-paper/75 group-hover:text-accent-bright' : 'text-mist group-hover:text-accent',
            )}
          >
            {SITE.tagline}
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Primary">
          {NAV_PRIMARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'rounded-md px-2.5 py-1.5 text-sm transition-colors',
                overHero
                  ? active(item.href)
                    ? 'bg-paper/10 font-medium text-paper'
                    : 'text-paper/70 hover:text-paper'
                  : active(item.href)
                    ? 'bg-ink/5 font-medium text-ink dark:bg-paper/10 dark:text-paper'
                    : 'text-mist hover:text-ink dark:hover:text-paper',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            className={clsx(
              'rounded-md border p-2 transition-colors',
              overHero
                ? 'border-paper/20 text-paper/70 hover:text-paper'
                : 'border-paper-line text-mist hover:text-ink dark:border-ink-muted dark:hover:text-paper',
            )}
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <Link
            href="https://app.asoftechinsightz.com"
            className={clsx(
              'hidden rounded-md px-3 py-2 text-sm sm:inline',
              overHero ? 'text-paper/70 hover:text-paper' : 'text-mist hover:text-ink dark:hover:text-paper',
            )}
          >
            Login
          </Link>
          <Link
            href="/demo"
            className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
          >
            Book Demo
          </Link>
          <button
            type="button"
            className={clsx(
              'rounded-md border p-2 xl:hidden',
              overHero ? 'border-paper/20' : 'border-paper-line dark:border-ink-muted',
            )}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          className={clsx(
            'border-t px-6 py-4 xl:hidden',
            overHero ? 'border-paper/10 bg-ink/95' : 'border-paper-line bg-paper dark:border-ink-muted dark:bg-ink',
          )}
        >
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={clsx(
                    'block rounded-md px-2 py-2 text-sm',
                    overHero ? 'hover:bg-paper/10' : 'hover:bg-ink/5 dark:hover:bg-paper/10',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/mobile" onClick={() => setOpen(false)} className="block px-2 py-2 text-sm">
                Mobile Apps
              </Link>
            </li>
            <li>
              <Link href="https://app.asoftechinsightz.com" className="block px-2 py-2 text-sm">
                Login
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
