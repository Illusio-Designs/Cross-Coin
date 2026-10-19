// Website → SEO: page titles & descriptions, FAQs and the store-wide SEO
// settings for one store. Product SEO is fixed in Products → Fix SEO in bulk.
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { websiteService, seoService, seoAdminService, faqService, productService, brandSettingsService } from '../../services';
import { showSuccess, showError } from '../../utils/toastNotification';
import ConfirmBar from '../ui/ConfirmBar';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import { Select } from '../ui';
import SerpPreview, { brandSiteName } from '../common/SerpPreview';
import SeoLengthMeter from '../common/SeoLengthMeter';
import { richHtml } from '../../utils/sanitizeHtml';
import { WebChips, WebBody, WebGridState, WebCard, WebPager, WebPanel, WebField, ViewOnSite, Toggle } from './webParts';
import { useLoad, useObjectUrl, errText, siteUrl, goToView } from './webUtil';

const Editor = dynamic(() => import('../common/Editor'), {
  ssr: false,
  loading: () => <div className="web-editor-skel" />,
});

const SUBS = [
  { id: 'pages', label: 'Pages', view: 'seo-pages' },
  { id: 'faqs', label: 'FAQs', view: 'faqs', adminOnly: true },
  { id: 'settings', label: 'Settings', view: 'seo-global', adminOnly: true }, // brand settings API is admin-only
];

export default function SeoTab(props) {
  const { seoView, isAdmin, brandId } = props;
  const subs = SUBS.filter((s) => !s.adminOnly || isAdmin);
  const sub = subs.find((s) => s.id === seoView) || subs[0];
  return (
    <>
      <div className="web-seo-top">
        <div className="web-seg" role="tablist" aria-label="SEO">
          {subs.map((s) => (
            <button key={s.id} type="button" role="tab" aria-selected={s.id === sub.id} className={`web-seg-btn${s.id === sub.id ? ' is-on' : ''}`} onClick={() => { if (s.id !== sub.id) goToView(s.view); }}>{s.label}</button>
          ))}
        </div>
        <CatalogueScore brandId={brandId} />
      </div>
      {sub.id === 'pages' && <Pages {...props} />}
      {sub.id === 'faqs' && <Faqs {...props} />}
      {sub.id === 'settings' && <Settings {...props} />}
    </>
  );
}

// Product + category SEO score (same formula as the old SEO overview), with
// the way to fix it: Products → Fix SEO in bulk.
function CatalogueScore({ brandId }) {
  const h = useLoad(() => (brandId ? seoAdminService.health({ brand_id: brandId }) : Promise.resolve(null)), [brandId]);
  let text = 'Product SEO';
  if (h.data?.products && h.data?.categories) {
    const p = h.data.products; const c = h.data.categories;
    const fields = (p.total * 3) + (c.total * 3);
    const missing = (p.missingMetaTitle || 0) + (p.missingMetaDescription || 0) + (p.missingOgImage || 0)
      + (c.missingMetaTitle || 0) + (c.missingMetaDescription || 0) + (c.missingOgImage || 0);
    const score = fields ? Math.round(100 * (1 - missing / fields)) : 100;
    text = `Products & categories: ${score}/100${missing ? ` · ${missing.toLocaleString('en-IN')} fields empty` : ''}`;
  }
  return (
    <div className="web-score">
      <span>{h.loading ? 'Checking product SEO…' : text}</span>
      <button type="button" className="web-btn web-btn--sm" onClick={() => goToView('products', 'seo=1')}>Fix product SEO in bulk →</button>
    </div>
  );
}

// ─── Pages ───────────────────────────────────────────────────────────────────
const LIMIT = 24;
const ROBOTS = [
  ['', 'Show in Google (default)'],
  ['index, follow, max-image-preview:large', 'Show in Google, large picture previews'],
  ['noindex, follow', 'Hide from Google'],
  ['noindex, nofollow', 'Hide from Google and ignore its links'],
];
const PAGE_STATE = {
  live: { label: 'Live', tone: 'done' },
  fix: { label: 'Needs SEO', tone: 'needs' },
  hidden: { label: 'Hidden from Google', tone: 'neutral' },
};
const isValidJson = (s) => { if (!s || !String(s).trim()) return true; try { JSON.parse(s); return true; } catch { return false; } };
const pagePath = (r) => {
  const name = String(r.page_name || '').toLowerCase();
  if (name === 'home' || name === 'index' || name === 'homepage') return '/';
  const slug = r.slug || `/${name}`;
  return slug.startsWith('/') ? slug : `/${slug}`;
};

function Pages({ brand, brandId, q, registerAction }) {
  const [state, setState] = useState('all');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [formErr, setFormErr] = useState('');
  const brandSlug = brand?.slug || 'crosscoin';

  useEffect(() => { setPage(1); setForm(null); }, [brandId]);
  useEffect(() => { setPage(1); }, [q, state]);
  const list = useLoad(() => (brandId ? websiteService.listSeoPages({ brandId, search: q || undefined, state, page, limit: LIMIT }) : Promise.resolve(null)), [brandId, q, state, page]);
  const items = list.data?.items || [];
  const counts = list.data?.counts || {};
  const loading = list.loading || !brandId;

  const blank = { original: '', page_name: '', meta_title: '', meta_description: '', meta_keywords: '', canonical_url: '', robots: '', structured_data: '', image: null, imageUrl: null };
  const openNew = () => { setConfirmDel(false); setFormErr(''); setForm({ ...blank }); };
  const newRef = useRef(openNew);
  newRef.current = openNew;
  useEffect(() => { registerAction({ label: '+ New page', onClick: () => newRef.current() }); return () => registerAction(null); }, [registerAction]);

  const openEdit = async (r) => {
    setConfirmDel(false); setFormErr('');
    setForm({ ...blank, original: r.page_name, page_name: r.page_name, meta_title: r.meta_title, meta_description: r.meta_description, imageUrl: r.image, loading: true, row: r });
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
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const imagePreview = useObjectUrl(form?.image || null);

  const save = async () => {
    const name = form.page_name.trim().toLowerCase();
    if (!name) return setFormErr('Give the page a name, like “home” or “about”.');
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
    } catch (e) { setFormErr(errText(e, 'Could not save.')); } finally { setSaving(false); }
  };
  const remove = async () => {
    setSaving(true);
    try {
      await seoService.deleteSEOData(form.original, brandSlug);
      showSuccess('deleteSuccess', 'Page SEO deleted');
      setForm(null); setConfirmDel(false);
      list.reload(true);
    } catch (e) { showError('deleteFailed', errText(e)); } finally { setSaving(false); }
  };

  const chips = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'live', label: 'Good', count: counts.live },
    { id: 'fix', label: 'Needs SEO', count: counts.fix },
    { id: 'hidden', label: 'Hidden from Google', count: counts.hidden },
  ];
  const tl = list.data?.limits?.title || 60;
  const dl = list.data?.limits?.description || 160;

  const panel = (
    <WebPanel
      open={!!form}
      title={form?.original ? form.original : 'New page'}
      pill={form?.row ? PAGE_STATE[form.row.state] : null}
      onClose={() => setForm(null)}
      hint="Pick a page to edit how it shows in Google."
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
          <WebField label="Page" htmlFor="sp-name" hint="The page’s name on the site, like home, shop, about, contact.">
            <input id="sp-name" className="web-input" value={form.page_name} onChange={(e) => set('page_name', e.target.value)} placeholder="about" />
          </WebField>
          <WebField label={`Title in Google (${form.meta_title.length}/${tl})`} htmlFor="sp-title">
            <input id="sp-title" className="web-input" value={form.meta_title} onChange={(e) => set('meta_title', e.target.value)} />
            <SeoLengthMeter value={form.meta_title || ''} type="title" />
          </WebField>
          <WebField label={`Description in Google (${form.meta_description.length}/${dl})`} htmlFor="sp-desc">
            <textarea id="sp-desc" className="web-input web-textarea" rows={3} value={form.meta_description} onChange={(e) => set('meta_description', e.target.value)} />
            <SeoLengthMeter value={form.meta_description || ''} type="description" />
          </WebField>
          <div className="web-serp">
            <SerpPreview title={form.meta_title} description={form.meta_description} siteName={brandSiteName(brand)}
              url={siteUrl(brand, pagePath({ page_name: form.page_name, slug: form.row?.slug })) || 'https://example.com/'} variant="desktop" />
          </div>
          <WebField label="Keywords" htmlFor="sp-kw">
            <input id="sp-kw" className="web-input" value={form.meta_keywords} onChange={(e) => set('meta_keywords', e.target.value)} placeholder="sports socks, ankle socks" />
          </WebField>
          <WebField label="Google" htmlFor="sp-robots">
            <select id="sp-robots" className="web-input" value={form.robots} onChange={(e) => set('robots', e.target.value)}>
              {ROBOTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </WebField>
          <WebField label="Social share picture" htmlFor="sp-img" hint="1200 × 630 px · JPG, PNG or WEBP">
            {(imagePreview || form.imageUrl) && <div className="web-preview web-preview--og"><img src={imagePreview || form.imageUrl} alt="" /></div>}
            <input id="sp-img" type="file" accept="image/jpeg,image/png,image/webp" className="web-file" onChange={(e) => set('image', e.target.files?.[0] || null)} />
          </WebField>
          <details className="web-details">
            <summary>Advanced</summary>
            <WebField label="Main address (canonical)" htmlFor="sp-can" hint="Leave empty to use the page’s own address.">
              <input id="sp-can" className="web-input" value={form.canonical_url} onChange={(e) => set('canonical_url', e.target.value)} />
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
    <>
      <WebChips chips={chips} value={state} onChange={setState} />
      <WebBody panel={panel}>
        <WebGridState
          loading={loading} error={list.error} onRetry={() => list.reload()} count={items.length}
          empty={<EmptyState title={q || state !== 'all' ? 'No pages match' : 'No page SEO yet'} description={q || state !== 'all' ? 'Try another search or filter.' : 'Add the home, shop and about pages first.'} action={!q && state === 'all' ? <button type="button" className="web-btn web-btn--primary" onClick={openNew}>+ New page</button> : null} />}
        />
        {!loading && !list.error && items.length > 0 && (
          <>
            <div className="web-grid">
              {items.map((r) => (
                <WebCard
                  key={r.id}
                  selected={form?.original === r.page_name}
                  onOpen={() => openEdit(r)}
                  title={r.page_name}
                  pill={PAGE_STATE[r.state]}
                  meta={r.problem || `Title ${r.title_length}/${tl} · description ${r.description_length}/${dl}`}
                  sub={r.meta_title || null}
                />
              ))}
            </div>
            <WebPager page={page} limit={LIMIT} total={list.data?.total || 0} onPage={setPage} />
          </>
        )}
      </WebBody>
    </>
  );
}

// ─── FAQs ────────────────────────────────────────────────────────────────────
const SCOPES = [
  { value: 'global', label: 'Whole site' },
  { value: 'product', label: 'Products' },
  { value: 'category', label: 'A category' },
  { value: 'page', label: 'A page' },
];
const ALL_PRODUCTS = '__all_products__';
const EMPTY_FAQ = { id: null, attached_to_type: 'global', attached_to_id: '', attached_to_slug: '', product_ids: [], question: '', answer: '', display_order: 0, is_active: true };

function Faqs({ brand, brandId, q, registerAction }) {
  const [scope, setScope] = useState('all');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [products, setProducts] = useState([]);
  const brandSlug = brand?.slug || '';

  useEffect(() => { setForm(null); }, [brandId]);
  useEffect(() => {
    let off = false;
    if (!brandSlug) return undefined;
    productService.getAllProducts(1, 500, '', null, false, brandSlug, true)
      .then((r) => { if (!off) setProducts(r?.products || r?.data || []); })
      .catch(() => { if (!off) setProducts([]); });
    return () => { off = true; };
  }, [brandSlug]);

  // Server search; the list is one store's FAQs (small), kept whole so the
  // order within each group can be changed.
  const list = useLoad(() => (brandId ? faqService.list({ brand_id: brandId, ...(q ? { search: q } : {}) }) : Promise.resolve({ faqs: [] })), [brandId, q]);
  const all = list.data?.faqs || [];
  const items = scope === 'all' ? all : all.filter((f) => f.attached_to_type === scope);
  const productName = (id) => { const p = products.find((x) => String(x.id) === String(id)); return p ? p.name : `Product #${id}`; };
  const where = (f) => {
    if (f.attached_to_type === 'global') return 'Whole site';
    if (f.attached_to_type === 'product') return f.attached_to_id ? productName(f.attached_to_id) : 'All products';
    if (f.attached_to_type === 'category') return `Category #${f.attached_to_id}`;
    return `Page: ${f.attached_to_slug}`;
  };
  const peersOf = (f) => all.filter((x) => x.attached_to_type === f.attached_to_type && x.attached_to_id === f.attached_to_id && x.attached_to_slug === f.attached_to_slug)
    .sort((a, b) => a.display_order - b.display_order || a.id - b.id);

  const openNew = () => { setConfirmDel(false); setFormErr(''); setForm({ ...EMPTY_FAQ }); };
  const newRef = useRef(openNew);
  newRef.current = openNew;
  useEffect(() => { registerAction({ label: '+ New FAQ', onClick: () => newRef.current() }); return () => registerAction(null); }, [registerAction]);

  const openEdit = (f) => {
    setConfirmDel(false); setFormErr('');
    setForm({
      id: f.id, attached_to_type: f.attached_to_type, attached_to_id: f.attached_to_id || '', attached_to_slug: f.attached_to_slug || '',
      product_ids: f.attached_to_type === 'product' ? (f.attached_to_id ? [String(f.attached_to_id)] : [ALL_PRODUCTS]) : [],
      question: f.question, answer: f.answer, display_order: f.display_order, is_active: !!f.is_active,
    });
  };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.question.trim() || !String(form.answer || '').replace(/<[^>]*>/g, '').trim()) return setFormErr('Write the question and the answer.');
    const isProduct = form.attached_to_type === 'product';
    if (isProduct && !form.product_ids.length) return setFormErr('Pick at least one product, or “All products”.');
    if (form.attached_to_type === 'category' && !form.attached_to_id) return setFormErr('Enter the category number.');
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
    } catch (e) { setFormErr(errText(e, 'Could not save the FAQ.')); } finally { setSaving(false); }
  };
  const remove = async () => {
    setSaving(true);
    try {
      await faqService.remove(form.id);
      showSuccess('deleteSuccess', 'FAQ deleted');
      setForm(null); setConfirmDel(false);
      list.reload(true);
    } catch (e) { showError('deleteFailed', errText(e)); } finally { setSaving(false); }
  };
  const move = async (f, dir) => {
    const peers = peersOf(f);
    const i = peers.findIndex((p) => p.id === f.id);
    const other = peers[i + dir];
    if (!other) return;
    // Equal orders (e.g. both 0) would not swap anything — renumber the group.
    const next = peers.slice();
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    try {
      await faqService.reorder(next.map((p, k) => ({ id: p.id, display_order: k + 1 })));
      list.reload(true);
    } catch (e) { showError('saveFailed', errText(e, 'Could not change the order.')); }
  };

  const counts = useMemo(() => {
    const c = { all: all.length };
    for (const s of SCOPES) c[s.value] = all.filter((f) => f.attached_to_type === s.value).length;
    return c;
  }, [all]);
  const chips = [{ id: 'all', label: 'All', count: counts.all }, ...SCOPES.map((s) => ({ id: s.value, label: s.label, count: counts[s.value] }))];
  const productOptions = [{ value: ALL_PRODUCTS, label: 'All products' }, ...products.map((p) => ({ value: String(p.id), label: p.name }))];

  const panel = (
    <WebPanel
      wide
      open={!!form}
      title={form?.id ? 'Edit FAQ' : 'New FAQ'}
      pill={form?.id ? (form.is_active ? { label: 'Live', tone: 'done' } : { label: 'Hidden', tone: 'neutral' }) : null}
      onClose={() => setForm(null)}
      hint="Pick a question to edit it. Whole-site FAQs show on the home page and every product page, and help the store show up in Google’s FAQ boxes."
      actions={form && (confirmDel ? (
        <ConfirmBar message={<>Delete this FAQ? It disappears from the site.</>} confirmLabel="Delete" cancelLabel="Keep" busy={saving} onConfirm={remove} onCancel={() => setConfirmDel(false)} />
      ) : (
        <>
          <button type="button" className="web-btn web-btn--primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          {form.id && <button type="button" className="web-btn web-btn--danger" onClick={() => setConfirmDel(true)} disabled={saving}>Delete</button>}
        </>
      ))}
    >
      {form && (
        <>
          <WebField label="Shows on" htmlFor="fq-scope">
            <select id="fq-scope" className="web-input" value={form.attached_to_type} onChange={(e) => setForm({ ...form, attached_to_type: e.target.value, attached_to_id: '', attached_to_slug: '', product_ids: [] })}>
              {SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label === 'Products' ? 'Product pages' : s.label}</option>)}
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
            <WebField label="Category number" htmlFor="fq-cat">
              <input id="fq-cat" type="number" className="web-input" value={form.attached_to_id} onChange={(e) => set('attached_to_id', e.target.value)} placeholder="42" />
            </WebField>
          )}
          {form.attached_to_type === 'page' && (
            <WebField label="Page" htmlFor="fq-page">
              <input id="fq-page" className="web-input" value={form.attached_to_slug} onChange={(e) => set('attached_to_slug', e.target.value)} placeholder="about" />
            </WebField>
          )}
          <WebField label="Question" htmlFor="fq-q">
            <input id="fq-q" className="web-input" maxLength={500} value={form.question} onChange={(e) => set('question', e.target.value)} placeholder="What is your return policy?" />
          </WebField>
          <WebField label="Answer">
            <Editor allowImages={false} value={form.answer} onChange={(v) => set('answer', v)} placeholder="Type the answer. Lists and links are fine." headingBase={3} />
          </WebField>
          <div className="web-2col">
            <WebField label="Order" htmlFor="fq-order" hint="Lower shows first">
              <input id="fq-order" type="number" className="web-input" value={form.display_order} onChange={(e) => set('display_order', e.target.value)} />
            </WebField>
            <Toggle label="Show on the site" checked={form.is_active} onChange={(v) => set('is_active', v)} />
          </div>
          {formErr && <p className="web-form-err" role="alert">{formErr}</p>}
        </>
      )}
    </WebPanel>
  );

  const sorted = items.slice().sort((a, b) => a.attached_to_type.localeCompare(b.attached_to_type) || String(a.attached_to_id || a.attached_to_slug || '').localeCompare(String(b.attached_to_id || b.attached_to_slug || '')) || a.display_order - b.display_order || a.id - b.id);

  return (
    <>
      <WebChips chips={chips} value={scope} onChange={setScope} />
      <WebBody panel={panel}>
        <WebGridState
          loading={list.loading} error={list.error} onRetry={() => list.reload()} count={sorted.length}
          empty={<EmptyState title={q || scope !== 'all' ? 'No FAQs match' : 'No FAQs yet'} description={q || scope !== 'all' ? 'Try another search or filter.' : 'Add 3–5 whole-site FAQs (returns, delivery time, sizes) — Google can show them right in search results.'} action={!q && scope === 'all' ? <button type="button" className="web-btn web-btn--primary" onClick={openNew}>+ New FAQ</button> : null} />}
        />
        {!list.loading && !list.error && sorted.length > 0 && (
          <div className="web-grid web-grid--text">
            {sorted.map((f) => {
              const peers = peersOf(f);
              const i = peers.findIndex((p) => p.id === f.id);
              return (
                <WebCard
                  key={f.id}
                  selected={form?.id === f.id}
                  onOpen={() => openEdit(f)}
                  title={f.question}
                  pill={f.is_active ? { label: 'Live', tone: 'done' } : { label: 'Hidden', tone: 'neutral' }}
                  meta={`${where(f)} · #${i + 1} of ${peers.length}`}
                  sub={<span className="web-clamp" {...richHtml(f.answer)} />}
                  foot={peers.length > 1 ? (
                    <span className="web-move">
                      <button type="button" className="web-icon-btn" aria-label="Show earlier" disabled={i === 0} onClick={() => move(f, -1)}><HugeiconsIcon icon={ArrowUp01Icon} size={16} strokeWidth={2} /></button>
                      <button type="button" className="web-icon-btn" aria-label="Show later" disabled={i === peers.length - 1} onClick={() => move(f, 1)}><HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={2} /></button>
                    </span>
                  ) : null}
                />
              );
            })}
          </div>
        )}
      </WebBody>
    </>
  );
}

// ─── Settings (store-wide SEO defaults, saved as brand settings) ─────────────
const FIELDS = [
  { section: 'Store identity', keys: [
    { key: 'SEO_ORGANIZATION_NAME', label: 'Business name', placeholder: 'CrossCoin', hint: 'Shown to Google as the business behind the store.' },
    { key: 'SEO_ORGANIZATION_LOGO', label: 'Logo link', placeholder: 'https://crosscoin.in/logo.png', hint: 'A public picture link.' },
    { key: 'SEO_PHONE', label: 'Public phone', placeholder: '+91-9876543210' },
  ] },
  { section: 'Defaults', keys: [
    { key: 'SEO_DEFAULT_TITLE_TEMPLATE', label: 'Product title pattern', placeholder: '{name} | CrossCoin', hint: 'For products without their own title. {name} = product, {brand} = store.' },
    { key: 'SEO_DEFAULT_DESCRIPTION', label: 'Fallback description', placeholder: 'Shop premium socks with free shipping and easy returns.', hint: 'For pages without their own description (up to 160 characters).' },
    { key: 'SEO_DEFAULT_OG_IMAGE', label: 'Default share picture (1200 × 630)', placeholder: 'https://crosscoin.in/og-default.jpg' },
  ] },
  { section: 'Trust (helps AI shopping and Google)', keys: [
    { key: 'SEO_RETURN_POLICY_URL', label: 'Return policy link', placeholder: 'https://crosscoin.in/policy/cancellation-and-refund', hint: 'Every product tells Google where the return policy is.' },
    { key: 'SEO_DEFAULT_SHIPPING_PROMISE_DAYS', label: 'Delivery promise (days)', placeholder: '3', type: 'number' },
  ] },
  { section: 'Social profiles', keys: [
    { key: 'SEO_SOCIAL_FACEBOOK', label: 'Facebook', placeholder: 'https://facebook.com/crosscoin' },
    { key: 'SEO_SOCIAL_INSTAGRAM', label: 'Instagram', placeholder: 'https://instagram.com/crosscoin' },
    { key: 'SEO_SOCIAL_TWITTER', label: 'X (Twitter)', placeholder: '@crosscoin' },
    { key: 'SEO_SOCIAL_YOUTUBE', label: 'YouTube', placeholder: 'https://youtube.com/@crosscoin' },
  ] },
  { section: 'Address', keys: [
    { key: 'SEO_ADDRESS_STREET', label: 'Street', placeholder: 'Plot 12, Industrial Area' },
    { key: 'SEO_ADDRESS_CITY', label: 'City', placeholder: 'Rajkot' },
    { key: 'SEO_ADDRESS_REGION', label: 'State', placeholder: 'Gujarat' },
    { key: 'SEO_ADDRESS_POSTAL', label: 'PIN code', placeholder: '360001' },
    { key: 'SEO_ADDRESS_COUNTRY', label: 'Country code', placeholder: 'IN' },
  ] },
];
const ALL_KEYS = FIELDS.flatMap((s) => s.keys.map((k) => k.key));

function Settings({ brand, brandId, registerAction }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const load = useLoad(() => (brandId ? brandSettingsService.getSettingsByCategory(brandId, 'seo') : Promise.resolve([])), [brandId]);
  const originals = useMemo(() => {
    const map = {};
    for (const item of (load.data?.data || load.data || [])) if (item && item.key) map[item.key] = item.value || '';
    return map;
  }, [load.data]);
  useEffect(() => { setValues(originals); setMsg(''); }, [originals]);
  useEffect(() => { registerAction(null); }, [registerAction]);
  const dirty = ALL_KEYS.filter((k) => (values[k] || '') !== (originals[k] || ''));

  const save = async () => {
    setSaving(true); setMsg('');
    let failed = 0;
    for (const key of dirty) {
      const value = values[key] || '';
      try {
        try { await brandSettingsService.updateSetting(brandId, key, { value }); } catch {
          await brandSettingsService.createSetting({ brand_id: Number(brandId), key, value, category: 'seo', is_encrypted: false });
        }
      } catch { failed += 1; }
    }
    setSaving(false);
    if (failed) setMsg(`${failed} setting${failed === 1 ? '' : 's'} could not be saved. Try again.`);
    else showSuccess('saveSuccess', 'SEO settings saved');
    load.reload(true);
  };

  if (load.error) return <ErrorState message={`Couldn't load the SEO settings — ${load.error}`} onRetry={() => load.reload()} />;
  if (load.loading || !brandId) return <div className="web-skel-lines" aria-busy="true"><span /><span /><span /></div>;
  return (
    <div className="web-settings">
      <p className="web-note">Defaults for {brand ? (brand.display_name || brand.name) : 'this store'}. Set once — every product, category and page uses them.</p>
      <div className="web-settings-grid">
        {FIELDS.map((s) => (
          <section key={s.section} className="web-settings-card">
            <h3 className="web-h3">{s.section}</h3>
            {s.keys.map((f) => (
              <WebField key={f.key} label={<>{f.label}{(values[f.key] || '') !== (originals[f.key] || '') && <span className="web-dirty"> · not saved</span>}</>} htmlFor={`ss-${f.key}`} hint={f.hint}>
                <input id={`ss-${f.key}`} type={f.type || 'text'} className="web-input" value={values[f.key] || ''} placeholder={f.placeholder} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
              </WebField>
            ))}
          </section>
        ))}
      </div>
      <div className="web-settings-foot">
        {msg && <span className="web-form-err" role="alert">{msg}</span>}
        <button type="button" className="web-btn web-btn--primary" onClick={save} disabled={saving || !dirty.length}>{saving ? 'Saving…' : dirty.length ? `Save ${dirty.length} change${dirty.length === 1 ? '' : 's'}` : 'No changes'}</button>
      </div>
    </div>
  );
}
