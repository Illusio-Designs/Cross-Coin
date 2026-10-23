import Head from 'next/head';
import { R } from '@/components/test/routes';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { ProductCard, SkeletonCards, SkBusy, Sk } from '../../components/test/ui';
import { fetchSearch } from '../../components/test/real';
import { fbqTrack } from '@/utils/fbqTrack';

export default function TestSearch() {
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const lastTracked = useRef('');

  // ?q= (also ?query= from old /SearchResults links)
  const raw = router.query.q ?? router.query.query;
  const q = typeof raw === 'string' ? raw : '';

  // Sync the input with the URL and run the real search whenever ?q= changes.
  useEffect(() => {
    setTerm(q);
    if (!q.trim()) { setResults([]); setRan(false); return; }
    // Meta Search (pixel + CAPI) + GA4 `search` — once per settled ?q= (the URL
    // only changes on submit, never per keystroke).
    const termKey = q.trim();
    if (lastTracked.current !== termKey) {
      lastTracked.current = termKey;
      try { fbqTrack('Search', { search_string: termKey, content_type: 'product' }); } catch (_) { /* never throw */ }
    }
    let off = false;
    setLoading(true);
    fetchSearch(q)
      .then((r) => { if (!off) { setResults(r); setRan(true); } })
      .catch(() => { if (!off) { setResults([]); setRan(true); } })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [q]);

  const submit = (e) => {
    e.preventDefault();
    const v = term.trim();
    router.push(v ? `${R.search}?q=${encodeURIComponent(v)}` : R.search);
  };

  return (
    <TestLayout>
      <Head><title>Search — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push(R.home)}>Home</span> / Search</div>
          <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', marginTop: 10 }}>Find your mint</h2>
          <form className="searchbar" onSubmit={submit}>
            <input
              autoFocus
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search socks, packs, colours…"
              aria-label="Search products"
            />
            <button className="btn btn--crimson" type="submit">Search</button>
          </form>
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: 60 }}>
        {(!router.isReady || loading || (q.trim() && !ran)) && results.length === 0
          ? (
            <SkBusy label="Searching…">
              <div style={{ padding: '18px 0 8px' }}><Sk w={170} h={12} /></div>
              <div className="pgrid"><SkeletonCards n={8} /></div>
            </SkBusy>
          )
          : !q.trim()
            ? <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 13, padding: '30px 0' }}>Type something above to search the real catalogue.</p>
            : !loading && ran && results.length === 0
              ? <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 13, padding: '30px 0' }}>No matches for &ldquo;{q}&rdquo;. Try another term.</p>
              : (
                // A new search keeps the previous results on screen (dimmed)
                // until the new ones arrive, instead of flashing skeletons.
                <div className={loading ? 'sk-dim' : undefined} aria-busy={loading || undefined}>
                  <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 12, padding: '18px 0 8px' }}>{loading ? 'Searching…' : <>{results.length} result{results.length === 1 ? '' : 's'} for &ldquo;{q}&rdquo;</>}</p>
                  <div className="pgrid">{results.map((p) => <ProductCard key={p.id} p={p} />)}</div>
                </div>
              )}
      </div>
    </TestLayout>
  );
}
