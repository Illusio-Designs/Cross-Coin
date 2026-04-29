'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { getPublicProducts } from '@/lib/api/products';
import { getPublicCategories } from '@/lib/api/categories';
import ProductCard from '@/components/shop/ProductCard';

export default function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useStore();
  const [query, setQuery]         = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [popular, setPopular]     = useState([]);
  const fetchedRef = useRef(false);
  const inputRef = useRef(null);

  // Hydrate the "Browse Collections" chips from live categories.
  useEffect(() => {
    let alive = true;
    getPublicCategories().then(cats => {
      if (!alive) return;
      const list = (cats || [])
        .filter(c => c.name && c.slug)
        .slice(0, 6)
        .map(c => ({ name: c.name, slug: c.slug }));
      setPopular(list);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Load the full catalog ONCE the first time the overlay opens.
  // Cached for the rest of the session — same shape as shop/home.
  // After this, every keystroke filters in-memory which feels instant
  // and never returns "no results" for something that genuinely exists.
  useEffect(() => {
    if (!searchOpen || fetchedRef.current) return;
    fetchedRef.current = true;
    setLoadingCatalog(true);
    getPublicProducts({ limit: 200 })
      .then(r => setAllProducts(Array.isArray(r.products) ? r.products : []))
      .catch(() => setAllProducts([]))
      .finally(() => setLoadingCatalog(false));
  }, [searchOpen]);

  // Filter products by query — matches name, category/collection, AND
  // any of the product's variation attributes (so typing "oud" finds
  // products with oud notes even if "oud" isn't in the title). Returns
  // a ranked list: name matches first, then category, then anything else.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const nameHits = [];
    const collectionHits = [];
    const otherHits = [];
    const seen = new Set();

    for (const p of allProducts) {
      if (!p || seen.has(p.id)) continue;
      const name = String(p.name || '').toLowerCase();
      const collection = String(p.collection || p.category || '').toLowerCase();
      const desc = String(p.description || '').toLowerCase();
      const colorBlob = (p.colors || []).join(' ').toLowerCase();
      const sizeBlob = (p.sizes || []).join(' ').toLowerCase();

      if (name.includes(q)) {
        seen.add(p.id);
        nameHits.push(p);
      } else if (collection.includes(q) || q.includes(collection) && collection.length > 1) {
        seen.add(p.id);
        collectionHits.push(p);
      } else if (desc.includes(q) || colorBlob.includes(q) || sizeBlob.includes(q)) {
        seen.add(p.id);
        otherHits.push(p);
      }
    }

    return [...nameHits, ...collectionHits, ...otherHits].slice(0, 24);
  }, [query, allProducts]);

  const searching = loadingCatalog && query.length >= 2 && results.length === 0;

  useEffect(() => {
    if (searchOpen) { setTimeout(() => inputRef.current?.focus(), 100); }
    else { setQuery(''); }
  }, [searchOpen]);

  // Lock the page behind the overlay so it doesn't scroll while
  // searching. Restores the previous overflow value on close.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (searchOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSearchOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSearchOpen]);

  if (!searchOpen) return null;

  // Wrap product clicks so the overlay closes when the user navigates
  // to a detail page (NOT a redirect — the link just lets Next.js
  // route as usual, and we hide the overlay along the way).
  const closeOnNav = () => setSearchOpen(false);

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--bg)] flex flex-col">
      {/* Header — title left, close button right (sticky at top) */}
      <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-[var(--border)] bg-[var(--bg)]">
        <span className="font-serif italic text-xl text-[var(--ink)]">
          Search <span className="gold-text not-italic font-display tracking-tight">Velmique</span>
        </span>
        <button
          onClick={() => setSearchOpen(false)}
          aria-label="Close search"
          className="w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--ink)] hover:border-[var(--gold)] hover:bg-[var(--surface)] transition-colors"
        >
          <X size={18} strokeWidth={1.6} />
        </button>
      </div>

      {/* Search input (sticky below header) */}
      <div className="shrink-0 max-w-3xl mx-auto w-full px-6 pt-8 pb-4">
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink)]" strokeWidth={2} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search for fragrances, notes, collections…"
            className="w-full bg-white border-2 border-[var(--border)] focus:border-[var(--gold)] outline-none pl-12 pr-4 py-4 rounded-full text-base md:text-lg font-body font-medium text-black placeholder:text-[var(--ink-muted)] placeholder:font-normal transition-colors"
          />
        </div>

        {/* Results count */}
        {query.length > 1 && (
          <p className="text-[var(--ink-muted)] text-[10px] tracking-[0.3em] uppercase font-body mt-4">
            {searching
              ? 'Loading catalog…'
              : `${results.length} result${results.length === 1 ? '' : 's'} for “${query}”`}
          </p>
        )}
      </div>

      {/* Scrollable body — results grid OR popular collections */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto w-full px-6 pb-12">

          {/* Searching skeleton */}
          {searching && (
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
          )}

          {/* Real results — full ProductCards inside the overlay,
              no redirect. Clicking a card closes the overlay and
              navigates to the product detail page. */}
          {!searching && query.length > 1 && results.length > 0 && (
            <div onClick={closeOnNav}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {results.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {!searching && query.length > 1 && results.length === 0 && (
            <div className="text-center py-16 bg-white border border-[var(--border)] rounded-2xl max-w-xl mx-auto mt-4">
              <Search size={36} className="text-[var(--ink-muted)] mx-auto mb-4" />
              <p className="font-display text-2xl text-[var(--ink)] uppercase tracking-tight mb-2">No results found</p>
              <p className="text-[var(--ink-soft)] text-sm font-body">
                We couldn't find a match for &ldquo;{query}&rdquo;. Try a different word or pick a collection below.
              </p>
              {popular.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
                  {popular.map(c => (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => setQuery(c.name)}
                      className="px-4 py-2 rounded-full border border-[var(--border)] text-[var(--ink-soft)] hover:border-[var(--gold)] hover:text-[var(--ink)] hover:bg-[var(--surface)] text-xs font-body tracking-[0.05em] transition-colors"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Idle state — collection chips when no query yet. Click runs an
              in-place search (sets the input value) so results appear right
              here in the overlay instead of redirecting to /shop. */}
          {!query && popular.length > 0 && (
            <div className="max-w-2xl mx-auto pt-2">
              <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--gold-deep)] font-body mb-4">Browse Collections</p>
              <div className="flex flex-wrap gap-2">
                {popular.map(c => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => setQuery(c.name)}
                    className="px-4 py-2 rounded-full border border-[var(--border)] text-[var(--ink-soft)] hover:border-[var(--gold)] hover:text-[var(--ink)] hover:bg-white text-xs font-body tracking-[0.05em] transition-colors"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
