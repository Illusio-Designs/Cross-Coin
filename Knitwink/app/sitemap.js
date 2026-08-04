/**
 * Dynamic XML sitemap for Knitwink.
 *
 * Streams every public route — static pages, every product slug, every
 * category slug, every blog post — so Google can discover new SKUs
 * without waiting for an internal link crawl.
 *
 * Next.js App Router serves this at /sitemap.xml automatically. It runs
 * on the server at request time (no static export needed), so newly
 * created products show up on the next crawl.
 */

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://knitwink.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'knitwink';

async function safeFetch(path) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'X-Brand-Name': BRAND },
      next: { revalidate: 300 },   // 5-min ISR cache for the sitemap fetches
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const revalidate = 300;

export default async function sitemap() {
  const now = new Date();

  const staticRoutes = [
    { url: '/', changeFrequency: 'daily', priority: 1.0 },
    { url: '/collections', changeFrequency: 'daily', priority: 0.9 },
    { url: '/journal', changeFrequency: 'weekly', priority: 0.7 },
    { url: '/about', changeFrequency: 'monthly', priority: 0.5 },
    { url: '/contact', changeFrequency: 'monthly', priority: 0.5 },
    { url: '/track-order', changeFrequency: 'yearly', priority: 0.3 },
  ];

  const [productsResp, categoriesResp, blogResp, policiesResp] = await Promise.all([
    safeFetch('/api/products/catalog?limit=500'),
    safeFetch('/api/categories?nocache=true'),
    safeFetch('/api/public/blogs?limit=200'),
    safeFetch('/api/public/policies'),
  ]);

  const productUrls = (productsResp?.data?.products || productsResp?.products || productsResp?.data || [])
    .filter((p) => p?.slug)
    .map((p) => ({
      url: `/products/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

  const categoryUrls = (categoriesResp?.data?.categories || categoriesResp?.categories || categoriesResp?.data || [])
    .filter((c) => c?.slug || c?.handle)
    .map((c) => ({
      url: `/collections/${c.slug || c.handle}`,
      lastModified: c.updatedAt ? new Date(c.updatedAt) : now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  const blogUrls = (blogResp?.data?.posts || blogResp?.posts || blogResp?.data || [])
    .filter((p) => p?.slug)
    .map((p) => ({
      url: `/journal/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: 'monthly',
      priority: 0.6,
    }));

  const policyUrls = (policiesResp?.data?.policies || policiesResp?.policies || policiesResp?.data || [])
    .filter((p) => p?.name || p?.slug)
    .map((p) => ({
      url: `/policies/${p.slug || p.name}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: 'yearly',
      priority: 0.3,
    }));

  return [...staticRoutes, ...productUrls, ...categoryUrls, ...blogUrls, ...policyUrls].map((entry) => ({
    ...entry,
    url: `${SITE_URL}${entry.url}`,
  }));
}
