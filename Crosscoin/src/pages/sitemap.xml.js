const BASE_URL = 'https://www.crosscoin.in';

const STATIC_ROUTES = [
  { path: '/',                  priority: '1.0', changefreq: 'daily' },
  { path: '/Products',          priority: '0.9', changefreq: 'daily' },
  { path: '/Collections',       priority: '0.8', changefreq: 'weekly' },
  { path: '/blog',              priority: '0.7', changefreq: 'weekly' },
  { path: '/About',             priority: '0.6', changefreq: 'monthly' },
  { path: '/Contact',           priority: '0.6', changefreq: 'monthly' },
  { path: '/OrderTracking',     priority: '0.5', changefreq: 'monthly' },
  // Policies are emitted dynamically below from the live policy list so a
  // new policy in the admin shows up in the sitemap without a code change.
];

function generateSitemapXml(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(({ path, priority, changefreq }) => `  <url>
    <loc>${BASE_URL}${path}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n')}
</urlset>`;
}

export async function getServerSideProps({ res }) {
  let dynamicRoutes = [];

  try {
    const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

    // Fetch products → /products/<slug> (clean SEO URL, set up in Phase A).
    // Falls back to id-based query if a product has no slug yet.
    const prodRes = await fetch(`${API}/api/products/catalog?limit=500`, {
      headers: { 'X-Brand-Name': 'crosscoin' },
    });
    if (prodRes.ok) {
      const prodData = await prodRes.json();
      const products = prodData?.products || prodData || [];
      products.forEach(p => {
        if (p.slug) {
          dynamicRoutes.push({
            path: `/products/${p.slug}`,
            priority: '0.8',
            changefreq: 'weekly',
          });
        }
      });
    }

    // Fetch blogs → /blog/<slug> (Phase C).
    const blogRes = await fetch(`${API}/api/blogs/listing?limit=200`, {
      headers: { 'X-Brand-Name': 'crosscoin' },
    });
    if (blogRes.ok) {
      const blogData = await blogRes.json();
      const blogs = blogData?.posts || blogData?.blogs || blogData || [];
      blogs.forEach(b => {
        if (b.slug) {
          dynamicRoutes.push({
            path: `/blog/${b.slug}`,
            priority: '0.6',
            changefreq: 'monthly',
          });
        }
      });
    }

    // Fetch policies → /policy/<slug> (clean slug; backend matches the
    // slug against the title for the public read endpoint).
    const polRes = await fetch(`${API}/api/policies`, {
      headers: { 'X-Brand-Name': 'crosscoin' },
    });
    if (polRes.ok) {
      const polData = await polRes.json();
      const policies = Array.isArray(polData) ? polData : (polData?.policies || polData?.data || []);
      policies.forEach(p => {
        const slug = String(p.title || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (slug) {
          dynamicRoutes.push({
            path: `/policy/${slug}`,
            priority: '0.4',
            changefreq: 'yearly',
          });
        }
      });
    }

    // Fetch categories → /collections/<slug> (Phase C).
    const catRes = await fetch(`${API}/api/categories/listing`, {
      headers: { 'X-Brand-Name': 'crosscoin' },
    });
    if (catRes.ok) {
      const catData = await catRes.json();
      const cats = catData?.categories || catData?.data || catData || [];
      cats.forEach(c => {
        if (c.slug && c.seoIndex !== false) {
          dynamicRoutes.push({
            path: `/collections/${c.slug}`,
            priority: '0.7',
            changefreq: 'weekly',
          });
        }
      });
    }
  } catch {
    // silently fall back to static only
  }

  const allUrls = [...STATIC_ROUTES, ...dynamicRoutes];
  const xml = generateSitemapXml(allUrls);

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  res.write(xml);
  res.end();

  return { props: {} };
}

export default function SitemapXml() {
  return null;
}
