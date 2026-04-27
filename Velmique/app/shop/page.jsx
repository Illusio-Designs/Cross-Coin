'use client';
import { useState, useMemo } from 'react';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { products, categories } from '@/lib/data';
import ProductCard from '@/components/shop/ProductCard';
import QuickViewModal from '@/components/shop/QuickViewModal';
import PageHeader from '@/components/layout/PageHeader';

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
  const [priceRange, setPriceRange] = useState([0, 50000]);

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
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow="Browse"
        title="ALL"
        accent="FRAGRANCES"
        intro="Every Velmique extrait, eau de parfum and discovery kit — composed in Grasse, ready for your skin."
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10 pb-6 border-b border-[var(--border)]">
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 text-[10px] tracking-[0.2em] uppercase font-body rounded-full border transition-all ${
                  activeCategory === cat
                    ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
                    : 'border-[var(--border)] text-[var(--ink-soft)] hover:border-[var(--gold)] hover:text-[var(--ink)]'
                }`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[var(--ink-muted)] text-xs font-body">{filtered.length} pieces</span>
            <div className="relative">
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="bg-white border border-[var(--border)] pl-4 pr-9 py-2 text-xs font-body appearance-none rounded-full cursor-pointer text-[var(--ink)] hover:border-[var(--gold)] transition-colors">
                {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
            </div>
            <button onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-2 bg-white border border-[var(--border)] px-4 py-2 text-[10px] tracking-[0.2em] uppercase font-body rounded-full text-[var(--ink)] hover:border-[var(--gold)] transition-colors">
              <SlidersHorizontal size={12} /> Filters
            </button>
          </div>
        </div>

        <div className="flex gap-8">
          {filtersOpen && (
            <aside className="w-60 flex-shrink-0">
              <div className="bg-white border border-[var(--border)] rounded-2xl p-6 space-y-7 sticky top-28">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] tracking-[0.3em] uppercase text-[var(--ink)] font-body">Filters</h3>
                  <button onClick={() => setFiltersOpen(false)}><X size={14} className="text-[var(--ink-muted)]" /></button>
                </div>

                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-3">Price Range</p>
                  <div className="flex items-center gap-2 text-[var(--ink-soft)] text-xs font-body mb-2">
                    <span>${Math.round(priceRange[0] / 100)}</span>
                    <span className="flex-1 text-center">–</span>
                    <span>${Math.round(priceRange[1] / 100)}</span>
                  </div>
                  <input type="range" min={0} max={50000} step={500} value={priceRange[1]}
                    onChange={e => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full accent-[var(--gold)]" />
                </div>

                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-3">Maison</p>
                  {['Noir', 'Signature', 'Luminara', 'Extrait'].map(c => (
                    <label key={c} className="flex items-center gap-2 py-1.5 cursor-pointer group">
                      <input type="checkbox" className="accent-[var(--gold)]" />
                      <span className="text-[var(--ink-soft)] text-sm font-body group-hover:text-[var(--ink)] transition-colors">{c}</span>
                    </label>
                  ))}
                </div>

                <button onClick={() => { setActiveCategory('All'); setPriceRange([0, 50000]); }}
                  className="text-[var(--gold-deep)] text-[10px] uppercase tracking-[0.3em] font-body hover:underline">
                  Clear All
                </button>
              </div>
            </aside>
          )}

          <div className="flex-1">
            {filtered.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map(p => (
                  <ProductCard key={p.id} product={p} onQuickView={setQuickView} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="font-display text-3xl text-[var(--ink-muted)] uppercase tracking-tight">No products found</p>
                <button onClick={() => setActiveCategory('All')} className="text-[var(--gold-deep)] text-[10px] tracking-[0.3em] uppercase font-body mt-4 hover:underline">
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
