'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { searchProducts } from '@/lib/api/products';
import { getPublicCategories } from '@/lib/api/categories';
import { fbTrack } from '@/utils/pixel';
import ProductCard from '../_components/ProductCard';
import { ProductGridSkeleton, Sk } from '../_components/Skeleton';

export default function SearchClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const query = (sp.get('q') || '').trim();
  const [input, setInput] = useState(query);
  const [results, setResults] = useState([]);
  // A ?q= link searches on mount — start loading so "No results" never flashes.
  const [loading, setLoading] = useState(() => !!query);
  const [cats, setCats] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => { setInput(query); }, [query]);

  // Focus the box on an empty search (the header icon lands here).
  useEffect(() => { if (!query) inputRef.current?.focus(); }, [query]);

  useEffect(() => {
    let alive = true;
    getPublicCategories().then((c) => { if (alive) setCats((c || []).filter((x) => x.slug).slice(0, 6)); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    if (!query) { setResults([]); setLoading(false); return undefined; }
    setLoading(true);
    fbTrack('Search', { search_string: query });
    searchProducts(query, 60)
      .then((list) => { if (alive) setResults(Array.isArray(list) ? list : []); })
      .catch(() => { if (alive) setResults([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [query]);

  const submit = (e) => {
    e.preventDefault();
    const q = input.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  const suggestions = cats.length ? (
    <div className="m-filterbar" style={{ justifyContent: 'center', marginTop: 18, marginBottom: 0 }}>
      {cats.map((c) => <Link key={c.id} className="m-fchip" href={`/collections/${c.slug}`}>{c.name}</Link>)}
    </div>
  ) : null;

  return (
    <>
      <section className="m-wrap m-ph">
        <span className="m-eyebrow">{query ? 'Results for' : 'Search'}</span>
        <h1>{query ? `“${query}”` : 'Find Your Scent.'}</h1>
        <form className="m-searchform" role="search" onSubmit={submit}>
          <input
            ref={inputRef}
            className="m-input"
            type="search"
            name="q"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search fragrances, notes, collections…"
            aria-label="Search fragrances"
            enterKeyHint="search"
          />
          <button type="submit" className="m-btn m-btn--fill">Search</button>
        </form>
        <p aria-live="polite">
          {!query ? 'Search by fragrance name, note or collection.'
            : loading ? <><Sk w={150} h={14} inline /><span className="sr-only">Searching…</span></>
            : `${results.length} fragrance${results.length !== 1 ? 's' : ''} found`}
        </p>
      </section>

      <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
        {loading && !results.length ? (
          <ProductGridSkeleton label="Searching…" />
        ) : query && results.length ? (
          // A new search keeps the previous results on screen, dimmed, until the new ones land.
          <div className={`m-pgrid${loading ? ' sk-dim' : ''}`} aria-busy={loading || undefined}>{results.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        ) : query ? (
          <div className="m-empty">
            <h3>No results found</h3>
            <p style={{ marginBottom: 20 }}>We couldn&rsquo;t find a match for &ldquo;{query}&rdquo;. Try another word or browse a collection.</p>
            <Link className="m-btn m-btn--fill" href="/shop" style={{ justifyContent: 'center' }}>Explore the shop</Link>
            {suggestions}
          </div>
        ) : (
          <div className="m-empty">
            <h3>Start exploring</h3>
            <p style={{ marginBottom: 20 }}>Type a fragrance, note or collection above — or start from a collection.</p>
            <Link className="m-btn m-btn--fill" href="/shop" style={{ justifyContent: 'center' }}>Browse all fragrances</Link>
            {suggestions}
          </div>
        )}
      </div>
    </>
  );
}
