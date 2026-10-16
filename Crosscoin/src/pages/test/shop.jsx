import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { ProductCard, SkeletonCards, I } from '../../components/test/ui';
import { fetchProducts, fetchCategories, colorToCss } from '../../components/test/real';

const PER_PAGE = 24;

export default function TestShop() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('feat');
  const [colorSel, setColorSel] = useState([]); // selected colour names
  const [sizeSel, setSizeSel] = useState([]); // selected sizes
  const [price, setPrice] = useState([0, 0]); // [min, max] user range
  const [page, setPage] = useState(1);
  const [mobFilters, setMobFilters] = useState(false); // mobile filter panel

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

  // Facet option lists + the catalogue price span, computed from real products.
  const facets = useMemo(() => {
    const colors = new Map(); const sizes = new Set(); let lo = Infinity; let hi = 0;
    products.forEach((p) => {
      (p.colors || []).forEach((c) => { if (c?.name) colors.set(c.name, c.hex || colorToCss(c.name)); });
      (p.sizes || []).forEach((s) => s && sizes.add(s));
      const n = Number(p.now) || 0; if (n > 0) { lo = Math.min(lo, n); hi = Math.max(hi, n); }
    });
    return { colors: [...colors.entries()], sizes: [...sizes], lo: lo === Infinity ? 0 : Math.floor(lo), hi: Math.ceil(hi) };
  }, [products]);

  // Initialise the price range once the catalogue span is known.
  useEffect(() => { if (facets.hi > 0 && price[0] === 0 && price[1] === 0) setPrice([facets.lo, facets.hi]); }, [facets.hi]);

  const list = useMemo(() => {
    const selCat = cats.find((c) => c.name === filter);
    let l = products.filter((p) => {
      if (filter !== 'all') {
        const byId = selCat && p.catId != null && String(p.catId) === String(selCat.id);
        const byName = (p.cat || '').toLowerCase() === filter.toLowerCase();
        if (!byId && !byName) return false;
      }
      if (colorSel.length && !(p.colors || []).some((c) => colorSel.includes(c.name))) return false;
      if (sizeSel.length && !(p.sizes || []).some((s) => sizeSel.includes(s))) return false;
      const n = Number(p.now) || 0;
      if (price[1] > 0 && (n < price[0] || n > price[1])) return false;
      return true;
    });
    if (sort === 'low') l = [...l].sort((a, b) => a.now - b.now);
    else if (sort === 'high') l = [...l].sort((a, b) => b.now - a.now);
    else if (sort === 'rating') l = [...l].sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
    return l;
  }, [products, cats, filter, sort, colorSel, sizeSel, price]);

  // Reset to page 1 whenever the filters/sort change.
  useEffect(() => { setPage(1); }, [filter, sort, colorSel, sizeSel, price]);

  const pageCount = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const pageItems = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggle = (arr, setArr, v) => setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const activeCount = (filter !== 'all' ? 1 : 0) + colorSel.length + sizeSel.length + ((price[1] > 0 && (price[0] > facets.lo || price[1] < facets.hi)) ? 1 : 0);
  const clearAll = () => { setFilter('all'); setColorSel([]); setSizeSel([]); setPrice([facets.lo, facets.hi]); };

  const Filters = () => (
    <div className="shopfilters">
      <div className="shopfilters__grp">
        <div className="shopfilters__h">Category</div>
        <button className={`facetrow${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>All categories</button>
        {cats.map((c) => <button key={c.id || c.name} className={`facetrow${filter === c.name ? ' on' : ''}`} onClick={() => setFilter(c.name)}>{c.name}</button>)}
      </div>

      {facets.hi > 0 && (
        <div className="shopfilters__grp">
          <div className="shopfilters__h">Price</div>
          <div className="pricerow">
            <input type="number" value={price[0]} min={facets.lo} max={price[1]} onChange={(e) => setPrice([Number(e.target.value) || 0, price[1]])} aria-label="Min price" />
            <span>–</span>
            <input type="number" value={price[1]} min={price[0]} max={facets.hi} onChange={(e) => setPrice([price[0], Number(e.target.value) || 0])} aria-label="Max price" />
          </div>
          <input type="range" className="pricerange" min={facets.lo} max={facets.hi} value={price[1]} onChange={(e) => setPrice([price[0], Number(e.target.value)])} aria-label="Max price slider" />
        </div>
      )}

      {facets.colors.length > 0 && (
        <div className="shopfilters__grp">
          <div className="shopfilters__h">Colour</div>
          <div className="swatchwrap">
            {facets.colors.map(([name, hex]) => (
              <button key={name} className={`swatchbtn${colorSel.includes(name) ? ' on' : ''}`} title={name} onClick={() => toggle(colorSel, setColorSel, name)}>
                <span style={{ background: hex }} />{name}
              </button>
            ))}
          </div>
        </div>
      )}

      {facets.sizes.length > 0 && (
        <div className="shopfilters__grp">
          <div className="shopfilters__h">Size</div>
          <div className="sizewrap">
            {facets.sizes.map((s) => <button key={s} className={`chip${sizeSel.includes(s) ? ' on' : ''}`} onClick={() => toggle(sizeSel, setSizeSel, s)}>{s}</button>)}
          </div>
        </div>
      )}

      {activeCount > 0 && <button className="btn" style={{ width: '100%' }} onClick={clearAll}>Clear all filters</button>}
    </div>
  );

  return (
    <TestLayout>
      <Head><title>Shop — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push('/test')}>Home</span> / Shop / {filter === 'all' ? 'All' : filter}</div>
          <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', marginTop: 10 }}>The full mint</h2>
          <div className="shopbar">
            <button className="btn shopbar__filter" onClick={() => setMobFilters((v) => !v)}>{I.menu(16)} Filters{activeCount > 0 ? ` · ${activeCount}` : ''}</button>
            <span className="shopbar__count mono">{loading ? '…' : `${list.length} product${list.length === 1 ? '' : 's'}`}</span>
            <select className="sortsel" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
              <option value="feat">Sort — Featured</option>
              <option value="low">Price ↑</option>
              <option value="high">Price ↓</option>
              <option value="rating">Top rated</option>
            </select>
          </div>
        </div>
      </div>

      <div className="wrap shoplayout" style={{ paddingBottom: 60 }}>
        <aside className={`shopaside${mobFilters ? ' open' : ''}`}><Filters /></aside>

        <div className="shopmain">
          {loading && products.length === 0
            ? <div className="pgrid" style={{ paddingTop: 4 }}><SkeletonCards n={9} /></div>
            : list.length === 0
              ? <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 13, padding: '30px 0' }}>No products match these filters. <a style={{ color: 'var(--crimson)', cursor: 'pointer' }} onClick={clearAll}>Clear filters</a></p>
              : <>
                  <div className="pgrid">{pageItems.map((p) => <ProductCard key={p.id} p={p} />)}</div>
                  {pageCount > 1 && (
                    <div className="pager">
                      <button className="btn" disabled={page === 1} onClick={() => { setPage(page - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>‹ Prev</button>
                      {Array.from({ length: pageCount }).map((_, i) => (
                        <button key={i} className={`pager__n${page === i + 1 ? ' on' : ''}`} onClick={() => { setPage(i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{i + 1}</button>
                      ))}
                      <button className="btn" disabled={page === pageCount} onClick={() => { setPage(page + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Next ›</button>
                    </div>
                  )}
                </>}
        </div>
      </div>
    </TestLayout>
  );
}
