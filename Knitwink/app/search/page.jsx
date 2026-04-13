
import Link from 'next/link';
import { Search } from 'lucide-react';
import { searchProducts, getFeaturedCollections } from '@/lib/api/products';
import { ProductGrid } from '@/components/collection/ProductGrid';
import { SearchInput } from './SearchInput';
import { SITE_NAME } from '@/lib/constants';





export async function generateMetadata({ searchParams }) {
  const { q } = await searchParams;
  return {
    title: q ? `Search results for "${q}"` : 'Search',
    description: q ?
    `Browse results for "${q}" on ${SITE_NAME}.` :
    `Search for shoes and more on ${SITE_NAME}.`
  };
}

const SUGGESTED = [
{ label: 'Mens', href: '/collections/mens' },
{ label: 'Womens', href: '/collections/womens' },
{ label: 'New Arrivals', href: '/collections/new' },
{ label: 'Sale', href: '/collections/sale' }];


export default async function SearchPage({ searchParams }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  const [products, collections] = await Promise.all([
  query ? searchProducts(query).catch(() => []) : Promise.resolve([]),
  getFeaturedCollections().catch(() => [])]
  );

  const suggestedCollections = collections.length > 0 ? collections.slice(0, 4) : null;

  return (
    <section className="bg-white px-6 py-16 md:px-10 lg:px-16">
      <div className="mx-auto max-w-site">
      {/* Search bar */}
      <div className="mx-auto max-w-2xl">
        <SearchInput initialQuery={query} />
      </div>

      {/* Results */}
      {query ?
        <div className="mt-12">
          <p className="mb-8 text-sm text-gray-600">
            {products.length} result{products.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>

          {products.length > 0 ?
          <ProductGrid products={products} /> :

          <EmptyState query={query} suggestedCollections={suggestedCollections} />
          }
        </div> : (

        /* No query yet — show suggested collections */
        <div className="mt-16">
          <p className="mb-6 text-xs font-medium uppercase tracking-widest text-gray-600">
            Popular categories
          </p>
          <div className="flex flex-wrap gap-3">
            {SUGGESTED.map((s) =>
            <Link
              key={s.href}
              href={s.href}
              className="rounded-full border border-gray-200 px-5 py-2.5 text-sm text-gray-800 transition-colors duration-150 hover:border-brand-black hover:text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2">
              
                {s.label}
              </Link>
            )}
          </div>
        </div>)
        }
    </div>
    </section>);

}

// ── empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  query,
  suggestedCollections



}) {
  return (
    <div className="flex flex-col items-center gap-8 py-20 text-center">
      <Search size={40} className="text-gray-200" aria-hidden="true" />
      <div>
        <p className="text-base font-medium text-brand-black">No results for &ldquo;{query}&rdquo;</p>
        <p className="mt-2 text-sm text-gray-600">
          Try a different search term or browse a collection below.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {(suggestedCollections ?? SUGGESTED.map((s) => ({ name: s.label, handle: s.href.replace('/collections/', '') }))).map(
          (c) =>
          <Link
            key={c.handle}
            href={`/collections/${c.handle}`}
            className="rounded-full border border-gray-200 px-5 py-2.5 text-sm text-gray-800 transition-colors duration-150 hover:border-brand-black hover:text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2">
            
              {c.name}
            </Link>

        )}
      </div>
    </div>);

}