'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/shop/ProductCard';
import { Search, ArrowUpRight } from 'lucide-react';
import { searchProducts } from '@/lib/api/products';
import { getPublicCategories } from '@/lib/api/categories';
import SeoWrapper from '@/components/SeoWrapper';

function SearchResults() {
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') || '').trim();
  const [results, setResults]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Hydrate suggestion chips from live categories — used for the empty
  // state and the no-results state. Mirrors the search overlay so users
  // get the same "popular" surface everywhere they type.
  useEffect(() => {
    let alive = true;
    getPublicCategories().then(cats => {
      if (!alive) return;
      const list = (cats || [])
        .filter(c => c.name && c.slug)
        .slice(0, 6)
        .map(c => ({ name: c.name, slug: c.slug }));
      setSuggestions(list);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    if (!query) { setResults([]); setLoading(false); return; }
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
        <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-4">
          {query ? 'Results for' : 'Search'}
        </p>
        <h1 className="font-display text-[var(--ink)] uppercase leading-[0.92] tracking-tight"
          style={{ fontSize: 'clamp(2.4rem, 6vw, 5rem)' }}>
          {query ? <>&ldquo;{query}&rdquo;</> : 'FIND YOUR SCENT'}
        </h1>
        <p className="text-[var(--ink-soft)] text-base font-body mt-4">
          {!query
            ? 'Type a fragrance, note or collection in the search bar above.'
            : loading
              ? 'Searching…'
              : `${results.length} fragrance${results.length !== 1 ? 's' : ''} found`}
        </p>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[3/4] rounded-2xl bg-[var(--surface-2)] animate-pulse" />
                <div className="mt-4 space-y-2">
                  <div className="h-2.5 w-1/3 rounded bg-[var(--surface-2)] animate-pulse" />
                  <div className="h-3.5 w-2/3 rounded bg-[var(--surface-2)] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : query && results.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {results.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : query ? (
          <div className="text-center py-20 bg-white border border-[var(--border)] rounded-2xl">
            <Search size={40} className="text-[var(--ink-muted)] mx-auto mb-5" />
            <p className="font-display text-3xl text-[var(--ink)] uppercase tracking-tight mb-3">No results found</p>
            <p className="text-[var(--ink-soft)] text-sm font-body mb-6">
              We couldn't find a match for &ldquo;{query}&rdquo;. Try a different word or browse our collections.
            </p>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto mb-6">
                {suggestions.map(s => (
                  <Link key={s.slug} href={`/shop?collection=${encodeURIComponent(s.slug)}`}
                    className="px-4 py-2 rounded-full border border-[var(--border)] text-[var(--ink-soft)] hover:border-[var(--gold)] hover:text-[var(--ink)] text-xs font-body tracking-[0.05em] transition-colors">
                    {s.name}
                  </Link>
                ))}
              </div>
            )}
            <Link href="/shop" className="pill-cta inline-flex">
              Explore the Shop <ArrowUpRight size={13} strokeWidth={1.6} />
            </Link>
          </div>
        ) : (
          <div className="text-center py-20 bg-white border border-[var(--border)] rounded-2xl">
            <Search size={40} className="text-[var(--ink-muted)] mx-auto mb-5" />
            <p className="font-display text-3xl text-[var(--ink)] uppercase tracking-tight mb-3">Start exploring</p>
            <p className="text-[var(--ink-soft)] text-sm font-body mb-6">
              Search by fragrance name, note, or collection.
            </p>
            {suggestions.length > 0 && (
              <>
                <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.3em] uppercase font-body mb-3">Popular collections</p>
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto">
                  {suggestions.map(s => (
                    <Link key={s} href={`/search?q=${encodeURIComponent(s)}`}
                      className="px-4 py-2 rounded-full border border-[var(--border)] text-[var(--ink-soft)] hover:border-[var(--gold)] hover:text-[var(--ink)] text-xs font-body tracking-[0.05em] transition-colors">
                      {s}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <SeoWrapper pageName="search">
      <Suspense>
        <SearchResults />
      </Suspense>
    </SeoWrapper>
  );
}
