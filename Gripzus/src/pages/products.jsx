import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import PageHero from '../components/common/PageHero';
import ProductCard from '../components/products/ProductCard';
import FilterDrawer from '../components/products/FilterDrawer';
import SeoWrapper from '../components/SeoWrapper';
import { getPublicCategories } from '../services/categories';
import { getPublicProducts, getProductsByCategory } from '../services/products';

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
        <div className="absolute left-0 mt-2 w-48 bg-paper border border-line rounded-lg shadow-card py-1.5 z-30">
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
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink"><polyline points="20 6 9 17 4 12" /></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const SORTS = [
  { value: 'featured',   label: 'Featured' },
  { value: 'newest',     label: 'Newest' },
  { value: 'price-asc',  label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
];

const EMPTY_DRAFT = { priceMin: '', priceMax: '', sizes: [], colors: [] };

export default function ProductsPage() {
  const router = useRouter();
  const collectionParam = router.query.collection || '';

  const [categories, setCategories] = useState([]);   // [{id,name,slug}]
  const [activeCat, setActiveCat]   = useState('all'); // 'all' or category slug
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);

  const [sort, setSort]   = useState('featured');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [filters, setFilters] = useState(EMPTY_DRAFT);

  // Categories for the chips.
  useEffect(() => {
    getPublicCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // Honour ?collection=<slug> from the URL once categories are known.
  useEffect(() => {
    if (!collectionParam) { setActiveCat('all'); return; }
    setActiveCat(String(collectionParam));
  }, [collectionParam]);

  // Fetch products whenever the active collection changes.
  useEffect(() => {
    let alive = true;

    // For a specific collection we need the categories list first so we
    // can resolve the slug → the real category NAME — the by-name API
    // 404s on a slug. Wait until categories have loaded.
    if (activeCat !== 'all' && categories.length === 0) {
      setLoading(true);
      return;
    }

    setLoading(true);
    const run = async () => {
      if (activeCat === 'all') {
        return getPublicProducts({ limit: 200 });
      }
      const cat = categories.find((c) => c.slug === activeCat || c.name === activeCat);
      if (!cat) return getPublicProducts({ limit: 200 }); // unknown slug → show all
      return getProductsByCategory(cat.name);             // always the real name
    };
    run()
      .then((list) => { if (alive) setProducts(Array.isArray(list) ? list : []); })
      .catch(() => { if (alive) setProducts([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [activeCat, categories]);

  const selectChip = (slug) => {
    setActiveCat(slug);
    const url = slug === 'all' ? '/products' : `/products?collection=${encodeURIComponent(slug)}`;
    router.push(url, undefined, { shallow: true });
  };

  // Filter option lists — dynamic, derived from the products on the page.
  const sizeOptions = useMemo(
    () => [...new Set(products.flatMap((p) => p.sizes || []))],
    [products]
  );
  const colorOptions = useMemo(() => {
    const seen = new Map();
    products.forEach((p) => (p.colors || []).forEach((c) => {
      if (c?.name && !seen.has(c.name)) seen.set(c.name, c);
    }));
    return [...seen.values()];
  }, [products]);

  // Apply a filter set (price + size + colour) to a product list.
  const applyFilters = (list, f) => {
    const min = Number(f.priceMin) || 0;
    const max = Number(f.priceMax) || Infinity;
    let out = list.filter((p) => { const pr = p.price ?? 0; return pr >= min && pr <= max; });
    if (f.sizes.length)  out = out.filter((p) => (p.sizes || []).some((s) => f.sizes.includes(s)));
    if (f.colors.length) out = out.filter((p) => (p.colors || []).some((c) => f.colors.includes(c.name)));
    return out;
  };

  // Client-side filter + sort on the fetched list.
  const filtered = useMemo(() => {
    let list = applyFilters([...products], filters);
    if (sort === 'price-asc')  list.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (sort === 'newest')     list.reverse();
    return list;
  }, [products, sort, filters]);

  const draftCount = useMemo(() => applyFilters([...products], draft).length, [products, draft]);

  const activeFilterCount =
    filters.sizes.length + filters.colors.length +
    (filters.priceMin ? 1 : 0) + (filters.priceMax ? 1 : 0);

  const openDrawer  = () => { setDraft(filters); setDrawerOpen(true); };
  const applyDrawer = () => { setFilters(draft); setDrawerOpen(false); };
  const clearDrawer = () => { setDraft(EMPTY_DRAFT); setFilters(EMPTY_DRAFT); };

  const activeName = activeCat === 'all'
    ? null
    : (categories.find((c) => c.slug === activeCat || c.name === activeCat)?.name || activeCat);

  return (
    <SeoWrapper pageName="products">
      <PageHero
        eyebrow={activeName ? 'Collection' : 'The Catalogue'}
        title={activeName ? activeName : 'Every'}
        accent={activeName ? '' : 'pair.'}
        intro={activeName
          ? `Every Gripzus pair in the ${activeName} collection.`
          : 'The full Gripzus archive — knit small-batch from combed cotton, merino and recycled nylon.'}
      />

      <section className="section-y">
        <div className="wrap">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-10 pb-5 border-b border-line">
            {/* Collection chips — desktop only (mobile uses the Refine drawer) */}
            <div className="hidden lg:flex flex-wrap items-center gap-2">
              <button
                onClick={() => selectChip('all')}
                className={`px-4 py-2 text-[12px] tracking-[0.06em] rounded-full border transition-colors ${
                  activeCat === 'all' ? 'bg-ink text-paper border-ink' : 'border-line text-ink-soft hover:border-ink hover:text-ink'
                }`}
              >
                All
              </button>
              {categories.map((c) => {
                const key = c.slug || c.name;
                return (
                  <button
                    key={c.id ?? key}
                    onClick={() => selectChip(key)}
                    className={`px-4 py-2 text-[12px] tracking-[0.06em] rounded-full border transition-colors ${
                      activeCat === key ? 'bg-ink text-paper border-ink' : 'border-line text-ink-soft hover:border-ink hover:text-ink'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <SortDropdown value={sort} onChange={setSort} options={SORTS} />
              <button
                onClick={openDrawer}
                className="flex items-center gap-2 px-4 py-2 text-[12px] tracking-[0.06em] rounded-full border border-ink hover:bg-ink hover:text-paper transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" /></svg>
                Refine
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-ink text-paper text-[10px] font-semibold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-9">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i}>
                  <div className="aspect-[4/5] rounded-lg bg-paper-deep animate-pulse" />
                  <div className="mt-3.5 h-3 w-1/3 rounded bg-paper-deep animate-pulse" />
                  <div className="mt-2 h-4 w-2/3 rounded bg-paper-deep animate-pulse" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 border border-line rounded-lg">
              <p className="h-display text-3xl mb-3">No pairs found</p>
              <button onClick={() => { selectChip('all'); clearDrawer(); }} className="btn-outline inline-flex">Clear everything</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-9">
              {filtered.map((p) => <ProductCard key={p.uid ?? p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        draft={draft}
        setDraft={setDraft}
        onApply={applyDrawer}
        onClear={clearDrawer}
        resultCount={draftCount}
        sizeOptions={sizeOptions}
        colorOptions={colorOptions}
        categories={categories}
        activeCat={activeCat}
        onSelectCollection={(slug) => { selectChip(slug); setDrawerOpen(false); }}
      />
    </SeoWrapper>
  );
}
