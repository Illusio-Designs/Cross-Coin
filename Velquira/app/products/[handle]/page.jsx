import ClientPage from './ClientPage';
import { getBestsellers } from '@/lib/api/products';
import { getProductReviews } from '@/lib/api/reviews';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://velquira.com';
const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'velquira';

async function fetchProduct(handle) {
  try {
    const r = await fetch(`${API}/api/products/${encodeURIComponent(handle)}`, {
      headers: { 'X-Brand-Name': BRAND },
      next: { revalidate: 600 },
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.data || j?.product || j;
  } catch { return null; }
}

export async function generateMetadata({ params }) {
  const { handle } = await params;
  const p = await fetchProduct(handle);
  if (!p) return { title: 'Product — Velquira', description: 'Discover Velquira jewellery.' };
  const title = `${p.name || p.title} — Velquira`;
  const description = (p.shortDescription || p.description || '').replace(/<[^>]*>/g, '').slice(0, 160);
  const image = p.image || p.images?.[0] || `${SITE}/og.jpg`;
  const url = `${SITE}/products/${handle}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images: [{ url: image }], type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function Page({ params }) {
  const { handle } = await params;
  // Parallel fetch: product (deduped with generateMetadata via Next's
  // request cache) + bestsellers for CrossSell + product reviews for
  // ReviewsSection — saves two client round-trips on first paint.
  const [product, initialBestsellers] = await Promise.all([
    fetchProduct(handle),
    getBestsellers().catch(() => []),
  ]);
  const initialReviewsPayload = product?.id
    ? await getProductReviews(product.id).catch(() => null)
    : null;
  const initialReviews = initialReviewsPayload?.reviews ?? (Array.isArray(initialReviewsPayload) ? initialReviewsPayload : null);
  const initialStats = initialReviewsPayload?.stats ?? null;

  const jsonLd = product ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name || product.title,
    description: (product.shortDescription || product.description || '').replace(/<[^>]*>/g, '').slice(0, 500),
    image: product.image || product.images?.[0],
    sku: product.sku || product.id,
    brand: { '@type': 'Brand', name: 'Velquira' },
    offers: {
      '@type': 'Offer',
      url: `${SITE}/products/${handle}`,
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
      <ClientPage
        initialProduct={product}
        initialBestsellers={initialBestsellers}
        initialReviews={initialReviews}
        initialStats={initialStats}
      />
    </>
  );
}
