'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { X, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { getPublicProducts, mapProduct } from '@/lib/api/products'
import { getPublicCategories, getCategoryByName } from '@/lib/api/categories'
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
      : 'All Pieces'
  const introCopy =
    selectedCategories.length > 0
      ? `Hand-finished ${selectedCategories.map(c => c.name.toLowerCase()).join(', ')} from the Velquira atelier.`
      : 'Hand-finished rings, necklaces, earrings and bracelets in 18k gold, certified diamonds and ethically sourced gemstones.'

  const countLabel = `${filtered.length} ${filtered.length === 1 ? 'piece' : 'pieces'}`

  return (
    <SeoWrapper pageName="products">
      <main className="bg-ivory">
        {/* Editorial page header */}
        <section className="px-4 pt-20 pb-12 text-center md:pt-28 md:pb-16 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <Reveal>
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
                Products
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-4 font-display text-4xl font-normal leading-[1.05] tracking-tight text-brand-black md:text-6xl">
                {headingTitle}
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-brand-black/60">
                {introCopy}
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <span className="mt-6 inline-block h-px w-12 bg-gold/60" aria-hidden />
            </Reveal>
          </div>
        </section>

        {/* Controls bar — sticky hairline gold rules */}
        <div className="sticky top-[64px] z-30 border-y border-gold/20 bg-ivory/95 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between gap-4 px-4 md:px-8">
            <button
              onClick={() => setFiltersOpen(true)}
              className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.28em] text-brand-black transition-colors duration-200 hover:text-gold-deep"
            >
              <SlidersHorizontal size={13} strokeWidth={1.6} />
              Refine
              {activeFilterCount > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 font-sans text-[9px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <p className="hidden font-display text-[13px] italic text-brand-black/55 sm:block">
              {loading ? 'Curating…' : countLabel}
            </p>

            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="inline-flex items-center gap-2 border-b border-gold/30 px-1 pb-1 text-[11px] font-medium uppercase tracking-[0.22em] text-brand-black transition-colors duration-200 hover:border-gold"
              >
                {SORT_OPTIONS.find(o => o.value === sort)?.label}
                <ChevronDown size={12} strokeWidth={1.7} className={`text-gold transition-transform duration-300 ${sortOpen ? 'rotate-180' : ''}`} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-3 w-56 rounded-md border border-gold/25 bg-white py-1 shadow-[0_18px_40px_-22px_rgba(143,102,32,0.28)]">
                  {SORT_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => { setSort(o.value); setSortOpen(false) }}
                      className={`block w-full px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.2em] transition-colors duration-150 ${
                        sort === o.value
                          ? 'text-gold'
                          : 'text-brand-black/70 hover:text-gold-deep'
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
              className="absolute inset-0 bg-brand-black/30 backdrop-blur-sm"
              onClick={() => setFiltersOpen(false)}
            />
            <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-ivory shadow-[0_0_60px_-10px_rgba(58,46,26,0.35)]">
              <div className="flex items-center justify-between border-b border-gold/20 px-7 py-5">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">Refine</p>
                  <p className="mt-1 font-display text-xl text-brand-black">
                    {filtered.length}{' '}
                    <span className="text-sm italic text-brand-black/55">
                      {filtered.length === 1 ? 'piece' : 'pieces'}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setFiltersOpen(false)}
                  aria-label="Close filters"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/30 text-brand-black transition-colors duration-200 hover:border-gold hover:text-gold"
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
                      <div className="mt-3 h-px w-10 bg-gold/40" />
                      <div className="mt-5 flex flex-col gap-3.5">
                        {categories.map(cat => (
                          <label
                            key={cat.id}
                            className="group flex cursor-pointer items-center gap-3 font-display text-[14px] text-brand-black/80 transition-colors hover:text-brand-black"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCategoryIds.includes(String(cat.id))}
                              onChange={() => toggleCategory(cat)}
                              className="h-3.5 w-3.5 accent-gold"
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
                      <div className="mt-3 h-px w-10 bg-gold/40" />
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
                                  ? 'border-gold ring-1 ring-gold ring-offset-2 ring-offset-ivory'
                                  : 'border-gold/30 group-hover:border-gold'
                              }`}
                              style={{ backgroundColor: c.hex }}
                            />
                            <span className="text-[10px] uppercase tracking-[0.18em] text-brand-black/65">
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
                          className="flex cursor-pointer items-center gap-3 font-display text-[14px] text-brand-black/80 transition-colors hover:text-brand-black"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPrices.includes(r.label)}
                            onChange={() => togglePrice(r.label)}
                            className="h-3.5 w-3.5 accent-gold"
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
                      <div className="mt-3 h-px w-10 bg-gold/40" />
                      <div className="mt-5 flex flex-col gap-3.5">
                        {filterOptions.genders.map(g => (
                          <label
                            key={g}
                            className="flex cursor-pointer items-center gap-3 font-display text-[14px] text-brand-black/80 transition-colors hover:text-brand-black"
                          >
                            <input
                              type="checkbox"
                              checked={selectedGenders.includes(g)}
                              onChange={() => toggleGender(g)}
                              className="h-3.5 w-3.5 accent-gold"
                            />
                            {g}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-gold/20 px-7 py-5">
                <button
                  onClick={clearFilters}
                  disabled={activeFilterCount === 0}
                  className="text-[11px] font-medium uppercase tracking-[0.28em] text-gold transition-colors duration-200 hover:text-gold-deep disabled:opacity-40"
                >
                  Clear all
                </button>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="inline-flex items-center justify-center rounded-full bg-brand-black px-6 py-3 text-[11px] font-medium uppercase tracking-[0.28em] text-white transition-colors duration-200 hover:bg-gold-deep"
                >
                  View {countLabel}
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Grid */}
        <section className="px-4 pb-24 pt-12 md:pb-32 md:pt-14 lg:px-8">
          <div className="mx-auto max-w-[1320px]">
            {loading ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col rounded-2xl border border-gold/20 bg-white p-3"
                  >
                    <div className="aspect-square animate-pulse rounded-xl bg-cream" />
                    <div className="mt-4 h-3 w-3/4 animate-pulse rounded bg-cream" />
                    <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-cream" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Reveal>
                <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
                  <span className="inline-block h-px w-12 bg-gold/60" aria-hidden />
                  <p className="font-display text-2xl italic text-brand-black">
                    Nothing matches just yet.
                  </p>
                  <p className="text-[14px] leading-relaxed text-brand-black/55">
                    Loosen a selection to discover more pieces.
                  </p>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="mt-2 text-[11px] font-medium uppercase tracking-[0.28em] text-gold transition-colors duration-200 hover:text-gold-deep"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </Reveal>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
                {filtered.map((p, i) => (
                  <Reveal key={p.id} delay={Math.min(i * 0.03, 0.3)}>
                    <ProductCard product={p} />
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </SeoWrapper>
  )
}