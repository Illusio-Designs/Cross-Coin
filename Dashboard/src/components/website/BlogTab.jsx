// Website → Blog: posts (and their categories) per store.
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp01Icon, ArrowDown01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { blogService, productService } from '../../services';
import { showSuccess, showError } from '../../utils/toastNotification';
import ConfirmBar from '../ui/ConfirmBar';
import EmptyState from '../ui/EmptyState';
import { Select } from '../ui';
import SerpPreview, { brandSiteName } from '../common/SerpPreview';
import SeoLengthMeter from '../common/SeoLengthMeter';
import { WebChips, WebBody, WebGridState, webStale, WebPanelSkeleton, WebCard, WebPager, WebPanel, WebField, ViewOnSite, StoreChecks } from './webParts';
import { useLoad, useObjectUrl, errText, fmtDay, siteUrl, siteBase, brandLabel } from './webUtil';

const Editor = dynamic(() => import('../common/Editor'), {
  ssr: false,
  loading: () => <div className="web-editor-skel" />,
});

const LIMIT = 24;
const SEO_FIELDS = [
  ['meta_keywords', 'Keywords'], ['og_title', 'Social share title'], ['og_description', 'Social share text'],
  ['og_image', 'Social share picture (link)'], ['canonical_url', 'Main address (canonical)'],
];
const EMPTY_SEO = { meta_title: '', meta_description: '', meta_keywords: '', og_title: '', og_description: '', og_image: '', canonical_url: '' };

function postPill(p) {
  if (p.status === 'published') return p.seo_missing ? { label: 'Needs SEO', tone: 'needs' } : { label: 'Live', tone: 'done' };
  if (p.status === 'archived') return { label: 'Archived', tone: 'neutral' };
  return { label: 'Draft', tone: 'neutral' };
}

export default function BlogTab(props) {
  const [kind, setKind] = useState('posts');
  return (
    <>
      <div className="web-seg" role="tablist" aria-label="Blog">
        {[['posts', 'Posts'], ['categories', 'Categories']].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={kind === id} className={`web-seg-btn${kind === id ? ' is-on' : ''}`} onClick={() => setKind(id)}>{label}</button>
        ))}
      </div>
      {kind === 'posts' ? <Posts {...props} /> : <Categories {...props} />}
    </>
  );
}

// ─── Posts ───────────────────────────────────────────────────────────────────
function Posts({ brands, brand, brandId, q, registerAction }) {
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState(null);

  useEffect(() => { setPage(1); }, [brandId, q, filter]);
  useEffect(() => {
    blogService.getAllCategories().then((r) => setCategories(r?.data || [])).catch(() => {});
  }, []);

  const params = { summary: 1, page, limit: LIMIT };
  if (brandId) params.brand_id = brandId;
  if (q) params.search = q;
  if (['published', 'draft', 'archived'].includes(filter)) params.status = filter;
  if (filter === 'seo') params.seo = 'missing';
  const list = useLoad(() => blogService.getAllPosts(params), [brandId, q, filter, page]);
  const items = list.data?.data || [];
  const counts = list.data?.counts || {};
  const total = list.data?.pagination?.total || 0;

  const ensureProducts = () => {
    if (products) return;
    setProducts([]);
    productService.getAllProducts(1, 500, '', null, false, '', true)
      .then((r) => setProducts(r?.products || r?.data || []))
      .catch(() => setProducts([]));
  };

  const openNew = () => {
    setConfirmDel(false); setFormErr(''); setTagInput('');
    setForm({
      id: null, title: '', author_name: '', status: 'draft', blog_category_id: '', slug: '',
      brand_ids: brand ? [Number(brand.id)] : [], tags: [], sections: [{ heading: '', content: '' }],
      seo: { ...EMPTY_SEO }, featured_products: [], hero: null, thumb: null, heroUrl: null, thumbUrl: null,
    });
    ensureProducts();
  };
  const newRef = useRef(openNew);
  newRef.current = openNew;
  useEffect(() => { registerAction({ label: '+ New post', onClick: () => newRef.current() }); return () => registerAction(null); }, [registerAction]);

  const openEdit = async (row) => {
    setConfirmDel(false); setFormErr(''); setTagInput('');
    setLoadingPost(true);
    setForm({ id: row.id, title: row.title, loading: true });
    ensureProducts();
    try {
      const res = await blogService.getPostById(row.id);
      const p = res?.data || res;
      let sections = p.sections;
      if (typeof sections === 'string') { try { sections = JSON.parse(sections); } catch { sections = []; } }
      setForm({
        id: p.id, title: p.title || '', author_name: p.author_name || '', status: p.status || 'draft', slug: p.slug || '',
        blog_category_id: p.blog_category_id ? String(p.blog_category_id) : '',
        brand_ids: (p.Brands || []).map((b) => Number(b.id)),
        tags: (p.Tags || []).map((t) => t.name),
        sections: Array.isArray(sections) && sections.length ? sections : [{ heading: '', content: '' }],
        seo: Object.fromEntries(Object.keys(EMPTY_SEO).map((k) => [k, p.BlogSEO?.[k] || ''])),
        featured_products: (p.FeaturedProducts || []).map((fp) => ({ product_id: String(fp.id), lifestyle_tag: fp.BlogFeaturedProduct?.lifestyle_tag || '' })),
        hero: null, thumb: null, heroUrl: p.hero_image || null, thumbUrl: p.thumbnail_image || null,
        published_at: p.published_at,
      });
    } catch (e) {
      setForm(null);
      showError('loadingFailed', errText(e, 'Could not open the post.'));
    } finally { setLoadingPost(false); }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setSeo = (k, v) => setForm((f) => ({ ...f, seo: { ...f.seo, [k]: v } }));
  const setSection = (i, k, v) => setForm((f) => ({ ...f, sections: f.sections.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));
  const moveSection = (i, d) => setForm((f) => {
    const j = i + d;
    if (j < 0 || j >= f.sections.length) return f;
    const next = f.sections.slice();
    [next[i], next[j]] = [next[j], next[i]];
    return { ...f, sections: next };
  });
  const setFp = (i, k, v) => setForm((f) => ({ ...f, featured_products: f.featured_products.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  };

  const save = async () => {
    if (!form.title.trim()) return setFormErr('Give the post a title.');
    if (!form.brand_ids.length) return setFormErr('Pick at least one store.');
    setFormErr('');
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      author_name: form.author_name || null,
      status: form.status,
      blog_category_id: form.blog_category_id || null,
      brand_ids: form.brand_ids,
      tags: form.tags,
      sections: form.sections,
      seo: form.seo,
      featured_products: form.featured_products.filter((fp) => fp.product_id).map((fp) => ({ product_id: Number(fp.product_id), lifestyle_tag: fp.lifestyle_tag })),
    };
    try {
      let id = form.id;
      if (id) await blogService.updatePost(id, payload);
      else {
        const res = await blogService.createPost(payload);
        id = res?.data?.id;
      }
      if (id && form.hero) await blogService.uploadHeroImage(id, form.hero);
      if (id && form.thumb) await blogService.uploadThumbnailImage(id, form.thumb);
      showSuccess(form.id ? 'updateSuccess' : 'createSuccess', form.id ? 'Post saved' : 'Post added');
      setForm(null);
      list.reload(true);
    } catch (e) {
      setFormErr(errText(e, 'Could not save the post.'));
    } finally { setSaving(false); }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await blogService.deletePost(form.id);
      showSuccess('deleteSuccess', 'Post deleted');
      setForm(null); setConfirmDel(false);
      list.reload(true);
    } catch (e) { showError('deleteFailed', errText(e)); } finally { setSaving(false); }
  };

  const heroPreview = useObjectUrl(form?.hero || null);
  const thumbPreview = useObjectUrl(form?.thumb || null);

  const chips = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'published', label: 'Published', count: counts.published },
    { id: 'draft', label: 'Draft', count: counts.draft },
    { id: 'archived', label: 'Archived', count: counts.archived },
    { id: 'seo', label: 'No meta description', count: counts.seo_missing },
  ];

  const formBrand = form && (brands.find((b) => form.brand_ids?.includes(Number(b.id)) && siteBase(b)) || brands.find((b) => form.brand_ids?.includes(Number(b.id))));
  const productOpts = (products || []).map((p) => ({ value: String(p.id), label: p.name }));
  const row = form?.id ? items.find((x) => x.id === form.id) : null;

  const panel = (
    <WebPanel
      wide
      open={!!form}
      title={form?.id ? (form.title || 'Post') : 'New post'}
      pill={row ? postPill(row) : null}
      onClose={() => setForm(null)}
      hint="Pick a post to edit it, or write a new one."
      actions={form && !form.loading && (confirmDel ? (
        <ConfirmBar message={<>Delete post <b>{form.title}</b>? This can’t be undone.</>} confirmLabel="Delete" cancelLabel="Keep" busy={saving} onConfirm={remove} onCancel={() => setConfirmDel(false)} />
      ) : (
        <>
          <button type="button" className="web-btn web-btn--primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          {form.id && <ViewOnSite url={form.status === 'published' && form.slug ? siteUrl(formBrand, `/journal/${form.slug}`) : null} reason={form.status !== 'published' ? 'Publish the post to see it on the site.' : undefined} />}
          {form.id && <button type="button" className="web-btn web-btn--danger" onClick={() => setConfirmDel(true)} disabled={saving}>Delete</button>}
        </>
      ))}
    >
      {form && (form.loading || loadingPost) && <WebPanelSkeleton fields={6} label="Loading post…" />}
      {form && !form.loading && !loadingPost && (
        <>
          <WebField label="Title" htmlFor="bp-title">
            <input id="bp-title" className="web-input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="How to pick sports socks" />
          </WebField>
          <div className="web-2col">
            <WebField label="Written by" htmlFor="bp-author">
              <input id="bp-author" className="web-input" value={form.author_name} onChange={(e) => set('author_name', e.target.value)} placeholder="Kiran" />
            </WebField>
            <WebField label="Status" htmlFor="bp-status">
              <select id="bp-status" className="web-input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="draft">Draft — not on the site</option>
                <option value="published">Published</option>
                <option value="archived">Archived — hidden</option>
              </select>
            </WebField>
          </div>
          <WebField label="Category" htmlFor="bp-cat">
            <select id="bp-cat" className="web-input" value={form.blog_category_id} onChange={(e) => set('blog_category_id', e.target.value)}>
              <option value="">None</option>
              {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          </WebField>
          <WebField label="Stores">
            <StoreChecks brands={brands} value={form.brand_ids} onChange={(v) => set('brand_ids', v)} disabled={saving} />
          </WebField>
          <WebField label="Tags" htmlFor="bp-tag">
            <div className="web-inline">
              <input id="bp-tag" className="web-input" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="Type a tag and press Enter" />
              <button type="button" className="web-btn" onClick={addTag}>Add</button>
            </div>
            {form.tags.length > 0 && (
              <div className="web-tags">
                {form.tags.map((t) => <span key={t} className="web-tag">{t}<button type="button" aria-label={`Remove tag ${t}`} onClick={() => set('tags', form.tags.filter((x) => x !== t))}>×</button></span>)}
              </div>
            )}
          </WebField>

          <h3 className="web-h3">Pictures</h3>
          <div className="web-2col">
            <WebField label="Card picture" htmlFor="bp-thumb" hint="800 × 450 px (16:9). If empty, cards use the main picture.">
              {(thumbPreview || form.thumbUrl) && <div className="web-preview web-preview--169"><img src={thumbPreview || form.thumbUrl} alt="" /></div>}
              <input id="bp-thumb" type="file" accept="image/jpeg,image/png,image/webp" className="web-file" onChange={(e) => set('thumb', e.target.files?.[0] || null)} />
            </WebField>
            <WebField label="Main picture" htmlFor="bp-hero" hint="Top of the article · 1920 × 1020 px">
              {(heroPreview || form.heroUrl) && <div className="web-preview web-preview--169"><img src={heroPreview || form.heroUrl} alt="" /></div>}
              <input id="bp-hero" type="file" accept="image/jpeg,image/png,image/webp" className="web-file" onChange={(e) => set('hero', e.target.files?.[0] || null)} />
            </WebField>
          </div>

          <h3 className="web-h3">Sections</h3>
          {form.sections.map((sec, i) => (
            <div key={i} className="web-subcard">
              <div className="web-subcard-head">
                <span>Section {i + 1}</span>
                <span className="web-move">
                  <button type="button" className="web-icon-btn" aria-label="Move section up" disabled={i === 0} onClick={() => moveSection(i, -1)}><HugeiconsIcon icon={ArrowUp01Icon} size={15} strokeWidth={2} /></button>
                  <button type="button" className="web-icon-btn" aria-label="Move section down" disabled={i === form.sections.length - 1} onClick={() => moveSection(i, 1)}><HugeiconsIcon icon={ArrowDown01Icon} size={15} strokeWidth={2} /></button>
                  <button type="button" className="web-icon-btn" aria-label="Remove section" disabled={form.sections.length === 1} onClick={() => set('sections', form.sections.filter((_, j) => j !== i))}><HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={2} /></button>
                </span>
              </div>
              <input className="web-input" aria-label={`Section ${i + 1} heading`} value={sec.heading || ''} onChange={(e) => setSection(i, 'heading', e.target.value)} placeholder="Section heading" />
              <Editor value={sec.content || ''} onChange={(v) => setSection(i, 'content', v)} placeholder="Write this section…" headingBase={2} />
            </div>
          ))}
          <button type="button" className="web-btn web-btn--sm" onClick={() => set('sections', [...form.sections, { heading: '', content: '' }])}>+ Add section</button>

          <h3 className="web-h3">Products shown in the post</h3>
          {form.featured_products.map((fp, i) => (
            <div key={i} className="web-fp">
              <div className="web-fp-product">
                <Select options={productOpts} value={fp.product_id} onChange={(v) => setFp(i, 'product_id', v)} searchable placeholder={products && products.length ? 'Pick a product' : 'Loading products…'} />
              </div>
              <input className="web-input" aria-label="Short label" value={fp.lifestyle_tag} onChange={(e) => setFp(i, 'lifestyle_tag', e.target.value)} placeholder="Label, e.g. For runners" />
              <button type="button" className="web-icon-btn" aria-label="Remove product" onClick={() => set('featured_products', form.featured_products.filter((_, j) => j !== i))}><HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={2} /></button>
            </div>
          ))}
          <button type="button" className="web-btn web-btn--sm" onClick={() => set('featured_products', [...form.featured_products, { product_id: '', lifestyle_tag: '' }])}>+ Add product</button>

          <h3 className="web-h3">Google search</h3>
          <WebField label="Title in Google" htmlFor="bp-mt">
            <input id="bp-mt" className="web-input" value={form.seo.meta_title} onChange={(e) => setSeo('meta_title', e.target.value)} placeholder={form.title || 'Defaults to the post title'} />
            <SeoLengthMeter value={form.seo.meta_title || ''} type="title" />
          </WebField>
          <WebField label="Description in Google" htmlFor="bp-md" error={form.status === 'published' && !form.seo.meta_description.trim() ? 'Missing — Google will pick random text from the post.' : null}>
            <textarea id="bp-md" className="web-input web-textarea" rows={3} value={form.seo.meta_description} onChange={(e) => setSeo('meta_description', e.target.value)} placeholder="One or two sentences on what the reader learns." />
            <SeoLengthMeter value={form.seo.meta_description || ''} type="description" />
          </WebField>
          <details className="web-details">
            <summary>More search and sharing settings</summary>
            {SEO_FIELDS.map(([k, label]) => (
              <WebField key={k} label={label} htmlFor={`bp-${k}`}>
                <input id={`bp-${k}`} className="web-input" value={form.seo[k]} onChange={(e) => setSeo(k, e.target.value)} />
              </WebField>
            ))}
          </details>
          <div className="web-serp">
            <SerpPreview
              title={form.seo.meta_title || form.title}
              description={form.seo.meta_description}
              siteName={brandSiteName(formBrand)}
              url={siteUrl(formBrand, `/journal/${form.slug || ''}`) || `https://example.com/journal/${form.slug || ''}`}
              variant="desktop"
            />
          </div>
          {formErr && <p className="web-form-err" role="alert">{formErr}</p>}
        </>
      )}
    </WebPanel>
  );

  return (
    <>
      <WebChips chips={chips} value={filter} onChange={setFilter} />
      <WebBody panel={panel}>
        <WebGridState
          loading={list.loading} error={list.error} onRetry={() => list.reload()} count={items.length} label="Loading posts…"
          empty={<EmptyState title={q || filter !== 'all' ? 'No posts match' : 'No posts yet'} description={q || filter !== 'all' ? 'Try another search or filter.' : 'Write a post to answer what shoppers search for.'} action={!q && filter === 'all' ? <button type="button" className="web-btn web-btn--primary" onClick={openNew}>+ New post</button> : null} />}
        />
        {!list.error && items.length > 0 && (
          <>
            <div className={`web-grid${webStale(list.loading)}`} aria-busy={list.loading || undefined}>
              {items.map((p) => (
                <WebCard
                  key={p.id}
                  selected={form?.id === p.id}
                  onOpen={() => openEdit(p)}
                  media={p.thumbnail_image || p.hero_image || null}
                  title={p.title}
                  pill={postPill(p)}
                  meta={p.seo_missing ? 'No meta description' : [p.author_name, p.status === 'published' ? `Published ${fmtDay(p.published_at, true)}` : null].filter(Boolean).join(' · ') || ' '}
                  sub={[p.BlogCategory?.name, !brand ? (p.Brands || []).map((b) => brandLabel(brands.find((x) => Number(x.id) === Number(b.id)) || b)).join(', ') : null].filter(Boolean).join(' · ') || null}
                />
              ))}
            </div>
            <WebPager page={page} limit={LIMIT} total={total} onPage={setPage} />
          </>
        )}
      </WebBody>
    </>
  );
}

// ─── Categories ──────────────────────────────────────────────────────────────
function Categories({ q, registerAction }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [formErr, setFormErr] = useState('');
  const list = useLoad(() => blogService.getAllCategories(), []);
  const all = list.data?.data || [];
  const needle = (q || '').toLowerCase();
  const items = needle ? all.filter((c) => `${c.name} ${c.description || ''}`.toLowerCase().includes(needle)) : all;

  const openNew = () => { setConfirmDel(false); setFormErr(''); setForm({ id: null, name: '', description: '', status: 'active' }); };
  const newRef = useRef(openNew);
  newRef.current = openNew;
  useEffect(() => { registerAction({ label: '+ New category', onClick: () => newRef.current() }); return () => registerAction(null); }, [registerAction]);

  const save = async () => {
    if (!form.name.trim()) return setFormErr('Give the category a name.');
    setSaving(true); setFormErr('');
    try {
      const body = { name: form.name.trim(), description: form.description, status: form.status };
      if (form.id) await blogService.updateCategory(form.id, body);
      else await blogService.createCategory(body);
      showSuccess('saveSuccess', 'Category saved');
      setForm(null);
      list.reload(true);
    } catch (e) { setFormErr(errText(e, 'Could not save the category.')); } finally { setSaving(false); }
  };
  const remove = async () => {
    setSaving(true);
    try {
      await blogService.deleteCategory(form.id);
      showSuccess('deleteSuccess', 'Category deleted');
      setForm(null); setConfirmDel(false);
      list.reload(true);
    } catch (e) { showError('deleteFailed', errText(e)); } finally { setSaving(false); }
  };

  const panel = (
    <WebPanel
      open={!!form}
      title={form?.id ? form.name || 'Category' : 'New category'}
      onClose={() => setForm(null)}
      hint="Categories group posts on the blog page."
      actions={form && (confirmDel ? (
        <ConfirmBar message={<>Delete category <b>{form.name}</b>? Posts in it stay, without a category.</>} confirmLabel="Delete" cancelLabel="Keep" busy={saving} onConfirm={remove} onCancel={() => setConfirmDel(false)} />
      ) : (
        <>
          <button type="button" className="web-btn web-btn--primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          {form.id && <button type="button" className="web-btn web-btn--danger" onClick={() => setConfirmDel(true)} disabled={saving}>Delete</button>}
        </>
      ))}
    >
      {form && (
        <>
          <WebField label="Name" htmlFor="bc-name">
            <input id="bc-name" className="web-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sock care" />
          </WebField>
          <WebField label="Description" htmlFor="bc-desc">
            <textarea id="bc-desc" className="web-input web-textarea" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </WebField>
          <WebField label="Status" htmlFor="bc-status">
            <select id="bc-status" className="web-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Shown on the blog</option>
              <option value="inactive">Hidden</option>
            </select>
          </WebField>
          {formErr && <p className="web-form-err" role="alert">{formErr}</p>}
        </>
      )}
    </WebPanel>
  );

  return (
    <WebBody panel={panel}>
      <WebGridState
        loading={list.loading} error={list.error} onRetry={() => list.reload()} count={items.length}
        media={null} label="Loading categories…"
        empty={<EmptyState title={q ? 'No categories match' : 'No categories yet'} description={q ? 'Try another search.' : 'Add one to group posts, like “Sock care”.'} />}
      />
      {!list.error && items.length > 0 && (
        <div className={`web-grid${webStale(list.loading)}`} aria-busy={list.loading || undefined}>
          {items.map((c) => (
            <WebCard
              key={c.id}
              selected={form?.id === c.id}
              onOpen={() => { setConfirmDel(false); setFormErr(''); setForm({ id: c.id, name: c.name || '', description: c.description || '', status: c.status || 'active' }); }}
              title={c.name}
              pill={c.status === 'inactive' ? { label: 'Hidden', tone: 'neutral' } : { label: 'Live', tone: 'done' }}
              meta={`/${c.slug || ''}`}
              sub={c.description ? c.description.slice(0, 90) : null}
            />
          ))}
        </div>
      )}
    </WebBody>
  );
}
