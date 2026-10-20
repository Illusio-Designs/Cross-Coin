'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { getPublicProducts } from '@/lib/api/products';
import { getPublicCategories } from '@/lib/api/categories';
import ProductCard from './ProductCard';
import Pager from './Pager';
import { ChipsSkeleton, ProductGridSkeleton, Sk } from './Skeleton';

const PAGE_SIZE = 24;

// Does this product carry the given fragrance note (by name)?
const hasNote = (p, note) => {
  const t = note.toLowerCase();
  const names = [
    ...(p.notes || []).map((n) => (typeof n === 'string' ? n : n?.name)),
    ...(p.variations || []).flatMap((v) => (v.noteItems || []).map((x) => x?.name)),
  ].filter(Boolean);
  return names.some((n) => String(n).toLowerCase().trim() === t);
};

// Sorting runs client-side on the mapped price (the default variation's), so
// it matches the price printed on the card.
const SORTS = [
  { v: '', label: 'Featured' },
  { v: 'price-asc', label: 'Price: Low to High' },
  { v: 'price-desc', label: 'Price: High to Low' },
  { v: 'rating', label: 'Best Rated' },
  { v: 'newest', label: 'Newest' },
];

const PRICE_BANDS = [
  { v: '', label: 'Any price' },
  { v: '0-999', label: 'Under ₹1,000' },
  { v: '1000-1999', label: '₹1,000 – ₹1,999' },
  { v: '2000-2999', label: '₹2,000 – ₹2,999' },
  { v: '3000-', label: '₹3,000 & above' },
];
const inBand = (price, band) => {
  if (!band) return true;
  const [lo, hi] = band.split('-').map((x) => (x === '' ? null : Number(x)));
  return (lo == null || price >= lo) && (hi == null || price <= hi);
};

const toggleIn = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/* The catalogue grid behind /shop and /collections/<slug>: collection chips
   (clean /collections URLs), note / price / gender / season filters, sort and
   pagination. `categoryId` scopes the API query to one collection. */
export default function ShopGrid({ categoryId = '', note = '' }) {
  const [cats, setCats] = useState([]);
  const [catsReady, setCatsReady] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [sort, setSort] = useState('');
  const [band, setBand] = useState('');
  const [genders, setGenders] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const topRef = useRef(null);

  useEffect(() => {
    let alive = true;
    getPublicCategories().then((c) => { if (alive) setCats(c || []); }).catch(() => {})
      .finally(() => { if (alive) setCatsReady(true); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    // The catalog endpoint filters by numeric category id.
    getPublicProducts({ category: categoryId || undefined, limit: 200 })
      .then((r) => { if (alive) { setProducts(r.products || []); setLoading(false); } })
      .catch(() => { if (alive) { setProducts([]); setFailed(true); setLoading(false); } });
    return () => { alive = false; };
  }, [categoryId]);

  // Filter chips only offer values that exist in the loaded products.
  const allGenders = useMemo(() => [...new Set(products.flatMap((p) => p.genders || []))].filter(Boolean), [products]);
  const allSeasons = useMemo(() => [...new Set(products.flatMap((p) => p.seasons || []))].filter(Boolean), [products]);

  const shown = useMemo(() => {
    let list = products;
    if (note) list = list.filter((p) => hasNote(p, note));
    if (band) list = list.filter((p) => inBand(Number(p.price) || 0, band));
    if (genders.length) list = list.filter((p) => (p.genders || []).some((g) => genders.includes(g)));
    if (seasons.length) list = list.filter((p) => (p.seasons || []).some((s) => seasons.includes(s)));
    switch (sort) {
      case 'price-asc': return [...list].sort((a, b) => a.price - b.price);
      case 'price-desc': return [...list].sort((a, b) => b.price - a.price);
      case 'rating': return [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'newest': return [...list].sort((a, b) => Number(b.id) - Number(a.id));
      default: return list;
    }
  }, [products, note, band, genders, seasons, sort]);

  // Any filter / sort change goes back to page 1.
  useEffect(() => { setPage(1); }, [note, band, genders, seasons, sort, categoryId]);

  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const pageItems = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const activeFilters = (band ? 1 : 0) + genders.length + seasons.length;
  const clearFilters = () => { setBand(''); setGenders([]); setSeasons([]); };

  const goPage = (n) => {
    setPage(n);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="m-wrap m-section" style={{ paddingTop: 0 }} ref={topRef}>
      {!catsReady ? <ChipsSkeleton /> : null}
      {cats.length > 0 && (
        <nav className="m-filterbar" aria-label="Collections">
          <Link className={`m-fchip ${!categoryId ? 'on' : ''}`} href="/shop" aria-current={!categoryId ? 'page' : undefined}>All</Link>
          {cats.map((c) => (
            <Link key={c.id} className={`m-fchip ${String(categoryId) === String(c.id) ? 'on' : ''}`} href={`/collections/${c.slug}`}
              aria-current={String(categoryId) === String(c.id) ? 'page' : undefined}>{c.name}</Link>
          ))}
        </nav>
      )}

      {note ? (
        <div className="m-notechip">
          <span>Note: <b>{note}</b></span>
          <Link href="/shop" aria-label="Clear note filter">✕</Link>
        </div>
      ) : null}

      <div className="m-toolbar">
        <span className="count" aria-live="polite">
          {loading ? <><Sk w={104} h={12} inline /><span className="sr-only">Loading fragrances…</span></> : `${shown.length} fragrance${shown.length !== 1 ? 's' : ''}`}
        </span>
        <div className="m-toolbar__r">
          <button type="button" className={`m-fchip ${showFilters || activeFilters ? 'on' : ''}`} aria-expanded={showFilters} aria-controls="m-shopfilters" onClick={() => setShowFilters((v) => !v)}>
            Filters{activeFilters ? ` (${activeFilters})` : ''}
          </button>
          <select className="m-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {showFilters ? (
        <div className="m-filters" id="m-shopfilters">
          <fieldset>
            <legend>Price</legend>
            <div className="m-filters__chips">
              {PRICE_BANDS.map((b) => (
                <button type="button" key={b.v || 'any'} className={`m-fchip ${band === b.v ? 'on' : ''}`} aria-pressed={band === b.v} onClick={() => setBand(b.v)}>{b.label}</button>
              ))}
            </div>
          </fieldset>
          {allGenders.length ? (
            <fieldset>
              <legend>For</legend>
              <div className="m-filters__chips">
                {allGenders.map((g) => (
                  <button type="button" key={g} className={`m-fchip ${genders.includes(g) ? 'on' : ''}`} aria-pressed={genders.includes(g)} onClick={() => setGenders((l) => toggleIn(l, g))}>{g}</button>
                ))}
              </div>
            </fieldset>
          ) : null}
          {allSeasons.length ? (
            <fieldset>
              <legend>Season</legend>
              <div className="m-filters__chips">
                {allSeasons.map((s) => (
                  <button type="button" key={s} className={`m-fchip ${seasons.includes(s) ? 'on' : ''}`} aria-pressed={seasons.includes(s)} onClick={() => setSeasons((l) => toggleIn(l, s))}>{s}</button>
                ))}
              </div>
            </fieldset>
          ) : null}
          {activeFilters ? <button type="button" className="m-linkbtn" onClick={clearFilters}>Clear filters</button> : null}
        </div>
      ) : null}

      {loading && !products.length ? (
        <ProductGridSkeleton />
      ) : pageItems.length ? (
        <>
          {/* A refetch keeps the current products on screen, dimmed. */}
          <div className={`m-pgrid${loading ? ' sk-dim' : ''}`} aria-busy={loading || undefined}>{pageItems.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          {pages > 1 ? <Pager page={current} pages={pages} onGo={goPage} /> : null}
        </>
      ) : (
        <div className="m-empty">
          <h3>{failed ? 'We couldn’t load the collection' : 'Nothing here yet'}</h3>
          <p style={{ marginBottom: activeFilters || note ? 20 : 0 }}>
            {failed ? 'Please check your connection and try again.' : 'No fragrances match this selection.'}
          </p>
          {activeFilters ? <button type="button" className="m-btn m-btn--ghost" onClick={clearFilters}>Clear filters</button>
            : note ? <Link className="m-btn m-btn--ghost" href="/shop">See every fragrance</Link> : null}
        </div>
      )}
    </div>
  );
}
