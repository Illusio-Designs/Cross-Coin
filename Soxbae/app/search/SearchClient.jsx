'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import ProductCard from '@/components/home/ProductCard';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { searchProducts } from '@/lib/api';

// Live search — results update as you type (debounced), no Enter needed.
export default function SearchClient({ initialQuery = '' }) {
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const query = q.trim();
    if (!query) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const r = await searchProducts(query);
        if (id === reqId.current) setResults(r);
      } catch {
        if (id === reqId.current) setResults([]);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  const trimmed = q.trim();

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <div className="page-hero">
        <span className="eyebrow">Search</span>
        <h1>{trimmed ? `Results for “${trimmed}”` : 'Search products'}</h1>
      </div>

      <div className="search-input" style={{ margin: '20px 0 8px', maxWidth: 520 }}>
        <Icon name="Search" size={18} color="#6a7186" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by style, size or technology…"
          aria-label="Search products"
          autoFocus
        />
        <button className="go" aria-label={q ? 'Clear search' : 'Search'} type="button" onClick={() => { if (q) setQ(''); }}>
          <Icon name={q ? 'X' : 'Search'} size={16} />
        </button>
      </div>

      {!trimmed ? (
        <div className="empty">Type something to search the Soxbae catalog.</div>
      ) : loading && results.length === 0 ? (
        <ProductGridSkeleton count={4} label="Searching…" style={{ marginTop: 18 }} />
      ) : results.length === 0 ? (
        <div className="empty">No products match “{trimmed}”.</div>
      ) : (
        <>
          <p className="muted" style={{ margin: '18px 0' }}>{results.length} result{results.length === 1 ? '' : 's'}</p>
          {/* Typing a new query keeps the current results (dimmed) until the new ones land. */}
          <div className={`product-grid${loading ? ' sk-dim' : ''}`} aria-busy={loading || undefined}>
            {results.map((p) => <ProductCard key={p.uid ?? p.id} product={p} />)}
          </div>
        </>
      )}
    </div>
  );
}
