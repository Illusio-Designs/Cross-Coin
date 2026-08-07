// When accessed directly as a Next.js page, redirect to dashboard shell
export { default } from './index';
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Modal, Button, Table, Pagination, Input, Select, Switch } from "../../components/ui";
import { PageHeader, Panel, FilterBar, EmptyState } from "../../components/Dashboard/primitives";
import Loader from "../../components/common/Loader";
import { blogService, productService } from "../../services";
import BrandAssignment from '../../components/Dashboard/BrandAssignment';
import { showSuccess, showError } from "../../utils/toastNotification";
import { ConfirmModal } from '../../components/common/AlertModal';

const Editor = dynamic(() => import("../../components/common/Editor"), { ssr: false });

// ─── Icons ────────────────────────────────────────────────────────────────────
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Search01Icon, PencilEdit02Icon, Delete02Icon, Image02Icon, News01Icon } from '@hugeicons/core-free-icons';

const IC = {
  add:    <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />,
  search: <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />,
  edit:   <HugeiconsIcon icon={PencilEdit02Icon} size={16} strokeWidth={2} />,
  trash:  <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} />,
  image:  <HugeiconsIcon icon={Image02Icon} size={20} strokeWidth={2} />,
  blog:   <HugeiconsIcon icon={News01Icon} size={20} strokeWidth={2} />,
};

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = ['Posts', 'Categories'];

const STATUS_OPTS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const EMPTY_POST = {
  id: null, title: '', author_name: '', status: 'draft',
  blog_category_id: '', brand_ids: [], tags: [],
  sections: [{ heading: '', content: '' }],
  seo: { meta_title: '', meta_description: '', meta_keywords: '', og_title: '', og_description: '', og_image: '', canonical_url: '' },
  featured_products: [],
};

const EMPTY_CAT = { id: null, name: '', description: '', status: 'active' };

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = { published: '#16a34a', draft: '#d97706', archived: '#6b6b73', active: '#16a34a', inactive: '#6b6b73' };
  return (
    <span style={{ background: map[status] || '#6b6b73', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
      {status}
    </span>
  );
}

// ─── Sections editor ──────────────────────────────────────────────────────────
function SectionsEditor({ value, onChange }) {
  const addSection = () => onChange([...value, { heading: '', content: '' }]);
  const removeSection = (i) => onChange(value.filter((_, idx) => idx !== i));
  const updateSection = (i, field, val) =>
    onChange(value.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  return (
    <div className="dm-sections-editor">
      {value.map((sec, i) => (
        <div key={i} style={{ border: '1px solid var(--ds-color-border)', borderRadius: 8, padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ds-color-text-muted)' }}>Section {i + 1}</span>
            <button type="button" onClick={() => removeSection(i)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0a0a0a', display: 'flex' }}>
              {IC.trash}
            </button>
          </div>
          <Input
            label="Heading"
            value={sec.heading || ''}
            onChange={e => updateSection(i, 'heading', e.target.value)}
            placeholder="Section heading"
          />
          <div className="dm-field" style={{ marginTop: 10 }}>
            <label className="dm-label">Content</label>
            <div className="dm-quill-wrap">
              <Editor
                value={sec.content || ''}
                onChange={val => updateSection(i, 'content', val)}
                placeholder="Write section content..."
              />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="sl-add-btn" style={{ marginTop: 4 }} onClick={addSection}>
        <span className="sl-add-btn-icon">{IC.add}</span>Add Section
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function Blogs() {
  const [tab, setTab] = useState('Posts');
  const [confirmState, setConfirmState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [postModal, setPostModal] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [heroModal, setHeroModal] = useState(false);
  const [postForm, setPostForm] = useState(EMPTY_POST);
  const [catForm, setCatForm] = useState(EMPTY_CAT);
  const [heroPostId, setHeroPostId] = useState(null);
  const [heroFile, setHeroFile] = useState(null);
  const [heroPreview, setHeroPreview] = useState(null);
  const [tagInput, setTagInput] = useState('');

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [postsRes, catsRes] = await Promise.all([
        blogService.getAllPosts(),
        blogService.getAllCategories(),
      ]);
      setPosts(postsRes?.data || []);
      setCategories(catsRes?.data || []);
    } catch { showError('loadingFailed'); }
    finally { setLoading(false); }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await productService.getAllProducts(1, 200);
      setProducts(res?.products || res?.data || []);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { fetchAll(); fetchProducts(); }, [fetchAll, fetchProducts]);
  useEffect(() => { setCurrentPage(1); }, [search, tab]);

  // ── Derived option arrays ──────────────────────────────────────────────────
  const categoryOpts = [{ value: '', label: '— None —' }, ...categories.map(c => ({ value: String(c.id), label: c.name }))];
  const productOpts = [{ value: '', label: '— Select product —' }, ...products.map(p => ({ value: String(p.id), label: p.name }))];
  const catStatusOpts = [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }];

  // ── Post form helpers ──────────────────────────────────────────────────────
  const openNewPost = () => { setPostForm(EMPTY_POST); setTagInput(''); setPostModal(true); };

  const openEditPost = async (id) => {
    setLoading(true);
    try {
      const res = await blogService.getPostById(id);
      const p = res?.data || res;
      const rawSections = typeof p.sections === 'string'
        ? (() => { try { return JSON.parse(p.sections); } catch { return []; } })()
        : (p.sections || []);
      setPostForm({
        id: p.id,
        title: p.title || '',
        author_name: p.author_name || '',
        status: p.status || 'draft',
        blog_category_id: p.blog_category_id ? String(p.blog_category_id) : '',
        brand_ids: (p.Brands || []).map(b => b.id),
        tags: (p.Tags || []).map(t => t.name),
        sections: rawSections.length ? rawSections : [{ heading: '', content: '' }],
        seo: {
          meta_title: p.BlogSEO?.meta_title || '',
          meta_description: p.BlogSEO?.meta_description || '',
          meta_keywords: p.BlogSEO?.meta_keywords || '',
          og_title: p.BlogSEO?.og_title || '',
          og_description: p.BlogSEO?.og_description || '',
          og_image: p.BlogSEO?.og_image || '',
          canonical_url: p.BlogSEO?.canonical_url || '',
        },
        featured_products: (p.FeaturedProducts || []).map(fp => ({
          product_id: String(fp.id),
          lifestyle_tag: fp.BlogFeaturedProduct?.lifestyle_tag || '',
        })),
      });
      setTagInput('');
      setPostModal(true);
    } catch { showError('loadingFailed'); }
    finally { setLoading(false); }
  };

  const handlePostField = (field, value) => setPostForm(prev => ({ ...prev, [field]: value }));
  const handleSeoField = (field, value) => setPostForm(prev => ({ ...prev, seo: { ...prev.seo, [field]: value } }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !postForm.tags.includes(t)) setPostForm(prev => ({ ...prev, tags: [...prev.tags, t] }));
    setTagInput('');
  };
  const removeTag = (t) => setPostForm(prev => ({ ...prev, tags: prev.tags.filter(x => x !== t) }));

  const addFeaturedProduct = () =>
    setPostForm(prev => ({ ...prev, featured_products: [...prev.featured_products, { product_id: '', lifestyle_tag: '' }] }));
  const removeFeaturedProduct = (i) =>
    setPostForm(prev => ({ ...prev, featured_products: prev.featured_products.filter((_, idx) => idx !== i) }));
  const updateFeaturedProduct = (i, field, val) =>
    setPostForm(prev => ({
      ...prev,
      featured_products: prev.featured_products.map((fp, idx) => idx === i ? { ...fp, [field]: val } : fp),
    }));

  // ── Submit post ────────────────────────────────────────────────────────────
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!postForm.title.trim()) { showError('fieldRequired'); return; }
    if (!postForm.brand_ids.length) { showError('fieldRequired'); return; }
    const payload = {
      title: postForm.title,
      author_name: postForm.author_name || null,
      status: postForm.status,
      blog_category_id: postForm.blog_category_id || null,
      brand_ids: postForm.brand_ids,
      tags: postForm.tags,
      sections: postForm.sections,
      seo: postForm.seo,
      featured_products: postForm.featured_products
        .filter(fp => fp.product_id)
        .map(fp => ({ product_id: Number(fp.product_id), lifestyle_tag: fp.lifestyle_tag })),
    };
    setLoading(true);
    try {
      if (postForm.id) { await blogService.updatePost(postForm.id, payload); showSuccess('updateSuccess'); }
      else { await blogService.createPost(payload); showSuccess('createSuccess'); }
      setPostModal(false);
      fetchAll();
    } catch (err) { showError('saveFailed', err?.message); }
    finally { setLoading(false); }
  };

  const handleDeletePost = (id) => {
    setConfirmState({ message: 'Delete this post?', onConfirm: async () => {
      setConfirmState(null);
      setLoading(true);
      try { await blogService.deletePost(id); showSuccess('deleteSuccess'); fetchAll(); }
      catch { showError('deleteFailed'); }
      finally { setLoading(false); }
    }});
  };

  // ── Hero image ─────────────────────────────────────────────────────────────
  const openHeroModal = (id) => { setHeroPostId(id); setHeroFile(null); setHeroPreview(null); setHeroModal(true); };
  const handleHeroFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setHeroFile(file);
    setHeroPreview(URL.createObjectURL(file));
  };
  const handleHeroUpload = async () => {
    if (!heroFile) return;
    setLoading(true);
    try { await blogService.uploadHeroImage(heroPostId, heroFile); showSuccess('updateSuccess'); setHeroModal(false); fetchAll(); }
    catch { showError('saveFailed'); }
    finally { setLoading(false); }
  };

  // ── Category CRUD ──────────────────────────────────────────────────────────
  const handleCatSubmit = async (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) { showError('fieldRequired'); return; }
    setLoading(true);
    try {
      if (catForm.id) {
        await blogService.updateCategory(catForm.id, { name: catForm.name, description: catForm.description, status: catForm.status });
        showSuccess('updateSuccess');
      } else {
        await blogService.createCategory({ name: catForm.name, description: catForm.description, status: catForm.status });
        showSuccess('createSuccess');
      }
      setCatModal(false);
      fetchAll();
    } catch (err) { showError('saveFailed', err?.message); }
    finally { setLoading(false); }
  };

  const handleDeleteCat = (id) => {
    setConfirmState({ message: 'Delete this category?', onConfirm: async () => {
      setConfirmState(null);
      setLoading(true);
      try { await blogService.deleteCategory(id); showSuccess('deleteSuccess'); fetchAll(); }
      catch { showError('deleteFailed'); }
      finally { setLoading(false); }
    }});
  };

  // ── Filtered / paginated ───────────────────────────────────────────────────
  const filteredPosts = posts.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.title?.toLowerCase().includes(s) || p.author_name?.toLowerCase().includes(s);
  });
  const filteredCats = categories.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()));
  const activeList = tab === 'Posts' ? filteredPosts : filteredCats;
  const totalPages = Math.ceil(activeList.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const pageItems = activeList.slice(start, start + itemsPerPage).map((item, i) => ({ ...item, serial_number: start + i + 1 }));

  // ── Table columns ──────────────────────────────────────────────────────────
  const postColumns = [
    { header: '#', accessor: 'serial_number' },
    { header: 'Title', accessor: 'title', cell: ({ title, hero_image }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {hero_image && <img src={hero_image} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4 }} />}
        <span className="cat-name-cell">{title}</span>
      </div>
    )},
    { header: 'Author', accessor: 'author_name', cell: ({ author_name }) => <span>{author_name || '—'}</span> },
    { header: 'Category', accessor: 'blog_category_id', cell: ({ BlogCategory }) => <span>{BlogCategory?.name || '—'}</span> },
    { header: 'Status', accessor: 'status', cell: ({ status }) => <StatusBadge status={status} /> },
    { header: 'Brands', accessor: 'brands', cell: ({ Brands }) => (
      Brands?.length > 0
        ? <div className="sl-brands-wrap">{Brands.map((b, i) => <span key={i} className="sl-brand-tag">{b.display_name || b.name}</span>)}</div>
        : <span className="sl-na">—</span>
    )},
    { header: 'Actions', accessor: 'actions', cell: ({ id }) => (
      <div className="sl-actions">
        <button className="sl-btn-edit" title="Hero Image" onClick={() => openHeroModal(id)}>{IC.image}</button>
        <button className="sl-btn-edit" title="Edit" onClick={() => openEditPost(id)}>{IC.edit}</button>
        <button className="sl-btn-delete" title="Delete" onClick={() => handleDeletePost(id)}>{IC.trash}</button>
      </div>
    )},
  ];

  const catColumns = [
    { header: '#', accessor: 'serial_number' },
    { header: 'Name', accessor: 'name', cell: ({ name }) => <span className="cat-name-cell">{name}</span> },
    { header: 'Slug', accessor: 'slug' },
    { header: 'Description', accessor: 'description', cell: ({ description }) => <span>{description?.slice(0, 60) || '—'}</span> },
    { header: 'Status', accessor: 'status', cell: ({ status }) => <StatusBadge status={status} /> },
    { header: 'Actions', accessor: 'actions', cell: ({ id, name, description, status }) => (
      <div className="sl-actions">
        <button className="sl-btn-edit" title="Edit" onClick={() => { setCatForm({ id, name, description: description || '', status }); setCatModal(true); }}>{IC.edit}</button>
        <button className="sl-btn-delete" title="Delete" onClick={() => handleDeleteCat(id)}>{IC.trash}</button>
      </div>
    )},
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />
      <div className="dashboard-page">
        <PageHeader
          title="Blog Management"
          subtitle={`${posts.length} post${posts.length !== 1 ? 's' : ''} · ${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}`}
          actions={
            <Button variant="primary" onClick={tab === 'Posts' ? openNewPost : () => { setCatForm(EMPTY_CAT); setCatModal(true); }}>
              + Add {tab === 'Posts' ? 'Post' : 'Category'}
            </Button>
          }
        />

        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 18px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, background: tab === t ? 'var(--ds-color-brand, #0a0a0a)' : 'var(--ds-color-surface, #fff)', color: tab === t ? 'var(--ds-color-surface, #fff)' : 'var(--ds-color-text-muted, #6b6b73)', border: `1px solid ${tab === t ? 'var(--ds-color-brand, #0a0a0a)' : 'var(--ds-color-border, #e7e7ea)'}`, transition: 'background 0.15s, border-color 0.15s' }}>
              {t}
            </button>
          ))}
        </div>

        <Panel>
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder={`Search ${tab.toLowerCase()}…`}
          >
            <Select
              value={String(itemsPerPage)}
              onChange={v => { setItemsPerPage(Number(v || 10)); setCurrentPage(1); }}
              options={[{ value: '10', label: 'Show: 10' }, { value: '25', label: 'Show: 25' }, { value: '50', label: 'Show: 50' }, { value: '100', label: 'Show: 100' }]}
            />
          </FilterBar>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Loader /></div>
          ) : pageItems.length === 0 ? (
            <EmptyState
              icon={IC.blog}
              title={search ? `No ${tab.toLowerCase()} match` : `No ${tab.toLowerCase()} yet`}
              message={search ? "Try a different search term." : `Add your first ${tab.toLowerCase().slice(0, -1)} to get started.`}
            />
          ) : (
            <>
              <Table columns={tab === 'Posts' ? postColumns : catColumns} data={pageItems} striped hoverable />
              {activeList.length > itemsPerPage && (
                <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}>
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </Panel>
      </div>


      {/* ── Post Modal ─────────────────────────────────────────────────────── */}
      <Modal isOpen={postModal} onClose={() => setPostModal(false)} title={postForm.id ? 'Edit Post' : 'New Post'} closeOnOverlayClick={false}>
        <form onSubmit={handlePostSubmit} className="seo-form">
          <div className="modal-body">

            {/* Row 1: Title + Author */}
            <div className="dm-2col">
              <Input
                label="Title"
                required
                value={postForm.title}
                onChange={e => handlePostField('title', e.target.value)}
                placeholder="Post title"
              />
              <Input
                label="Author Name"
                value={postForm.author_name}
                onChange={e => handlePostField('author_name', e.target.value)}
                placeholder="e.g., Jane Doe"
              />
            </div>

            {/* Row 2: Status + Category */}
            <div className="dm-2col">
              <Select
                label="Status"
                options={STATUS_OPTS}
                value={postForm.status}
                onChange={v => handlePostField('status', v)}
              />
              <Select
                label="Category"
                options={categoryOpts}
                value={postForm.blog_category_id}
                onChange={v => handlePostField('blog_category_id', v)}
                searchable
                clearable
              />
            </div>

            {/* Brands — same as slider */}
            <div className="dm-field">
              <BrandAssignment
                selectedBrands={postForm.brand_ids || []}
                onChange={v => handlePostField('brand_ids', v)}
                disabled={loading}
              />
            </div>

            {/* Tags */}
            <div className="dm-field" style={{ marginTop: 4 }}>
              <label className="dm-label">Tags</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <Input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Type tag and press Enter"
                />
                <Button type="button" variant="secondary" onClick={addTag}>{IC.add}</Button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {postForm.tags.map(t => (
                  <span key={t} style={{ background: 'var(--ds-color-surface-soft, #fafafa)', color: 'var(--ds-color-text-muted, #6b6b73)', border: '1px solid var(--ds-color-border, #e7e7ea)', borderRadius: 4, padding: '2px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {t}
                    <button type="button" onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-color-text-muted, #6b6b73)', lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Sections with Quill editor */}
            <div className="dm-field" style={{ marginTop: 8 }}>
              <label className="dm-label">Sections</label>
              <SectionsEditor value={postForm.sections} onChange={v => handlePostField('sections', v)} />
            </div>

            {/* Featured Products */}
            <div className="dm-field" style={{ marginTop: 8 }}>
              <label className="dm-label">Featured Products</label>
              {postForm.featured_products.map((fp, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 2 }}>
                    <Select
                      options={productOpts}
                      value={fp.product_id}
                      onChange={v => updateFeaturedProduct(i, 'product_id', v)}
                      searchable
                      placeholder="Select product"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Input
                      value={fp.lifestyle_tag}
                      onChange={e => updateFeaturedProduct(i, 'lifestyle_tag', e.target.value)}
                      placeholder="Lifestyle tag"
                    />
                  </div>
                  <button type="button" onClick={() => removeFeaturedProduct(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0a0a0a', marginBottom: 2 }}>
                    {IC.trash}
                  </button>
                </div>
              ))}
              <button type="button" className="sl-add-btn" style={{ marginTop: 4 }} onClick={addFeaturedProduct}>
                <span className="sl-add-btn-icon">{IC.add}</span>Add Product
              </button>
            </div>

            {/* SEO */}
            <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 700, fontSize: 13, color: 'var(--ds-color-text, #0a0a0a)' }}>SEO Settings</div>
            <div className="dm-2col">
              {[
                ['meta_title', 'Meta Title'], ['meta_description', 'Meta Description'],
                ['meta_keywords', 'Meta Keywords'], ['og_title', 'OG Title'],
                ['og_description', 'OG Description'], ['og_image', 'OG Image URL'],
                ['canonical_url', 'Canonical URL'],
              ].map(([field, label]) => (
                <Input
                  key={field}
                  label={label}
                  value={postForm.seo[field]}
                  onChange={e => handleSeoField(field, e.target.value)}
                  placeholder={label}
                />
              ))}
            </div>

          </div>
          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={() => setPostModal(false)} disabled={loading}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={loading}>{loading ? 'Saving...' : postForm.id ? 'Update Post' : 'Create Post'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Category Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={catModal} onClose={() => setCatModal(false)} title={catForm.id ? 'Edit Category' : 'New Category'} closeOnOverlayClick={false}>
        <form onSubmit={handleCatSubmit} className="seo-form">
          <div className="modal-body">
            <Input
              label="Name"
              required
              value={catForm.name}
              onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Category name"
            />
            <Input
              label="Description"
              multiline
              rows={3}
              value={catForm.description}
              onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Optional description"
            />
            <Select
              label="Status"
              options={catStatusOpts}
              value={catForm.status}
              onChange={v => setCatForm(p => ({ ...p, status: v }))}
            />
          </div>
          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={() => setCatModal(false)} disabled={loading}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={loading}>{loading ? 'Saving...' : catForm.id ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Hero Image Modal ───────────────────────────────────────────────── */}
      <Modal isOpen={heroModal} onClose={() => setHeroModal(false)} title="Upload Hero Image">
        <div className="modal-body">
          <Input
            label="Select Image (JPEG, PNG, WebP)"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleHeroFileChange}
          />
          {heroPreview && (
            <img src={heroPreview} alt="Preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 6, marginTop: 8 }} />
          )}
        </div>
        <div className="modal-footer">
          <Button variant="secondary" type="button" onClick={() => setHeroModal(false)}>Cancel</Button>
          <Button variant="primary" type="button" onClick={handleHeroUpload} disabled={!heroFile || loading}>
            {loading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
