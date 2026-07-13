import { searchProducts, getPublicProducts } from '@/lib/api/products'
import { ProductCard } from '@/components/collection/ProductCard'
import { SearchInput } from './SearchInput'
import { SITE_NAME } from '@/lib/constants'
import SeoWrapper from '@/components/SeoWrapper'
import { Reveal } from '@/components/ui/Reveal'

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
    <SeoWrapper pageName="search">
      <main className="min-h-screen bg-ivory">
        {/* Refined page header */}
        <section className="vq-container pt-36 pb-10 text-center">
          <Reveal>
            <span className="vq-diamond mx-auto block" aria-hidden />
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
              {query ? 'Search Results' : 'Discover'}
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <h1 className="mt-3 font-display text-4xl font-normal leading-tight text-brand-black md:text-5xl">
              {query ? <>Results for <span className="italic">&ldquo;{query}&rdquo;</span></> : 'Search'}
            </h1>
          </Reveal>
          <Reveal delay={0.24}>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-brand-black/55">
              {query
                ? `${products.length} product${products.length !== 1 ? 's' : ''} matching your search.`
                : 'Find what you are looking for by name, occasion, or collection.'}
            </p>
          </Reveal>
          <Reveal delay={0.32}>
            <div className="mx-auto mt-6 h-px w-12 bg-gold vq-rule" />
          </Reveal>

          {/* Search bar */}
          <Reveal delay={0.4}>
            <div className="mx-auto mt-10 max-w-xl">
              <SearchInput initialQuery={query} />
            </div>
          </Reveal>
        </section>

        {/* Results */}
        <section className="vq-container pb-24">
          {/* WITH QUERY */}
          {query && (
            products.length > 0 ? (
              <Reveal delay={0.1}>
                <div className="mx-auto grid max-w-site grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {products.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              </Reveal>
            ) : (
              <Reveal delay={0.1}>
                <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-16 text-center">
                  <span className="vq-diamond" aria-hidden />
                  <p className="font-display text-2xl italic text-brand-black/75">No matches for &ldquo;{query}&rdquo;.</p>
                  <p className="max-w-sm text-sm leading-relaxed text-brand-black/55">
                    Try a different word, or browse the full collection.
                  </p>
                </div>
              </Reveal>
            )
          )}

          {/* NO QUERY: one piece per collection */}
          {!query && collectionProducts.length > 0 && (
            <Reveal delay={0.1}>
              <div className="mx-auto grid max-w-site grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {collectionProducts.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </Reveal>
          )}
        </section>
      </main>
    </SeoWrapper>
  )
}