'use client';
import { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X, ChevronDown, Check } from 'lucide-react';
import ProductCard from '@/components/shop/ProductCard';
import PageHeader from '@/components/layout/PageHeader';
import { getPublicProducts, mapProduct } from '@/lib/api/products';
import { getPublicCategories, getCategoryByName } from '@/lib/api/categories';
// getCategoryByName is kept as a fallback for the rare case the catalog
// endpoint can't be filtered by id.

const sortOptions = [
  { label: 'Featured',           value: 'featured'   },
  { label: 'Newest',             value: 'newest'     },
  { label: 'Price: Low to High', value: 'price-asc'  },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Best Rated',         value: 'rating'     },
];

function ShopPageInner() {
  const searchParams = useSearchParams();
  const collectionParam = searchParams?.get('collection') || '';

  const [products, setProducts]       = useState([]);
  const [rawCategories, setRawCategories] = useState([]);
  const [categories, setCategories]   = useState(['All']);
  const [loading, setLoading]         = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy]           = useState('featured');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceRange, setPriceRange]   = useState([0, 50000]);

  // Lock body scroll while the mobile filter drawer is open. Only kicks in
  // below md breakpoint where the drawer overlay is shown.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (filtersOpen && isMobile) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [filtersOpen]);

  // Fetch categories once on mount (small payload, used by URL slug matching + filter pills).
  useEffect(() => {
    let alive = true;
    getPublicCategories().then(cats => {
      if (!alive) return;
      if (Array.isArray(cats) && cats.length) {
        setRawCategories(cats);
        setCategories(['All', ...cats.map(c => c.name)]);
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Honour ?collection=slug — match against category slug or name once cats arrive.
  useEffect(() => {
    if (!collectionParam || !rawCategories.length) return;
    const slug = collectionParam.toLowerCase();
    const match = rawCategories.find(
      c => (c.slug || '').toLowerCase() === slug
        || c.name.toLowerCase() === slug
        || c.name.toLowerCase().replace(/\s+/g, '-') === slug
    );
    if (match) setActiveCategory(match.name);
  }, [collectionParam, rawCategories]);

  // Fetch products — always uses the catalog endpoint so cards have
  // full data (images, variations, ratings, prices) regardless of
  // whether the user is browsing All or a specific collection. The
  // by-name endpoint returns sparse rows, which is why filtered cards
  // were missing reviews / images / etc — we route around it.
  useEffect(() => {
    let alive = true;
    setLoading(true);

    let fetchPromise;
    if (activeCategory === 'All') {
      fetchPromise = getPublicProducts({ limit: 200 }).then(r => r.products || []);
    } else {
      // Resolve the category name → id from the cached list, then hit
      // catalog with that id. Same data shape as "All".
      const matched = rawCategories.find(c => c.name === activeCategory);
      if (matched?.id) {
        fetchPromise = getPublicProducts({ category: matched.id, limit: 200 }).then(r => r.products || []);
      } else {
        // Defensive fallback — categories haven't loaded yet OR the
        // backend doesn't have an id we recognise. Use the by-name
        // endpoint so the page isn't empty.
        fetchPromise = getCategoryByName(activeCategory).then(cat => {
          const rows = cat?.products || [];
          return rows.map(mapProduct).filter(Boolean);
        });
      }
    }

    fetchPromise
      .then(prods => { if (alive) setProducts(prods); })
      .catch(() => { if (alive) setProducts([]); })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [activeCategory, rawCategories]);

  // API already filtered by category — just apply price + sort client-side.
  const filtered = useMemo(() => {
    const list = products.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
    switch (sortBy) {
      case 'price-asc':  return [...list].sort((a, b) => a.price - b.price);
      case 'price-desc': return [...list].sort((a, b) => b.price - a.price);
      case 'rating':     return [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'newest':     return [...list].reverse();
      default:           return list;
    }
  }, [sortBy, priceRange, products]);

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
            <span className="text-[var(--ink-muted)] text-xs font-body">
              {loading ? 'Loading…' : `${filtered.length} pieces`}
            </span>
            <SortDropdown value={sortBy} onChange={setSortBy} options={sortOptions} />
            <button onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-2 bg-white border border-[var(--border)] px-4 py-2 text-[10px] tracking-[0.2em] uppercase font-body rounded-full text-[var(--ink)] hover:border-[var(--gold)] transition-colors">
              <SlidersHorizontal size={12} /> Filters
            </button>
          </div>
        </div>

        {/* Mobile filter drawer (full-height from left, with backdrop) */}
        {filtersOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 bg-[var(--ink)]/40 backdrop-blur-[2px] z-40"
              onClick={() => setFiltersOpen(false)}
              aria-hidden
            />
            <aside className="md:hidden fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white z-50 shadow-2xl flex flex-col animate-[slideInLeft_.25s_ease-out]">
              <FilterPanel
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                categories={categories}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                onClose={() => setFiltersOpen(false)}
                onClearAll={() => { setActiveCategory('All'); setPriceRange([0, 50000]); }}
                mobile
              />
            </aside>
            <style jsx>{`
              @keyframes slideInLeft {
                from { transform: translateX(-100%); }
                to   { transform: translateX(0); }
              }
            `}</style>
          </>
        )}

        <div className="flex gap-8">
          {/* Desktop sidebar (hidden on mobile — mobile uses the drawer above) */}
          {filtersOpen && (
            <aside className="hidden md:block w-60 flex-shrink-0">
              <div className="bg-white border border-[var(--border)] rounded-2xl p-6 space-y-7 sticky top-28">
                <FilterPanel
                  priceRange={priceRange}
                  setPriceRange={setPriceRange}
                  categories={categories}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  onClose={() => setFiltersOpen(false)}
                  onClearAll={() => { setActiveCategory('All'); setPriceRange([0, 50000]); }}
                />
              </div>
            </aside>
          )}

          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-2xl bg-[var(--surface-2)] animate-pulse" />
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="font-display text-3xl text-[var(--ink-muted)] uppercase tracking-tight">No products found</p>
                <button onClick={() => { setActiveCategory('All'); setPriceRange([0, 50000]); }}
                  className="text-[var(--gold-deep)] text-[10px] tracking-[0.3em] uppercase font-body mt-4 hover:underline">
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg)]" />}>
      <ShopPageInner />
    </Suspense>
  );
}

/* ─── Custom sort dropdown — branded popover, replaces native <select> ─── */
function SortDropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const current = options.find(o => o.value === value) || options[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 bg-white border pl-4 pr-3 py-2 text-[10px] tracking-[0.2em] uppercase font-body rounded-full transition-colors ${
          open ? 'border-[var(--gold)] text-[var(--ink)]' : 'border-[var(--border)] text-[var(--ink)] hover:border-[var(--gold)]'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-[var(--ink-muted)] hidden sm:inline">Sort:</span>
        <span>{current.label}</span>
        <ChevronDown size={12} strokeWidth={1.8}
          className={`text-[var(--gold-deep)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 sm:left-auto sm:right-0 top-[calc(100%+8px)] z-30 w-[min(14rem,calc(100vw-2rem))] bg-white border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden py-1.5"
        >
          {options.map(o => {
            const active = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-xs font-body text-left transition-colors ${
                    active
                      ? 'bg-[var(--surface)] text-[var(--ink)]'
                      : 'text-[var(--ink-soft)] hover:bg-[var(--surface)] hover:text-[var(--ink)]'
                  }`}
                >
                  <span className="tracking-[0.05em]">{o.label}</span>
                  {active && <Check size={13} className="text-[var(--gold-deep)] shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ─── Filter body — shared between desktop sidebar and mobile drawer ─── */
function FilterPanel({
  priceRange, setPriceRange,
  categories, activeCategory, setActiveCategory,
  onClose, onClearAll, mobile = false,
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] tracking-[0.35em] uppercase text-[var(--ink)] font-body">Filters</h3>
        <button onClick={onClose} aria-label="Close filters"
          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)] transition-colors">
          <X size={16} />
        </button>
      </div>

      <div>
        <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-3">Price Range</p>
        <div className="flex items-center gap-2 text-[var(--ink-soft)] text-xs font-body mb-2">
          <span>₹{priceRange[0].toLocaleString('en-IN')}</span>
          <span className="flex-1 text-center">–</span>
          <span>₹{priceRange[1].toLocaleString('en-IN')}</span>
        </div>
        <input type="range" min={0} max={50000} step={500} value={priceRange[1]}
          onChange={e => setPriceRange([priceRange[0], parseInt(e.target.value)])}
          className="w-full accent-[var(--gold)]" />
      </div>

      <div>
        <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-3">Maison</p>
        <div className="space-y-1">
          {categories.filter(c => c !== 'All').slice(0, 8).map(c => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`block text-left w-full py-1.5 text-sm font-body transition-colors ${
                activeCategory === c ? 'text-[var(--ink)] font-medium' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <button onClick={onClearAll}
        className="text-[var(--gold-deep)] text-[10px] uppercase tracking-[0.3em] font-body hover:underline">
        Clear All
      </button>
    </>
  );

  if (mobile) {
    return (
      <>
        <div className="px-6 pt-6 pb-5 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-[11px] tracking-[0.35em] uppercase text-[var(--ink)] font-body">Filters</h3>
          <button onClick={onClose} aria-label="Close filters"
            className="w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--ink-muted)] hover:border-[var(--gold)] hover:text-[var(--ink)] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-3">Price Range</p>
            <div className="flex items-center gap-2 text-[var(--ink-soft)] text-xs font-body mb-2">
              <span>₹{priceRange[0].toLocaleString('en-IN')}</span>
              <span className="flex-1 text-center">–</span>
              <span>₹{priceRange[1].toLocaleString('en-IN')}</span>
            </div>
            <input type="range" min={0} max={50000} step={500} value={priceRange[1]}
              onChange={e => setPriceRange([priceRange[0], parseInt(e.target.value)])}
              className="w-full accent-[var(--gold)]" />
          </div>

          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-3">Maison</p>
            <div className="space-y-1">
              {categories.filter(c => c !== 'All').slice(0, 12).map(c => (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`block text-left w-full py-2 text-sm font-body transition-colors ${
                    activeCategory === c ? 'text-[var(--ink)] font-medium' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center gap-3">
          <button onClick={onClearAll}
            className="flex-1 text-[var(--ink-soft)] text-[10px] uppercase tracking-[0.3em] font-body py-3 border border-[var(--border)] rounded-full hover:border-[var(--gold)] hover:text-[var(--ink)] transition-colors">
            Clear All
          </button>
          <button onClick={onClose}
            className="flex-1 bg-[var(--ink)] text-white text-[10px] uppercase tracking-[0.3em] font-body py-3 rounded-full hover:bg-[var(--gold-deep)] transition-colors">
            View Results
          </button>
        </div>
      </>
    );
  }

  return body;
}
