/**
 * Clean-slug product route: /products/<slug>
 *
 * Why this file exists (instead of just reusing /ProductDetails?slug=X):
 *  - Google Ads quality score and organic SEO both reward URLs without
 *    query strings and with the keyword in the path.
 *  - getServerSideProps fetches the product before the page is rendered, so
 *    the initial HTML the crawler sees already carries the correct <title>,
 *    <meta description>, OpenGraph tags, canonical, and schema.org JSON-LD
 *    (Product + BreadcrumbList + optional FAQPage).
 *
 * The interactive UI is still ProductDetails.jsx — we just inject the
 * already-fetched product as `initialProduct` so the client doesn't refetch
 * the same payload it already has in the HTML.
 */

import Head from 'next/head';
import ProductDetails from '../ProductDetails';

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

  const [productResp, faqResp] = await Promise.all([
    fetchJson(`${API_URL}/api/products/by-slug/${encodeURIComponent(slug)}`),
    fetchJson(`${API_URL}/api/public/faqs?type=global`),
  ]);

  if (!productResp?.success || !productResp?.data) {
    return { notFound: true };
  }

  // Fetch product-specific FAQs too (separate call so we can cache them
  // independently). Global FAQs are merged below the product ones.
  const productFaqResp = await fetchJson(
    `${API_URL}/api/public/faqs?type=product&id=${productResp.data.id}`
  );

  // CDN caching: product pages change rarely; let the edge serve a stale
  // copy while we revalidate in the background.
  res?.setHeader?.(
    'Cache-Control',
    'public, s-maxage=300, stale-while-revalidate=600'
  );

  return {
    props: {
      slug,
      initialProduct: productResp.data,
      productFaqs: productFaqResp?.faqs || [],
      globalFaqs: faqResp?.faqs || [],
    },
  };
}

function stripHtml(s) {
  if (!s) return '';
  return String(s).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncate(s, n) {
  const t = stripHtml(s);
  return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
}

export default function ProductSlugPage({ slug, initialProduct, productFaqs, globalFaqs }) {
  const seo = initialProduct?.seo || {};
  const canonical = seo.canonicalUrl || seo.canonical_url || `${SITE_URL}/products/${slug}`;
  const title = seo.metaTitle || seo.meta_title || `${initialProduct?.name || 'Product'} | CrossCoin`;
  const description = truncate(
    seo.metaDescription || seo.meta_description || initialProduct?.description || '',
    160
  );
  const ogTitle = seo.ogTitle || seo.og_title || title;
  const ogDescription = seo.ogDescription || seo.og_description || description;
  const ogImage = seo.ogImage || seo.og_image
    || initialProduct?.images?.[0]?.large
    || initialProduct?.images?.[0]?.image_url
    || `${SITE_URL}/crosscoin-icon.png`;

  // Product JSON-LD: prefer the structured_data the backend already built
  // (it's enriched with brand, sku, aggregateRating, return policy, etc.).
  let productLd = null;
  if (seo.structuredData || seo.structured_data) {
    try {
      const raw = seo.structuredData || seo.structured_data;
      productLd = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      productLd = null;
    }
  }

  // BreadcrumbList — always emit at least Home → Product.
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/Products` },
      { '@type': 'ListItem', position: 3, name: initialProduct?.name || 'Product', item: canonical },
    ],
  };

  // FAQPage — combine product-specific FAQs first, then global.
  const allFaqs = [...(productFaqs || []), ...(globalFaqs || [])];
  const faqLd = allFaqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allFaqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: stripHtml(f.answer),
      },
    })),
  } : null;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={seo.metaKeywords || seo.meta_keywords || ''} />
        <link rel="canonical" href={canonical} />
        <meta name="robots" content="index, follow, max-image-preview:large" />

        <meta property="og:type" content="product" />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="CrossCoin" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />

        {productLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
          />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
        {faqLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
          />
        )}
      </Head>

      {/* The interactive product UI. SeoWrapper inside ProductDetails will
          duplicate-set some tags; Next.js Head merges by id/key so this is
          safe. The Head above is what crawlers see first. */}
      <ProductDetails
        initialProduct={initialProduct}
        initialSlug={slug}
        productFaqs={productFaqs}
        globalFaqs={globalFaqs}
      />
    </>
  );
}
