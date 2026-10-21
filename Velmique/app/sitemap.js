import { SITE_URL as SITE } from '@/lib/site';
import { getPublicProducts } from '@/lib/api/products';
import { getPublicCategories } from '@/lib/api/categories';
import { getBlogPage } from '@/lib/api/blog';

export const revalidate = 3600;

/* Every indexable URL: static pages, products, collections and journal posts.
   Sources are the same public, brand-scoped endpoints the pages use (the
   admin list endpoints need auth and returned nothing here before). */
// The blog listing returns at most 50 posts per request: walk every page.
async function allBlogPosts() {
  const posts = [];
  for (let page = 1; page <= 40; page += 1) {
    const r = await getBlogPage({ page, limit: 50 }).catch(() => null);
    if (!r?.posts?.length) break;
    posts.push(...r.posts);
    if (page >= (r.totalPages || 1)) break;
  }
  return { posts };
}

export default async function sitemap() {
  const now = new Date();
  const staticRoutes = [
    '', '/shop', '/collections', '/pack', '/journal', '/about', '/contact', '/track-order',
    '/privacy-policy', '/terms', '/shipping-returns', '/cancellation-refund',
  ].map((p) => ({
    url: `${SITE}${p}`,
    lastModified: now,
    changeFrequency: p === '' ? 'daily' : 'weekly',
    priority: p === '' ? 1 : 0.7,
  }));

  const [productsRes, collections, blog] = await Promise.all([
    getPublicProducts({ limit: 500 }).catch(() => ({ products: [] })),
    getPublicCategories().catch(() => []),
    allBlogPosts(),
  ]);

  const productRoutes = (productsRes.products || []).filter((p) => p.slug).map((p) => {
    const img = p.images?.[0];
    return {
      url: `${SITE}/product/${p.slug}`,
      lastModified: p.raw?.updatedAt ? new Date(p.raw.updatedAt) : now,
      changeFrequency: 'weekly',
      priority: 0.9,
      ...(typeof img === 'string' && /^https?:\/\//.test(img) ? { images: [img] } : {}),
    };
  });

  const collectionRoutes = (collections || []).filter((c) => c.slug).map((c) => ({
    url: `${SITE}/collections/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const journalRoutes = (blog.posts || []).filter((b) => b.slug).map((b) => ({
    url: `${SITE}/journal/${b.slug}`,
    lastModified: b.publishedAt ? new Date(b.publishedAt) : now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...collectionRoutes, ...journalRoutes];
}
