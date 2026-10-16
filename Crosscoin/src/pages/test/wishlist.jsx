import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { ProductCard, toast } from '../../components/test/ui';
import TestLayout from '../../components/test/TestLayout';
import { useWishlist, clearWishlist } from '../../components/test/wishlist';
import { addItem } from '../../components/test/store';
import { fetchProducts } from '../../components/test/real';

export default function TestWishlist() {
  const router = useRouter();
  const items = useWishlist();
  const [sort, setSort] = useState('new');
  const [recs, setRecs] = useState([]);

  // Recommendations — real products not already saved.
  useEffect(() => {
    let off = false;
    fetchProducts({ limit: 12 }).then((l) => { if (!off) setRecs(l); }).catch(() => {});
    return () => { off = true; };
  }, []);

  const sorted = useMemo(() => {
    const l = [...items];
    if (sort === 'low') l.sort((a, b) => a.now - b.now);
    else if (sort === 'high') l.sort((a, b) => b.now - a.now);
    else l.reverse(); // newest first (store appends)
    return l;
  }, [items, sort]);

  const recList = useMemo(() => {
    const ids = new Set(items.map((p) => String(p.id)));
    return recs.filter((p) => !ids.has(String(p.id))).slice(0, 4);
  }, [recs, items]);

  const addOne = (p) => {
    const v = (p.variants || []).find((x) => x.pairs === 1) || (p.variants || [])[0] || null;
    addItem({ id: p.id, vid: v?.id || null, name: p.name, brand: p.brand, color: p.colors?.[0]?.name || '', size: v?.size || p.sizes?.[0] || '', pack: v?.label || 'Single', packq: v?.pairs || 1, unit: v?.price || p.now, was: v?.comparePrice || p.was, base: v?.price || p.now, img: p.img }, 1);
  };
  const addAll = () => {
    if (!items.length) return;
    items.forEach(addOne);
    toast(`Added ${items.length} item${items.length > 1 ? 's' : ''} to cart ✓`);
    window.dispatchEvent(new CustomEvent('cc-test-opencart'));
  };

  return (
    <TestLayout>
      <Head><title>Wishlist — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push('/test')}>Home</span> / Wishlist</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', marginTop: 10 }}>Your wishlist</h2>
            {items.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <select className="sortsel" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort wishlist">
                  <option value="new">Newest</option>
                  <option value="low">Price ↑</option>
                  <option value="high">Price ↓</option>
                </select>
                <button className="btn btn--crimson" onClick={addAll}>Add all to bag</button>
                <button className="chip" onClick={() => clearWishlist()}>Clear all</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: 60 }}>
        {items.length === 0
          ? (
            <div style={{ padding: '46px 0', textAlign: 'center' }}>
              <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 13, marginBottom: 16 }}>Nothing saved yet — tap the ♥ on any product to keep it here.</p>
              <button className="btn btn--crimson btn--lg" onClick={() => router.push('/test/shop')}>Browse the mint</button>
            </div>
          )
          : <div className="pgrid">{sorted.map((p) => <ProductCard key={p.id} p={p} />)}</div>}

        {recList.length > 0 && (
          <section className="block" style={{ paddingTop: 40 }}>
            <div className="sechead"><div><span className="eyebrow">You might also like</span><h2>More from the mint</h2></div></div>
            <div className="prail">{recList.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          </section>
        )}
      </div>
    </TestLayout>
  );
}
