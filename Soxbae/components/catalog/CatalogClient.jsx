'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ProductCard from '@/components/home/ProductCard';
import Icon from '@/components/Icon';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];

export default function CatalogClient({ products = [], chips: rawChips = [], initialCat = 'all' }) {
  const chips = [{ label: 'All socks', slug: 'all', icon: 'LayoutGrid' }, ...rawChips];
  const [cat, setCat] = useState(initialCat);
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [priceSel, setPriceSel] = useState([]);
  const [sort, setSort] = useState('featured');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);

  // Real filter facets derived from the actual products (same idea as Knitwink):
  // available sizes, colours (name + hex) and computed price ranges.
  const facets = useMemo(() => {
    const sizeSet = new Set();
    const colorMap = new Map();
    let minP = Infinity, maxP = 0;
    products.forEach((p) => {
      (p.sizes || []).forEach((s) => s && sizeSet.add(s));
      (p.colorNames || []).forEach((name, i) => {
        if (name && !colorMap.has(name)) colorMap.set(name, (p.colors || [])[i] || '#c9d1d6');
      });
      if (p.price > 0) { minP = Math.min(minP, p.price); maxP = Math.max(maxP, p.price); }
    });
    if (!Number.isFinite(minP)) minP = 0;
    const ranges = [];
    if (maxP > minP) {
      const step = Math.max(1, Math.ceil((maxP - minP) / 4));
      for (let lo = Math.floor(minP); lo < maxP; lo += step) {
        const hi = lo + step;
        ranges.push({ label: `₹${lo} – ₹${Math.min(hi, Math.ceil(maxP))}`, min: lo, max: hi });
      }
    }
    return {
      sizes: [...sizeSet],
      colors: [...colorMap].map(([name, hex]) => ({ name, hex })),
      priceRanges: ranges,
    };
  }, [products]);

  const toggler = (setter) => (v) => setter((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  const toggleSize = toggler(setSizes);
  const toggleColor = toggler(setColors);
  const togglePrice = toggler(setPriceSel);

  const clearAll = () => { setCat('all'); setSizes([]); setColors([]); setPriceSel([]); setSort('featured'); };
  const activeCount = (cat !== 'all' ? 1 : 0) + sizes.length + colors.length + priceSel.length;

  useEffect(() => {
    document.body.style.overflow = filterOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [filterOpen]);

  useEffect(() => {
    const h = (e) => { if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false); };
    if (sortOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [sortOpen]);

  const list = useMemo(() => {
    const out = products.filter((p) => {
      if (!(cat === 'all' || p.categorySlug === cat || p.category?.toLowerCase() === cat)) return false;
      if (sizes.length && !sizes.some((s) => (p.sizes || []).includes(s))) return false;
      if (colors.length && !colors.some((c) => (p.colorNames || []).includes(c))) return false;
      if (priceSel.length) {
        const ranges = priceSel.map((lbl) => facets.priceRanges.find((r) => r.label === lbl)).filter(Boolean);
        if (!ranges.some((r) => p.price >= r.min && p.price < r.max)) return false;
      }
      return true;
    });
    const by = {
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      'rating': (a, b) => b.rating - a.rating,
    }[sort];
    return by ? [...out].sort(by) : out;
  }, [products, cat, sizes, colors, priceSel, sort, facets]);

  const activeLabel = chips.find((c) => c.slug === cat)?.label || 'All socks';
  const sortLabel = SORTS.find((s) => s.value === sort)?.label;

  const SortDropdown = () => (
    <div className="sort-dd" ref={sortRef}>
      <button className="sort-dd-btn" onClick={() => setSortOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={sortOpen}>
        <Icon name="Sort" size={15} /> <span>{sortLabel}</span>
        <Icon name="ChevronDown" size={14} className={sortOpen ? 'sort-dd-caret open' : 'sort-dd-caret'} />
      </button>
      {sortOpen && (
        <div className="sort-dd-menu" role="listbox">
          {SORTS.map((s) => (
            <button key={s.value} role="option" aria-selected={sort === s.value}
              className={`sort-dd-opt${sort === s.value ? ' active' : ''}`}
              onClick={() => { setSort(s.value); setSortOpen(false); }}>
              {s.label}{sort === s.value && <Icon name="Check" size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const FilterGroups = () => (
    <>
      <div className="filter-group">
        <span className="filter-label">Category</span>
        <div className="chips">
          {chips.map((c) => (
            <button key={c.slug} onClick={() => setCat(c.slug)} className={`chip${c.slug === cat ? ' chip-active' : ''}`}>
              <Icon name={c.icon} size={15} /> {c.label}
            </button>
          ))}
        </div>
      </div>
      {facets.sizes.length > 0 && (
        <div className="filter-group">
          <span className="filter-label">Size</span>
          <div className="size-filter">
            {facets.sizes.map((s) => (
              <button key={s} onClick={() => toggleSize(s)} className={`size-pill${sizes.includes(s) ? ' active' : ''}`}>{s}</button>
            ))}
          </div>
        </div>
      )}
      {facets.colors.length > 0 && (
        <div className="filter-group">
          <span className="filter-label">Colour</span>
          <div className="color-filter">
            {facets.colors.map((c) => (
              <button key={c.name} onClick={() => toggleColor(c.name)} className={`color-swatch${colors.includes(c.name) ? ' active' : ''}`} title={c.name}>
                <span style={{ background: c.hex }} /> {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {facets.priceRanges.length > 0 && (
        <div className="filter-group">
          <span className="filter-label">Price</span>
          <div className="price-filter">
            {facets.priceRanges.map((r) => (
              <button key={r.label} onClick={() => togglePrice(r.label)} className={`price-pill${priceSel.includes(r.label) ? ' active' : ''}`}>{r.label}</button>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 40 }}>
      <div className="page-hero">
        <span className="eyebrow">Shop</span>
        <h1>{activeLabel}</h1>
        <p>Premium socks engineered for movement and everyday comfort.</p>
      </div>

      {/* Quick category chips (desktop) */}
      <div className="chips catalog-desktop" style={{ margin: '22px 0 18px' }}>
        {chips.map((c) => (
          <button key={c.slug} onClick={() => setCat(c.slug)} className={`chip${c.slug === cat ? ' chip-active' : ''}`}>
            <Icon name={c.icon} size={15} /> {c.label}
          </button>
        ))}
      </div>

      {/* Toolbar — Filters + Sort (all screens) */}
      <div className="cat-toolbar">
        <span className="result-count">{list.length} product{list.length === 1 ? '' : 's'}</span>
        <div className="cat-tools">
          <button className="filter-trigger" onClick={() => setFilterOpen(true)}>
            <Icon name="Filter" size={16} /> Filters
            {activeCount > 0 && <span className="filter-badge">{activeCount}</span>}
          </button>
          <SortDropdown />
        </div>
      </div>

      {list.length > 0 ? (
        <div className="product-grid" style={{ marginTop: 20 }}>
          {list.map((p) => <ProductCard key={p.uid ?? p.id} product={p} />)}
        </div>
      ) : (
        <div className="empty">No products match these filters.</div>
      )}

      {/* Filter drawer */}
      <div className={`filter-overlay${filterOpen ? ' show' : ''}`} onClick={() => setFilterOpen(false)} />
      <aside className={`filter-drawer${filterOpen ? ' show' : ''}`} aria-hidden={!filterOpen} data-lenis-prevent>
        <div className="filter-head">
          <b>Filters</b>
          <button className="hamburger" aria-label="Close filters" onClick={() => setFilterOpen(false)}><Icon name="X" size={20} /></button>
        </div>
        <div className="filter-body"><FilterGroups /></div>
        <div className="filter-foot">
          <button className="btn btn-ghost" onClick={clearAll}>Clear all</button>
          <button className="btn btn-primary" onClick={() => setFilterOpen(false)}>Show {list.length} result{list.length === 1 ? '' : 's'}</button>
        </div>
      </aside>
    </div>
  );
}
