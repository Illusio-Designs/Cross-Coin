/**
 * Dynamic XML sitemap for Gripzus (Next.js Pages Router).
 *
 * Unlike the Morbix App Router app (which uses the built-in `sitemap.js`
 * convention), the Pages Router has no sitemap helper, so we serve the XML
 * from a server route: `getServerSideProps` runs at request time, writes the
 * XML to the response, and the page component renders nothing.
 *
 * It lists every public route — static pages plus every product slug,
 * category, blog post and policy — pulled live from the backend, so new SKUs
 * and posts appear on the next crawl without a redeploy.
 */

const SITE_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://gripzus.com').replace(/\/+$/, '');
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'gripzus';

/* Escape the characters that are illegal in an XML text node. The ampersand
   must be replaced first, otherwise it would double-escape the entities the
   later replacements introduce (e.g. turning `&lt;` into `&amp;lt;`). */
function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/* Normalise any timestamp to a W3C date (YYYY-MM-DD); fall back to today. */
function lastmodOf(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/* Fetch a backend endpoint with the brand header. Each call is isolated in
   its own try/catch so one failing endpoint never breaks the whole sitemap. */
async function safeFetch(path) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'X-Brand-Name': BRAND },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function urlTag({ loc, lastmod, changefreq, priority, image }) {
  return (
    '<url>' +
    `<loc>${escapeXml(`${SITE_URL}${loc}`)}</loc>` +
    (lastmod ? `<lastmod>${lastmod}</lastmod>` : '') +
    `<changefreq>${changefreq}</changefreq>` +
    `<priority>${priority}</priority>` +
    // Image sitemap extension — associates the product's primary photo with the
    // page so it is eligible for Google Images.
    (image ? `<image:image><image:loc>${escapeXml(image)}</image:loc></image:image>` : '') +
    '</url>'
  );
}

export default function Sitemap() {
  // All output is written in getServerSideProps; nothing to render.
  return null;
}

export async function getServerSideProps({ res }) {
  const now = new Date().toISOString().slice(0, 10);

  const [productsResp, categoriesResp, blogResp, policiesResp] = await Promise.all([
    safeFetch('/api/products/catalog?limit=500'),
    safeFetch('/api/categories?nocache=true'),
    safeFetch('/api/public/blogs?limit=200'),
    safeFetch('/api/public/policies'),
  ]);

  // Static routes that actually exist under src/pages (verified against the
  // page files). Private flows (account/login/register/wishlist) and utility
  // pages (search, returns) are intentionally excluded.
  const staticRoutes = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/products', changefreq: 'daily', priority: '0.9' },
    { loc: '/collections', changefreq: 'daily', priority: '0.9' },
    { loc: '/journal', changefreq: 'weekly', priority: '0.7' },
    { loc: '/about', changefreq: 'monthly', priority: '0.5' },
    { loc: '/contact', changefreq: 'monthly', priority: '0.5' },
    { loc: '/track-order', changefreq: 'yearly', priority: '0.3' },
  ].map((r) => ({ ...r, lastmod: now }));

  // Products → /products/<slug>  (pages/products/[slug].jsx)
  const products = productsResp?.data?.products || productsResp?.products || productsResp?.data || [];
  const productUrls = (Array.isArray(products) ? products : [])
    .filter((p) => p?.slug)
    .map((p) => ({
      loc: `/products/${p.slug}`,
      lastmod: lastmodOf(p.updatedAt || p.updated_at),
      changefreq: 'weekly',
      priority: '0.8',
      image: p.mainImage || p.images?.[0]?.image_url || (typeof p.image === 'string' ? p.image : undefined),
    }));

  // Categories → /collections/<slug>  (pages/collections/[slug].jsx)
  const categories = categoriesResp?.data?.categories || categoriesResp?.categories || categoriesResp?.data || [];
  const categoryUrls = (Array.isArray(categories) ? categories : [])
    .filter((c) => c?.slug || c?.handle)
    .map((c) => ({
      loc: `/collections/${c.slug || c.handle}`,
      lastmod: lastmodOf(c.updatedAt || c.updated_at),
      changefreq: 'weekly',
      priority: '0.7',
    }));

  // Blogs → /journal/<slug>  (pages/journal/[slug].jsx)
  const blogs = blogResp?.data?.posts || blogResp?.posts || blogResp?.data || [];
  const blogUrls = (Array.isArray(blogs) ? blogs : [])
    .filter((b) => b?.slug)
    .map((b) => ({
      loc: `/journal/${b.slug}`,
      lastmod: lastmodOf(b.updatedAt || b.updated_at || b.published_at),
      changefreq: 'monthly',
      priority: '0.6',
    }));

  // Policies → /policies/<slug>  (pages/policies/[slug].jsx)
  const policies = policiesResp?.data?.policies || policiesResp?.policies || policiesResp?.data || [];
  const policyUrls = (Array.isArray(policies) ? policies : [])
    .filter((p) => p?.slug || p?.name)
    .map((p) => ({
      loc: `/policies/${p.slug || p.name}`,
      lastmod: lastmodOf(p.updatedAt || p.updated_at),
      changefreq: 'yearly',
      priority: '0.3',
    }));

  const entries = [...staticRoutes, ...productUrls, ...categoryUrls, ...blogUrls, ...policyUrls];

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' +
    entries.map(urlTag).join('') +
    '</urlset>';

  res.setHeader('Content-Type', 'text/xml');
  res.write(xml);
  res.end();

  return { props: {} };
}
