import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { ProductCard } from '../../components/test/ui';
import { fetchProducts, fetchCategories } from '../../components/test/real';

export default function TestShop() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('feat');

  // Load the real Crosscoin catalogue once.
  useEffect(() => {
    let off = false;
    Promise.all([fetchProducts({ limit: 60 }), fetchCategories()])
      .then(([prods, categories]) => { if (off) return; setProducts(prods); setCats(categories); })
      .catch(() => {})
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, []);

  // Preselect a category from ?cat= (set by the home category index).
  useEffect(() => { if (router.query.cat) setFilter(String(router.query.cat)); }, [router.query.cat]);

  const list = useMemo(() => {
    let l = products.filter((p) => filter === 'all' || (p.cat || '').toLowerCase() === filter.toLowerCase());
    if (sort === 'low') l = [...l].sort((a, b) => a.now - b.now);
    else if (sort === 'high') l = [...l].sort((a, b) => b.now - a.now);
    else if (sort === 'rating') l = [...l].sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
    return l;
  }, [products, filter, sort]);

  const chips = ['all', ...cats.map((c) => c.name)];

  return (
    <TestLayout>
      <Head><title>Shop — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push('/test')}>Home</span> / Shop / {filter === 'all' ? 'All' : filter}</div>
          <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', marginTop: 10 }}>The full mint</h2>
          <div className="shopbar">
            {chips.map((f) => (
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
        {loading && products.length === 0
          ? <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 13, padding: '30px 0' }}>Loading the catalogue…</p>
          : list.length === 0
            ? <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 13, padding: '30px 0' }}>No products in this category.</p>
            : <div className="pgrid">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
      </div>
    </TestLayout>
  );
}
