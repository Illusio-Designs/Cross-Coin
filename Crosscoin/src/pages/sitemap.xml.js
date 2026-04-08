const BASE_URL = 'https://www.crosscoin.in';

const STATIC_ROUTES = [
  { path: '/',                  priority: '1.0', changefreq: 'daily' },
  { path: '/Products',          priority: '0.9', changefreq: 'daily' },
  { path: '/Collections',       priority: '0.8', changefreq: 'weekly' },
  { path: '/blog',              priority: '0.7', changefreq: 'weekly' },
  { path: '/About',             priority: '0.6', changefreq: 'monthly' },
  { path: '/Contact',           priority: '0.6', changefreq: 'monthly' },
  { path: '/OrderTracking',     priority: '0.5', changefreq: 'monthly' },
  { path: '/policy?name=privacy-policy',           priority: '0.4', changefreq: 'yearly' },
  { path: '/policy?name=terms-and-conditions',     priority: '0.4', changefreq: 'yearly' },
  { path: '/policy?name=shipping-policy',          priority: '0.4', changefreq: 'yearly' },
  { path: '/policy?name=cancellation-and-refund',  priority: '0.4', changefreq: 'yearly' },
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

    // Fetch products
    const prodRes = await fetch(`${API}/api/products/catalog?limit=500`, {
      headers: { 'X-Brand-Name': 'crosscoin' },
    });
    if (prodRes.ok) {
      const prodData = await prodRes.json();
      const products = prodData?.products || prodData || [];
      products.forEach(p => {
        if (p.slug || p.id) {
          dynamicRoutes.push({
            path: `/ProductDetails?id=${p.id}`,
            priority: '0.8',
            changefreq: 'weekly',
          });
        }
      });
    }

    // Fetch blogs
    const blogRes = await fetch(`${API}/api/blogs/listing?limit=200`, {
      headers: { 'X-Brand-Name': 'crosscoin' },
    });
    if (blogRes.ok) {
      const blogData = await blogRes.json();
      const blogs = blogData?.posts || blogData?.blogs || blogData || [];
      blogs.forEach(b => {
        if (b.slug || b.id) {
          dynamicRoutes.push({
            path: `/blog-details?slug=${b.slug || b.id}`,
            priority: '0.6',
            changefreq: 'monthly',
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
