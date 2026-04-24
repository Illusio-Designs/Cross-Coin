'use client';
import { useState, useMemo } from 'react';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { products, categories } from '@/lib/data';
import ProductCard from '@/components/shop/ProductCard';
import QuickViewModal from '@/components/shop/QuickViewModal';

const sortOptions = [
  { label: 'Featured', value: 'featured' },
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Best Rated', value: 'rating' },
];

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickView, setQuickView] = useState(null);
  const [priceRange, setPriceRange] = useState([0, 500]);

  const filtered = useMemo(() => {
    let list = activeCategory === 'All' ? products : products.filter(p => p.category === activeCategory);
    list = list.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
    switch (sortBy) {
      case 'price-asc': return [...list].sort((a, b) => a.price - b.price);
      case 'price-desc': return [...list].sort((a, b) => b.price - a.price);
      case 'rating': return [...list].sort((a, b) => b.rating - a.rating);
      default: return list;
    }
  }, [activeCategory, sortBy, priceRange]);

  return (
    <div className="pt-24 min-h-screen">
      {/* Header */}
      <div className="border-b border-[#b8624f]/10 bg-[#26211b]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 py-10">
          <p className="text-[#d4927f]/60 text-xs tracking-[0.3em] uppercase font-body mb-2">Browse</p>
          <h1 className="font-serif text-4xl text-[#f3ede0]">All Fragrances</h1>
          <div className="gold-divider w-16 mt-4" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 py-8">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 text-xs tracking-[0.15em] uppercase font-body rounded-full border transition-all ${
                  activeCategory === cat
                    ? 'bg-[#b8624f] text-black border-[#b8624f]'
                    : 'border-[#b8624f]/20 text-[#f3ede0]/60 hover:border-[#b8624f]/50 hover:text-[#d4927f]'
                }`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[#f3ede0]/40 text-xs font-body">{filtered.length} items</span>
            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="input-gold pl-3 pr-8 py-2 text-xs font-body appearance-none rounded-sm cursor-pointer"
              >
                {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#d4927f]/60 pointer-events-none" />
            </div>
            {/* Filter toggle */}
            <button onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-2 btn-outline-gold px-4 py-2 text-xs tracking-wider uppercase font-body rounded-sm">
              <SlidersHorizontal size={12} /> Filters
            </button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar filters */}
          {filtersOpen && (
            <aside className="w-56 flex-shrink-0">
              <div className="bg-[#1d1915] border border-[#b8624f]/15 rounded-sm p-5 space-y-6 sticky top-28">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs tracking-[0.2em] uppercase text-[#f3ede0] font-body">Filters</h3>
                  <button onClick={() => setFiltersOpen(false)}><X size={14} className="text-[#f3ede0]/40" /></button>
                </div>

                {/* Price range */}
                <div>
                  <p className="text-xs tracking-[0.15em] uppercase text-[#f3ede0]/50 font-body mb-3">Price Range</p>
                  <div className="flex items-center gap-2 text-[#f3ede0]/60 text-xs font-body mb-2">
                    <span>${priceRange[0]}</span>
                    <span className="flex-1 text-center">–</span>
                    <span>${priceRange[1]}</span>
                  </div>
                  <input type="range" min={0} max={500} value={priceRange[1]}
                    onChange={e => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full accent-[#C9A84C]" />
                </div>

                {/* Collections */}
                <div>
                  <p className="text-xs tracking-[0.15em] uppercase text-[#f3ede0]/50 font-body mb-3">Collection</p>
                  {['Noir', 'Signature', 'Luminara', 'Extrait'].map(c => (
                    <label key={c} className="flex items-center gap-2 py-1.5 cursor-pointer group">
                      <input type="checkbox" className="accent-[#C9A84C]" />
                      <span className="text-[#f3ede0]/60 text-xs font-body group-hover:text-[#d4927f] transition-colors">{c}</span>
                    </label>
                  ))}
                </div>

                <button onClick={() => { setActiveCategory('All'); setPriceRange([0, 500]); }}
                  className="text-[#d4927f]/60 text-xs uppercase tracking-wider font-body hover:text-[#d4927f] transition-colors">
                  Clear All
                </button>
              </div>
            </aside>
          )}

          {/* Product grid */}
          <div className="flex-1">
            {filtered.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map(p => (
                  <ProductCard key={p.id} product={p} onQuickView={setQuickView} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="font-serif text-xl text-[#f3ede0]/40">No products found</p>
                <button onClick={() => setActiveCategory('All')} className="text-[#d4927f] text-xs tracking-wider uppercase font-body mt-4 hover:underline">
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
    </div>
  );
}
