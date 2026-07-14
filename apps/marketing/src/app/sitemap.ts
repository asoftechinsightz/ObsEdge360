import { MetadataRoute } from 'next';
import { INDUSTRIES, PRODUCTS, SITE } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    '',
    '/platform',
    '/products',
    '/solutions',
    '/services',
    '/resources',
    '/company',
    '/partners',
    '/contact',
    '/demo',
    '/pricing',
    '/integrations',
    '/trust',
    '/mobile',
  ];
  const productPaths = PRODUCTS.map((p) => p.href);
  const industryPaths = INDUSTRIES.map((i) => `/solutions/${i.slug}`);
  return [...staticPaths, ...productPaths, ...industryPaths].map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : path.startsWith('/products/') || path.startsWith('/solutions/') ? 0.8 : 0.7,
  }));
}
