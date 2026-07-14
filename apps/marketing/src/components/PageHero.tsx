import type { ReactNode } from 'react';

export function PageHero({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-paper-line bg-paper px-6 py-14 text-ink md:px-10 md:py-16 lg:px-16 dark:border-ink-muted dark:bg-ink dark:text-paper dark:bg-none">
      <div className="mx-auto max-w-wide">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="font-display mt-3 max-w-3xl text-3xl font-semibold leading-tight text-ink md:text-4xl dark:text-paper">
          {title}
        </h1>
        {children && (
          <div className="mt-4 max-w-2xl text-base leading-relaxed text-mist">{children}</div>
        )}
      </div>
    </header>
  );
}
