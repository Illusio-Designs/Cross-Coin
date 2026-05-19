import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProductCard from '../components/products/ProductCard';
import { searchProducts, getPublicProducts } from '../services/products';

/* Search — live API search (GET /api/products/search), same flow as the
   Knitwink search page: a debounced field in the hero that syncs to
   ?q=, results below, and a one-per-collection browse grid when empty. */

export default function SearchPage() {
  const router = useRouter();
  const urlQ = (router.query.q || '').toString();

  const [value, setValue]   = useState('');   // what's typed
  const [query, setQuery]   = useState('');   // the committed (debounced) term
  const [results, setResults] = useState([]);
  const [browse, setBrowse]   = useState([]); // one product per collection
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef(null);
  const seededRef   = useRef(false);

  // Seed the field from ?q= once the router is ready.
  useEffect(() => {
    if (!router.isReady || seededRef.current) return;
    seededRef.current = true;
    setValue(urlQ);
    setQuery(urlQ);
  }, [router.isReady, urlQ]);

  // Debounce typing → commit the term + sync the URL.
  useEffect(() => {
    if (!seededRef.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = value.trim();
      setQuery(q);
      router.replace(q ? `/search?q=${encodeURIComponent(q)}` : '/search', undefined, { shallow: true });
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Run the search whenever the committed term changes.
  useEffect(() => {
    if (!query) { setResults([]); setLoading(false); return; }
    let alive = true;
    setLoading(true);
    searchProducts(query)
      .then((list) => { if (alive) setResults(list); })
      .catch(() => { if (alive) setResults([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [query]);

  // Browse grid for the empty state — one pair from each collection.
  useEffect(() => {
    getPublicProducts({ limit: 100 })
      .then((list) => {
        const seen = new Map();
        for (const p of list) {
          const c = p.collection || 'Gripzus';
          if (!seen.has(c)) seen.set(c, p);
        }
        setBrowse([...seen.values()]);
      })
      .catch(() => setBrowse([]));
  }, []);

  const hasQuery = query.trim().length > 0;

  return (
    <>
      <Head><title>{hasQuery ? `"${query}" — Search` : 'Search'} — Gripzus</title></Head>
      <main className="bg-paper">

        {/* Hero — title + search field */}
        <section className="bg-paper-warm border-b border-line">
          <div className="max-w-site mx-auto px-6 lg:px-10 py-14 md:py-20 text-center">
            <p className="eyebrow mb-4">Find a pair</p>
            <h1 className="h-display text-4xl md:text-6xl">
              {hasQuery ? 'Results' : 'Search'}{' '}
              <span className="h-italic">{hasQuery ? `“${query}”` : 'the archive.'}</span>
            </h1>
            <p className="prose-body text-sm md:text-base mt-4">
              {hasQuery
                ? `${results.length} pair${results.length === 1 ? '' : 's'} found`
                : 'Type a name, collection or material — like “merino” or “trail”.'}
            </p>

            {/* Search field */}
            <div className="relative max-w-xl mx-auto mt-8">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                className="absolute left-5 top-1/2 -translate-y-1/2 text-ink-muted">
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                autoFocus
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Search socks, colours, packs…"
                className="w-full rounded-full border border-line bg-paper py-4 pl-12 pr-12 text-sm text-ink placeholder:text-ink-muted outline-none transition-colors focus:border-ink"
              />
              {value && (
                <button
                  type="button"
                  onClick={() => setValue('')}
                  aria-label="Clear search"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-paper transition-opacity hover:opacity-80"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="section-y">
          <div className="wrap">

            {/* WITH QUERY */}
            {hasQuery && (
              loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i}>
                      <div className="aspect-[4/5] rounded-xl bg-gray-200 animate-pulse" />
                      <div className="mt-3.5 h-3 w-1/3 rounded bg-gray-200 animate-pulse" />
                      <div className="mt-2 h-4 w-2/3 rounded bg-gray-200 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : results.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
                  {results.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              ) : (
                <div className="text-center py-20 border border-line rounded-lg max-w-xl mx-auto">
                  <p className="h-display text-3xl text-ink mb-3">No matches</p>
                  <p className="prose-body text-sm mb-7">
                    Nothing found for &ldquo;{query}&rdquo;. Try a different word, or open the full catalogue.
                  </p>
                  <Link href="/products" className="btn-outline inline-flex">Browse all pairs</Link>
                </div>
              )
            )}

            {/* NO QUERY — one pair per collection */}
            {!hasQuery && browse.length > 0 && (
              <>
                <p className="eyebrow text-center mb-10">A pair from every collection</p>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
                  {browse.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
