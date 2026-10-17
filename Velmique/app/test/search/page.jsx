'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { searchProducts } from '@/lib/api/products';
import ProductCard from '../_components/ProductCard';

function Results() {
  const sp = useSearchParams();
  const query = (sp.get('q') || '').trim();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!query) { setResults([]); setLoading(false); return; }
    setLoading(true);
    searchProducts(query, 60).then((list) => { if (alive) { setResults(Array.isArray(list) ? list : []); setLoading(false); } });
    return () => { alive = false; };
  }, [query]);

  return (
    <>
      <section className="m-wrap m-ph">
        <span className="m-eyebrow">{query ? 'Results for' : 'Search'}</span>
        <h1>{query ? `“${query}”` : 'Find Your Scent.'}</h1>
        <p>{!query ? 'Search by fragrance name, note or collection.' : loading ? 'Searching…' : `${results.length} fragrance${results.length !== 1 ? 's' : ''} found`}</p>
      </section>

      <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
        {loading ? (
          <div className="m-pgrid">{Array.from({ length: 8 }).map((_, i) => <div className="m-skel" key={i} />)}</div>
        ) : query && results.length ? (
          <div className="m-pgrid">{results.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        ) : query ? (
          <div className="m-empty">
            <h3>No results found</h3>
            <p style={{ marginBottom: 20 }}>We couldn&rsquo;t find a match for &ldquo;{query}&rdquo;. Try another word or browse the collection.</p>
            <Link className="m-btn m-btn--fill" href="/test/shop" style={{ justifyContent: 'center' }}>Explore the shop</Link>
          </div>
        ) : (
          <div className="m-empty">
            <h3>Start exploring</h3>
            <p style={{ marginBottom: 20 }}>Type a fragrance, note or collection to begin.</p>
            <Link className="m-btn m-btn--fill" href="/test/shop" style={{ justifyContent: 'center' }}>Browse all fragrances</Link>
          </div>
        )}
      </div>
    </>
  );
}

export default function MaisonSearch() {
  return (
    <Suspense fallback={<div className="m-wrap m-ph"><h1>Search</h1></div>}>
      <Results />
    </Suspense>
  );
}
