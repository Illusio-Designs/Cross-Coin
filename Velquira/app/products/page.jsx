'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { X, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { getPublicProducts, mapProduct } from '@/lib/api/products'
import { getPublicCategories, getCategoryByName } from '@/lib/api/categories'
import { PageHero } from '@/components/layout/PageHero'
import { ProductCard } from '@/components/collection/ProductCard'
import SeoWrapper from '@/components/SeoWrapper'
import { Reveal } from '@/components/ui/Reveal'

const SORT_OPTIONS = [
  { value: 'featured',   label: 'Featured' },
  { value: 'newest',     label: 'Newest' },
  { value: 'price:asc',  label: 'Price, Low to High' },
  { value: 'price:desc', label: 'Price, High to Low' },
]

/**
 * ProductsPage — `/products`
 *
 * Minimal editorial header (eyebrow + Playfair title + intro + thin gold
 * rule) over a refine/sort controls strip and a clean ProductCard grid.
 * All filter and sort state is preserved verbatim — only the visual
 * layer changed to match the rest of the site (no Roman numerals, no
 * rotated ornaments, no diamond dividers).
 */
export default function ProductsPage() {
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get('category')

  const [allProducts, setAllProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)

  const [selectedCategoryIds, setSelectedCategoryIds] = useState([])
  const [selectedCategoryName, setSelectedCategoryName] = useState('')
  const [selectedPrices, setSelectedPrices] = useState([])
  const [selectedColors, setSelectedColors] = useState([])
  const [selectedGenders, setSelectedGenders] = useState([])
  const [sort, setSort] = useState('featured')

  // Fetch categories once on mount + match URL ?category=name.
  useEffect(() => {
    let alive = true
    getPublicCategories().then(cats => {
      if (!alive) return
      setCategories(cats || [])
      if (categoryParam && cats?.length) {
        const match = cats.find(c => c.name.trim().toLowerCase() === categoryParam.toLowerCase())
        if (match) {
          setSelectedCategoryIds([String(match.id)])
          setSelectedCategoryName(match.name)
        }
      }
    }).catch(() => {})
    return () => { alive = false }
  }, [categoryParam])

  // Fetch products — picks the right endpoint:
  //   • no category selected (or multi-select)  → /api/products/catalog
  //   • exactly one category selected           → /api/categories/by-name/:name
  useEffect(() => {
    let alive = true
    setLoading(true)

    const exactlyOne = selectedCategoryIds.length === 1
      ? categories.find(c => String(c.id) === selectedCategoryIds[0])
      : null

    const fetchPromise = exactlyOne
      ? getCategoryByName(exactlyOne.name).then(cat => {
          const rows = cat?.products || []
          return rows.map(mapProduct).filter(Boolean)
        })
      : getPublicProducts({ limit: 200 }).then(r => r.products || [])

    fetchPromise
      .then(prods => { if (alive) setAllProducts(prods) })
      .catch(() => { if (alive) setAllProducts([]) })
      .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [selectedCategoryIds, categories])

  // Extract real filter options from product data
  const filterOptions = useMemo(() => {
    const colors = new Map()
    const genders = new Set()
    const materials = new Set()
    let minP = Infinity, maxP = 0

    allProducts.forEach(p => {
      if (p.price > 0) {
        if (p.price < minP) minP = p.price
        if (p.price > maxP) maxP = p.price
      }
      p.colors?.forEach(c => {
        if (c.name && !c.packColors && !colors.has(c.name)) colors.set(c.name, c.hex)
      })
      p.genders?.forEach(g => { if (g) genders.add(g) })
      p.materials?.forEach(m => { if (m) materials.add(m) })
    })

    if (minP === Infinity) minP = 0
    if (maxP === 0) maxP = 5000
    const step = Math.ceil((maxP - minP) / 4 / 100) * 100 || 500
    const priceRanges = []
    for (let i = 0; i < 4; i++) {
      const lo = minP + step * i
      const hi = i === 3 ? maxP + 1 : minP + step * (i + 1)
      priceRanges.push({ label: `₹${Math.round(lo)} - ₹${Math.round(hi > maxP ? maxP : hi)}`, min: lo, max: hi })
    }

    return {
      colors: Array.from(colors, ([name, hex]) => ({ name, hex })),
      genders: Array.from(genders),
      materials: Array.from(materials),
      priceRanges,
    }
  }, [allProducts])

  // Apply filters + sort client-side.
  const filtered = useMemo(() => {
    let result = [...allProducts]

    if (selectedCategoryIds.length > 1) {
      const catNames = categories.filter(c => selectedCategoryIds.includes(String(c.id))).map(c => c.name.toLowerCase())
      result = result.filter(p => catNames.includes(p.collectionName?.toLowerCase()))
    }

    if (selectedGenders.length > 0) {
      result = result.filter(p => p.genders?.some(g => selectedGenders.includes(g)))
    }

    if (selectedPrices.length > 0) {
      const ranges = selectedPrices.map(label => filterOptions.priceRanges.find(r => r.label === label)).filter(Boolean)
      result = result.filter(p => ranges.some(r => p.price >= r.min && p.price < r.max))
    }

    if (selectedColors.length > 0) {
      result = result.filter(p => p.colors?.some(c => selectedColors.includes(c.name)))
    }

    switch (sort) {
      case 'price:asc':  result.sort((a, b) => a.price - b.price); break
      case 'price:desc': result.sort((a, b) => b.price - a.price); break
      case 'newest':     result.sort((a, b) => Number(b.id) - Number(a.id)); break
    }

    return result
  }, [allProducts, selectedCategoryIds, selectedGenders, selectedPrices, selectedColors, sort, categories, filterOptions])

  const activeFilterCount = [
    selectedCategoryIds.length > 0,
    selectedPrices.length > 0,
    selectedColors.length > 0,
    selectedGenders.length > 0,
  ].filter(Boolean).length

  const clearFilters = () => {
    setSelectedCategoryIds([])
    setSelectedCategoryName('')
    setSelectedPrices([])
    setSelectedColors([])
    setSelectedGenders([])
  }

  const toggleCategory = (cat) => {
    setSelectedCategoryIds(prev =>
      prev.includes(String(cat.id))
        ? prev.filter(c => c !== String(cat.id))
        : [...prev, String(cat.id)]
    )
    setSelectedCategoryName('')
  }
  const togglePrice  = (label) => setSelectedPrices(prev => prev.includes(label) ? prev.filter(p => p !== label) : [...prev, label])
  const toggleColor  = (name)  => setSelectedColors(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name])
  const toggleGender = (g)     => setSelectedGenders(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  const selectedCategories = categories.filter(c => selectedCategoryIds.includes(String(c.id)))
  const headingTitle =
    selectedCategories.length > 0
      ? selectedCategories.map(c => c.name).join(' · ')
      : 'All Products'
  const introCopy =
    selectedCategories.length > 0
      ? `Hand-finished ${selectedCategories.map(c => c.name.toLowerCase()).join(', ')} from the Velquira studio.`
      : 'Hand-finished rings, necklaces, earrings and bracelets in 18k gold, certified diamonds and ethically sourced gemstones.'

  const countLabel = `${filtered.length} ${filtered.length === 1 ? 'item' : 'items'}`

  return (
    <SeoWrapper pageName="products">
      <main className="bg-cream">
        <PageHero
          variant="minimal"
          align="left"
          eyebrow="Products"
          title={headingTitle}
          description={introCopy}
        >
          <p className="mt-4 text-[11px] uppercase tracking-[0.3em] text-gold">{countLabel}</p>
        </PageHero>

        {/* Category browse row */}
        {categories.length > 0 && (
          <div className="vq-container pt-8 pb-2">
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/products"
                className={`rounded-full border px-5 py-2 text-[11px] font-medium uppercase tracking-[0.18em] transition-all duration-300 ${
                  !categoryParam ? 'border-ink bg-ink text-cream' : 'border-line text-ink hover:border-ink'
                }`}
              >
                All
              </Link>
              {categories.map((c) => {
                const name = (c.name || '').trim()
                const active = categoryParam === name
                return (
                  <Link
                    key={c.id || c.slug || name}
                    href={`/products?category=${encodeURIComponent(name)}`}
                    className={`rounded-full border px-5 py-2 text-[11px] font-medium uppercase tracking-[0.18em] transition-all duration-300 ${
                      active ? 'border-ink bg-ink text-cream' : 'border-line text-ink hover:border-ink'
                    }`}
                  >
                    {name}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Controls bar — sticky hairline gold rules */}
        <div className="sticky top-[112px] z-30 border-y border-line bg-cream/95 backdrop-blur-sm">
          <div className="vq-container flex h-14 items-center justify-between gap-4">
            <button
              onClick={() => setFiltersOpen(true)}
              className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.28em] text-ink transition-colors duration-200 hover:text-gold"
            >
              <SlidersHorizontal size={13} strokeWidth={1.6} />
              Refine
              {activeFilterCount > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 font-sans text-[9px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <p className="hidden font-display text-[13px] italic text-text-muted sm:block">
              {loading ? 'Loading…' : countLabel}
            </p>

            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="inline-flex items-center gap-2 border-b border-line px-1 pb-1 text-[11px] font-medium uppercase tracking-[0.22em] text-ink transition-colors duration-200 hover:border-ink"
              >
                {SORT_OPTIONS.find(o => o.value === sort)?.label}
                <ChevronDown size={12} strokeWidth={1.7} className={`text-ink transition-transform duration-300 ${sortOpen ? 'rotate-180' : ''}`} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-3 w-56 rounded-md border border-line bg-cream py-1 shadow-[0_18px_40px_-22px_rgba(20,20,20,0.20)]">
                  {SORT_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => { setSort(o.value); setSortOpen(false) }}
                      className={`block w-full px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.2em] transition-colors duration-150 ${
                        sort === o.value
                          ? 'text-ink font-semibold'
                          : 'text-text-muted hover:text-ink'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter side drawer */}
        {filtersOpen && (
          <div className="fixed inset-0 z-[100]">
            <div
              className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
              onClick={() => setFiltersOpen(false)}
            />
            <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-cream shadow-[0_0_60px_-10px_rgba(20,20,20,0.20)]">
              <div className="flex items-center justify-between border-b border-line px-7 py-5">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">Refine</p>
                  <p className="mt-1 font-display text-xl text-ink">
                    {filtered.length}{' '}
                    <span className="text-sm italic text-text-muted">
                      {filtered.length === 1 ? 'item' : 'items'}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setFiltersOpen(false)}
                  aria-label="Close filters"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink transition-colors duration-200 hover:border-ink"
                >
                  <X size={14} strokeWidth={1.6} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-7 py-8">
                <div className="flex flex-col gap-10">
                  {/* Category */}
                  {categories.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
                        Category
                      </p>
                      <div className="mt-3 h-px w-10 bg-gold/50" />
                      <div className="mt-5 flex flex-col gap-3.5">
                        {categories.map(cat => (
                          <label
                            key={cat.id}
                            className="group flex cursor-pointer items-center gap-3 font-display text-[14px] text-graphite transition-colors hover:text-ink"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCategoryIds.includes(String(cat.id))}
                              onChange={() => toggleCategory(cat)}
                              className="h-3.5 w-3.5 accent-ink"
                            />
                            {cat.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tone */}
                  {filterOptions.colors.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
                        Tone
                      </p>
                      <div className="mt-3 h-px w-10 bg-gold/50" />
                      <div className="mt-5 flex flex-wrap gap-4">
                        {filterOptions.colors.map(c => (
                          <button
                            key={c.name}
                            onClick={() => toggleColor(c.name)}
                            title={c.name}
                            className="group flex flex-col items-center gap-2"
                          >
                            <span
                              className={`h-7 w-7 rounded-full border transition-all duration-200 ${
                                selectedColors.includes(c.name)
                                  ? 'border-gold ring-1 ring-gold ring-offset-2 ring-offset-white'
                                  : 'border-line group-hover:border-ink'
                              }`}
                              style={{ backgroundColor: c.hex }}
                            />
                            <span className="text-[10px] uppercase tracking-[0.18em] text-text-muted">
                              {c.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price */}
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
                      Price
                    </p>
                    <div className="mt-3 h-px w-10 bg-gold/40" />
                    <div className="mt-5 flex flex-col gap-3.5">
                      {filterOptions.priceRanges.map(r => (
                        <label
                          key={r.label}
                          className="flex cursor-pointer items-center gap-3 font-display text-[14px] text-graphite transition-colors hover:text-ink"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPrices.includes(r.label)}
                            onChange={() => togglePrice(r.label)}
                            className="h-3.5 w-3.5 accent-ink"
                          />
                          {r.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Gender */}
                  {filterOptions.genders.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
                        Worn By
                      </p>
                      <div className="mt-3 h-px w-10 bg-gold/50" />
                      <div className="mt-5 flex flex-col gap-3.5">
                        {filterOptions.genders.map(g => (
                          <label
                            key={g}
                            className="flex cursor-pointer items-center gap-3 font-display text-[14px] text-graphite transition-colors hover:text-ink"
                          >
                            <input
                              type="checkbox"
                              checked={selectedGenders.includes(g)}
                              onChange={() => toggleGender(g)}
                              className="h-3.5 w-3.5 accent-ink"
                            />
                            {g}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-line px-7 py-5">
                <button
                  onClick={clearFilters}
                  disabled={activeFilterCount === 0}
                  className="text-[11px] font-medium uppercase tracking-[0.28em] text-text-muted transition-colors duration-200 hover:text-ink disabled:opacity-40"
                >
                  Clear all
                </button>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-[11px] font-medium uppercase tracking-[0.28em] text-white transition-colors duration-200 hover:bg-[#3a3227]"
                >
                  View {countLabel}
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Grid */}
        <section className="pb-24 pt-12 md:pb-32 md:pt-14">
          <div className="vq-container">
            {loading ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col rounded-2xl border border-line bg-cream p-3"
                  >
                    <div className="aspect-square animate-pulse rounded-xl bg-paper" />
                    <div className="mt-4 h-3 w-3/4 animate-pulse rounded bg-paper" />
                    <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-paper" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Reveal>
                <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
                  <span className="inline-block h-px w-12 bg-gold/60" aria-hidden />
                  <p className="font-display text-2xl italic text-ink">
                    Nothing matches just yet.
                  </p>
                  <p className="text-[14px] leading-relaxed text-text-muted">
                    Remove a filter to see more products.
                  </p>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="mt-2 text-[11px] font-medium uppercase tracking-[0.28em] text-text-muted transition-colors duration-200 hover:text-ink"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </Reveal>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </SeoWrapper>
  )
}