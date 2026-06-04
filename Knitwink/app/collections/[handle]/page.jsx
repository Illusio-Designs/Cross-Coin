/**
 * Collection detail page for /collections/<handle>.
 *
 * Server component — renders title/description/JSON-LD on the SERVER so
 * search-engine crawlers and social-share scrapers see the right meta
 * tags without waiting for JS hydration. The product grid is a thin
 * client component because the cart/wishlist buttons need state.
 *
 * Data source: GET /api/categories/by-name/:handle returns:
 *   { id, name, slug, description?, image?, products: [...] }
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategoryByName, getPublicCategories } from '@/lib/api/categories';
import { mapProduct } from '@/lib/api/products';
import { ProductCard } from '@/components/collection/ProductCard';

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://knitwink.com';

// Cache: regenerate the static shell every 5 minutes; live category
// changes hit immediately via the /api/revalidate webhook.
export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { handle } = await params;
  const category = await getCategoryByName(handle);

  const name = category?.name || handle;
  const description = category?.description
    || `Shop ${name} at Knitwink. ${category?.products?.length || 0} pieces of natural-fibre knitwear, made to last.`;
  const url = `${SITE_URL}/collections/${handle}`;
  const ogImage = category?.image || `${SITE_URL}/knitwinklogo.webp`;

  return {
    title: name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: name,
      description,
      url,
      type: 'website',
      images: [{ url: ogImage }],
    },
    twitter: { card: 'summary_large_image', title: name, description, images: [ogImage] },
  };
}

export async function generateStaticParams() {
  // Pre-render the top categories at build time so the storefront's most-
  // visited collection URLs are served straight from the edge cache.
  try {
    const cats = await getPublicCategories();
    return cats.slice(0, 20).map((c) => ({ handle: c.slug || c.name }));
  } catch {
    return [];
  }
}

export default async function CollectionPage({ params }) {
  const { handle } = await params;
  const category = await getCategoryByName(handle);

  if (!category) return notFound();

  const products = (category.products || []).map(mapProduct);

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category.name,
    description: category.description || `${category.name} from Knitwink`,
    url: `${SITE_URL}/collections/${handle}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: products.slice(0, 30).map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/products/${p.handle}`,
        name: p.name,
        image: p.images?.[0]?.url,
      })),
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Collections', item: `${SITE_URL}/collections` },
      { '@type': 'ListItem', position: 3, name: category.name, item: `${SITE_URL}/collections/${handle}` },
    ],
  };

  return (
    <>
      {/* JSON-LD — self-generated, intentionally bypasses DOMPurify. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-black min-h-[200px] sm:min-h-[260px] md:min-h-[320px]">
        {category.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={category.image}
            alt={category.name}
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black/60 to-transparent" />
        <div className="relative flex h-full min-h-[200px] sm:min-h-[260px] md:min-h-[320px] flex-col items-start justify-end px-4 pt-32 pb-8 sm:px-6 sm:pt-36 sm:pb-10 md:px-10 md:pt-40">
          <nav aria-label="Breadcrumb" className="mb-2 text-xs text-white/60">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/collections" className="hover:text-white">Collections</Link>
            <span className="mx-2">/</span>
            <span className="text-white/90">{category.name}</span>
          </nav>
          <h1 className="text-3xl font-bold text-white lg:text-4xl">{category.name}</h1>
          {category.description && (
            <p className="mt-2 max-w-2xl text-sm text-white/70">{category.description}</p>
          )}
          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-white/60">
            {products.length} item{products.length !== 1 ? 's' : ''}
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-site px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        {products.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-500">No products in this collection yet.</p>
            <Link href="/collections" className="mt-4 inline-block text-sm font-semibold text-brand-black underline">
              Browse all collections →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
