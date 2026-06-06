const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://velquira.com';
const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'velquira';

export const revalidate = 3600;

async function safeList(path) {
  try {
    const r = await fetch(`${API}${path}`, {
      headers: { 'X-Brand-Name': BRAND },
      next: { revalidate: 3600 },
    });
    if (!r.ok) return [];
    const json = await r.json();
    return Array.isArray(json) ? json : (json.data || json.items || []);
  } catch {
    return [];
  }
}

export default async function sitemap() {
  const staticRoutes = [
    '', '/about', '/contact', '/collections', '/journal',
    '/policies/privacy-policy', '/policies/terms', '/policies/shipping-returns',
    '/policies/cancellation-refund', '/track-order',
  ].map((p) => ({
    url: `${SITE}${p}`,
    lastModified: new Date(),
    changeFrequency: p === '' ? 'daily' : 'weekly',
    priority: p === '' ? 1 : 0.7,
  }));

  const [products, blogs, collections] = await Promise.all([
    safeList('/api/products?limit=500'),
    safeList('/api/blogs?limit=200'),
    safeList('/api/categories'),
  ]);

  const productRoutes = products.map((p) => ({
    url: `${SITE}/products/${p.slug || p.handle || p.id}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const blogRoutes = blogs.map((b) => ({
    url: `${SITE}/journal/${b.slug || b.id}`,
    lastModified: b.updatedAt || b.publishedAt ? new Date(b.updatedAt || b.publishedAt) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const collectionRoutes = collections.map((c) => ({
    url: `${SITE}/collections/${c.slug || c.handle || c.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes, ...blogRoutes, ...collectionRoutes];
}
