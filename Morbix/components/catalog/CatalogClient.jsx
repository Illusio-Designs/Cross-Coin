'use client';

import { useMemo, useState } from 'react';
import ProductCard from '@/components/home/ProductCard';
import Icon from '@/components/Icon';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];
const SIZES = ['S', 'M', 'L', 'XL'];

export default function CatalogClient({ products = [], chips = [], initialCat = 'all' }) {
  const [cat, setCat] = useState(initialCat);
  const [sizes, setSizes] = useState([]);
  const [sort, setSort] = useState('featured');

  const toggleSize = (s) =>
    setSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

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

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 40 }}>
      <div className="page-hero">
        <span className="eyebrow">Catalog</span>
        <h1>{activeLabel}</h1>
        <p>Premium socks engineered for movement and everyday comfort.</p>
      </div>

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

      {list.length > 0 ? (
        <div className="product-grid">
          {list.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <div className="empty">No products match these filters.</div>
      )}
    </div>
  );
}
