/**
 * Product detail route — server component shell.
 *
 * Owns generateMetadata + the initial product fetch on the SERVER so
 * social-share scrapers (Twitter, FB, Slack) see the right title +
 * description + OG image without running JS. The interactive UI
 * (gallery, cart, wishlist) lives in ClientPage.jsx.
 *
 * The fetch here is cheap because it goes through Next's request-
 * dedupe — ClientPage.jsx's getProduct() call on the same handle
 * during the same request is deduped to a single backend round-trip.
 */

import ClientPage from './ClientPage';
import { getProduct } from '@/lib/api/products';

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://knitwink.com';

export const revalidate = 300;   // ISR cache for the server-rendered shell

export async function generateMetadata({ params }) {
  const { handle } = await params;
  let product = null;
  try { product = await getProduct(handle); } catch { /* 404 handled below */ }

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

export default function ProductRoute() {
  // ClientPage handles all interactive state; server work is just metadata.
  return <ClientPage />;
}
