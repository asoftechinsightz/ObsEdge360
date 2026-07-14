import Link from 'next/link';

export function CtaBand({
  title,
  body,
  primary,
  secondary,
}: {
  title: string;
  body?: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="section-pad border-t border-paper-line bg-ink text-paper dark:border-ink-muted">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-semibold md:text-4xl">{title}</h2>
        {body && <p className="mx-auto mt-4 max-w-xl text-paper/65">{body}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={primary.href} className="btn-primary">
            {primary.label}
          </Link>
          {secondary && (
            <Link
              href={secondary.href}
              className="inline-flex items-center rounded-md border border-white/20 px-5 py-3 text-sm font-medium transition-colors hover:bg-white/8"
            >
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
