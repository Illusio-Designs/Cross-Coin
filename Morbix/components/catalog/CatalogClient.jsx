'use client';

import { useEffect, useMemo, useState } from 'react';
import ProductCard from '@/components/home/ProductCard';
import Icon from '@/components/Icon';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];
const SIZES = ['S', 'M', 'L', 'XL'];

export default function CatalogClient({ products = [], chips: rawChips = [], initialCat = 'all' }) {
  // Always offer an "All" option in front of the live categories.
  const chips = [{ label: 'All socks', slug: 'all', icon: 'LayoutGrid' }, ...rawChips];
  const [cat, setCat] = useState(initialCat);
  const [sizes, setSizes] = useState([]);
  const [sort, setSort] = useState('featured');
  const [filterOpen, setFilterOpen] = useState(false);

  const toggleSize = (s) =>
    setSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const clearAll = () => { setCat('all'); setSizes([]); setSort('featured'); };
  const activeCount = (cat !== 'all' ? 1 : 0) + sizes.length + (sort !== 'featured' ? 1 : 0);

  // Lock body scroll while the mobile filter sheet is open
  useEffect(() => {
    document.body.style.overflow = filterOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [filterOpen]);

  const list = useMemo(() => {
    let out = products.filter((p) =>
      (cat === 'all' || p.categorySlug === cat || p.category.toLowerCase() === cat) &&
      (sizes.length === 0 || sizes.some((s) => (p.sizes || []).includes(s)))
    );
    const by = {
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      'rating': (a, b) => b.rating - a.rating,
    }[sort];
    return by ? [...out].sort(by) : out;
  }, [products, cat, sizes, sort]);

  const activeLabel = chips.find((c) => c.slug === cat)?.label || 'All socks';

  // Shared filter controls (reused in desktop toolbar + mobile drawer)
  const CategoryChips = () => (
    <div className="chips">
      {chips.map((c) => (
        <button key={c.slug} onClick={() => setCat(c.slug)} className={`chip${c.slug === cat ? ' chip-active' : ''}`}>
          <Icon name={c.icon} size={15} /> {c.label}
        </button>
      ))}
    </div>
  );
  const SizePills = () => (
    <div className="size-filter">
      {SIZES.map((s) => (
        <button key={s} onClick={() => toggleSize(s)} className={`size-pill${sizes.includes(s) ? ' active' : ''}`}>{s}</button>
      ))}
    </div>
  );

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 40 }}>
      <div className="page-hero">
        <span className="eyebrow">Shop</span>
        <h1>{activeLabel}</h1>
        <p>Premium socks engineered for movement and everyday comfort.</p>
      </div>

      {/* Desktop: inline chips + toolbar */}
      <div className="catalog-desktop">
        <div className="chips" style={{ margin: '22px 0 20px' }}>
          {chips.map((c) => (
            <button key={c.slug} onClick={() => setCat(c.slug)} className={`chip${c.slug === cat ? ' chip-active' : ''}`}>
              <Icon name={c.icon} size={15} /> {c.label}
            </button>
          ))}
        </div>

        <div className="cat-toolbar">
          <span className="result-count">{list.length} product{list.length === 1 ? '' : 's'}</span>
          <div className="cat-tools">
            <div className="size-filter">
              <Icon name="Filter" size={15} color="#6a7186" />
              {SIZES.map((s) => (
                <button key={s} onClick={() => toggleSize(s)} className={`size-pill${sizes.includes(s) ? ' active' : ''}`}>{s}</button>
              ))}
            </div>
            <label className="sort-select">
              <Icon name="Sort" size={15} color="#6a7186" />
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <Icon name="ChevronDown" size={14} color="#6a7186" />
            </label>
          </div>
        </div>
      </div>

      {/* Mobile: filter trigger bar */}
      <div className="catalog-mobilebar">
        <button className="filter-trigger" onClick={() => setFilterOpen(true)}>
          <Icon name="Filter" size={16} /> Filters
          {activeCount > 0 && <span className="filter-badge">{activeCount}</span>}
        </button>
        <span className="result-count">{list.length} product{list.length === 1 ? '' : 's'}</span>
      </div>

      {list.length > 0 ? (
        <div className="product-grid">
          {list.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <div className="empty">No products match these filters.</div>
      )}

      {/* Mobile filter drawer (bottom sheet) */}
      <div className={`filter-overlay${filterOpen ? ' show' : ''}`} onClick={() => setFilterOpen(false)} />
      <aside className={`filter-drawer${filterOpen ? ' show' : ''}`} aria-hidden={!filterOpen}>
        <div className="filter-head">
          <b>Filters</b>
          <button className="hamburger" aria-label="Close filters" onClick={() => setFilterOpen(false)}><Icon name="X" size={20} /></button>
        </div>
        <div className="filter-body">
          <div className="filter-group">
            <span className="filter-label">Category</span>
            <CategoryChips />
          </div>
          <div className="filter-group">
            <span className="filter-label">Size</span>
            <SizePills />
          </div>
          <div className="filter-group">
            <span className="filter-label">Sort by</span>
            <div className="sort-list">
              {SORTS.map((s) => (
                <button key={s.value} onClick={() => setSort(s.value)} className={`sort-opt${sort === s.value ? ' active' : ''}`}>
                  {s.label}{sort === s.value && <Icon name="Check" size={16} />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="filter-foot">
          <button className="btn btn-ghost" onClick={clearAll}>Clear all</button>
          <button className="btn btn-primary" onClick={() => setFilterOpen(false)}>Show {list.length} result{list.length === 1 ? '' : 's'}</button>
        </div>
      </aside>
    </div>
  );
}
