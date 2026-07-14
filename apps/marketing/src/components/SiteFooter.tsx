import Link from 'next/link';
import { INDUSTRIES, PRODUCTS, SITE } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="border-t border-paper-line bg-ink text-paper dark:border-ink-muted">
      <div className="mx-auto grid max-w-wide gap-10 px-6 py-14 md:grid-cols-2 lg:grid-cols-5 md:px-10 lg:px-16">
        <div className="lg:col-span-2">
          <p className="font-display text-xl font-semibold">{SITE.name}</p>
          <p className="mt-2 text-sm text-paper/65">{SITE.positioning}</p>
          <p className="mt-3 text-sm text-paper/55">{SITE.suite}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-paper/70">Products</p>
          <ul className="mt-3 space-y-2 text-sm text-paper/75">
            {PRODUCTS.map((p) => (
              <li key={p.slug}>
                <Link href={p.href} className="hover:text-accent-bright">
                  {p.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/pricing" className="hover:text-accent-bright">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/integrations" className="hover:text-accent-bright">
                Integrations
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-paper/70">Industries</p>
          <ul className="mt-3 space-y-2 text-sm text-paper/75">
            {INDUSTRIES.slice(0, 6).map((i) => (
              <li key={i.slug}>
                <Link href={`/solutions/${i.slug}`} className="hover:text-accent-bright">
                  {i.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/solutions" className="hover:text-accent-bright">
                All industries
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-paper/70">Company</p>
          <ul className="mt-3 space-y-2 text-sm text-paper/75">
            <li>
              <Link href="/services" className="hover:text-accent-bright">
                Services & Support
              </Link>
            </li>
            <li>
              <Link href="/trust" className="hover:text-accent-bright">
                Trust Center
              </Link>
            </li>
            <li>
              <Link href="/resources" className="hover:text-accent-bright">
                Resources
              </Link>
            </li>
            <li>
              <Link href="/mobile" className="hover:text-accent-bright">
                Mobile Apps
              </Link>
            </li>
            <li>
              <Link href="/demo" className="hover:text-accent-bright">
                Demo Center
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-accent-bright">
                Contact
              </Link>
            </li>
            <li>
              <a href={`mailto:${SITE.salesEmail}`} className="hover:text-accent-bright">
                Sales
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-6 py-5 text-center text-xs text-paper/60 md:px-10">
        © {new Date().getFullYear()} {SITE.legal}. All rights reserved. OpsEdge360, LeadEdge360, and
        RetailEdge360 are products of {SITE.name}.
      </div>
    </footer>
  );
}
