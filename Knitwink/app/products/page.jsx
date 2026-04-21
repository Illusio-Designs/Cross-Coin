'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { getPublicProducts } from '@/lib/api/products'
import { getPublicCategories } from '@/lib/api/categories'
import { ProductCard } from '@/components/collection/ProductCard'

const SORT_OPTIONS = [
  { value: 'featured',   label: 'Featured' },
  { value: 'newest',     label: 'Newest' },
  { value: 'price:asc',  label: 'Price, Low to High' },
  { value: 'price:desc', label: 'Price, High to Low' },
]

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

  // Fetch categories + all products once
  useEffect(() => {
    setLoading(true)
    Promise.all([
      getPublicProducts({ limit: 200 }),
      getPublicCategories(),
    ]).then(([result, cats]) => {
      setAllProducts(result.products || [])
      setCategories(cats || [])
      // Match URL category param
      if (categoryParam && cats?.length) {
        const match = cats.find(c => c.name.trim().toLowerCase() === categoryParam.toLowerCase())
        if (match) {
          setSelectedCategoryIds([String(match.id)])
          setSelectedCategoryName(match.name)
        }
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [categoryParam])

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
      // Gender from variation attributes
      p.genders?.forEach(g => { if (g) genders.add(g) })
      // Materials from variation attributes
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

  // Apply filters + sort client-side
  const filtered = useMemo(() => {
    let result = [...allProducts]

    // Category — multi-select
    if (selectedCategoryIds.length > 0) {
      const catNames = categories.filter(c => selectedCategoryIds.includes(String(c.id))).map(c => c.name.toLowerCase())
      result = result.filter(p => catNames.includes(p.collectionName?.toLowerCase()))
    }

    // Gender — from product.genders array
    if (selectedGenders.length > 0) {
      result = result.filter(p => p.genders?.some(g => selectedGenders.includes(g)))
    }

    // Price — multi-select ranges
    if (selectedPrices.length > 0) {
      const ranges = selectedPrices.map(label => filterOptions.priceRanges.find(r => r.label === label)).filter(Boolean)
      result = result.filter(p => ranges.some(r => p.price >= r.min && p.price < r.max))
    }

    // Colors
    if (selectedColors.length > 0) {
      result = result.filter(p => p.colors?.some(c => selectedColors.includes(c.name)))
    }

    // Sort
    switch (sort) {
      case 'price:asc':  result.sort((a, b) => a.price - b.price); break
      case 'price:desc': result.sort((a, b) => b.price - a.price); break
      case 'newest':     result.sort((a, b) => Number(b.id) - Number(a.id)); break
    }

    return result
  }, [allProducts, selectedCategoryIds, selectedGenders, selectedPrices, selectedColors, sort, categories, filterOptions])

  const activeFilterCount = [selectedCategoryIds.length > 0, selectedPrices.length > 0, selectedColors.length > 0, selectedGenders.length > 0].filter(Boolean).length

  const clearFilters = () => {
    setSelectedCategoryIds([]); setSelectedCategoryName(''); setSelectedPrices([]); setSelectedColors([]); setSelectedGenders([])
  }

  const toggleCategory = (cat) => {
    setSelectedCategoryIds(prev => prev.includes(String(cat.id)) ? prev.filter(c => c !== String(cat.id)) : [...prev, String(cat.id)])
    setSelectedCategoryName('')
  }

  const togglePrice = (label) => setSelectedPrices(prev => prev.includes(label) ? prev.filter(p => p !== label) : [...prev, label])

  const toggleColor = (name) => setSelectedColors(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name])
  const toggleGender = (g) => setSelectedGenders(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-black min-h-[240px] sm:min-h-[300px] md:min-h-[380px]">
        <img src="/product hero.jpg" alt="Products" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black/60 to-transparent" />
        <div className="relative flex h-full min-h-[240px] sm:min-h-[300px] md:min-h-[380px] flex-col items-start justify-end px-4 pt-32 pb-8 sm:px-6 sm:pt-36 sm:pb-10 md:px-10 md:pt-40">
          <h1 className="text-3xl font-bold text-white lg:text-4xl">{
            selectedCategoryIds.length > 0
              ? categories.filter(c => selectedCategoryIds.includes(String(c.id))).map(c => c.name).join(', ')
              : 'All Products'
          }</h1>
          <p className="mt-2 text-sm text-white/50">Premium socks crafted for comfort and style.</p>
        </div>
      </section>

      {/* Controls bar */}
      <div className="sticky top-[70px] z-30 mx-3 mt-2 rounded-2xl border border-gray-100 bg-white/95 px-4 shadow-sm backdrop-blur-sm md:px-6">
        <div className="flex h-14 items-center justify-between">
          {/* Filter */}
          <button onClick={() => setFiltersOpen(true)} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-black">
            <SlidersHorizontal size={15} />
            Filter
            {activeFilterCount > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-black text-[9px] text-white">{activeFilterCount}</span>}
          </button>

          {/* Gender tabs — hidden on mobile */}
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto">
            {['All', 'Men', 'Women', 'Unisex'].map(g => (
              <button key={g} onClick={() => {
                if (g === 'All') setSelectedGenders([])
                else setSelectedGenders(prev => prev.length === 1 && prev[0] === g ? [] : [g])
              }}
                className={`shrink-0 rounded-full px-5 py-1.5 text-xs font-semibold transition-colors ${
                  (g === 'All' && selectedGenders.length === 0) || selectedGenders.includes(g)
                    ? 'bg-brand-black text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >{g}</button>
            ))}
          </div>

          {/* Sort */}
          <div className="relative">
            <button onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-1.5 text-xs font-semibold text-brand-black"
            >
              {SORT_OPTIONS.find(o => o.value === sort)?.label}
              <ChevronDown size={13} className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                {SORT_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => { setSort(o.value); setSortOpen(false) }}
                    className={`block w-full px-4 py-2.5 text-left text-xs ${sort === o.value ? 'bg-gray-50 font-semibold text-brand-black' : 'text-gray-600 hover:bg-gray-50'}`}
                  >{o.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter popup */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
          <div className="relative w-full max-w-4xl rounded-2xl border border-gray-100 bg-white p-5 shadow-2xl sm:p-6 md:p-8 max-h-[85vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <X size={15} className="cursor-pointer text-gray-500" onClick={() => setFiltersOpen(false)} />
                <p className="text-xs font-bold uppercase tracking-widest text-brand-black">
                  Collapse Filters <span className="font-normal text-gray-400">({filtered.length} products)</span>
                </p>
              </div>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs font-semibold text-brand-black underline underline-offset-2">Clear all</button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4">
              {/* Category */}
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-brand-black">Category</p>
                <div className="flex flex-col gap-2.5">
                  {categories.map(cat => (
                    <label key={cat.id} className="flex items-center gap-2.5 text-xs text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={selectedCategoryIds.includes(String(cat.id))} onChange={() => toggleCategory(cat)} className="accent-brand-black h-3.5 w-3.5" />
                      {cat.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Color */}
              {filterOptions.colors.length > 0 && (
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-brand-black">Color</p>
                  <div className="flex flex-wrap gap-2.5">
                    {filterOptions.colors.map(c => (
                      <div key={c.name} className="flex flex-col items-center gap-1">
                        <button onClick={() => toggleColor(c.name)} title={c.name}
                          className={`h-7 w-7 rounded-full border-2 transition-all ${selectedColors.includes(c.name) ? 'border-brand-black ring-2 ring-brand-black ring-offset-1' : 'border-gray-200'}`}
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-[9px] text-gray-400">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Price — from real data */}
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-brand-black">Price</p>
                <div className="flex flex-col gap-2.5">
                  {filterOptions.priceRanges.map(r => (
                    <label key={r.label} className="flex items-center gap-2.5 text-xs text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={selectedPrices.includes(r.label)} onChange={() => togglePrice(r.label)} className="accent-brand-black h-3.5 w-3.5" />
                      {r.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Gender — from real data */}
              {filterOptions.genders.length > 0 && (
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-brand-black">Gender</p>
                  <div className="flex flex-col gap-2.5">
                    {filterOptions.genders.map(g => (
                      <label key={g} className="flex items-center gap-2.5 text-xs text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={selectedGenders.includes(g)} onChange={() => toggleGender(g)} className="accent-brand-black h-3.5 w-3.5" />
                        {g}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="bg-off-white px-4 py-8 md:px-6">
        {loading ? (
          <div className="mx-auto grid max-w-site grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-square animate-pulse rounded-2xl bg-gray-100" />
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-20 text-center text-sm text-gray-400">No products found.</p>
        ) : (
          <div className="mx-auto grid max-w-site grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </>
  )
}
