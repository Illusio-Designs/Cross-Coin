import Head from 'next/head';
import { R } from '@/components/test/routes';
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

export default function TestShop({ preview = true }) {
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

  // Preselect a category from the URL. Supports ?category= (live /Products),
  // ?cat= (home category index) and the /collections/[slug] path param,
  // matching by category name, slug, or a slugified name.
  useEffect(() => {
    const q = router.query.category || router.query.cat || router.query.slug;
    if (!q) return;
    const qs = String(q).toLowerCase();
    if (!cats.length) { setFilter(String(q)); return; }
    const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const hit = cats.find((c) => String(c.name).toLowerCase() === qs || String(c.slug || '').toLowerCase() === qs || slugify(c.name) === qs);
    setFilter(hit ? hit.name : String(q));
  }, [router.query.category, router.query.cat, router.query.slug, cats]);

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
      {preview && <Head><title>Shop — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>}

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push(R.home)}>Home</span> / Shop / {filter === 'all' ? 'All' : filter}</div>
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
