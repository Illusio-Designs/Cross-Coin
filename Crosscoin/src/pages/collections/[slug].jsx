/**
 * Clean-slug collection route: /collections/<slug>
 *
 * Server-renders the category landing page with:
 *   - The right <title>, meta description, OG, canonical (admin can
 *     override via Category SEO fields).
 *   - schema.org CollectionPage + ItemList JSON-LD (so Google can
 *     show the category in product carousels).
 *   - BreadcrumbList JSON-LD: Home → Collections → <Category>.
 *   - Optional global FAQs at the bottom (FAQPage schema).
 *
 * The visible UI is intentionally minimal — a heading + product grid —
 * because Crosscoin's existing Products.jsx is heavy and the goal here
 * is SEO. Admin can adjust styling later; the schema and meta are what
 * matter for Google Ads landing-page quality and organic rank.
 */

import Head from 'next/head';
import Link from 'next/link';
import { useEffect } from 'react';
import ProductCard from '../../components/products/ProductCard';
import ProductFaqSection from '../../components/common/ProductFaqSection';
import { useBreadcrumb } from '../../components/common/Breadcrumb';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://crosscoin.in';

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

  const [catResp, faqResp] = await Promise.all([
    fetchJson(`${API_URL}/api/categories/by-slug/${encodeURIComponent(slug)}`),
    fetchJson(`${API_URL}/api/public/faqs?type=global`),
  ]);

  const category = catResp?.data || null;
  if (!category) return { notFound: true };

  res?.setHeader?.(
    'Cache-Control',
    'public, s-maxage=300, stale-while-revalidate=600'
  );

  return {
    props: {
      slug,
      category,
      globalFaqs: faqResp?.faqs || [],
    },
  };
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

export default function CollectionSlugPage({ slug, category, globalFaqs }) {
  // Set the breadcrumb to the precise category name so the dynamic
  // [slug] segment becomes "Cross Coin® Professional Performance Ankle Socks"
  // instead of the literal placeholder.
  const { setCustomBreadcrumbs } = useBreadcrumb();
  useEffect(() => {
    if (category?.name) {
      setCustomBreadcrumbs([
        { label: 'Home', path: '/' },
        { label: 'Collections', path: '/collections' },
        { label: category.name, path: `/collections/${slug}`, isLast: true },
      ]);
    }
    return () => setCustomBreadcrumbs(null);
  }, [category?.name, slug, setCustomBreadcrumbs]);

  const seo = category.seo || {};
  const title = seo.metaTitle || `${category.name} | CrossCoin`;
  const description = truncate(
    seo.metaDescription || category.description || `Shop ${category.name} at CrossCoin. ${category.productCount || 0} products available with free shipping & easy returns.`,
    160,
  );
  const canonical = seo.canonicalUrl || `${SITE_URL}/collections/${slug}`;
  const ogImage = seo.ogImage
    || category.image
    || `${SITE_URL}/crosscoin-icon.png`;
  const robots = seo.seoIndex === false
    ? 'noindex, follow'
    : 'index, follow, max-image-preview:large';

  // ItemList schema — Google uses this to show category pages in their
  // shopping carousels. Each item points to its product page.
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
  // Admin-supplied override wins.
  const structuredOverride = safeJson(seo.structuredData);
  const collectionLd = structuredOverride || itemList;

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

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
      </Head>

      <main className="collection-page" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
          <Link href="/" style={{ color: '#6b7280' }}>Home</Link>
          {' › '}
          <Link href="/Collections" style={{ color: '#6b7280' }}>Collections</Link>
          {' › '}
          <span style={{ color: '#180D3E' }}>{category.name}</span>
        </nav>

        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, color: '#180D3E' }}>{category.name}</h1>
          {category.description && (
            <p style={{ marginTop: 8, color: '#4b5563', maxWidth: 720 }}>{stripHtml(category.description)}</p>
          )}
          <div style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>
            {products.length} product{products.length === 1 ? '' : 's'}
          </div>
        </header>

        {products.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
            No products in this collection yet.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            {products.map(p => (
              <ProductCard
                key={p.id}
                product={{
                  id: p.id,
                  slug: p.slug,
                  name: p.name,
                  title: p.name,
                  price: p.price,
                  comparePrice: p.comparePrice,
                  image: p.image,
                  images: p.image ? [p.image] : [],
                }}
              />
            ))}
          </div>
        )}

        {globalFaqs?.length > 0 && (
          <ProductFaqSection productFaqs={[]} globalFaqs={globalFaqs} />
        )}
      </main>
    </>
  );
}
