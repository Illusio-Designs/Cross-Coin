import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { ProductCard, SkeletonCards, Dropdown } from '../../components/test/ui';
import { fetchProducts, fetchCategories } from '../../components/test/real';

const SORTS = [
  { value: 'feat', label: 'Sort — Featured' },
  { value: 'low', label: 'Price — low to high' },
  { value: 'high', label: 'Price — high to low' },
  { value: 'rating', label: 'Top rated' },
];

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
    Promise.all([fetchProducts({ page: 1, limit: 100 }), fetchCategories()])
      .then(([prods, categories]) => { if (off) return; setProducts(prods); setCats(categories); })
      .catch(() => {})
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, []);

  // Preselect a category from ?cat= (set by the home category index).
  useEffect(() => { if (router.query.cat) setFilter(String(router.query.cat)); }, [router.query.cat]);

  const catOptions = useMemo(() => [{ value: 'all', label: 'All categories' }, ...cats.map((c) => ({ value: c.name, label: c.name }))], [cats]);

  const list = useMemo(() => {
    const selCat = cats.find((c) => c.name === filter);
    let l = products.filter((p) => {
      if (filter === 'all') return true;
      if (selCat && p.catId != null && String(p.catId) === String(selCat.id)) return true;
      return (p.cat || '').toLowerCase() === filter.toLowerCase();
    });
    if (sort === 'low') l = [...l].sort((a, b) => a.now - b.now);
    else if (sort === 'high') l = [...l].sort((a, b) => b.now - a.now);
    else if (sort === 'rating') l = [...l].sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
    return l;
  }, [products, cats, filter, sort]);

  return (
    <TestLayout>
      <Head><title>Shop — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push('/test')}>Home</span> / Shop / {filter === 'all' ? 'All' : filter}</div>
          <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', marginTop: 10 }}>The full mint</h2>
          <div className="shopbar">
            <Dropdown value={filter} options={catOptions} onChange={setFilter} ariaLabel="Filter by category" />
            <Dropdown className="sort" value={sort} options={SORTS} onChange={setSort} ariaLabel="Sort products" />
            {filter !== 'all' && <button className="chip on" onClick={() => setFilter('all')}>✕ Clear</button>}
          </div>
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: 60 }}>
        {loading && products.length === 0
          ? <div className="pgrid" style={{ paddingTop: 20 }}><SkeletonCards n={8} /></div>
          : list.length === 0
            ? <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 13, padding: '30px 0' }}>No products in this category.</p>
            : <div className="pgrid">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
      </div>
    </TestLayout>
  );
}
