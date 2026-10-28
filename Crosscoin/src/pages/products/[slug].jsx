/**
 * Clean-slug product route: /products/<slug>
 *
 * Why this file exists (instead of just reusing /ProductDetails?slug=X):
 *  - Google Ads quality score and organic SEO both reward URLs without
 *    query strings and with the keyword in the path.
 *  - getStaticProps fetches the product before the page is rendered, so
 *    the initial HTML the crawler sees already carries the correct <title>,
 *    <meta description>, OpenGraph tags, canonical, and schema.org JSON-LD
 *    (Product + BreadcrumbList + optional FAQPage).
 *
 * Incrementally static (ISR): each product page is built on its first visit,
 * served from Vercel's cache, and rebuilt in the background at most once a
 * minute (so price/stock edits show within about a minute). Before, every
 * visit rendered it again on the server ("private, no-store").
 *
 * The interactive UI (pages/test/product.jsx) gets the already-fetched product
 * as `initialProduct`, so the gallery and buy panel are in that HTML and the
 * client doesn't fetch the same product again before showing it.
 */

import Head from 'next/head';
import TestProduct, { MAIN_WIDTHS, MAIN_SIZES, openingImage } from '../test/product';
import { ikTransform, ikSrcSet } from '../../utils/imageUtils';

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

// No product is built ahead at deploy; each is built on its first visit
// (that visit waits for it, like before; the next ones get the cached copy).
export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' };
}

export async function getStaticProps({ params }) {
  const slug = params?.slug;
  if (!slug) return { notFound: true };

  const [productResp, faqResp] = await Promise.all([
    fetchJson(`${API_URL}/api/products/by-slug/${encodeURIComponent(slug)}`),
    fetchJson(`${API_URL}/api/public/faqs?type=global`),
  ]);

  if (!productResp?.success || !productResp?.data) {
    return { notFound: true, revalidate: 60 };
  }

  // SEO win: if the requested slug is a legacy form (e.g. contains parens),
  // the API returns the canonical (clean) slug. Redirect 301 to the clean
  // URL so search engines reindex and users see the tidy form.
  const canonicalSlug = productResp.canonicalSlug || productResp.data?.canonicalSlug;
  if (canonicalSlug && canonicalSlug !== slug) {
    return {
      redirect: { destination: `/products/${canonicalSlug}`, permanent: true },
    };
  }

  // Fetch product-specific FAQs too (separate call so we can cache them
  // independently). Global FAQs are merged below the product ones.
  const productFaqResp = await fetchJson(
    `${API_URL}/api/public/faqs?type=product&id=${productResp.data.id}`
  );

  return {
    props: {
      slug,
      initialProduct: productResp.data,
      productFaqs: productFaqResp?.faqs || [],
      globalFaqs: faqResp?.faqs || [],
    },
    // Rebuilt in the background at most once a minute after a visit.
    revalidate: 60,
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

  // The main photo (the page's largest paint): announce it in <head> with the
  // same srcset/sizes the gallery uses, so it downloads before the page's
  // scripts and styles are processed.
  const mainImg = openingImage(initialProduct);

  return (
    <>
      <Head>
        {mainImg && (
          <link rel="preload" as="image" fetchPriority="high" href={ikTransform(mainImg, 1200)}
            imageSrcSet={ikSrcSet(mainImg, MAIN_WIDTHS)} imageSizes={MAIN_SIZES} key="lcp-img" />
        )}
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

      {/* Mint product UI. The Head above (server-rendered) is the SEO source
          of truth — meta, canonical, Product/Breadcrumb/FAQ JSON-LD. The Mint
          page starts from the product fetched here (see initialProduct). */}
      <TestProduct preview={false} initialProduct={initialProduct} />
    </>
  );
}

// Render with the Mint chrome (bare — no legacy Header/Footer/Breadcrumb).
ProductSlugPage.mintChrome = true;
