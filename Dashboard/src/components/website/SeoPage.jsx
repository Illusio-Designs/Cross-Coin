/*
 * SEO — how one store shows up on Google.
 *   Score strip   → seoAdminService.overview (score, products, categories, pages, FAQs)
 *   To fix        → the same overview's issue list, best sellers first
 *   Pages         → seo_metadata rows (title, description, share picture, show on Google)
 *   FAQs          → grouped by where they show, drag to reorder
 *   Store details → SEO_* brand settings, with a preview of the business on Google
 *
 * Dashboard views: seo → To fix · seo-pages → Pages · faqs → FAQs ·
 * seo-global → Store details (seo-health / seo-bulk open To fix).
 * Styles: styles/dashboard/seo.css (.seo-*) on top of website.css (.web-*).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, Cancel01Icon, ArrowUp01Icon, ArrowDown01Icon, DragDropVerticalIcon } from '@hugeicons/core-free-icons';
import { websiteService, seoService, seoAdminService, faqService, productService, categoryService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { showSuccess, showError } from '../../utils/toastNotification';
import Dropdown from '../ui/Dropdown';
import StatusPill from '../ui/StatusPill';
import ConfirmBar from '../ui/ConfirmBar';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import { Select } from '../ui';
import SerpPreview, { brandSiteName } from '../common/SerpPreview';
import SeoLengthMeter from '../common/SeoLengthMeter';
import { richHtml } from '../../utils/sanitizeHtml';
import { WebPanel, WebField, ViewOnSite, Toggle } from './webParts';
import { useLoad, useObjectUrl, useDebounced, errText, siteUrl, goToView, loadBrands, brandLabel } from './webUtil';

const Editor = dynamic(() => import('../common/Editor'), {
  ssr: false,
  loading: () => <div className="web-editor-skel" />,
});

const BRAND_KEY = 'obz-website-brand';
const TABS = [
  { id: 'fix', label: 'To fix', view: 'seo', search: 'Search products, pages, posts' },
  { id: 'pages', label: 'Pages', view: 'seo-pages', search: 'Search pages' },
  { id: 'faqs', label: 'FAQs', view: 'faqs', search: 'Search questions' },
  { id: 'store', label: 'Store details', view: 'seo-global', search: null },
];
const n = (v) => Number(v || 0).toLocaleString('en-IN');
const pct = (done, total) => (total ? Math.round((100 * done) / total) : 0);
const readBrand = () => { try { return localStorage.getItem(BRAND_KEY) || ''; } catch { return ''; } };

export default function SeoPage({ initialTab = 'fix' }) {
  const { user, loading: authLoading, hasAnyRole } = useAuth();
  const canSeo = !!user && hasAnyRole(['admin', 'product_manager']);
  const [tab, setTab] = useState(initialTab);
  useEffect(() => { setTab(initialTab); }, [initialTab]);
  const [brands, setBrands] = useState([]);
  const [brandsError, setBrandsError] = useState(null);
  const [brandSel, setBrandSel] = useState(readBrand);
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 300);
  const [openPage, setOpenPage] = useState(null);

  useEffect(() => {
    let off = false;
    loadBrands().then((b) => { if (!off) setBrands(b); }).catch(() => { if (!off) setBrandsError('Could not load the store list.'); });
    return () => { off = true; };
  }, []);
  const brand = brands.find((b) => String(b.id) === String(brandSel)) || brands[0] || null;
  const brandId = brand ? String(brand.id) : '';
  const pickBrand = (v) => { setBrandSel(String(v)); try { localStorage.setItem(BRAND_KEY, String(v)); } catch { /* storage blocked */ } };

  const ov = useLoad(() => (brandId ? seoAdminService.overview(brandId) : Promise.resolve(null)), [brandId]);
  const o = ov.data;
  const refresh = () => ov.reload(true);

  const pickTab = (id) => {
    setTab(id); setSearch(''); setOpenPage(null);
    const t = TABS.find((x) => x.id === id);
    try { window.history.replaceState({}, '', `/dashboard/${t.view}`); } catch { /* ignore */ }
  };
  const fixPage = (name) => { pickTab('pages'); setOpenPage(name); };

  if (authLoading) return <div className="dashboard-sections web seo"><div className="web-skel-lines" aria-busy="true"><span /><span /><span /></div></div>;
  if (!canSeo) {
    return (
      <div className="dashboard-sections web seo">
        <EmptyState title="You don't have access to this" description="Ask an admin to give your account the Product manager or Admin role." />
      </div>
    );
  }

  const current = TABS.find((t) => t.id === tab) || TABS[0];
  const counts = { fix: o?.toFix, pages: o?.pages?.total, faqs: o?.faqs?.live };
  const sitemap = siteUrl(brand, '/sitemap.xml');

  return (
    <div className="dashboard-sections web seo">
      <header className="web-head">
        <div className="web-head-text">
          <h1 className="web-title">SEO</h1>
          <p className="web-sub">How each store shows up on Google. Fix what’s missing, write the FAQs, and fill in the store’s details once.</p>
        </div>
        <div className="seo-head-actions">
          {brands.length > 0 && <div className="web-dd" aria-label="Store"><Dropdown value={brandId} onChange={pickBrand} options={brands.map((b) => ({ value: String(b.id), label: brandLabel(b) }))} /></div>}
          <ViewOnSite url={sitemap} label="View sitemap ↗" />
        </div>
      </header>
      {brandsError && <ErrorState message={brandsError} />}

      <Score o={o} loading={ov.loading || !brandId} error={ov.error} onRetry={() => ov.reload()} onGo={pickTab} />

      <div className="web-bar">
        <div role="tablist" aria-label="SEO section" className="web-tabs">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={t.id === current.id} className={`web-tab${t.id === current.id ? ' is-on' : ''}`} onClick={() => { if (t.id !== current.id) pickTab(t.id); }}>
              {t.label}{counts[t.id] != null && <span className="seo-tab-count">{n(counts[t.id])}</span>}
            </button>
          ))}
        </div>
        {current.search && (
          <label className="web-search">
            <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={current.search} aria-label="Search" />
            {search && <button type="button" className="web-search-x" aria-label="Clear search" onClick={() => setSearch('')}><HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} /></button>}
          </label>
        )}
      </div>

      {current.id === 'fix' && <ToFix o={o} loading={ov.loading || !brandId} error={ov.error} q={q} onRetry={() => ov.reload()} onFixPage={fixPage} />}
      {current.id === 'pages' && <Pages key={brandId} brand={brand} brandId={brandId} q={q} openName={openPage} onOpened={() => setOpenPage(null)} onChanged={refresh} />}
      {current.id === 'faqs' && <Faqs key={brandId} brand={brand} brandId={brandId} q={q} onChanged={refresh} />}
      {current.id === 'store' && <StoreDetails key={brandId} brand={brand} brandId={brandId} />}
    </div>
  );
}

// ─── Score strip ─────────────────────────────────────────────────────────────
function Score({ o, loading, error, onRetry, onGo }) {
  if (error) return <ErrorState message={`Couldn't load the SEO score — ${error}`} onRetry={onRetry} />;
  if (loading || !o) return <div className="seo-kpis" aria-busy="true">{[0, 1, 2, 3, 4].map((i) => <span key={i} className="seo-kpi seo-kpi--skel" />)}</div>;
  const score = o.score;
  const tone = score == null ? 'none' : score >= 80 ? 'good' : score >= 50 ? 'ok' : 'low';
  const tiles = [
    { label: 'Products', value: `${n(o.products.done)} of ${n(o.products.total)}`, p: pct(o.products.done, o.products.total), note: o.products.missingDescription ? `${n(o.products.missingDescription)} missing a description` : (o.products.total ? 'All have their own title and description' : 'No live products yet'), warn: !!o.products.missingDescription, go: 'fix' },
    { label: 'Categories', value: `${n(o.categories.done)} of ${n(o.categories.total)}`, p: pct(o.categories.done, o.categories.total), note: o.categories.firstGap || (o.categories.total ? 'All complete' : 'No categories shown on Google'), warn: !!o.categories.firstGap, go: 'fix' },
    { label: 'Pages', value: `${n(o.pages.done)} of ${n(o.pages.shown)}`, p: pct(o.pages.done, o.pages.shown), note: o.pages.firstGap || (o.pages.total ? 'All complete' : 'Add the home, shop and about pages'), warn: !!o.pages.firstGap || !o.pages.total, go: 'pages' },
    { label: 'FAQs', value: `${n(o.faqs.live)} live`, p: o.faqs.live ? 100 : 0, note: o.faqs.on.length ? `On ${o.faqs.on.join(' and ')}` : 'None yet — add 3 to 5 for the whole site', warn: !o.faqs.live, go: 'faqs', info: true },
  ];
  return (
    <section className="seo-kpis" aria-label="SEO health">
      <div className="seo-kpi seo-kpi--score">
        <span className={`seo-ring seo-ring--${tone}`} style={{ '--p': `${score ?? 0}%` }}><b>{score ?? '–'}</b></span>
        <span className="seo-kpi-text">
          <span className="seo-kpi-label">SEO score</span>
          <b className="seo-kpi-big">{score == null ? 'Nothing to score yet' : `${tone === 'good' ? 'Good' : tone === 'ok' ? 'Fair' : 'Needs work'}${o.toFix ? `, ${n(o.toFix)} to fix` : ''}`}</b>
          <span className="seo-kpi-note">Out of 100, across everything below</span>
        </span>
      </div>
      {tiles.map((t) => (
        <button key={t.label} type="button" className="seo-kpi" onClick={() => onGo(t.go)}>
          <span className="seo-kpi-label">{t.label}</span>
          <b className="seo-kpi-value">{t.value}</b>
          <span className="seo-bar"><span className={t.info ? 'is-info' : ''} style={{ width: `${t.p}%` }} /></span>
          <span className={`seo-kpi-note${t.warn ? ' is-warn' : ''}`}>{t.note}</span>
        </button>
      ))}
    </section>
  );
}

// ─── To fix ──────────────────────────────────────────────────────────────────
const TYPE_LABEL = { product: 'Product', category: 'Category', page: 'Page', blog: 'Blog post' };

function ToFix({ o, loading, error, q, onRetry, onFixPage }) {
  const rows = useMemo(() => {
    const all = o?.issues || [];
    const needle = q.toLowerCase();
    return needle ? all.filter((r) => `${r.name} ${r.path}`.toLowerCase().includes(needle)) : all;
  }, [o, q]);
  const productCount = (o?.issues || []).filter((r) => r.type === 'product').length;
  if (error) return null; // the score strip already shows the error with Retry
  if (loading) return <div className="web-skel-lines" aria-busy="true"><span /><span /><span /></div>;

  const fix = (r) => {
    if (r.type === 'product') goToView('products', `edit=${r.id}`);
    else if (r.type === 'category') goToView('categories');
    else if (r.type === 'blog') goToView('blogs');
    else onFixPage(r.name);
  };

  return (
    <section className="seo-card">
      <div className="seo-card-head">
        <span className="seo-card-title"><b>What Google is missing</b><span>Best sellers first. Each item still shows on Google using the store’s defaults; its own title and description do better.</span></span>
        {productCount > 0 && <button type="button" className="web-btn web-btn--primary" onClick={() => goToView('products', 'seo=1')}>Fix {n(productCount)} product{productCount === 1 ? '' : 's'} in bulk →</button>}
      </div>
      {!rows.length ? (
        <EmptyState title={q ? 'Nothing matches' : 'Nothing to fix'} description={q ? 'Try another search.' : 'Every product, category, page and post has its own title and description.'} />
      ) : (
        <div className="seo-table-wrap">
          <table className="seo-table">
            <thead><tr><th>What</th><th>Type</th><th>Missing</th><th className="num">Sold · 30 days</th><th aria-label="Action" /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.type}-${r.id}`}>
                  <td><b>{r.name}</b><span className="seo-path">{r.path}</span></td>
                  <td>{TYPE_LABEL[r.type]}</td>
                  <td><span className="seo-gaps">{r.gaps.map((g) => <StatusPill key={g} tone="needs" size="sm">{g}</StatusPill>)}</span></td>
                  <td className="num">{r.sold == null ? '—' : n(r.sold)}</td>
                  <td className="act"><button type="button" className="web-btn web-btn--sm" onClick={() => fix(r)}>Fix</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ─── Pages ───────────────────────────────────────────────────────────────────
const ROBOTS = [
  ['', 'Show in Google (default)'],
  ['index, follow, max-image-preview:large', 'Show in Google, large picture previews'],
  ['noindex, follow', 'Hide from Google'],
  ['noindex, nofollow', 'Hide from Google and ignore its links'],
];
const PAGE_STATE = { live: { label: 'Good', tone: 'done' }, fix: { label: 'Needs work', tone: 'needs' }, hidden: { label: 'Hidden from Google', tone: 'neutral' } };
const STANDARD_PAGES = ['home', 'shop', 'about', 'contact', 'blog', 'track-order'];
const isValidJson = (s) => { if (!s || !String(s).trim()) return true; try { JSON.parse(s); return true; } catch { return false; } };
const hidden = (robots) => /noindex/i.test(robots || '');
const pagePath = (r) => {
  const name = String(r.page_name || '').toLowerCase();
  if (name === 'home' || name === 'index' || name === 'homepage') return '/';
  const slug = r.slug || `/${name}`;
  return slug.startsWith('/') ? slug : `/${slug}`;
};
const titleCase = (s) => String(s || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function Pages({ brand, brandId, q, openName, onOpened, onChanged }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [formErr, setFormErr] = useState('');
  const brandSlug = brand?.slug || 'crosscoin';
  const list = useLoad(() => (brandId ? websiteService.listSeoPages({ brandId, search: q || undefined, state: 'all', page: 1, limit: 100 }) : Promise.resolve(null)), [brandId, q]);
  const items = list.data?.items || [];
  const tl = list.data?.limits?.title || 60;
  const dl = list.data?.limits?.description || 160;
  const have = new Set(items.map((r) => String(r.page_name).toLowerCase()));
  const missing = q ? [] : STANDARD_PAGES.filter((p) => !have.has(p));

  const blank = { original: '', page_name: '', meta_title: '', meta_description: '', meta_keywords: '', canonical_url: '', robots: '', structured_data: '', image: null, imageUrl: null };
  const openNew = (name = '') => { setConfirmDel(false); setFormErr(''); setForm({ ...blank, page_name: name }); };
  const openEdit = async (r) => {
    setConfirmDel(false); setFormErr('');
    setForm({ ...blank, original: r.page_name, page_name: r.page_name, meta_title: r.meta_title || '', meta_description: r.meta_description || '', robots: r.robots || '', imageUrl: r.image, loading: true, row: r });
    try {
      const res = await seoService.getSEOData(r.page_name, brandSlug);
      const d = res?.data || res || {};
      setForm((f) => (f && f.original === r.page_name ? {
        ...f, loading: false,
        meta_title: d.meta_title || '', meta_description: d.meta_description || '', meta_keywords: d.meta_keywords || '',
        canonical_url: d.canonical_url || '', robots: d.robots || '',
        structured_data: d.structured_data ? (typeof d.structured_data === 'string' ? d.structured_data : JSON.stringify(d.structured_data, null, 2)) : '',
      } : f));
    } catch (e) {
      setForm((f) => (f && f.original === r.page_name ? { ...f, loading: false } : f));
      setFormErr(errText(e, 'Could not load every field of this page.'));
    }
  };

  // Opened from "To fix": open that page once the list has it.
  useEffect(() => {
    if (!openName || list.loading) return;
    const r = items.find((x) => String(x.page_name).toLowerCase() === String(openName).toLowerCase());
    if (r) openEdit(r);
    onOpened();
  }, [openName, list.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const imagePreview = useObjectUrl(form?.image || null);

  const save = async () => {
    const name = form.page_name.trim().toLowerCase();
    if (!name) return setFormErr('Give the page a name, like “home” or “about” (Advanced).');
    if (!form.meta_title.trim()) return setFormErr('Add the title shown in Google.');
    if (!form.meta_description.trim()) return setFormErr('Add the description shown in Google.');
    if (!isValidJson(form.structured_data)) return setFormErr('The structured data is not valid JSON — fix it or clear it.');
    setFormErr(''); setSaving(true);
    try {
      const fd = new FormData();
      fd.append('page_name', name);
      fd.append('meta_title', form.meta_title.trim());
      fd.append('meta_description', form.meta_description.trim());
      fd.append('meta_keywords', form.meta_keywords);
      fd.append('canonical_url', form.canonical_url);
      fd.append('robots', form.robots);
      fd.append('structured_data', form.structured_data);
      if (form.image) fd.append('meta_image', form.image);
      if (!form.original) {
        await seoService.createSEOData(fd, brandSlug);
      } else if (form.original !== name) {
        await seoService.deleteSEOData(form.original, brandSlug);
        await seoService.createSEOData(fd, brandSlug);
      } else {
        await seoService.updateSEOData(fd, brandSlug);
      }
      showSuccess('saveSuccess', 'Page SEO saved');
      setForm(null);
      list.reload(true);
      onChanged();
    } catch (e) { setFormErr(errText(e, 'Could not save.')); } finally { setSaving(false); }
  };
  const remove = async () => {
    setSaving(true);
    try {
      await seoService.deleteSEOData(form.original, brandSlug);
      showSuccess('deleteSuccess', 'Page SEO deleted');
      setForm(null); setConfirmDel(false);
      list.reload(true);
      onChanged();
    } catch (e) { showError('deleteFailed', errText(e)); } finally { setSaving(false); }
  };

  const shown = form ? !hidden(form.robots) : true;
  const panel = (
    <WebPanel
      open={!!form}
      title={form ? `${titleCase(form.original || form.page_name) || 'New'} page` : ''}
      pill={form?.row ? PAGE_STATE[form.row.state] : null}
      onClose={() => setForm(null)}
      hint="Pick a page to edit how it shows on Google."
      actions={form && (confirmDel ? (
        <ConfirmBar message={<>Delete the SEO for <b>{form.original}</b>? The page falls back to the store’s default title.</>} confirmLabel="Delete" cancelLabel="Keep" busy={saving} onConfirm={remove} onCancel={() => setConfirmDel(false)} />
      ) : (
        <>
          <button type="button" className="web-btn web-btn--primary" onClick={save} disabled={saving || form.loading}>{saving ? 'Saving…' : 'Save'}</button>
          {form.original && <ViewOnSite url={siteUrl(brand, pagePath(form.row || { page_name: form.original }))} />}
          {form.original && <button type="button" className="web-btn web-btn--danger" onClick={() => setConfirmDel(true)} disabled={saving}>Delete</button>}
        </>
      ))}
    >
      {form && (
        <>
          <div className="web-serp">
            <SerpPreview title={form.meta_title} description={form.meta_description} siteName={brandSiteName(brand)}
              url={siteUrl(brand, pagePath({ page_name: form.page_name, slug: form.row?.slug })) || 'https://example.com/'} variant="desktop" />
            <span className="seo-serp-cap">Preview of the Google result</span>
          </div>
          {!form.original && (
            <WebField label="Page" htmlFor="sp-name" hint="The page’s name on the site, like home, shop, about, contact.">
              <input id="sp-name" className="web-input" value={form.page_name} onChange={(e) => set('page_name', e.target.value)} placeholder="about" />
            </WebField>
          )}
          <WebField label={`Google title (${form.meta_title.length}/${tl})`} htmlFor="sp-title">
            <input id="sp-title" className="web-input" value={form.meta_title} onChange={(e) => set('meta_title', e.target.value)} />
            <SeoLengthMeter value={form.meta_title || ''} type="title" />
          </WebField>
          <WebField label={`Description (${form.meta_description.length}/${dl})`} htmlFor="sp-desc">
            <textarea id="sp-desc" className="web-input web-textarea" rows={3} value={form.meta_description} onChange={(e) => set('meta_description', e.target.value)} />
            <SeoLengthMeter value={form.meta_description || ''} type="description" />
          </WebField>
          <WebField label="Share picture" htmlFor="sp-img" hint="Shown on WhatsApp and Facebook links · 1200 × 630 · JPG, PNG or WEBP">
            {(imagePreview || form.imageUrl) && <div className="web-preview web-preview--og"><img src={imagePreview || form.imageUrl} alt="" /></div>}
            <input id="sp-img" type="file" accept="image/jpeg,image/png,image/webp" className="web-file" onChange={(e) => set('image', e.target.files?.[0] || null)} />
          </WebField>
          <div className="seo-switch-row">
            <span><b>Show on Google</b><span>Turn off for pages like cart or thank-you</span></span>
            <Toggle label="" checked={shown} onChange={(v) => set('robots', v ? '' : 'noindex, follow')} />
          </div>
          <details className="web-details">
            <summary>Advanced: page name, canonical link, keywords, structured data</summary>
            <p className="web-hint">Leave these empty unless you know you need them — the store fills sensible defaults.</p>
            {form.original && (
              <WebField label="Page name" htmlFor="sp-name2">
                <input id="sp-name2" className="web-input" value={form.page_name} onChange={(e) => set('page_name', e.target.value)} />
              </WebField>
            )}
            <WebField label="Main address (canonical)" htmlFor="sp-can" hint="Leave empty to use the page’s own address.">
              <input id="sp-can" className="web-input" value={form.canonical_url} onChange={(e) => set('canonical_url', e.target.value)} />
            </WebField>
            <WebField label="Keywords" htmlFor="sp-kw">
              <input id="sp-kw" className="web-input" value={form.meta_keywords} onChange={(e) => set('meta_keywords', e.target.value)} placeholder="sports socks, ankle socks" />
            </WebField>
            <WebField label="Google" htmlFor="sp-robots">
              <select id="sp-robots" className="web-input" value={form.robots} onChange={(e) => set('robots', e.target.value)}>
                {ROBOTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </WebField>
            <WebField label="Structured data (JSON-LD)" htmlFor="sp-sd" error={form.structured_data && !isValidJson(form.structured_data) ? 'Not valid JSON — it won’t save until fixed.' : null}>
              <textarea id="sp-sd" className="web-input web-textarea web-mono" rows={7} value={form.structured_data} onChange={(e) => set('structured_data', e.target.value)} placeholder='{"@context":"https://schema.org","@type":"Organization"}' />
            </WebField>
          </details>
          {formErr && <p className="web-form-err" role="alert">{formErr}</p>}
        </>
      )}
    </WebPanel>
  );

  return (
    <div className="web-body">
      <section className="web-main">
        <div className="seo-card">
          <div className="seo-quick">
            <span>{missing.length ? 'Add a missing page:' : 'Pages with their own Google title and description.'}</span>
            {missing.map((p) => <button key={p} type="button" className="seo-chip-add" onClick={() => openNew(p)}>+ {titleCase(p)}</button>)}
            <button type="button" className="seo-chip-add" onClick={() => openNew('')}>+ Other page</button>
          </div>
          {list.error ? <ErrorState message={`Couldn't load the pages — ${list.error}`} onRetry={() => list.reload()} />
            : list.loading || !brandId ? <div className="web-skel-lines" aria-busy="true"><span /><span /><span /></div>
              : !items.length ? <EmptyState title={q ? 'No pages match' : 'No page SEO yet'} description={q ? 'Try another search.' : 'Start with the home, shop and about pages — the buttons above fill in the page name.'} />
                : items.map((r) => {
                  const on = form?.original === r.page_name;
                  return (
                    <button key={r.id} type="button" className={`seo-row${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => openEdit(r)}>
                      <span className="seo-row-main"><b>{titleCase(r.page_name)}</b><span>{r.meta_title || r.problem || 'No title yet'}</span></span>
                      <span className="seo-row-side">
                        <span className="seo-len" title="Title · description length">{r.title_length} · {r.description_length}</span>
                        <StatusPill tone={PAGE_STATE[r.state].tone} size="sm">{PAGE_STATE[r.state].label}</StatusPill>
                      </span>
                    </button>
                  );
                })}
        </div>
      </section>
      {panel}
    </div>
  );
}

// ─── FAQs ────────────────────────────────────────────────────────────────────
const SCOPES = [
  { value: 'global', label: 'The whole site' },
  { value: 'product', label: 'Product pages' },
  { value: 'category', label: 'A category' },
  { value: 'page', label: 'A page' },
];
const ALL_PRODUCTS = '__all_products__';
const EMPTY_FAQ = { id: null, attached_to_type: 'global', attached_to_id: '', attached_to_slug: '', product_ids: [], question: '', answer: '', display_order: 0, is_active: true };
const groupKey = (f) => `${f.attached_to_type}|${f.attached_to_id || ''}|${f.attached_to_slug || ''}`;
const GROUP_RANK = { global: 0, product: 1, category: 2, page: 3 };

function Faqs({ brand, brandId, q, onChanged }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const drag = useRef(null);
  const [dropOn, setDropOn] = useState(null);
  const brandSlug = brand?.slug || '';

  useEffect(() => {
    let off = false;
    if (!brandSlug) return undefined;
    productService.getAllProducts(1, 500, '', null, false, brandSlug, true)
      .then((r) => { if (!off) setProducts(r?.products || r?.data || []); })
      .catch(() => { if (!off) setProducts([]); });
    categoryService.getAllCategories(brandSlug)
      .then((r) => { if (!off) setCategories(Array.isArray(r) ? r : (r?.data || r?.categories || [])); })
      .catch(() => { if (!off) setCategories([]); });
    return () => { off = true; };
  }, [brandSlug]);

  const list = useLoad(() => (brandId ? faqService.list({ brand_id: brandId, ...(q ? { search: q } : {}) }) : Promise.resolve({ faqs: [] })), [brandId, q]);
  const all = list.data?.faqs || [];
  const productName = (id) => { const p = products.find((x) => String(x.id) === String(id)); return p ? p.name : `Product #${id}`; };
  const categoryName = (id) => { const c = categories.find((x) => String(x.id) === String(id)); return c ? c.name : `Category #${id}`; };

  // One group per place the questions show; product FAQs with the same
  // question text are shown together ("Ankle Sports Socks, Classic Crew Socks").
  const groups = useMemo(() => {
    const byKey = new Map();
    for (const f of all) {
      const k = groupKey(f);
      if (!byKey.has(k)) byKey.set(k, { key: k, type: f.attached_to_type, id: f.attached_to_id, slug: f.attached_to_slug, items: [] });
      byKey.get(k).items.push(f);
    }
    const out = [...byKey.values()];
    for (const g of out) g.items.sort((a, b) => a.display_order - b.display_order || a.id - b.id);
    out.sort((a, b) => GROUP_RANK[a.type] - GROUP_RANK[b.type] || String(a.id || a.slug || '').localeCompare(String(b.id || b.slug || '')));
    return out;
  }, [all]);
  const groupTitle = (g) => {
    if (g.type === 'global') return ['Whole site', 'Shown on the home page and the FAQ page'];
    if (g.type === 'product') return g.id ? [productName(g.id), 'Shown on this product page'] : ['Every product', 'Shown on every product page'];
    if (g.type === 'category') return [`Category: ${categoryName(g.id)}`, 'Shown on the category page'];
    return [`Page: ${g.slug}`, 'Shown on this page'];
  };

  const openNew = (preset = {}) => { setConfirmDel(false); setFormErr(''); setForm({ ...EMPTY_FAQ, ...preset }); };
  const openEdit = (f) => {
    setConfirmDel(false); setFormErr('');
    setForm({
      id: f.id, attached_to_type: f.attached_to_type, attached_to_id: f.attached_to_id || '', attached_to_slug: f.attached_to_slug || '',
      product_ids: f.attached_to_type === 'product' ? (f.attached_to_id ? [String(f.attached_to_id)] : [ALL_PRODUCTS]) : [],
      question: f.question, answer: f.answer, display_order: f.display_order, is_active: !!f.is_active,
    });
  };
  const presetFor = (g) => ({
    attached_to_type: g.type, attached_to_id: g.type === 'category' ? String(g.id || '') : '', attached_to_slug: g.slug || '',
    product_ids: g.type === 'product' ? (g.id ? [String(g.id)] : [ALL_PRODUCTS]) : [],
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.question.trim() || !String(form.answer || '').replace(/<[^>]*>/g, '').trim()) return setFormErr('Write the question and the answer.');
    const isProduct = form.attached_to_type === 'product';
    if (isProduct && !form.product_ids.length) return setFormErr('Pick at least one product, or “All products”.');
    if (form.attached_to_type === 'category' && !form.attached_to_id) return setFormErr('Pick the category.');
    if (form.attached_to_type === 'page' && !form.attached_to_slug.trim()) return setFormErr('Enter the page, like “about”.');
    setFormErr(''); setSaving(true);
    try {
      const base = {
        brand_id: Number(brandId),
        attached_to_type: form.attached_to_type,
        attached_to_slug: form.attached_to_type === 'page' ? form.attached_to_slug.trim() : null,
        question: form.question.trim(),
        answer: form.answer,
        display_order: parseInt(form.display_order, 10) || 0,
        is_active: !!form.is_active,
      };
      if (form.id) {
        const attached_to_id = isProduct
          ? (form.product_ids.includes(ALL_PRODUCTS) ? null : (form.product_ids[0] || null))
          : (form.attached_to_id || null);
        await faqService.update(form.id, { ...base, attached_to_id });
      } else if (isProduct && !form.product_ids.includes(ALL_PRODUCTS)) {
        for (const pid of form.product_ids) await faqService.create({ ...base, attached_to_id: pid });
      } else {
        await faqService.create({ ...base, attached_to_id: isProduct ? null : (form.attached_to_id || null) });
      }
      showSuccess('saveSuccess', 'FAQ saved');
      setForm(null);
      list.reload(true);
      onChanged();
    } catch (e) { setFormErr(errText(e, 'Could not save the FAQ.')); } finally { setSaving(false); }
  };
  const remove = async () => {
    setSaving(true);
    try {
      await faqService.remove(form.id);
      showSuccess('deleteSuccess', 'FAQ deleted');
      setForm(null); setConfirmDel(false);
      list.reload(true);
      onChanged();
    } catch (e) { showError('deleteFailed', errText(e)); } finally { setSaving(false); }
  };
  const reorder = async (g, from, to) => {
    if (from === to || to < 0 || to >= g.items.length) return;
    const next = g.items.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const orders = next.map((p, k) => ({ id: p.id, display_order: k + 1 }));
    list.setData((d) => ({ ...d, faqs: (d?.faqs || []).map((f) => { const o = orders.find((x) => x.id === f.id); return o ? { ...f, display_order: o.display_order } : f; }) }));
    try { await faqService.reorder(orders); } catch (e) { showError('saveFailed', errText(e, 'Could not change the order.')); list.reload(true); }
  };

  const productOptions = [{ value: ALL_PRODUCTS, label: 'All products' }, ...products.map((p) => ({ value: String(p.id), label: p.name }))];
  const categoryOptions = categories.map((c) => ({ value: String(c.id), label: c.name }));

  const panel = (
    <WebPanel
      wide
      open={!!form}
      title={form?.id ? 'Edit question' : 'New question'}
      pill={form?.id ? (form.is_active ? { label: 'Live', tone: 'done' } : { label: 'Hidden', tone: 'neutral' }) : null}
      onClose={() => setForm(null)}
      hint="Pick a question to edit it. Live questions can show right under your link on Google."
      actions={form && (confirmDel ? (
        <ConfirmBar message={<>Delete this question? It disappears from the site.</>} confirmLabel="Delete" cancelLabel="Keep" busy={saving} onConfirm={remove} onCancel={() => setConfirmDel(false)} />
      ) : (
        <>
          <button type="button" className="web-btn web-btn--primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          {form.id && <button type="button" className="web-btn web-btn--danger" onClick={() => setConfirmDel(true)} disabled={saving}>Delete</button>}
        </>
      ))}
    >
      {form && (
        <>
          <WebField label="Question" htmlFor="fq-q">
            <input id="fq-q" className="web-input" maxLength={500} value={form.question} onChange={(e) => set('question', e.target.value)} placeholder="Do the socks shrink after washing?" />
          </WebField>
          <WebField label="Answer">
            <Editor allowImages={false} value={form.answer} onChange={(v) => set('answer', v)} placeholder="Type the answer. Lists and links are fine." headingBase={3} />
          </WebField>
          <WebField label="Shows on" htmlFor="fq-scope">
            <select id="fq-scope" className="web-input" value={form.attached_to_type} onChange={(e) => setForm({ ...form, attached_to_type: e.target.value, attached_to_id: '', attached_to_slug: '', product_ids: [] })}>
              {SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </WebField>
          {form.attached_to_type === 'product' && (
            <WebField label={form.id ? 'Product' : 'Products (one or more)'}>
              <Select
                multiple={!form.id}
                searchable
                value={form.id ? (form.product_ids[0] ?? null) : form.product_ids}
                onChange={(v) => set('product_ids', form.id ? [v] : (Array.isArray(v) && v.includes(ALL_PRODUCTS) ? [ALL_PRODUCTS] : (Array.isArray(v) ? v : [v])))}
                options={productOptions}
                placeholder={products.length ? 'Pick products…' : 'Loading products…'}
              />
            </WebField>
          )}
          {form.attached_to_type === 'category' && (
            <WebField label="Category">
              {categoryOptions.length
                ? <Select searchable value={form.attached_to_id ? String(form.attached_to_id) : null} onChange={(v) => set('attached_to_id', v)} options={categoryOptions} placeholder="Pick a category…" />
                : <input className="web-input" type="number" value={form.attached_to_id} onChange={(e) => set('attached_to_id', e.target.value)} placeholder="Category number" />}
            </WebField>
          )}
          {form.attached_to_type === 'page' && (
            <WebField label="Page" htmlFor="fq-page">
              <input id="fq-page" className="web-input" value={form.attached_to_slug} onChange={(e) => set('attached_to_slug', e.target.value)} placeholder="about" />
            </WebField>
          )}
          <Toggle label="Show on the site" checked={form.is_active} onChange={(v) => set('is_active', v)} />
          <p className="seo-note">Live questions can appear right under your link on Google. Keep answers short and true.</p>
          {formErr && <p className="web-form-err" role="alert">{formErr}</p>}
        </>
      )}
    </WebPanel>
  );

  return (
    <div className="web-body">
      <section className="web-main">
        {list.error ? <ErrorState message={`Couldn't load the FAQs — ${list.error}`} onRetry={() => list.reload()} />
          : list.loading || !brandId ? <div className="web-skel-lines" aria-busy="true"><span /><span /><span /></div>
            : !groups.length ? (
              <EmptyState
                title={q ? 'No questions match' : 'No FAQs yet'}
                description={q ? 'Try another search.' : 'Add 3–5 whole-site questions (returns, delivery time, sizes). Google can show them right under your link.'}
                action={!q ? <button type="button" className="web-btn web-btn--primary" onClick={() => openNew()}>+ Question</button> : null}
              />
            ) : (
              <>
                {groups.map((g) => {
                  const [title, note] = groupTitle(g);
                  return (
                    <div key={g.key} className="seo-card">
                      <div className="seo-card-head">
                        <span className="seo-card-title"><b>{title}</b><span>{note}</span></span>
                        <button type="button" className="web-btn web-btn--sm" onClick={() => openNew(presetFor(g))}>+ Question</button>
                      </div>
                      <ul className="seo-faqs">
                        {g.items.map((f, i) => (
                          <li
                            key={f.id}
                            className={`seo-faq${form?.id === f.id ? ' is-on' : ''}${dropOn === f.id ? ' is-drop' : ''}`}
                            draggable={!q && g.items.length > 1}
                            onDragStart={(e) => { drag.current = { key: g.key, from: i }; e.dataTransfer.effectAllowed = 'move'; }}
                            onDragOver={(e) => { if (drag.current?.key === g.key) { e.preventDefault(); setDropOn(f.id); } }}
                            onDragLeave={() => setDropOn((d) => (d === f.id ? null : d))}
                            onDrop={(e) => { e.preventDefault(); setDropOn(null); const d = drag.current; drag.current = null; if (d?.key === g.key) reorder(g, d.from, i); }}
                            onDragEnd={() => { drag.current = null; setDropOn(null); }}
                          >
                            {g.items.length > 1 && !q && <span className="seo-grip" aria-hidden="true"><HugeiconsIcon icon={DragDropVerticalIcon} size={16} strokeWidth={2} /></span>}
                            <button type="button" className="seo-faq-main" onClick={() => openEdit(f)}>
                              <b>{f.question}</b>
                              <span className="web-clamp" {...richHtml(f.answer)} />
                            </button>
                            <StatusPill tone={f.is_active ? 'done' : 'neutral'} size="sm">{f.is_active ? 'Live' : 'Hidden'}</StatusPill>
                            {g.items.length > 1 && !q && (
                              <span className="web-move">
                                <button type="button" className="web-icon-btn" aria-label="Show earlier" disabled={i === 0} onClick={() => reorder(g, i, i - 1)}><HugeiconsIcon icon={ArrowUp01Icon} size={16} strokeWidth={2} /></button>
                                <button type="button" className="web-icon-btn" aria-label="Show later" disabled={i === g.items.length - 1} onClick={() => reorder(g, i, i + 1)}><HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={2} /></button>
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
                {!q && <button type="button" className="seo-chip-add seo-chip-add--wide" onClick={() => openNew()}>+ Question somewhere else</button>}
              </>
            )}
      </section>
      {panel}
    </div>
  );
}

// ─── Store details ───────────────────────────────────────────────────────────
const SECTIONS = [
  { title: 'Store identity', why: 'The business Google shows behind the store.', keys: [
    { key: 'SEO_ORGANIZATION_NAME', label: 'Business name', placeholder: 'CrossCoin' },
    { key: 'SEO_ORGANIZATION_LOGO', label: 'Logo link', placeholder: 'https://crosscoin.in/logo.png', hint: 'A public picture link.' },
    { key: 'SEO_PHONE', label: 'Public phone', placeholder: '+91 98765 43210' },
  ] },
  { title: 'Defaults', why: 'Used when a product or page has nothing of its own.', keys: [
    { key: 'SEO_DEFAULT_TITLE_TEMPLATE', label: 'Product title pattern', placeholder: '{name} | CrossCoin', hint: '{name} = product, {brand} = store.' },
    { key: 'SEO_DEFAULT_DESCRIPTION', label: 'Fallback description', placeholder: 'Shop premium socks with free shipping and easy returns.', hint: 'Up to 160 characters.' },
    { key: 'SEO_DEFAULT_OG_IMAGE', label: 'Default share picture (1200 × 630)', placeholder: 'https://crosscoin.in/og-default.jpg' },
  ] },
  { title: 'Trust', why: 'Helps Google and AI shopping show delivery and returns.', keys: [
    { key: 'SEO_RETURN_POLICY_URL', label: 'Return policy link', placeholder: 'https://crosscoin.in/policy/cancellation-and-refund' },
    { key: 'SEO_DEFAULT_SHIPPING_PROMISE_DAYS', label: 'Delivery promise (days)', placeholder: '3', type: 'number' },
  ] },
  { title: 'Social profiles', why: 'Linked from the store’s Google listing.', keys: [
    { key: 'SEO_SOCIAL_INSTAGRAM', label: 'Instagram', placeholder: 'https://instagram.com/crosscoin' },
    { key: 'SEO_SOCIAL_FACEBOOK', label: 'Facebook', placeholder: 'https://facebook.com/crosscoin' },
    { key: 'SEO_SOCIAL_YOUTUBE', label: 'YouTube', placeholder: 'https://youtube.com/@crosscoin' },
    { key: 'SEO_SOCIAL_TWITTER', label: 'X (Twitter)', placeholder: '@crosscoin' },
  ] },
  { title: 'Address', why: 'For local search.', keys: [
    { key: 'SEO_ADDRESS_STREET', label: 'Street', placeholder: 'Plot 12, Industrial Area' },
    { key: 'SEO_ADDRESS_CITY', label: 'City', placeholder: 'Rajkot' },
    { key: 'SEO_ADDRESS_REGION', label: 'State', placeholder: 'Gujarat' },
    { key: 'SEO_ADDRESS_POSTAL', label: 'PIN code', placeholder: '360001' },
    { key: 'SEO_ADDRESS_COUNTRY', label: 'Country code', placeholder: 'IN' },
  ] },
];
const ALL_KEYS = SECTIONS.flatMap((s) => s.keys.map((k) => k.key));
const SOCIAL = [['SEO_SOCIAL_INSTAGRAM', 'Instagram'], ['SEO_SOCIAL_FACEBOOK', 'Facebook'], ['SEO_SOCIAL_YOUTUBE', 'YouTube'], ['SEO_SOCIAL_TWITTER', 'X']];

function StoreDetails({ brand, brandId }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const load = useLoad(() => (brandId ? seoAdminService.storeDetails(brandId) : Promise.resolve({ values: {} })), [brandId]);
  const originals = useMemo(() => load.data?.values || {}, [load.data]);
  useEffect(() => { setValues(originals); setMsg(''); }, [originals]);
  const v = (k) => values[k] || '';
  const dirty = ALL_KEYS.filter((k) => v(k) !== (originals[k] || ''));

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const patch = {};
      for (const k of dirty) patch[k] = v(k);
      const res = await seoAdminService.saveStoreDetails(Number(brandId), patch);
      load.setData({ values: res?.values || {} });
      showSuccess('saveSuccess', 'Store details saved');
    } catch (e) { setMsg(errText(e, 'Could not save. Try again.')); } finally { setSaving(false); }
  };

  if (load.error) return <ErrorState message={`Couldn't load the store details — ${load.error}`} onRetry={() => load.reload()} />;
  if (load.loading || !brandId) return <div className="web-skel-lines" aria-busy="true"><span /><span /><span /></div>;

  const name = v('SEO_ORGANIZATION_NAME') || brandLabel(brand);
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const place = [v('SEO_ADDRESS_CITY'), v('SEO_ADDRESS_REGION')].filter(Boolean).join(', ');
  const days = v('SEO_DEFAULT_SHIPPING_PROMISE_DAYS');
  const storeName = brandLabel(brand) || 'this store';

  return (
    <div className="web-body">
      <section className="web-main seo-store-grid">
        {SECTIONS.map((s) => {
          const empty = s.keys.filter((k) => !v(k.key).trim()).length;
          return (
            <div key={s.title} className="seo-card seo-card--pad">
              <span className="seo-sec-head"><b>{s.title}</b><StatusPill tone={empty ? 'needs' : 'done'} size="sm">{empty ? `${empty} missing` : 'Complete'}</StatusPill></span>
              <span className="seo-sec-why">{s.why}</span>
              {s.keys.map((f) => (
                <WebField key={f.key} label={<>{f.label}{v(f.key) !== (originals[f.key] || '') && <span className="web-dirty"> · not saved</span>}</>} htmlFor={`ss-${f.key}`} hint={f.hint}>
                  <input id={`ss-${f.key}`} type={f.type || 'text'} className="web-input" value={v(f.key)} placeholder={f.placeholder} onChange={(e) => setValues((x) => ({ ...x, [f.key]: e.target.value }))} />
                </WebField>
              ))}
            </div>
          );
        })}
      </section>
      <aside className="seo-store-side">
        <div className="seo-gcard" aria-label="Preview of the store on Google">
          <span className="seo-gcard-cap">How Google describes the store</span>
          <span className="seo-gcard-id">
            {v('SEO_ORGANIZATION_LOGO') ? <img src={v('SEO_ORGANIZATION_LOGO')} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <span className="seo-gcard-logo">{initials || '?'}</span>}
            <span><b>{name || 'Business name missing'}</b><span>Online store{place ? ` · ${place}` : ''}</span></span>
          </span>
          {v('SEO_PHONE') ? <span>📞 {v('SEO_PHONE')}</span> : <span className="is-missing">Phone not added</span>}
          {days || v('SEO_RETURN_POLICY_URL')
            ? <span>{days ? `🚚 Delivers in about ${days} day${days === '1' ? '' : 's'}` : ''}{days && v('SEO_RETURN_POLICY_URL') ? ' · ' : ''}{v('SEO_RETURN_POLICY_URL') ? '🔁 Return policy linked' : ''}</span>
            : <span className="is-missing">Delivery and returns not added</span>}
          <span className="seo-gcard-socials">
            {SOCIAL.map(([k, l]) => <span key={k} className={v(k) ? '' : 'is-missing'}>{v(k) ? l : `${l}, add link`}</span>)}
          </span>
        </div>
        <div className="seo-card seo-card--pad seo-save-card">
          <b>Saved for {storeName} only</b>
          <span>Each store keeps its own details. Changes show on the store within a minute.</span>
          {msg && <span className="web-form-err" role="alert">{msg}</span>}
          <button type="button" className="web-btn web-btn--primary" onClick={save} disabled={saving || !dirty.length}>
            {saving ? 'Saving…' : dirty.length ? `Save ${dirty.length} change${dirty.length === 1 ? '' : 's'}` : 'No changes'}
          </button>
        </div>
      </aside>
    </div>
  );
}
