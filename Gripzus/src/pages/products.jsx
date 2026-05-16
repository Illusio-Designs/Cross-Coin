import { useState, useMemo, useRef, useEffect } from 'react';
import Head from 'next/head';
import PageHero from '../components/common/PageHero';
import ProductCard from '../components/products/ProductCard';
import FilterDrawer from '../components/products/FilterDrawer';
import { PRODUCTS } from '../data/products';

/* Custom sort dropdown — site-coloured, replaces the native <select>. */
function SortDropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const current = options.find((o) => o.value === value) || options[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 border border-line hover:border-ink rounded-full pl-4 pr-3 py-2 text-[12px] bg-paper transition-colors"
      >
        <span className="text-ink-muted">Sort</span>
        <span className="text-ink">{current.label}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-paper border border-line rounded-lg shadow-card py-1.5 z-30">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-[13px] text-left transition-colors ${
                o.value === value ? 'text-ink bg-paper-warm' : 'text-ink-soft hover:bg-paper-warm hover:text-ink'
              }`}
            >
              {o.label}
              {o.value === value && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-clay"><polyline points="20 6 9 17 4 12" /></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const CATEGORIES = [
  { value: 'athletic', label: 'Athletic' },
  { value: 'dress',    label: 'Dress' },
  { value: 'casual',   label: 'Casual' },
  { value: 'wool',     label: 'Wool' },
];

const SORTS = [
  { value: 'featured',   label: 'Featured' },
  { value: 'newest',     label: 'Newest' },
  { value: 'price-asc',  label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
];

const EMPTY_DRAFT = { categories: [], priceMin: '', priceMax: '', sizes: [] };

export default function ProductsPage() {
  const [chip, setChip]   = useState('all');
  const [sort, setSort]   = useState('featured');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [filters, setFilters] = useState(EMPTY_DRAFT);

  const filtered = useMemo(() => {
    let list = [...PRODUCTS];
    if (chip !== 'all') list = list.filter((p) => p.category === chip);
    if (filters.categories.length) list = list.filter((p) => filters.categories.includes(p.category));
    const min = Number(filters.priceMin) || 0;
    const max = Number(filters.priceMax) || Infinity;
    list = list.filter((p) => { const pr = p.salePrice ?? p.price; return pr >= min && pr <= max; });
    if (sort === 'price-asc')  list.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
    if (sort === 'price-desc') list.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
    if (sort === 'newest')     list.reverse();
    return list;
  }, [chip, sort, filters]);

  const draftCount = useMemo(() => {
    let list = [...PRODUCTS];
    if (chip !== 'all') list = list.filter((p) => p.category === chip);
    if (draft.categories.length) list = list.filter((p) => draft.categories.includes(p.category));
    const min = Number(draft.priceMin) || 0;
    const max = Number(draft.priceMax) || Infinity;
    list = list.filter((p) => { const pr = p.salePrice ?? p.price; return pr >= min && pr <= max; });
    return list.length;
  }, [chip, draft]);

  const activeFilterCount =
    filters.categories.length + filters.sizes.length +
    (filters.priceMin ? 1 : 0) + (filters.priceMax ? 1 : 0);

  const openDrawer  = () => { setDraft(filters); setDrawerOpen(true); };
  const applyDrawer = () => { setFilters(draft); setDrawerOpen(false); };
  const clearDrawer = () => { setDraft(EMPTY_DRAFT); setFilters(EMPTY_DRAFT); };

  return (
    <>
      <Head><title>All Pairs — Gripzus</title></Head>

      <PageHero
        eyebrow="The Catalogue"
        title="Every"
        accent="pair."
        intro="The full Gripzus archive — knit small-batch from combed cotton, merino and recycled nylon."
      />

      {/* Feature strip */}
      <div className="bg-ink text-paper">
        <div className="wrap py-2.5 flex items-center justify-center gap-6 text-[11px] tracking-[0.12em] uppercase">
          <span>Free shipping over ₹999</span>
          <span className="text-clay">·</span>
          <span className="hidden sm:inline">New drops every month</span>
          <span className="hidden sm:inline text-clay">·</span>
          <span>Knit small-batch in India</span>
        </div>
      </div>

      <section className="section-y">
        <div className="wrap">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10 pb-5 border-b border-line">
            <div className="flex flex-wrap items-center gap-2">
              {[{ value: 'all', label: 'All' }, ...CATEGORIES].map((c) => (
                <button
                  key={c.value}
                  onClick={() => setChip(c.value)}
                  className={`px-4 py-2 text-[12px] tracking-[0.06em] rounded-full border transition-colors ${
                    chip === c.value
                      ? 'bg-ink text-paper border-ink'
                      : 'border-line text-ink-soft hover:border-ink hover:text-ink'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <SortDropdown value={sort} onChange={setSort} options={SORTS} />

              <button
                onClick={openDrawer}
                className="flex items-center gap-2 px-4 py-2 text-[12px] tracking-[0.06em] rounded-full border border-ink hover:bg-ink hover:text-paper transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" /></svg>
                Refine
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-clay text-paper text-[10px] font-semibold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-24 border border-line rounded-lg">
              <p className="h-display text-3xl mb-3">No pairs match your filters</p>
              <button onClick={() => { setChip('all'); clearDrawer(); }} className="btn-outline inline-flex">Clear everything</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-9">
              {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        categories={CATEGORIES}
        draft={draft}
        setDraft={setDraft}
        onApply={applyDrawer}
        onClear={clearDrawer}
        resultCount={draftCount}
      />
    </>
  );
}
