import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, Add01Icon, ArrowLeft01Icon, ArrowRight01Icon, Tick02Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { productService, brandService, seoAdminService } from '../../../services';
import { useAuth } from '../../../context/AuthContext';
import { showSuccess, showError } from '../../../utils/toastNotification';
import ProductEditor from '../../../components/products/ProductEditor';
import SeoBulkPanel from '../../../components/products/SeoBulkPanel';
import { Skeleton, SkeletonTableRows } from '../../../components/ui/Skeleton';
import Dropdown from '../../../components/ui/Dropdown';
import { ConfirmModal } from '../../../components/common/AlertModal';

/*
 * Products — stock first. Tiles filter the list (same thresholds as Home's
 * "Out of stock → Restock" queue), brand chips + search narrow it, and each
 * product opens to its sizes where stock is typed straight in (Enter or
 * leaving the box saves). Editing a product's details opens a full-page
 * editor (?edit=<id> / ?new=1); "Fix SEO in bulk" opens ?seo=1. The browser
 * Back button returns to the list.
 */

const PAGE_SIZE = 25;
const FILTER_KEY = 'obz-products-filter'; // hand-off from Home ('out')

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const plural = (n, one, many = `${one}s`) => `${Number(n).toLocaleString('en-IN')} ${n === 1 ? one : many}`;
const priceRange = (min, max) => (min == null ? '—' : (max != null && max !== min ? `${inr(min)}–${inr(max)}` : inr(min)));

const BADGE_LABEL = { new_arrival: 'New arrival', hot_selling: 'Hot selling', low_stock: 'Low stock', out_of_stock: 'Out of stock', none: 'No badge' };
const SORTS = [
  { value: 'attention', label: 'Needs attention first' },
  { value: 'days', label: 'Runs out soonest' },
  { value: 'sold', label: 'Best sellers (30 days)' },
  { value: 'stock', label: 'Lowest stock' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name A–Z' },
];

function lastsText(days) {
  if (days === 0) return 'Out now';
  if (days == null) return 'No sales';
  if (days > 90) return '90+ days';
  return plural(days, 'day');
}
function lastsTone(days) {
  if (days === 0) return 'out';
  if (days != null && days <= 7) return 'low';
  if (days == null) return 'muted';
  return '';
}
const stockTone = (stock, days, lowSizes) => (stock <= 0 ? 'out' : ((days != null && days <= 7) || lowSizes > 0 ? 'low' : ''));

const VISIBILITY = {
  live: 'Live',
  draft: 'Hidden — draft',
  off: 'Hidden — turned off',
  brand_off: 'Hidden on this site',
  no_brand: 'Hidden — no site picked',
};

// ── URL state: ?edit=<id> | ?new=1 | ?seo=1 on /dashboard/products ──
function readMode() {
  if (typeof window === 'undefined') return { mode: 'list' };
  const sp = new URLSearchParams(window.location.search);
  if (sp.get('edit')) return { mode: 'edit', id: sp.get('edit'), focusCosts: sp.get('costs') === '1' };
  if (sp.get('new')) return { mode: 'new' };
  if (sp.get('seo')) return { mode: 'seo' };
  return { mode: 'list' };
}
function pushMode(query) {
  window.history.pushState({}, '', `/dashboard/products${query ? `?${query}` : ''}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
function goToView(view) {
  window.history.pushState({}, '', `/dashboard/${view}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function ProductsPage() {
  const { canAccessView } = useAuth();
  const [route, setRoute] = useState({ mode: 'list' });
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState('');
  const [filter, setFilter] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('filter') === 'missing_cost' ? 'missing_cost' : 'all');
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('attention');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [seoGaps, setSeoGaps] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleteIds, setDeleteIds] = useState([]);
  const [deletingSelected, setDeletingSelected] = useState(false);

  // Route + Home hand-off (read once, then cleared so a refresh shows all).
  useEffect(() => {
    setRoute(readMode());
    try {
      const f = sessionStorage.getItem(FILTER_KEY);
      if (f) { sessionStorage.removeItem(FILTER_KEY); if (['all', 'out', 'low', 'slow', 'hidden'].includes(f)) setFilter(f); }
    } catch { /* storage blocked */ }
    const sync = () => setRoute((r) => {
      const m = readMode();
      return m.mode === r.mode && m.id === r.id && m.focusCosts === r.focusCosts ? r : m;
    });
    // The sidebar changes the URL without a popstate when you're already on
    // this view (e.g. "Products" clicked from inside the editor) — re-read
    // the URL after any click so the page follows it.
    const onClick = () => setTimeout(sync, 0);
    window.addEventListener('popstate', sync);
    document.addEventListener('click', onClick, true);
    return () => { window.removeEventListener('popstate', sync); document.removeEventListener('click', onClick, true); };
  }, []);

  useEffect(() => {
    let alive = true;
    brandService.getAllBrands(false)
      .then((res) => { if (alive) setBrands((Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []).filter((b) => b.status !== 'inactive')); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Debounced server-side search.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchText.trim()), 300);
    return () => clearTimeout(t);
  }, [searchText]);
  useEffect(() => { setPage(1); }, [filter, brandId, search, sort]);

  const params = useMemo(() => ({ stock: filter, brandId: brandId || undefined, search: search || undefined, sort, page, limit: PAGE_SIZE }), [filter, brandId, search, sort, page]);

  const reqId = useRef(0);
  useEffect(() => {
    if (route.mode !== 'list') return undefined;
    const id = ++reqId.current;
    const ctrl = new AbortController();
    setLoading(true);
    setError('');
    productService.getStockList(params, ctrl.signal)
      .then((res) => {
        if (id !== reqId.current) return;
        setData(res);
        const lastPage = Math.max(1, res.pages || 1);
        if (params.page > lastPage) setPage(lastPage);
      })
      .catch((e) => { if (id === reqId.current && e?.name !== 'CanceledError') setError(e?.response?.data?.message || 'Couldn’t load products. Check your connection and try again.'); })
      .finally(() => { if (id === reqId.current) setLoading(false); });
    return () => ctrl.abort();
  }, [params, route.mode, reloadKey]);

  // SEO gaps count for the bottom panel.
  useEffect(() => {
    if (route.mode !== 'list') return undefined;
    let alive = true;
    seoAdminService.listProducts({ gaps_only: 'true', limit: 1, brand_id: brandId || undefined })
      .then((r) => { if (alive) setSeoGaps(Number(r?.gapsTotal ?? r?.total) || 0); })
      .catch(() => { if (alive) setSeoGaps(null); });
    return () => { alive = false; };
  }, [brandId, route.mode, reloadKey]);

  // After an inline save, refresh only the tile numbers — the rows stay put
  // so a product doesn't vanish from "Out of stock" while you're still typing.
  const countsTimer = useRef(null);
  const refreshCounts = useCallback(() => {
    clearTimeout(countsTimer.current);
    countsTimer.current = setTimeout(() => {
      productService.getStockList({ ...params, page: 1, limit: 1 })
        .then((res) => setData((d) => (d ? { ...d, counts: res.counts } : d)))
        .catch(() => {});
    }, 800);
  }, [params]);
  useEffect(() => () => clearTimeout(countsTimer.current), []);

  const patchRow = useCallback((productId, fn) => {
    setData((d) => (d ? { ...d, items: d.items.map((it) => (it.id === productId ? { ...it, ...fn(it) } : it)) } : d));
  }, []);

  const visibleItems = data?.items || [];
  const selectedOnPage = visibleItems.filter((p) => selectedIds.has(String(p.id))).length;
  const allOnPageSelected = visibleItems.length > 0 && selectedOnPage === visibleItems.length;
  const toggleProduct = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(String(id))) next.delete(String(id)); else next.add(String(id));
    return next;
  });
  const togglePage = () => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (allOnPageSelected) visibleItems.forEach((p) => next.delete(String(p.id)));
    else visibleItems.forEach((p) => next.add(String(p.id)));
    return next;
  });
  const deleteSelected = async () => {
    const ids = deleteIds;
    if (!ids.length || deletingSelected) return;
    setDeletingSelected(true);
    let deleted = 0;
    let archived = 0;
    const failed = [];
    const queue = [...ids];
    const workers = Array.from({ length: Math.min(4, ids.length) }, async () => {
      while (queue.length) {
        const id = queue.shift();
        try {
          const result = await productService.deleteProduct(id);
          if (result?.success === false) throw new Error(result.message || 'Delete failed');
          if (result?.archived) archived++;
          else deleted++;
        } catch (err) {
          failed.push({ id, name: data?.items?.find((p) => String(p.id) === id)?.name });
        }
      }
    });
    await Promise.all(workers);
    setSelectedIds(new Set(failed.map((x) => x.id)));
    setDeleteIds([]);
    setDeletingSelected(false);
    setReloadKey((k) => k + 1);
    if (deleted + archived) showSuccess('productsDeleted', `${deleted} deleted${archived ? ` · ${archived} archived to keep order history` : ''}`);
    if (failed.length) showError('productsDeleteFailed', `Couldn’t delete ${failed.length} product${failed.length === 1 ? '' : 's'}${failed[0].name ? ` (for example: ${failed[0].name})` : ''}. They remain selected so you can retry.`);
  };

  const backToList = () => { pushMode(''); setReloadKey((k) => k + 1); };

  if (route.mode === 'edit' || route.mode === 'new') {
    return (
      <ProductEditor
        key={route.mode === 'edit' ? `e${route.id}` : 'new'}
        productId={route.mode === 'edit' ? route.id : null}
        focusCosts={route.focusCosts}
        onClose={backToList}
        onSaved={(id) => { if (route.mode === 'new' && id) pushMode(`edit=${id}`); }}
        onDeleted={backToList}
      />
    );
  }
  if (route.mode === 'seo') {
    return <SeoBulkPanel brands={brands} initialBrandId={brandId} onClose={backToList} />;
  }

  const counts = data?.counts || {};
  const rules = data?.rules || { lowStock: 10, slowMinStock: 30, slowDays: 180 };
  const brandName = brands.find((b) => String(b.id) === String(brandId));
  const tiles = [
    { key: 'all', label: 'All products', value: counts.all, note: brandName ? `on ${brandName.display_name || brandName.name}` : `across ${plural(brands.length || 0, 'brand')}`, tone: '' },
    { key: 'out', label: 'Out of stock', value: counts.out, note: counts.outSizes != null ? `${plural(counts.outSizes, 'size')} at 0${counts.waitingOut ? ` · ${plural(counts.waitingOut, 'customer')} waiting` : ''}` : '', tone: 'out' },
    { key: 'low', label: 'Running low', value: counts.low, note: `a size has fewer than ${rules.lowStock} left`, tone: 'low' },
    { key: 'slow', label: 'Slow movers', value: counts.slow, note: `${rules.slowMinStock}+ in stock, over ${Math.round(rules.slowDays / 30)} months to sell`, tone: 'slow' },
    { key: 'hidden', label: 'Hidden on site', value: counts.hidden, note: 'not shown to shoppers', tone: 'muted' },
    { key: 'missing_cost', label: 'Missing cost price', value: counts.missingCost, note: 'products with uncosted variations', tone: 'low' },
  ];
  const total = data?.total ?? 0;
  const pages = Math.max(1, data?.pages || 1);
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(total, page * PAGE_SIZE);
  const firstLoad = loading && !data;
  const thead = (
    <thead>
      <tr>
        <th className="pst-select-col"><input type="checkbox" checked={allOnPageSelected} onChange={togglePage} disabled={deletingSelected || !visibleItems.length} aria-label="Select all products on this page" /></th>
        <th className="pst-col-prod">Product</th>
        <th>Brand</th>
        <th className="r">Price</th>
        <th className="r">In stock</th>
        <th className="r">Sold · 30 d</th>
        <th className="r">Lasts</th>
        <th>Badge</th>
        <th>Shows on site</th>
        <th className="pst-acts" scope="col"><span className="ds-sr-only">Actions</span></th>
      </tr>
    </thead>
  );

  return (
    <div className="dashboard-page pst">
      <ConfirmModal
        title={`Delete ${plural(deleteIds.length, 'product')}?`}
        message={deleteIds.length ? 'This removes the selected products from every store that sells them. Products with past orders are archived to preserve order history. All others are permanently deleted.' : null}
        confirmLabel={`Delete ${plural(deleteIds.length, 'product')}`}
        onConfirm={deleteSelected}
        onCancel={() => setDeleteIds([])}
      />
      <header className="pst-head">
        <div>
          <h1 className="pst-title">Products</h1>
          <p className="pst-sub">Stock first: see what’s running out, fix quantities right in the list, open a product only to edit its details.</p>
        </div>
        <div className="pst-head-actions">
          {canAccessView?.('pack-pricing') && (
            <button type="button" className="pst-btn" onClick={() => goToView('pack-pricing')}>Pack prices</button>
          )}
          <button type="button" className="pst-btn pst-btn--primary" onClick={() => pushMode('new=1')}>
            <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} /> New product
          </button>
        </div>
      </header>

      <section className="pst-tiles" aria-label="Stock health">
        {tiles.map((t) => (
          <button key={t.key} type="button" className={`pst-tile${filter === t.key ? ' is-on' : ''}`} aria-pressed={filter === t.key} onClick={() => setFilter(t.key)}>
            <span className="pst-tile-l">{t.label}</span>
            <span className={`pst-tile-v ${t.tone ? `tone-${t.tone}` : ''}`}>{t.value == null ? (firstLoad ? <Skeleton w="45%" h={24} /> : '—') : Number(t.value).toLocaleString('en-IN')}</span>
            <span className="pst-tile-n">{firstLoad && t.value == null ? <Skeleton w="80%" h={10} /> : t.note}</span>
          </button>
        ))}
      </section>

      <div className="pst-bar">
        <label className="pst-search">
          <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />
          <input type="search" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search name, SKU or colour" aria-label="Search products" />
        </label>
        <Dropdown value={sort} onChange={setSort} options={SORTS} className="pst-sort" />
      </div>
      {selectedIds.size > 0 && (
        <div className="pst-bulkbar" role="status">
          <span><b>{selectedIds.size}</b> product{selectedIds.size === 1 ? '' : 's'} selected</span>
          <button type="button" className="pst-btn pst-btn--danger" disabled={deletingSelected} onClick={() => setDeleteIds([...selectedIds])}>
            <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={2} />
            {deletingSelected ? 'Deleting…' : `Delete selected (${selectedIds.size})`}
          </button>
          <button type="button" className="pst-btn pst-btn--ghost" disabled={deletingSelected} onClick={() => setSelectedIds(new Set())}>Clear selection</button>
        </div>
      )}
      {brands.length > 1 && (
        <div className="pst-chips" role="group" aria-label="Brand">
          <button type="button" className={`pst-chip${brandId === '' ? ' is-on' : ''}`} onClick={() => setBrandId('')}>All brands</button>
          {brands.map((b) => (
            <button key={b.id} type="button" className={`pst-chip${String(brandId) === String(b.id) ? ' is-on' : ''}`} onClick={() => setBrandId(String(b.id))}>
              {b.display_name || b.name}
            </button>
          ))}
        </div>
      )}

      <section className="pst-panel">
        {error ? (
          <div className="pst-state">
            <p>{error}</p>
            <button type="button" className="pst-btn" onClick={() => setReloadKey((k) => k + 1)}>Try again</button>
          </div>
        ) : firstLoad ? (
          <div className="pst-scroll" role="status" aria-busy="true">
            <span className="ds-sr-only">Loading products…</span>
            <table className="pst-table ds-mobile-rows" aria-hidden="true">
              {thead}
              <tbody><SkeletonTableRows rows={8} cols={10} /></tbody>
            </table>
          </div>
        ) : !data?.items?.length ? (
          <div className="pst-state">
            {search ? `No products match “${search}”.` : filter === 'missing_cost' ? 'Every active variation has a cost price.' : filter === 'all' ? 'No products yet. Add your first one with “New product”.' : 'Nothing here — good news.'}
          </div>
        ) : (
          <div className={`pst-scroll${loading ? ' is-busy' : ''}`} aria-busy={loading || undefined}>
            <label className="ds-mobile-only pst-mobile-select">
              <input type="checkbox" checked={allOnPageSelected} onChange={togglePage} disabled={deletingSelected} />
              Select all products on this page
            </label>
            <table className="pst-table ds-mobile-rows" role="table">
              {thead}
              <tbody>
                {data.items.map((p) => (
                  <ProductRow key={p.id} p={p} selected={selectedIds.has(String(p.id))} selectDisabled={deletingSelected} onSelect={() => toggleProduct(p.id)} onPatch={patchRow} onSaved={refreshCounts} onOpen={(costs = false) => pushMode(`edit=${p.id}${costs ? '&costs=1' : ''}`)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pst-foot">
          <span>Type a new quantity and press Enter — it saves at once. When a sold-out product gets stock again, customers who saved it or have it in their cart get a WhatsApp (9 AM–9 PM).</span>
          {total > 0 && (
            <span className="pst-pager">
              Showing {from}–{to} of {total.toLocaleString('en-IN')}
              {pages > 1 && (
                <>
                  <button type="button" className="pst-icon-btn" disabled={page <= 1 || loading} onClick={() => setPage((x) => x - 1)} aria-label="Previous page"><HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} /></button>
                  <button type="button" className="pst-icon-btn" disabled={page >= pages || loading} onClick={() => setPage((x) => x + 1)} aria-label="Next page"><HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} /></button>
                </>
              )}
            </span>
          )}
        </div>
      </section>

      <section className="pst-panel pst-seo">
        <div>
          <b>Search engine gaps{seoGaps != null ? ` · ${plural(seoGaps, 'product')}` : ''}</b>
          <span>Missing a meta title, meta description or photo text. Fix them together instead of one product at a time.</span>
        </div>
        <button type="button" className="pst-btn" onClick={() => pushMode('seo=1')}>Fix SEO in bulk</button>
      </section>
    </div>
  );
}

// ── One product + its sizes ─────────────────────────────────────────────────
function ProductRow({ p, selected, selectDisabled, onSelect, onPatch, onSaved, onOpen }) {
  const [open, setOpen] = useState(false);
  const [vars, setVars] = useState(null);
  const [varsError, setVarsError] = useState('');
  const [varsLoading, setVarsLoading] = useState(false);

  const loadVars = useCallback(() => {
    setVarsLoading(true);
    setVarsError('');
    productService.getVariationStock(p.id)
      .then((res) => setVars(res.variations || []))
      .catch(() => setVarsError('Couldn’t load the sizes.'))
      .finally(() => setVarsLoading(false));
  }, [p.id]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !vars && !varsLoading) loadVars();
  };

  // Keep the product row's totals in step with the sizes being edited.
  const edited = useRef(false);
  const applyStock = useCallback((variationId, stock) => {
    edited.current = true;
    setVars((list) => (list || []).map((v) => (v.id === variationId
      ? { ...v, stock, daysLeft: stock <= 0 ? 0 : v.sold30 > 0 ? Math.floor(stock / (v.sold30 / 30)) : null }
      : v)));
  }, []);
  useEffect(() => {
    if (!edited.current || !vars) return;
    const totalStock = vars.reduce((a, v) => a + Math.max(0, v.stock), 0);
    onPatch(p.id, (row) => ({
      totalStock,
      outSizes: vars.filter((v) => v.stock <= 0).length,
      lowSizes: vars.filter((v) => v.stock > 0 && v.stock < 10).length,
      daysLeft: totalStock <= 0 ? 0 : row.sold30 > 0 ? Math.floor(totalStock / (row.sold30 / 30)) : null,
    }));
  }, [vars, onPatch, p.id]);

  const sTone = stockTone(p.totalStock, p.daysLeft, p.lowSizes);
  const meta = [
    p.variationCount ? plural(p.variationCount, 'size') : 'No sizes yet',
    p.category,
    p.outSizes > 0 && p.totalStock > 0 ? `${p.outSizes} out` : null,
    p.totalStock <= 0 && p.waiting > 0 ? `${plural(p.waiting, 'customer')} waiting` : null,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <tr className={open ? 'is-open' : ''}>
        <td className="pst-select-col"><input type="checkbox" checked={selected} onChange={onSelect} disabled={selectDisabled} aria-label={`Select ${p.name}`} /></td>
        <td className="pst-col-prod">
          <div className="pst-prod">
            <ProductThumbnail key={JSON.stringify(p.thumbnails || p.thumb)} product={p} />
            <div className="pst-prod-text">
              <button type="button" className="pst-name" onClick={() => onOpen()} title="Edit details">{p.name}</button>
              <div className="pst-meta">{meta}</div>
              {p.missingCostCount > 0 && <div className="pst-meta pst-missing-cost">{plural(p.missingCostCount, 'variation')} missing cost price</div>}
            </div>
          </div>
        </td>
        <td className="pst-brands ds-mobile-span" data-mobile-label="Brand">
          {p.brands.length === 0 ? <span className="muted">—</span> : p.brands.map((b) => (
            <span key={b.id} className={b.live ? '' : 'is-off'} title={b.live ? undefined : 'Hidden on this site'}>{b.name}</span>
          ))}
        </td>
        <td className="r" data-mobile-label="Price">{priceRange(p.minPrice, p.maxPrice)}</td>
        <td className="r" data-mobile-label="In stock"><b className={`pst-stock ${sTone ? `tone-${sTone}` : ''}`}>{p.totalStock.toLocaleString('en-IN')}</b></td>
        <td className="r" data-mobile-label="Sold · 30 days">{p.sold30.toLocaleString('en-IN')}</td>
        <td className={`r tone-${lastsTone(p.daysLeft) || 'none'}`} data-mobile-label="Lasts">{lastsText(p.daysLeft)}</td>
        <td data-mobile-label="Badge">
          <span className="pst-badge" title={p.badgeReason}>{p.badge === 'none' ? '—' : BADGE_LABEL[p.badge] || p.badge}</span>
          <span className="pst-badge-how">{p.badgeLocked ? 'Fixed' : 'Auto'}</span>
        </td>
        <td data-mobile-label="Shows on site"><span className={`pst-live ${p.visibility === 'live' ? 'is-live' : ''}`}>{VISIBILITY[p.visibility] || 'Hidden'}</span></td>
        <td className="r pst-acts ds-mobile-span ds-mobile-actions">
          <button type="button" className="pst-btn pst-btn--sm" onClick={toggle} aria-expanded={open} disabled={!p.variationCount}>
            {open ? 'Hide sizes' : 'Edit stock'}
          </button>
          <button type="button" className="pst-btn pst-btn--sm pst-btn--ghost" onClick={() => onOpen(p.missingCostCount > 0)}>{p.missingCostCount > 0 ? 'Edit costs' : 'Open'}</button>
        </td>
      </tr>
      {open && (varsLoading && !vars ? (
        // Size rows load: shimmer rows shaped like the size rows below.
        Array.from({ length: Math.min(Math.max(p.variationCount || 0, 1), 4) }, (_, i) => (
          <tr key={`sk${i}`} className="pst-sub" aria-busy="true">
            <td />
            <td className="pst-col-prod pst-var">
              {i === 0 && <span className="ds-sr-only" role="status">Loading sizes…</span>}
              <Skeleton w={`${45 + (i % 3) * 10}%`} h={12} />
            </td>
            <td />
            <td className="r"><Skeleton w={56} h={12} style={{ marginLeft: 'auto' }} /></td>
            <td className="r"><Skeleton w={72} h={34} r={8} style={{ marginLeft: 'auto' }} /></td>
            <td className="r"><Skeleton w={28} h={12} style={{ marginLeft: 'auto' }} /></td>
            <td className="r"><Skeleton w={48} h={12} style={{ marginLeft: 'auto' }} /></td>
            <td colSpan={3}><Skeleton w="40%" h={12} /></td>
          </tr>
        ))
      ) : varsError ? (
        <tr className="pst-sub"><td colSpan={10} className="pst-sub-msg">{varsError} <button type="button" className="pst-link" onClick={loadVars}>Try again</button></td></tr>
      ) : (vars || []).map((v) => (
        <VariationRow key={v.id} v={v} waiting={p.waiting} productOut={p.totalStock <= 0} onApply={applyStock} onSaved={onSaved} />
      )))}
    </>
  );
}

function ProductThumbnail({ product }) {
  const [index, setIndex] = useState(0);
  const sources = product.thumbnails || (product.thumb ? [product.thumb] : []);
  const src = sources[index];

  if (!src) {
    return <span className="pst-thumb pst-thumb--ph" aria-hidden="true">{(product.name || '?').slice(0, 1).toUpperCase()}</span>;
  }

  return <img key={src} className="pst-thumb" src={src} alt="" loading="lazy" decoding="async"
    onError={() => setIndex((current) => current === index ? current + 1 : current)} />;
}

function VariationRow({ v, waiting, productOut, onApply, onSaved }) {
  const [draft, setDraft] = useState(String(v.stock));
  const [state, setState] = useState({ saving: false, saved: false, error: '' });
  const savedTimer = useRef(null);
  const busy = useRef(false);
  const escaping = useRef(false);
  useEffect(() => { if (!busy.current) setDraft(String(v.stock)); }, [v.stock]);
  useEffect(() => () => clearTimeout(savedTimer.current), []);

  const commit = async (value) => {
    const raw = String(value ?? draft).trim();
    if (raw === String(v.stock) || busy.current) return;
    if (!/^\d+$/.test(raw) || Number(raw) > 1000000) {
      setState({ saving: false, saved: false, error: 'Use a whole number, 0 or more' });
      return;
    }
    const next = Number(raw);
    const prev = v.stock;
    busy.current = true;
    onApply(v.id, next); // optimistic
    setState({ saving: true, saved: false, error: '' });
    try {
      const res = await productService.updateVariationStock(v.id, next, prev);
      setState({ saving: false, saved: true, error: '' });
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setState((s) => ({ ...s, saved: false })), 2000);
      if (res?.restockAlert === 'sending') showSuccess('restock', 'Back in stock — customers waiting for it are getting a WhatsApp now.');
      else if (res?.restockAlert === 'morning') showSuccess('restock', 'Back in stock — customers waiting for it will get a WhatsApp after 9 AM.');
      onSaved?.();
    } catch (err) {
      const current = Number.isFinite(Number(err?.current)) && err?.code === 'STOCK_CHANGED' ? Number(err.current) : prev;
      onApply(v.id, current); // roll back (to the live number if it moved)
      setDraft(String(current));
      setState({ saving: false, saved: false, error: err?.message || 'Couldn’t save. Try again.' });
    } finally {
      busy.current = false;
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(e.currentTarget.value); }
    if (e.key === 'Escape') {
      escaping.current = true;
      setDraft(String(v.stock));
      setState({ saving: false, saved: false, error: '' });
      e.currentTarget.blur();
    }
  };
  const onBlur = (e) => {
    if (escaping.current) { escaping.current = false; return; }
    commit(e.currentTarget.value);
  };

  let note = '';
  if (!v.active) note = 'This size is hidden on the site';
  else if (v.stock <= 0) {
    const bits = [];
    if (v.inCarts) bits.push(`${plural(v.inCarts, 'customer')} ${v.inCarts === 1 ? 'has' : 'have'} it in their cart`);
    if (productOut && waiting) bits.push(`${plural(waiting, 'customer')} waiting for this product`);
    note = `Out${bits.length ? ` — ${bits.join(' · ')}` : ''}`;
  } else if (v.daysLeft != null && v.daysLeft <= 7) note = `Runs out in about ${plural(Math.max(1, v.daysLeft), 'day')}`;
  else if (v.stock < 10) note = `Fewer than 10 left`;

  const dTone = lastsTone(v.daysLeft);
  return (
    <tr className="pst-sub">
      <td />
      <td className="pst-col-prod pst-var ds-mobile-span">
        {v.label} <span className="pst-sku">{v.sku}</span>
      </td>
      <td />
      <td className="r" data-mobile-label="Price">
        {v.price != null ? inr(v.price) : '—'}
        <div className={`pst-meta${v.active && !(v.costPrice > 0) ? ' pst-missing-cost' : ''}`}>
          {v.costPrice > 0 ? `Cost ${inr(v.costPrice)}` : v.active ? 'Cost missing' : '—'}
        </div>
      </td>
      <td className="r" data-mobile-label="Edit stock">
        <input
          className={`pst-qty${state.error ? ' is-error' : ''}`}
          type="text"
          inputMode="numeric"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); if (state.error) setState((s) => ({ ...s, error: '' })); }}
          onBlur={onBlur}
          onKeyDown={onKey}
          readOnly={state.saving}
          aria-label={`Stock for ${v.label}`}
          aria-invalid={!!state.error}
        />
      </td>
      <td className="r" data-mobile-label="Sold · 30 days">{v.sold30.toLocaleString('en-IN')}</td>
      <td className={`r tone-${dTone || 'none'}`} data-mobile-label="Lasts">{lastsText(v.daysLeft)}</td>
      <td colSpan={3} className="pst-note ds-mobile-span">
        {state.error ? <span className="pst-err" role="alert">{state.error}</span>
          : state.saving ? <span className="muted">Saving…</span>
          : state.saved ? <span className="pst-ok"><HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.5} /> Saved</span>
          : note}
      </td>
    </tr>
  );
}
