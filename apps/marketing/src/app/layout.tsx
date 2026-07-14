import type { Metadata } from 'next';
import { Sora, Source_Sans_3 } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Analytics } from '@/components/Analytics';
import { PRODUCTS, SITE } from '@/lib/site';
import './globals.css';

const display = Sora({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const body = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description:
    'Enterprise AI platforms from AsoftechInsightz — Asoftech Business Suite with OpsEdge360, LeadEdge360, and RetailEdge360 for operations, growth, and retail.',
  applicationName: SITE.name,
  keywords: [
    'AsoftechInsightz',
    'Asoftech Business Suite',
    'OpsEdge360',
    'LeadEdge360',
    'RetailEdge360',
    'Enterprise AI Platform',
    'Digital Operations Intelligence',
    'Executive Operations Dashboard',
    'Business Service Intelligence',
    'Observability Platform',
    'Enterprise CRM',
    'Retail Operations Platform',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — We build enterprise AI platforms`,
    description:
      'Asoftech Business Suite: OpsEdge360, LeadEdge360, RetailEdge360 — governed AI for enterprise operations and growth.',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — Enterprise AI Platforms`,
    description: SITE.tagline,
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE.url },
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE.name,
  url: SITE.url,
  description: SITE.tagline,
  email: SITE.email,
  sameAs: [
    'https://app.asoftechinsightz.com',
    'https://opsedge360.asoftechinsightz.com',
    'https://leadedge360.asoftechinsightz.com',
  ],
  brand: PRODUCTS.map((p) => ({
    '@type': 'Brand',
    name: p.name,
    description: p.blurb,
    url: `${SITE.url}${p.href}`,
  })),
};

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE.suite,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: SITE.url,
  provider: { '@type': 'Organization', name: SITE.name, url: SITE.url },
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Contact for enterprise pricing' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
        <ThemeProvider>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
