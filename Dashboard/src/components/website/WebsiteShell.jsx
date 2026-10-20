/*
 * Website — one layout for Sliders, Blog, Photos and Policies:
 * pick the store, search, see what's live as cards, edit in a side panel.
 *
 * Each dashboard view keeps working and opens its tab here:
 *   slider → Sliders · blogs → Blog · media-gallery → Photos ·
 *   policies → Policies. SEO has its own page (SeoPage.jsx).
 *
 * Styles: styles/dashboard/website.css (.web-*). Shared look: components/ui
 * (StatusPill, ConfirmBar, EmptyState, ErrorState).
 */
import { useCallback, useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import Dropdown from '../ui/Dropdown';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import { useAuth } from '../../context/AuthContext';
import { goToView, loadBrands, useDebounced, brandLabel } from './webUtil';
import SlidersTab from './SlidersTab';
import BlogTab from './BlogTab';
import PhotosTab from './PhotosTab';
import PoliciesTab from './PoliciesTab';

const BRAND_KEY = 'obz-website-brand';

const TABS = [
  { id: 'sliders', label: 'Sliders', view: 'slider', Comp: SlidersTab, stores: 'all' },
  { id: 'blog', label: 'Blog', view: 'blogs', Comp: BlogTab, stores: 'all' },
  { id: 'photos', label: 'Photos', view: 'media-gallery', Comp: PhotosTab, stores: null },
  { id: 'policies', label: 'Policies', view: 'policies', Comp: PoliciesTab, stores: 'shared', adminOnly: true },
];

function readBrand() {
  try { return localStorage.getItem(BRAND_KEY) || ''; } catch { return ''; }
}

export default function WebsiteShell({ tab = 'sliders' }) {
  const { user, loading: authLoading, hasAnyRole } = useAuth();
  const canContent = !!user && hasAnyRole(['admin', 'product_manager']);
  const isAdmin = !!user && hasAnyRole(['admin']);
  const tabs = TABS.filter((t) => (t.adminOnly ? isAdmin : canContent));
  const current = TABS.find((t) => t.id === tab) || TABS[0];

  const [brands, setBrands] = useState([]);
  const [brandsError, setBrandsError] = useState(null);
  const [brandSel, setBrandSel] = useState(readBrand);
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 300);
  const [action, setAction] = useState(null);

  useEffect(() => {
    let off = false;
    loadBrands().then((b) => { if (!off) setBrands(b); }).catch(() => { if (!off) setBrandsError('Could not load the store list.'); });
    return () => { off = true; };
  }, []);

  const pickBrand = (v) => {
    const val = v === '' || v === 'global' ? v : String(v);
    setBrandSel(val);
    try { localStorage.setItem(BRAND_KEY, val); } catch { /* storage blocked */ }
  };

  // What this tab may scope by: 'all' (all stores + each), 'one' (one store
  // only), 'shared' (all + shared-only + each), null (no store picker).
  const mode = current.stores;
  let brandId = brandSel;
  if (mode === 'one' || mode === 'all') {
    if (brandId === 'global') brandId = '';
    if (mode === 'one' && !brands.some((b) => String(b.id) === String(brandId))) brandId = brands[0] ? String(brands[0].id) : '';
  }
  if (brandId && brandId !== 'global' && brands.length && !brands.some((b) => String(b.id) === String(brandId))) brandId = '';
  const brand = brands.find((b) => String(b.id) === String(brandId)) || null;

  const brandOptions = [
    ...(mode === 'all' || mode === 'shared' ? [{ value: '', label: 'All stores' }] : []),
    ...(mode === 'shared' ? [{ value: 'global', label: 'Shared (all stores)' }] : []),
    ...brands.map((b) => ({ value: String(b.id), label: brandLabel(b) })),
  ];

  const registerAction = useCallback((a) => setAction(a), []);

  if (authLoading) return <div className="web"><div className="web-skel-grid" aria-busy="true">{[0, 1, 2].map((i) => <span key={i} className="web-skel-card" />)}</div></div>;
  if (!canContent || (current.adminOnly && !isAdmin)) {
    return (
      <div className="dashboard-sections web">
        <EmptyState title="You don't have access to this" description="Ask an admin to give your account the Product manager or Admin role." />
      </div>
    );
  }

  const Comp = current.Comp;
  return (
    <div className="dashboard-sections web">
      <header className="web-head">
        <div className="web-head-text">
          <h1 className="web-title">Website</h1>
          <p className="web-sub">Sliders, blog, photos and policies in one place: pick the store, see what's live, edit in the side panel.</p>
        </div>
        {action && (action.htmlFor
          ? <label htmlFor={action.htmlFor} className={`web-btn web-btn--primary${action.busy ? ' is-busy' : ''}`} aria-disabled={action.busy || undefined}>{action.label}</label>
          : <button type="button" className="web-btn web-btn--primary" onClick={action.onClick} disabled={action.busy}>{action.label}</button>)}
      </header>

      <div className="web-bar">
        <div role="tablist" aria-label="Website section" className="web-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === current.id}
              className={`web-tab${t.id === current.id ? ' is-on' : ''}`}
              onClick={() => { if (t.id !== current.id) goToView(t.view); }}
            >{t.label}</button>
          ))}
        </div>
        <div className="web-bar-right">
          {mode && brands.length > 0 && (
            <div className="web-dd" aria-label="Store">
              <Dropdown value={brandId} onChange={pickBrand} options={brandOptions} />
            </div>
          )}
          <label className="web-search">
            <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" aria-label="Search" />
            {search && <button type="button" className="web-search-x" aria-label="Clear search" onClick={() => setSearch('')}><HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} /></button>}
          </label>
        </div>
      </div>
      {brandsError && <ErrorState message={brandsError} />}

      <Comp
        key={current.id}
        brands={brands}
        brand={brand}
        brandId={brandId}
        q={q}
        isAdmin={isAdmin}
        registerAction={registerAction}
      />
    </div>
  );
}
