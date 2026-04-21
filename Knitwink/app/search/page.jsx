import { PackageSearch } from 'lucide-react'
import { searchProducts, getPublicProducts } from '@/lib/api/products'
import { ProductCard } from '@/components/collection/ProductCard'
import { SearchInput } from './SearchInput'
import { SITE_NAME } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ searchParams }) {
  const { q } = await searchParams
  return {
    title: q ? `"${q}" — Search` : `Search — ${SITE_NAME}`,
    description: q ? `Browse results for "${q}" on ${SITE_NAME}.` : `Search products on ${SITE_NAME}.`,
  }
}

async function getOnePerCollection() {
  try {
    const { products } = await getPublicProducts({ limit: 100 })
    const seen = new Map()
    for (const p of products) {
      const col = p.collectionName || 'Other'
      if (!seen.has(col)) seen.set(col, p)
    }
    return Array.from(seen.values())
  } catch {
    return []
  }
}

export default async function SearchPage({ searchParams }) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  const [products, collectionProducts] = await Promise.all([
    query ? searchProducts(query).catch(() => []) : Promise.resolve([]),
    !query ? getOnePerCollection() : Promise.resolve([]),
  ])

  return (
    <div className="min-h-screen bg-[#f5f5f5]">

      {/* Hero — same as contact/other pages */}
      <section className="relative overflow-hidden bg-brand-black px-4 pt-32 pb-12 text-center sm:px-6 sm:pt-36 sm:pb-16 md:px-10 md:pt-40 md:pb-20">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-white/[0.03]" />
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.05]" />
        <div className="relative">
          <h1 className="mt-2 text-3xl font-bold text-white lg:text-4xl">
            {query ? `Results for "${query}"` : 'Search'}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/40">
            {query
              ? `${products.length} product${products.length !== 1 ? 's' : ''} found`
              : 'Find exactly what you are looking for'}
          </p>
          <div className="mx-auto mt-6 max-w-xl">
            <SearchInput initialQuery={query} />
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="px-6 py-8 md:px-10">

        {/* ── WITH QUERY ─────────────────────────────────────────────────── */}
        {query && (
          products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 rounded-2xl bg-white py-20 text-center shadow-sm">
              <PackageSearch size={48} className="text-gray-200" />
              <div>
                <p className="text-base font-semibold text-brand-black">No results for &ldquo;{query}&rdquo;</p>
                <p className="mt-1 text-sm text-gray-400">Try a different keyword or browse all products below.</p>
              </div>
            </div>
          )
        )}

        {/* ── NO QUERY: 1 product per collection ─────────────────────────── */}
        {!query && collectionProducts.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {collectionProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
