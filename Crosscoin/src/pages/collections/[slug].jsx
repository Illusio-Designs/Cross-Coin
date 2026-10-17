/**
 * Clean-slug collection route: /collections/<slug>
 *
 * Server-renders the category's SEO (title/meta/canonical + CollectionPage,
 * ItemList and BreadcrumbList JSON-LD) so crawlers get it in the initial HTML.
 * The visible UI is the Mint shop, which resolves the active category from the
 * [slug] param and renders the filtered grid.
 */
import Head from 'next/head';
import TestShop from '../test/shop';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.crosscoin.in';

async function fetchJson(url) {
  try {
    const r = await fetch(url, { headers: { 'X-Brand-Name': 'crosscoin' } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function getServerSideProps({ params, res }) {
  const slug = params?.slug;
  if (!slug) return { notFound: true };

  const catResp = await fetchJson(`${API_URL}/api/categories/by-slug/${encodeURIComponent(slug)}`);
  const category = catResp?.data || null;
  if (!category) return { notFound: true };

  res?.setHeader?.('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  return { props: { slug, category } };
}

function stripHtml(s) { return String(s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }
function truncate(s, n) {
  const t = stripHtml(s);
  return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
}
function safeJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return null; }
}

export default function CollectionSlugPage({ slug, category }) {
  const seo = category.seo || {};
  const title = seo.metaTitle || `${category.name} | CrossCoin`;
  const description = truncate(
    seo.metaDescription || category.description || `Shop ${category.name} at CrossCoin. ${category.productCount || 0} products available with free shipping & easy returns.`,
    160,
  );
  const canonical = seo.canonicalUrl || `${SITE_URL}/collections/${slug}`;
  const ogImage = seo.ogImage || category.image || `${SITE_URL}/crosscoin-icon.png`;
  const robots = seo.seoIndex === false ? 'noindex, follow' : 'index, follow, max-image-preview:large';

  const products = category.products || [];
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category.name,
    description,
    url: canonical,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: products.slice(0, 30).map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/products/${p.slug}`,
        name: p.name,
        image: p.image && p.image.startsWith('http') ? p.image : (p.image ? `${SITE_URL}${p.image}` : undefined),
      })),
    },
  };
  const collectionLd = safeJson(seo.structuredData) || itemList;

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',        item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Collections', item: `${SITE_URL}/Collections` },
      { '@type': 'ListItem', position: 3, name: category.name, item: canonical },
    ],
  };

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta name="robots" content={robots} />

        <meta property="og:type"        content="website" />
        <meta property="og:title"       content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url"         content={canonical} />
        <meta property="og:image"       content={ogImage} />
        <meta property="og:site_name"   content="CrossCoin" />

        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image"       content={ogImage} />

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      </Head>

      {/* Mint shop UI — resolves the active category from the [slug] param. */}
      <TestShop preview={false} />
    </>
  );
}

// Render with the Mint chrome (bare — no legacy Header/Footer/Breadcrumb).
CollectionSlugPage.mintChrome = true;
