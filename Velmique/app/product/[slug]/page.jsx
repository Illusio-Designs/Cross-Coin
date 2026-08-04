import ClientPage from './ClientPage';
import { getProductReviews } from '@/lib/api/reviews';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://velmique.com';
const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'velmique';

async function fetchProduct(slug) {
  try {
    const r = await fetch(`${API}/api/products/${encodeURIComponent(slug)}`, {
      headers: { 'X-Brand-Name': BRAND },
      next: { revalidate: 600 },
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.data || j?.product || j;
  } catch { return null; }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await fetchProduct(slug);
  if (!p) return { title: 'Product — Velmique', description: 'Discover Velmique luxury fragrances.' };
  const title = `${p.name || p.title} — Velmique`;
  const description = (p.shortDescription || p.description || '').replace(/<[^>]*>/g, '').slice(0, 160);
  const image = p.image || p.images?.[0] || `${SITE}/og.jpg`;
  const url = `${SITE}/product/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images: [{ url: image }], type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  // Pre-fetch reviews server-side so the first paint already shows
  // them — saves the ProductReviews client effect a round-trip.
  const initialReviewsPayload = product?.id
    ? await getProductReviews(product.id, { limit: 30 }).catch(() => null)
    : null;

  const jsonLd = product ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name || product.title,
    description: (product.shortDescription || product.description || '').replace(/<[^>]*>/g, '').slice(0, 500),
    image: product.image || product.images?.[0],
    sku: product.sku || product.id,
    brand: { '@type': 'Brand', name: 'Velmique' },
    offers: {
      '@type': 'Offer',
      url: `${SITE}/product/${slug}`,
      priceCurrency: 'INR',
      price: Number(product.salePrice || product.price || 0),
      availability: (product.inStock ?? true) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  } : null;

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <ClientPage initialProduct={product} initialReviewsPayload={initialReviewsPayload} />
    </>
  );
}
