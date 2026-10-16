import Head from 'next/head';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { ProductCard } from '../../components/test/ui';
import { PRODUCTS } from '../../components/test/data';

const FILTERS = ['all', 'Socks', 'Knitwear', 'Sport', 'Accessories'];

export default function TestShop() {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('feat');

  const list = useMemo(() => {
    let l = PRODUCTS.filter((p) => filter === 'all' || p.cat === filter);
    if (sort === 'low') l = [...l].sort((a, b) => a.now - b.now);
    else if (sort === 'high') l = [...l].sort((a, b) => b.now - a.now);
    else if (sort === 'rating') l = [...l].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    return l;
  }, [filter, sort]);

  return (
    <TestLayout>
      <Head><title>Shop — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push('/test')}>Home</span> / Shop / {filter === 'all' ? 'All' : filter}</div>
          <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', marginTop: 10 }}>The full mint</h2>
          <div className="shopbar">
            {FILTERS.map((f) => (
              <button key={f} className={`chip${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f}</button>
            ))}
            <select className="sortsel" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="feat">Sort — Featured</option>
              <option value="low">Price ↑</option>
              <option value="high">Price ↓</option>
              <option value="rating">Top rated</option>
            </select>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: 60 }}>
        <div className="pgrid">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </div>
    </TestLayout>
  );
}
