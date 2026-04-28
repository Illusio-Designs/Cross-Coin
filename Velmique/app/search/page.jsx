'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import ProductCard from '@/components/shop/ProductCard';
import { Search } from 'lucide-react';
import { searchProducts } from '@/lib/api/products';

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!query) { setResults([]); return; }
    setLoading(true);
    searchProducts(query, 60).then(list => {
      if (!alive) return;
      setResults(Array.isArray(list) ? list : []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [query]);

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <header className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pt-14 md:pt-20 pb-10">
        <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-4">Results for</p>
        <h1 className="font-display text-[var(--ink)] uppercase leading-[0.92] tracking-tight"
          style={{ fontSize: 'clamp(2.4rem, 6vw, 5rem)' }}>
          &ldquo;{query}&rdquo;
        </h1>
        <p className="text-[var(--ink-soft)] text-base font-body mt-4">
          {loading ? 'Searching…' : `${results.length} fragrance${results.length !== 1 ? 's' : ''} found`}
        </p>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-[var(--surface-2)] animate-pulse" />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {results.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="text-center py-24 bg-white border border-[var(--border)] rounded-2xl">
            <Search size={42} className="text-[var(--ink-muted)] mx-auto mb-5" />
            <p className="font-display text-3xl text-[var(--ink)] uppercase tracking-tight mb-3">No results found</p>
            <p className="text-[var(--ink-soft)] text-sm font-body">Try a different search term or browse our collections.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
