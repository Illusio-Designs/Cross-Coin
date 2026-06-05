/**
 * Product detail route — server component shell.
 *
 * Owns generateMetadata + the initial product fetch on the SERVER so
 * social-share scrapers (Twitter, FB, Slack) see the right title +
 * description + OG image without running JS. The interactive UI
 * (gallery, cart, wishlist) lives in ClientPage.jsx.
 *
 * The product fetched here is passed to ClientPage as `initialProduct`
 * — ClientPage seeds React Query's cache with it via `initialData` so
 * the browser doesn't refetch the same payload on hydration.
 */

import ClientPage from './ClientPage';
import { getProduct } from '@/lib/api/products';

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://knitwink.com';

export const revalidate = 300;   // ISR cache for the server-rendered shell

async function fetchProduct(handle) {
  try { return await getProduct(handle); } catch { return null; }
}

export async function generateMetadata({ params }) {
  const { handle } = await params;
  const product = await fetchProduct(handle);

  if (!product) {
    return { title: 'Product not found', robots: { index: false, follow: true } };
  }

  const title = product.seo?.metaTitle || `${product.name} | Knitwink`;
  const description = (product.seo?.metaDescription
    || product.description
    || `${product.name} from Knitwink — natural-fibre knitwear made to last.`).slice(0, 160);
  const url = `${SITE_URL}/products/${handle}`;
  const ogImage = product.images?.[0]?.url || `${SITE_URL}/knitwinklogo.webp`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: [{ url: ogImage }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  };
}

export default async function ProductRoute({ params }) {
  const { handle } = await params;
  // Server-side fetch — Next dedupes this with generateMetadata's call,
  // so we pay for one backend round-trip total. The payload is then
  // streamed into ClientPage as `initialProduct` so React Query's
  // useQuery seeds its cache from this value (no client refetch on
  // hydration).
  const initialProduct = await fetchProduct(handle);
  return <ClientPage initialHandle={handle} initialProduct={initialProduct} />;
}
