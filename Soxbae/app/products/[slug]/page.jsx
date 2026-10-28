import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductDetailImage from '@/components/product/ProductDetailImage';
import ProductVideos from '@/components/product/ProductVideos';
import ProductShowcase from '@/components/product/ProductShowcase';
import ProductStory from '@/components/product/ProductStory';
import ProductBenefits from '@/components/product/ProductBenefits';
import ProductFaq from '@/components/product/ProductFaq';
import Reviews from '@/components/reviews/Reviews';
import ProductCard from '@/components/home/ProductCard';
import { getProductBySlug, getAllProducts, getStoreReviews, getProductFaqs, getBundleTiers, brandFetch } from '@/lib/api';
import '@/app/styles/pdp.css';

// Incrementally static (ISR): each product page is built once, served from
// Vercel's cache, and rebuilt in the background at most once a minute, so
// price/stock edits show within about a minute. It must not read cookies,
// headers or the query string, or fetch with no-store: any of those makes
// Next build it on every visit again. The clicked card's colour arrives
// through the edge middleware as /products/<slug>/c/<colour>
// (c/[color]/page.jsx), a cached copy per colour.
export const revalidate = 60;
const PRODUCT_TTL = 60;

// No product is built ahead at deploy; each is built on its first visit.
export async function generateStaticParams() {
  return [];
}

const SITE_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://soxbaesocks.com').replace(/\/+$/, '');
const BRAND = 'Soxbae';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug, PRODUCT_TTL);
  if (!p) return { title: 'Product' };
  const url = `${SITE_URL}/products/${p.slug || slug}`;
  const img = (Array.isArray(p.images) && p.images[0]) || p.image || undefined;
  const desc = String(p.description || `Buy ${p.name} online at ${BRAND}.`).slice(0, 160);
  return {
    title: p.name,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title: p.name, description: desc, url, type: 'website', siteName: BRAND, images: img ? [{ url: img }] : undefined },
    twitter: { card: 'summary_large_image', title: p.name, description: desc, images: img ? [img] : undefined },
  };
}

// Build Product + BreadcrumbList JSON-LD for a PDP (schema.org rich results).
function buildProductJsonLd(product) {
  const url = `${SITE_URL}/products/${product.slug}`;
  const images = (Array.isArray(product.images) && product.images.length ? product.images : [product.image]).filter(Boolean);
  const inStock = product.inStock === false || product.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock';
  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: String(product.description || `${product.name} by ${BRAND}`).slice(0, 5000),
    image: images.length ? images : undefined,
    sku: String(product.sku || product.id || product.slug),
    brand: { '@type': 'Brand', name: BRAND },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'INR',
      price: Number(product.price ?? 0),
      availability: inStock,
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
  const rating = Number(product.rating);
  const reviewCount = Number(product.reviewCount ?? product.reviews ?? product.review_count);
  if (rating > 0 && reviewCount > 0) {
    productLd.aggregateRating = { '@type': 'AggregateRating', ratingValue: rating, reviewCount };
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE_URL}/products` },
      ...(product.category ? [{ '@type': 'ListItem', position: 3, name: product.category, item: `${SITE_URL}/collections/${product.categorySlug}` }] : []),
      { '@type': 'ListItem', position: product.category ? 4 : 3, name: product.name, item: url },
    ],
  };
  return [productLd, breadcrumbLd];
}

export default async function ProductPage({ params }) {
  const { slug, color } = await params;
  // The colour of the card that was clicked (only on the c/[color] route).
  let pickedColor = null;
  if (color) { try { pickedColor = decodeURIComponent(color); } catch { pickedColor = color; } }
  const product = await getProductBySlug(slug, PRODUCT_TTL);
  if (!product) notFound();

  // Only what the first screen needs (gallery + buy panel) is awaited here, so
  // the product photo and price reach the shopper as soon as possible. Reviews,
  // "You might also like" and the FAQ fetch their own data and stream in
  // after, each in its own <Suspense>.
  const [bundleTiers, coupons] = await Promise.all([
    getBundleTiers(product.id),
    brandFetch('/api/coupons/listing', 300).then((r) => r?.coupons || r).catch(() => []),
  ]);
  // Surface a real prepaid-only coupon (admin-created) on the buy panel — no
  // hard-coded discount. Shoppers apply the code at checkout to get the offer.
  const prepaidCoupon = (Array.isArray(coupons) ? coupons : []).find((c) => c.paymentModeRestriction === 'prepaid') || null;

  const jsonLd = buildProductJsonLd(product);

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 20 }}>
      {jsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
      <nav className="crumbs">
        <Link href="/">Home</Link> <span>/</span> <Link href="/products">Shop</Link>{' '}
        <span>/</span> <Link href={`/collections/${product.categorySlug}`} className="crumb-collapse" title={product.category} aria-label={product.category}>…</Link>{' '}
        <span>/</span> <b>{product.name}</b>
      </nav>

      {/* ── Gallery + buy panel + About/Specs (shared variation selection) ── */}
      <ProductShowcase product={product} initialColor={pickedColor} bundleTiers={bundleTiers} prepaidCoupon={prepaidCoupon} />
      <ProductVideos videos={product.videos} />


      {/* ── "What Soxbae Socks Are Made For" benefits band (before the details) ── */}
      <ProductBenefits />
      <ProductDetailImage image={product.detailImage} />

      {/* ── Full description + Ideal for / care / manufacturing (FAQ moved below) ── */}
      <ProductStory product={product} showFaq={false} />

      {/* ── Reviews: moving wall + Write-a-review for this product ── */}
      <Suspense fallback={null}>
        <PdpReviews productId={product.id} />
      </Suspense>

      <Suspense fallback={null}>
        <PdpRelated product={product} />
      </Suspense>

      {/* ── FAQ — last section before the footer (Morbix parity) ── */}
      <Suspense fallback={null}>
        <PdpFaq productId={product.id} />
      </Suspense>
    </div>
  );
}

async function PdpReviews({ productId }) {
  const reviewsData = await getStoreReviews(300);
  return <Reviews reviews={reviewsData.reviews} total={reviewsData.total} title="Customer reviews" productId={productId} showWrite />;
}

// "You might also like" — one card per product (not every colour variation).
// Prefer same-category products; fall back to any other products so the rail
// always shows (some products' category has no other items).
async function PdpRelated({ product }) {
  const all = await getAllProducts(300);
  const pickOthers = (pool) => {
    const seen = new Set();
    return pool
      .filter((p) => p.slug && p.slug !== product.slug && !seen.has(p.slug) && seen.add(p.slug))
      .slice(0, 5);
  };
  let related = pickOthers(all.filter((p) => p.categorySlug === product.categorySlug));
  if (related.length === 0) related = pickOthers(all);
  if (related.length === 0) return null;
  return (
    <section className="section" style={{ paddingBottom: 0 }}>
      <div className="section-head"><h2>You might also like</h2></div>
      <div className="product-grid">
        {related.map((p) => <ProductCard key={p.uid ?? p.id} product={p} />)}
      </div>
    </section>
  );
}

async function PdpFaq({ productId }) {
  const faqs = await getProductFaqs(productId);
  return <ProductFaq faqs={faqs} />;
}
