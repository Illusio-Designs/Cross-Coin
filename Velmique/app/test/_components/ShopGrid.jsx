'use client';

import { useEffect, useState } from 'react';
import { getPublicProducts } from '@/lib/api/products';
import { getPublicCategories } from '@/lib/api/categories';
import ProductCard from './ProductCard';

const SORTS = [
  { v: '', label: 'Featured' },
  { v: 'price_asc', label: 'Price: Low to High' },
  { v: 'price_desc', label: 'Price: High to Low' },
  { v: 'newest', label: 'Newest' },
];

export default function ShopGrid({ initialCategory = '' }) {
  const [cats, setCats] = useState([]);
  const [active, setActive] = useState(initialCategory);
  const [sort, setSort] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getPublicCategories().then((c) => { if (alive) setCats(c || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getPublicProducts({ category: active || undefined, sort: sort || undefined, limit: 60 })
      .then((r) => { if (alive) { setProducts(r.products || []); setLoading(false); } })
      .catch(() => { if (alive) { setProducts([]); setLoading(false); } });
    return () => { alive = false; };
  }, [active, sort]);

  return (
    <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
      {cats.length > 0 && (
        <div className="m-filterbar">
          <button className={`m-fchip ${!active ? 'on' : ''}`} onClick={() => setActive('')}>All</button>
          {cats.map((c) => (
            <button key={c.id} className={`m-fchip ${active === c.name ? 'on' : ''}`} onClick={() => setActive(c.name)}>{c.name}</button>
          ))}
        </div>
      )}

      <div className="m-toolbar">
        <span className="count">{loading ? 'Loading…' : `${products.length} fragrance${products.length !== 1 ? 's' : ''}`}</span>
        <select className="m-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
          {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="m-pgrid">{Array.from({ length: 8 }).map((_, i) => <div className="m-skel" key={i} />)}</div>
      ) : products.length ? (
        <div className="m-pgrid">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      ) : (
        <div className="m-empty">
          <h3>Nothing here yet</h3>
          <p>No fragrances match this selection. Try another collection.</p>
        </div>
      )}
    </div>
  );
}
