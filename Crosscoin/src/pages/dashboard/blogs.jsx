// When accessed directly as a Next.js page, redirect to dashboard shell
export { default } from './index';
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Modal, Button, Table, Pagination, Input, Select, Switch } from "../../components/ui";
import Loader from "../../components/common/Loader";
import { blogService, brandService, productService } from "../../services";
import { showSuccess, showError } from "../../utils/toastNotification";
import { ConfirmModal } from '../../components/common/AlertModal';

const ReactQuill = dynamic(() => import("../../components/common/QuillEditor"), { ssr: false });

// ─── Icons ────────────────────────────────────────────────────────────────────
const IC = {
  add:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  edit:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  image:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  blog:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
};

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = ['Posts', 'Categories'];

const STATUS_OPTS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    ['link'],
    ['clean'],
  ],
};

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
  const map = { published: '#22c55e', draft: '#f59e0b', archived: '#6b7280' };
  return (
    <span style={{ background: map[status] || '#6b7280', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
      {status}
    </span>
  );
}

// ─── Sections editor with ReactQuill ─────────────────────────────────────────
function SectionsEditor({ value, onChange }) {
  const addSection = () => onChange([...value, { heading: '', content: '' }]);
  const removeSection = (i) => onChange(value.filter((_, idx) => idx !== i));
  const updateSection = (i, field, val) =>
    onChange(value.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  return (
    <div className="dm-sections-editor">
      {value.map((sec, i) => (
        <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>Section {i + 1}</span>
            <button type="button" onClick={() => removeSection(i)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex' }}>
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
              <ReactQuill
                theme="snow"
                value={sec.content || ''}
                onChange={val => updateSection(i, 'content', val)}
                modules={QUILL_MODULES}
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
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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
      const [postsRes, catsRes, brandsRes] = await Promise.all([
        blogService.getAllPosts(),
        blogService.getAllCategories(),
        brandService.getAllBrands(),
      ]);
      setPosts(postsRes?.data || []);
      setCategories(catsRes?.data || []);
      setBrands(brandsRes?.data || []);
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
  const brandOpts = brands.map(b => ({ value: b.id, label: b.display_name || b.name }));
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
  const totalPages = Math.ceil(activeList.length / ITEMS_PER_PAGE);
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = activeList.slice(start, start + ITEMS_PER_PAGE).map((item, i) => ({ ...item, serial_number: start + i + 1 }));

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
    { header: 'Brands', accessor: 'brands', cell: ({ Brands }) => <span>{(Brands || []).map(b => b.name).join(', ') || '—'}</span> },
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
        <div className="sl-page-header">
          <div className="sl-header-left">
            <div className="sl-header-icon">{IC.blog}</div>
            <div>
              <h1 className="sl-page-title">Blog Management</h1>
              <p className="sl-page-sub">{posts.length} post{posts.length !== 1 ? 's' : ''} · {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</p>
            </div>
          </div>
          <div className="sl-header-right">
            <div className="sl-search-wrap">
              <span className="sl-search-icon">{IC.search}</span>
              <input type="text" className="sl-search-input" placeholder={`Search ${tab.toLowerCase()}...`} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="sl-add-btn" onClick={tab === 'Posts' ? openNewPost : () => { setCatForm(EMPTY_CAT); setCatModal(true); }}>
              <span className="sl-add-btn-icon">{IC.add}</span>Add {tab === 'Posts' ? 'Post' : 'Category'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: tab === t ? '#6366f1' : '#f3f4f6', color: tab === t ? '#fff' : '#374151' }}>
              {t}
            </button>
          ))}
        </div>

        <div className="sl-table-wrap">
          {loading ? (
            <div className="sl-loader-wrap"><Loader /></div>
          ) : pageItems.length === 0 ? (
            <div className="sl-empty">
              <div className="sl-empty-icon">{IC.blog}</div>
              <p>{search ? `No ${tab.toLowerCase()} match your search` : `No ${tab.toLowerCase()} yet`}</p>
            </div>
          ) : (
            <>
              <Table columns={tab === 'Posts' ? postColumns : catColumns} data={pageItems} striped hoverable />
              {activeList.length > ITEMS_PER_PAGE && (
                <div className="sl-pagination">
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </div>
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

            {/* Brands — multi-select */}
            <Select
              label="Brands"
              required
              options={brandOpts}
              value={postForm.brand_ids}
              onChange={v => handlePostField('brand_ids', v)}
              multiple
              searchable
              helperText="Select one or more brands"
            />

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
                  <span key={t} style={{ background: '#e0e7ff', color: '#4338ca', borderRadius: 4, padding: '2px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {t}
                    <button type="button" onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', lineHeight: 1 }}>×</button>
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
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', marginBottom: 2 }}>
                    {IC.trash}
                  </button>
                </div>
              ))}
              <button type="button" className="sl-add-btn" style={{ marginTop: 4 }} onClick={addFeaturedProduct}>
                <span className="sl-add-btn-icon">{IC.add}</span>Add Product
              </button>
            </div>

            {/* SEO */}
            <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 700, fontSize: 13, color: '#6366f1' }}>SEO Settings</div>
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
