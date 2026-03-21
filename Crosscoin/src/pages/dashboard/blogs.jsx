import { useState, useEffect, useCallback } from "react";
import { Modal, Button, Table, Pagination } from "../../components/ui";
import Loader from "../../components/common/Loader";
import { blogService, brandService, productService } from "../../services";
import { showSuccess, showError } from "../../utils/toastNotification";

// ─── Icons ────────────────────────────────────────────────────────────────────
const IC = {
  add:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  edit:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  image:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  blog:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  tag:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  upload: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
};


// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = ['Posts', 'Categories'];
const STATUS_OPTIONS = ['draft', 'published', 'archived'];

const EMPTY_POST = {
  id: null, title: '', author_name: '', status: 'draft',
  blog_category_id: '', brand_ids: [], tags: [], sections: '[]',
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

// ─── Section editor ───────────────────────────────────────────────────────────
function SectionsEditor({ value, onChange }) {
  let parsed = [];
  try { parsed = JSON.parse(value || '[]'); } catch { parsed = []; }

  const update = (sections) => onChange(JSON.stringify(sections));

  const addSection = () => update([...parsed, { heading: '', content: '' }]);
  const removeSection = (i) => update(parsed.filter((_, idx) => idx !== i));
  const updateSection = (i, field, val) => {
    const next = parsed.map((s, idx) => idx === i ? { ...s, [field]: val } : s);
    update(next);
  };

  return (
    <div className="dm-sections-editor">
      {parsed.map((sec, i) => (
        <div key={i} className="dm-section-item" style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Section {i + 1}</span>
            <button type="button" onClick={() => removeSection(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>{IC.trash}</button>
          </div>
          <div className="dm-field">
            <label className="dm-label">Heading</label>
            <input className="dm-input" value={sec.heading || ''} onChange={e => updateSection(i, 'heading', e.target.value)} placeholder="Section heading" />
          </div>
          <div className="dm-field">
            <label className="dm-label">Content</label>
            <textarea className="dm-input" rows={3} value={sec.content || ''} onChange={e => updateSection(i, 'content', e.target.value)} placeholder="Section content" style={{ resize: 'vertical' }} />
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
export default function Blogs() {
  const [tab, setTab] = useState('Posts');
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [tags, setTags] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modal state
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
      const [postsRes, catsRes, tagsRes, brandsRes] = await Promise.all([
        blogService.getAllPosts(),
        blogService.getAllCategories(),
        blogService.getAllTags(),
        brandService.getAllBrands(),
      ]);
      setPosts(postsRes?.posts || postsRes || []);
      setCategories(catsRes?.categories || catsRes || []);
      setTags(tagsRes?.tags || tagsRes || []);
      setBrands(brandsRes?.data || brandsRes || []);
    } catch (e) {
      showError('loadingFailed');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await productService.getAllProducts(1, 200);
      setProducts(res?.products || res?.data || []);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { fetchAll(); fetchProducts(); }, [fetchAll, fetchProducts]);
  useEffect(() => { setCurrentPage(1); }, [search, tab]);

  // ── Post form helpers ──────────────────────────────────────────────────────
  const openNewPost = () => { setPostForm(EMPTY_POST); setTagInput(''); setPostModal(true); };

  const openEditPost = async (id) => {
    setLoading(true);
    try {
      const res = await blogService.getPostById(id);
      const p = res?.post || res;
      setPostForm({
        id: p.id,
        title: p.title || '',
        author_name: p.author_name || '',
        status: p.status || 'draft',
        blog_category_id: p.blog_category_id || '',
        brand_ids: (p.Brands || p.brands || []).map(b => b.id),
        tags: (p.BlogTags || p.tags || []).map(t => t.name),
        sections: typeof p.sections === 'string' ? p.sections : JSON.stringify(p.sections || []),
        seo: {
          meta_title: p.BlogSEO?.meta_title || '',
          meta_description: p.BlogSEO?.meta_description || '',
          meta_keywords: p.BlogSEO?.meta_keywords || '',
          og_title: p.BlogSEO?.og_title || '',
          og_description: p.BlogSEO?.og_description || '',
          og_image: p.BlogSEO?.og_image || '',
          canonical_url: p.BlogSEO?.canonical_url || '',
        },
        featured_products: (p.FeaturedProducts || p.featured_products || []).map(fp => ({
          product_id: fp.product_id || fp.id,
          lifestyle_tag: fp.BlogFeaturedProduct?.lifestyle_tag || fp.lifestyle_tag || '',
        })),
      });
      setTagInput('');
      setPostModal(true);
    } catch { showError('loadingFailed'); }
    finally { setLoading(false); }
  };

  const handlePostField = (field, value) => setPostForm(prev => ({ ...prev, [field]: value }));
  const handleSeoField = (field, value) => setPostForm(prev => ({ ...prev, seo: { ...prev.seo, [field]: value } }));

  const toggleBrand = (id) => {
    setPostForm(prev => ({
      ...prev,
      brand_ids: prev.brand_ids.includes(id) ? prev.brand_ids.filter(b => b !== id) : [...prev.brand_ids, id],
    }));
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !postForm.tags.includes(t)) setPostForm(prev => ({ ...prev, tags: [...prev.tags, t] }));
    setTagInput('');
  };
  const removeTag = (t) => setPostForm(prev => ({ ...prev, tags: prev.tags.filter(x => x !== t) }));

  const addFeaturedProduct = () => setPostForm(prev => ({ ...prev, featured_products: [...prev.featured_products, { product_id: '', lifestyle_tag: '' }] }));
  const removeFeaturedProduct = (i) => setPostForm(prev => ({ ...prev, featured_products: prev.featured_products.filter((_, idx) => idx !== i) }));
  const updateFeaturedProduct = (i, field, val) => setPostForm(prev => ({
    ...prev,
    featured_products: prev.featured_products.map((fp, idx) => idx === i ? { ...fp, [field]: val } : fp),
  }));


  // ── Submit post ────────────────────────────────────────────────────────────
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!postForm.title.trim()) { showError('fieldRequired'); return; }
    if (!postForm.brand_ids.length) { showError('fieldRequired'); return; }
    let sections;
    try { sections = JSON.parse(postForm.sections || '[]'); } catch { showError('invalidData'); return; }
    const payload = {
      title: postForm.title,
      author_name: postForm.author_name || null,
      status: postForm.status,
      blog_category_id: postForm.blog_category_id || null,
      brand_ids: postForm.brand_ids,
      tags: postForm.tags,
      sections,
      seo: postForm.seo,
      featured_products: postForm.featured_products.filter(fp => fp.product_id),
    };
    setLoading(true);
    try {
      if (postForm.id) { await blogService.updatePost(postForm.id, payload); showSuccess('updateSuccess'); }
      else { await blogService.createPost(payload); showSuccess('createSuccess'); }
      setPostModal(false);
      fetchAll();
    } catch (e) { showError('saveFailed', e?.message); }
    finally { setLoading(false); }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm('Delete this post?')) return;
    setLoading(true);
    try { await blogService.deletePost(id); showSuccess('deleteSuccess'); fetchAll(); }
    catch { showError('deleteFailed'); }
    finally { setLoading(false); }
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
      if (catForm.id) { await blogService.updateCategory(catForm.id, { name: catForm.name, description: catForm.description, status: catForm.status }); showSuccess('updateSuccess'); }
      else { await blogService.createCategory({ name: catForm.name, description: catForm.description, status: catForm.status }); showSuccess('createSuccess'); }
      setCatModal(false);
      fetchAll();
    } catch (e) { showError('saveFailed', e?.message); }
    finally { setLoading(false); }
  };

  const handleDeleteCat = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    setLoading(true);
    try { await blogService.deleteCategory(id); showSuccess('deleteSuccess'); fetchAll(); }
    catch { showError('deleteFailed'); }
    finally { setLoading(false); }
  };

  // ── Filtered / paginated data ──────────────────────────────────────────────
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
      <div className="dashboard-page">
        {/* Header */}
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

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: tab === t ? '#6366f1' : '#f3f4f6', color: tab === t ? '#fff' : '#374151' }}>
              {t}
            </button>
          ))}
        </div>

        {/* Table */}
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

            {/* Basic fields */}
            <div className="dm-2col">
              <div className="dm-field">
                <label className="dm-label">Title <span className="dm-required">*</span></label>
                <input className="dm-input" value={postForm.title} onChange={e => handlePostField('title', e.target.value)} placeholder="Post title" required />
              </div>
              <div className="dm-field">
                <label className="dm-label">Author Name</label>
                <input className="dm-input" value={postForm.author_name} onChange={e => handlePostField('author_name', e.target.value)} placeholder="e.g., Jane Doe" />
              </div>
              <div className="dm-field">
                <label className="dm-label">Status</label>
                <select className="dm-input dm-select" value={postForm.status} onChange={e => handlePostField('status', e.target.value)}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div className="dm-field">
                <label className="dm-label">Category</label>
                <select className="dm-input dm-select" value={postForm.blog_category_id} onChange={e => handlePostField('blog_category_id', e.target.value)}>
                  <option value="">— None —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Brands */}
            <div className="dm-field">
              <label className="dm-label">Brands <span className="dm-required">*</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {brands.map(b => (
                  <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={postForm.brand_ids.includes(b.id)} onChange={() => toggleBrand(b.id)} />
                    {b.display_name || b.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="dm-field">
              <label className="dm-label">Tags</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input className="dm-input" style={{ flex: 1 }} value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="Type tag and press Enter" />
                <button type="button" className="sl-add-btn" style={{ padding: '0 12px' }} onClick={addTag}>{IC.add}</button>
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

            {/* Sections */}
            <div className="dm-field">
              <label className="dm-label">Sections</label>
              <SectionsEditor value={postForm.sections} onChange={v => handlePostField('sections', v)} />
            </div>

            {/* Featured Products */}
            <div className="dm-field">
              <label className="dm-label">Featured Products</label>
              {postForm.featured_products.map((fp, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                  <select className="dm-input dm-select" style={{ flex: 2 }} value={fp.product_id} onChange={e => updateFeaturedProduct(i, 'product_id', Number(e.target.value))}>
                    <option value="">— Select product —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input className="dm-input" style={{ flex: 1 }} value={fp.lifestyle_tag} onChange={e => updateFeaturedProduct(i, 'lifestyle_tag', e.target.value)} placeholder="Lifestyle tag" />
                  <button type="button" onClick={() => removeFeaturedProduct(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>{IC.trash}</button>
                </div>
              ))}
              <button type="button" className="sl-add-btn" style={{ marginTop: 4 }} onClick={addFeaturedProduct}>
                <span className="sl-add-btn-icon">{IC.add}</span>Add Product
              </button>
            </div>

            {/* SEO */}
            <div className="dm-section-title" style={{ marginTop: 16, marginBottom: 8, fontWeight: 700, fontSize: 13, color: '#6366f1' }}>SEO Settings</div>
            <div className="dm-2col">
              {[['meta_title','Meta Title'],['meta_description','Meta Description'],['meta_keywords','Meta Keywords'],['og_title','OG Title'],['og_description','OG Description'],['og_image','OG Image URL'],['canonical_url','Canonical URL']].map(([field, label]) => (
                <div key={field} className="dm-field">
                  <label className="dm-label">{label}</label>
                  <input className="dm-input" value={postForm.seo[field]} onChange={e => handleSeoField(field, e.target.value)} placeholder={label} />
                </div>
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
            <div className="dm-field">
              <label className="dm-label">Name <span className="dm-required">*</span></label>
              <input className="dm-input" value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} placeholder="Category name" required />
            </div>
            <div className="dm-field">
              <label className="dm-label">Description</label>
              <textarea className="dm-input" rows={3} value={catForm.description} onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" style={{ resize: 'vertical' }} />
            </div>
            <div className="dm-field">
              <label className="dm-label">Status</label>
              <select className="dm-input dm-select" value={catForm.status} onChange={e => setCatForm(p => ({ ...p, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
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
          <div className="dm-field">
            <label className="dm-label">Select Image (JPEG, PNG, WebP)</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleHeroFileChange} className="dm-input" />
          </div>
          {heroPreview && <img src={heroPreview} alt="Preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 6, marginTop: 8 }} />}
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
