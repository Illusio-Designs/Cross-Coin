/**
 * Dynamic XML sitemap for Crosscoin — served at /sitemap.xml
 *
 * Crosscoin is a Next.js PAGES ROUTER app, so it cannot use the App Router's
 * app/sitemap.js convention. Instead this is a normal page whose
 * getServerSideProps streams the XML straight to the response and renders
 * nothing. It runs on the server at request time, so newly created
 * products / categories / blogs / policies appear on the next crawl without a
 * code change or rebuild.
 *
 * NOTE: there is a separate human-facing HTML sitemap at src/pages/sitemap.jsx
 * which serves at /sitemap. This file is sitemap.xml.js and serves at the
 * distinct /sitemap.xml path, so the two never collide.
 *
 * URL path shapes were verified against the real page files under
 * src/pages:
 *   - products:   /products/<slug>     (src/pages/products/[slug].jsx)
 *   - collections:/collections/<slug>  (src/pages/collections/[slug].jsx)
 *   - journal:    /journal/<slug>       (src/pages/journal/[slug].jsx)
 *   - policies:   /policy/<slug>        (src/pages/policy/[slug].jsx)
 * Static route casing matches the page filenames (Products.jsx -> /Products).
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.crosscoin.in';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'crosscoin';

// Static, always-present routes. Casing matches the page filenames under
// src/pages (Next pages-router routes are case-sensitive).
const STATIC_ROUTES = [
  { path: '/',              priority: '1.0', changefreq: 'daily' },
  { path: '/Products',      priority: '0.9', changefreq: 'daily' },
  { path: '/Collections',   priority: '0.8', changefreq: 'weekly' },
  { path: '/journal',       priority: '0.7', changefreq: 'weekly' },
  { path: '/About',         priority: '0.6', changefreq: 'monthly' },
  { path: '/Contact',       priority: '0.6', changefreq: 'monthly' },
  { path: '/returns',       priority: '0.5', changefreq: 'monthly' },
  { path: '/OrderTracking', priority: '0.5', changefreq: 'monthly' },
  // Per-policy and per-product/category/blog URLs are emitted dynamically
  // below from the live API so new items show up without a code change.
];

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

// Policy slug = lowercased + hyphenated title, matching the backend policy
// matcher, the footer links, and src/pages/policy/[slug].jsx.
function policySlug(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function toLastmod(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10); // W3C date (YYYY-MM-DD)
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateSitemapXml(urls) {
  const body = urls
    .map(({ path, priority, changefreq, lastmod, image }) => `  <url>
    <loc>${escapeXml(BASE_URL + path)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${image ? `
    <image:image><image:loc>${escapeXml(image)}</image:loc></image:image>` : ''}
  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${body}
</urlset>`;
}

export async function getServerSideProps({ res }) {
  const now = toLastmod();
  const dynamicRoutes = [];

  const [productsResp, categoriesResp, blogResp, policiesResp] = await Promise.all([
    safeFetch('/api/products/catalog?limit=500'),
    safeFetch('/api/categories/listing'),
    safeFetch('/api/blogs/listing?limit=50'),
    safeFetch('/api/policies'),
  ]);

  // Products -> /products/<slug>
  const products =
    productsResp?.data?.products || productsResp?.products || productsResp?.data || (Array.isArray(productsResp) ? productsResp : []);
  (products || []).forEach((p) => {
    if (p?.slug) {
      dynamicRoutes.push({
        path: `/products/${p.slug}`,
        priority: '0.8',
        changefreq: 'weekly',
        lastmod: toLastmod(p.updatedAt),
        image: p.mainImage || p.images?.[0]?.image_url || (typeof p.image === 'string' ? p.image : undefined),
      });
    }
  });

  // Categories -> /collections/<slug>
  const categories =
    categoriesResp?.data?.categories || categoriesResp?.categories || categoriesResp?.data || (Array.isArray(categoriesResp) ? categoriesResp : []);
  (categories || []).forEach((c) => {
    const slug = c?.slug || c?.handle;
    if (slug && c.seoIndex !== false) {
      dynamicRoutes.push({
        path: `/collections/${slug}`,
        priority: '0.7',
        changefreq: 'weekly',
        lastmod: toLastmod(c.updatedAt),
      });
    }
  });

  // Blogs -> /journal/<slug>
  const blogs =
    blogResp?.data?.posts || blogResp?.posts || blogResp?.blogs || blogResp?.data || (Array.isArray(blogResp) ? blogResp : []);
  (blogs || []).forEach((b) => {
    if (b?.slug) {
      dynamicRoutes.push({
        path: `/journal/${b.slug}`,
        priority: '0.6',
        changefreq: 'monthly',
        lastmod: toLastmod(b.updatedAt),
      });
    }
  });

  // Policies -> /policy/<slug>
  const policies =
    policiesResp?.data?.policies || policiesResp?.policies || policiesResp?.data || (Array.isArray(policiesResp) ? policiesResp : []);
  (policies || []).forEach((p) => {
    const slug = p?.slug ? policySlug(p.slug) : policySlug(p?.title || p?.name);
    if (slug) {
      dynamicRoutes.push({
        path: `/policy/${slug}`,
        priority: '0.4',
        changefreq: 'yearly',
        lastmod: toLastmod(p.updatedAt),
      });
    }
  });

  const staticRoutes = STATIC_ROUTES.map((r) => ({ ...r, lastmod: now }));
  const xml = generateSitemapXml([...staticRoutes, ...dynamicRoutes]);

  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  res.write(xml);
  res.end();

  return { props: {} };
}

export default function SitemapXml() {
  return null;
}
