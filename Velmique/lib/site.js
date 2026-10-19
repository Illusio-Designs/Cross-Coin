/* Site-wide constants + metadata helpers shared by pages, JSON-LD, sitemap and
   robots — one canonical host so every canonical / OG / sitemap URL agrees. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://velmique.co.in').replace(/\/+$/, '');

/** Absolute URL for a site path ('/shop' → 'https://…/shop'). */
export const absUrl = (path = '/') => (/^https?:\/\//i.test(path) ? path : `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`);

/**
 * Complete Next metadata for a page: title, description, canonical, Open Graph
 * and Twitter card. Next merges metadata shallowly per key, so a page that sets
 * `openGraph` must set all of it — this builds the whole block every time.
 *
 * `noindex` marks private / transactional pages (account, cart, checkout…).
 */
export function pageMeta({ title, description, path = '/', image, type = 'website', noindex = false, extra = {} }) {
  const url = absUrl(path);
  const images = image ? [{ url: absUrl(image) }] : [{ url: absUrl('/logo.webp') }];
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    alternates: { canonical: url },
    openGraph: { type, siteName: 'Velmique', locale: 'en_IN', url, title, description, images, ...(extra.openGraph || {}) },
    twitter: { card: 'summary_large_image', title, description, images: images.map((i) => i.url) },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * pageMeta() with the dashboard-controlled SEO row (`/api/seo?page_name=`)
 * layered over it: the backend wins per field when it has a value, otherwise
 * the page's own copy stays. Server-only (fetches).
 */
export async function seoMeta(pageName, opts) {
  const { buildMetadata } = await import('@/lib/api/seo');
  const base = pageMeta(opts);
  const seo = await buildMetadata(pageName, base);
  return {
    ...base,
    ...seo,
    twitter: { ...base.twitter, title: seo.title || base.twitter.title, description: seo.description || base.twitter.description },
  };
}
