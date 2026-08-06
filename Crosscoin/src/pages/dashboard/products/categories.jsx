import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Table, Pagination, Select } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from '../../../components/common/AlertModal';
import BrandTags from "../../../components/Dashboard/BrandTags";
import BrandAssignment from "../../../components/Dashboard/BrandAssignment";
import { categoryService } from "../../../services";
import { brandService } from "../../../services";
import { extractErrorMessage, formatErrorForDisplay } from "../../../utils/errorMessages";
import { showSuccess, showError } from "../../../utils/toastNotification";
import { validateForm, isFormValid } from "../../../utils/formValidation";
import SerpPreview from "../../../components/common/SerpPreview";
import SeoLengthMeter from "../../../components/common/SeoLengthMeter";
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Search01Icon, PencilEdit02Icon, Delete02Icon, Image02Icon, Tag01Icon } from '@hugeicons/core-free-icons';

const IC = {
  add: <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />,
  search: <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />,
  edit: <HugeiconsIcon icon={PencilEdit02Icon} size={16} strokeWidth={2} />,
  trash: <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} />,
  image: <HugeiconsIcon icon={Image02Icon} size={20} strokeWidth={2} />,
  category: <HugeiconsIcon icon={Tag01Icon} size={20} strokeWidth={2} />,
};

const EMPTY_FORM = {
  name: "", description: "", status: "active",
  metaTitle: "", metaDescription: "", metaKeywords: "",
  ogImage: "", canonicalUrl: "", structuredData: "", seoIndex: true,
  image: null, brandIds: [1],
};

const VALIDATION_SCHEMA = {
  name: [{ type: 'required' }, { type: 'minLength', value: 2 }, { type: 'maxLength', value: 100 }],
  // Description is stored as TEXT in the DB (effectively unlimited),
  // so the frontend just requires it to be present — no length cap.
  description: [{ type: 'required' }],
};

export default function Categories() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  // Separate from `loading` (which gates the table) so opening the edit panel
  // doesn't reload the whole table.
  const [editLoading, setEditLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  // Brand filter — '' means "All brands". When set, the categoryService
  // sends X-Brand-Name so the listing is scoped server-side.
  const [brands, setBrands] = useState([]);
  const [selectedBrandSlug, setSelectedBrandSlug] = useState('');

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryService.getAllCategories(selectedBrandSlug);
      setCategories(Array.isArray(data) ? data : (data?.categories || data?.data || []));
    } catch (err) {
      const errorMsg = formatErrorForDisplay(extractErrorMessage(err));
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [selectedBrandSlug]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { setCurrentPage(1); }, [search, selectedBrandSlug]);

  // Fetch brands once for the filter dropdown
  useEffect(() => {
    let alive = true;
    brandService.getAllBrands(false).then((res) => {
      if (!alive) return;
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setBrands(list);
    }).catch(() => { /* dropdown stays empty */ });
    return () => { alive = false; };
  }, []);

  const filteredData = categories.filter(item => {
    if (statusFilter && item.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return item.name?.toLowerCase().includes(s) || item.description?.toLowerCase().includes(s);
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(start, start + itemsPerPage).map((item, i) => ({ ...item, serial_number: start + i + 1 }));

  const handleEdit = async (id) => {
    try {
      setEditLoading(true);
      setError(null);
      const data = await categoryService.getCategoryById(id);
      setFormData({
        id: data.id,
        name: data.name || "",
        description: data.description || "",
        status: data.status || "active",
        metaTitle:       data.metaTitle || "",
        metaDescription: data.metaDescription || "",
        metaKeywords:    data.metaKeywords || "",
        ogImage:         data.ogImage || "",
        canonicalUrl:    data.canonicalUrl || "",
        structuredData:  data.structuredData ? (typeof data.structuredData === 'string' ? data.structuredData : JSON.stringify(data.structuredData, null, 2)) : "",
        seoIndex:        data.seoIndex !== false,
        image: data.image || null,
        brandIds: data.brands?.map(b => Number(b.id)).filter(Boolean) || [],
        slug: data.slug || "",
      });
      setIsModalOpen(true);
    } catch (err) {
      const errorMsg = formatErrorForDisplay(extractErrorMessage(err));
      setError(errorMsg);
    }
    finally { setEditLoading(false); }
  };

  const handleDelete = (id) => {
    setConfirmState({ message: "Delete this category?", onConfirm: async () => {
      setConfirmState(null);
      try {
        setLoading(true);
        setError(null);
        await categoryService.deleteCategory(id);
        await fetchCategories();
      } catch (err) {
        const errorMsg = formatErrorForDisplay(extractErrorMessage(err));
        setError(errorMsg);
      }
      finally { setLoading(false); }
    }});
  };

  const handleModalClose = () => { setIsModalOpen(false); setFormData(EMPTY_FORM); };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    const newValue = type === 'file' ? e.target.files[0] : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const errors = validateForm(formData, VALIDATION_SCHEMA);
    setFormErrors(errors);

    if (!isFormValid(errors)) {
      // Tell the user WHY the button "did nothing" — the form scrolls
      // far below the required fields so the inline red errors are
      // often off-screen when they click Update.
      const firstField = Object.keys(errors)[0];
      const firstMsg = errors[firstField];
      showError(firstMsg || 'Please complete the required fields.');
      // Bring the first invalid field into view + focus it.
      if (typeof document !== 'undefined') {
        const el = document.querySelector(`[name="${firstField}"]`);
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (typeof el.focus === 'function') el.focus({ preventScroll: true });
        }
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const fd = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'image') {
          // Only append image if it's a new file upload — skip string URLs (existing image)
          if (formData[key] instanceof File) fd.append('image', formData[key]);
        } else if (key === 'brandIds') {
          fd.append('brandIds', JSON.stringify(formData[key] || []));
        } else if (key !== 'id' && formData[key] !== null && formData[key] !== undefined) {
          fd.append(key, formData[key]);
        }
      });
      if (formData.id) {
        await categoryService.updateCategory(formData.id, fd);
        showSuccess('Category updated');
      } else {
        await categoryService.createCategory(fd);
        showSuccess('Category created');
      }
      await fetchCategories();
      handleModalClose();
    } catch (err) {
      const errorMsg = formatErrorForDisplay(extractErrorMessage(err));
      setError(errorMsg);
      // Inline `setError` renders above the table — invisible while the
      // modal is open. Show a toast so the failure isn't silent.
      showError(errorMsg || 'Could not save the category.');
    }
    finally { setLoading(false); }
  };

  const columns = [
    { header: "Sr. No", accessor: "serial_number" },
    { header: "Name", accessor: "name", cell: ({ name }) => <span className="cat-name-cell">{name}</span> },
    { header: "Description", accessor: "description", cell: ({ description }) => <span className="cat-desc-cell">{description}</span> },
    { header: "Brands", accessor: row => <BrandTags brands={row.brands || []} /> },
    { header: "Status", accessor: "status", cell: ({ status }) => <span className={`sl-status-badge sl-status-${status}`}>{status}</span> },
    {
      header: "Actions", accessor: "actions",
      cell: ({ id }) => (
        <div className="sl-actions">
          <button className="sl-btn-edit" title="Edit" disabled={editLoading} onClick={() => handleEdit(id)}>{IC.edit}</button>
          <button className="sl-btn-delete" title="Delete" onClick={() => handleDelete(id)}>{IC.trash}</button>
        </div>
      )
    }
  ];

  const activeCount = categories.filter(c => c.status === 'active').length;

  return (
    <>
      <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />
      {error && (
        <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '6px', padding: '12px 16px', margin: '16px', color: '#991B1B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
      )}
      <div className="dashboard-page">
        <div className="sl-page-header">
          <div className="sl-header-left">
            <div className="sl-header-icon">{IC.category}</div>
            <div>
              <h1 className="sl-page-title">Categories</h1>
              <p className="sl-page-sub">{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'} total</p>
            </div>
          </div>
          <div className="sl-header-right">
            <div className="sl-search-wrap">
              <span className="sl-search-icon">{IC.search}</span>
              <input type="text" className="sl-search-input" placeholder="Search categories..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ minWidth: 180 }}>
              <Select
                options={[
                  { value: '', label: 'All Brands' },
                  ...brands.map((b) => ({ value: b.slug, label: b.display_name || b.name })),
                ]}
                value={selectedBrandSlug}
                onChange={setSelectedBrandSlug}
                placeholder="All Brands"
              />
            </div>
            <div style={{ minWidth: 160 }}>
              <Select
                options={[
                  { value: '', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="All Status"
              />
            </div>
            <button className="sl-add-btn" onClick={() => { setFormData(EMPTY_FORM); setIsModalOpen(true); }}>
              <span className="sl-add-btn-icon">{IC.add}</span>Add Category
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="sl-stat-cards">
          <div className="sl-stat-card">
            <div className="sl-stat-icon sl-stat-icon--blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </div>
            <div className="sl-stat-body">
              <span className="sl-stat-label">Total Categories</span>
              <span className="sl-stat-value">{categories.length}</span>
            </div>
          </div>
          <div className="sl-stat-card">
            <div className="sl-stat-icon sl-stat-icon--green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div className="sl-stat-body">
              <span className="sl-stat-label">Active</span>
              <span className="sl-stat-value">{activeCount}</span>
            </div>
          </div>
        </div>

        <div className="sl-table-wrap">
          {loading ? (
            <div className="sl-loader-wrap"><Loader /></div>
          ) : filteredData.length === 0 ? (
            <div className="sl-empty">
              <div className="sl-empty-icon">{IC.category}</div>
              <p>{search ? "No categories match your search" : "No categories yet"}</p>
            </div>
          ) : (
            <>
              <Table columns={columns} data={currentItems} striped hoverable />
              {filteredData.length > itemsPerPage && (
                <div className="sl-pagination">
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={formData.id ? "Edit Category" : "Add Category"} closeOnOverlayClick={false}
        footer={
          <>
            <Button variant="secondary" size="medium" onClick={handleModalClose} disabled={loading} type="button">Cancel</Button>
            <Button variant="primary" size="medium" onClick={handleSubmit} disabled={loading} type="button">{loading ? "Saving..." : formData.id ? "Update Category" : "Add Category"}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="seo-form">
          <div className="modal-body">
            <div className="dm-field">
              <label className="dm-label">Category Name <span className="dm-required">*</span></label>
              <input className="dm-input" type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., Footwear" required style={formErrors.name ? { borderColor: '#dc2626' } : {}} />
              {formErrors.name && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.name}</span>}
            </div>
            <div className="dm-field">
              <label className="dm-label">Description <span className="dm-required">*</span></label>
              <textarea className="dm-input dm-textarea" name="description" value={formData.description} onChange={handleInputChange} placeholder="Short description..." required style={formErrors.description ? { borderColor: '#dc2626' } : {}} />
              {formErrors.description && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.description}</span>}
            </div>
            <div className="dm-2col">
              <div className="dm-field">
                <label className="dm-label">Status <span className="dm-required">*</span></label>
                <Select
                  options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
                  value={formData.status}
                  onChange={v => setFormData(prev => ({ ...prev, status: v }))}
                  required
                />
              </div>
              <div className="dm-field">
                <label className="dm-label">Meta Keywords</label>
                <input className="dm-input" type="text" name="metaKeywords" value={formData.metaKeywords} onChange={handleInputChange} placeholder="keyword1, keyword2" />
              </div>
            </div>

            {/* ── SEO ── */}
            <div style={{ marginTop: 8, padding: 12, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ds-color-text)', marginBottom: 8 }}>SEO</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                Empty fields fall back to the category name and description on the live page.
              </div>

              <div className="dm-field">
                <label className="dm-label">Meta Title</label>
                <input className="dm-input" type="text" name="metaTitle" value={formData.metaTitle} onChange={handleInputChange} placeholder={`Auto: ${formData.name || 'Category Name'} | CrossCoin`} />
                <SeoLengthMeter value={formData.metaTitle || ''} type="title" />
              </div>

              <div className="dm-field">
                <label className="dm-label">Meta Description</label>
                <textarea className="dm-input dm-textarea" name="metaDescription" value={formData.metaDescription} onChange={handleInputChange} placeholder="Auto: first 160 chars of category description" />
                <SeoLengthMeter value={formData.metaDescription || ''} type="description" />
              </div>

              <div className="dm-2col">
                <div className="dm-field">
                  <label className="dm-label">OG Image URL</label>
                  <input className="dm-input" type="text" name="ogImage" value={formData.ogImage} onChange={handleInputChange} placeholder="Auto: category image" />
                </div>
                <div className="dm-field">
                  <label className="dm-label">Canonical URL</label>
                  <input className="dm-input" type="text" name="canonicalUrl" value={formData.canonicalUrl} onChange={handleInputChange} placeholder={`Auto: https://crosscoin.in/collections/${formData.slug || '<slug>'}`} />
                </div>
              </div>

              <div className="dm-field">
                <label className="dm-label">Structured Data (JSON-LD) — optional override</label>
                <textarea className="dm-input dm-textarea" name="structuredData" value={formData.structuredData} onChange={handleInputChange} placeholder="Auto: CollectionPage + ItemList of all category products" />
              </div>

              <div className="dm-field">
                <label className="dm-checkbox-label" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={!!formData.seoIndex} onChange={e => setFormData(prev => ({ ...prev, seoIndex: e.target.checked }))} />
                  <span>Allow Google to index this category (uncheck for sale-ended or deprecated categories)</span>
                </label>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>LIVE SEARCH PREVIEW</div>
                <SerpPreview
                  title={formData.metaTitle || `${formData.name || 'Category'} | CrossCoin`}
                  description={formData.metaDescription || (formData.description || '').slice(0, 160)}
                  url={formData.canonicalUrl || `https://crosscoin.in/collections/${formData.slug || formData.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || ''}`}
                  variant="both"
                />
              </div>
            </div>

            <div className="dm-field">
              <BrandAssignment selectedBrands={formData.brandIds || []} onChange={brandIds => setFormData(prev => ({ ...prev, brandIds }))} disabled={loading} />
            </div>
            <div className="dm-field">
              <label className="dm-label">Category Image {!formData.id && <span className="dm-required">*</span>}</label>
              <div className="dm-file-upload">
                <div className="dm-file-upload-icon">{IC.image}</div>
                <div className="dm-file-upload-text">
                  <span className="dm-file-upload-title">{formData.image instanceof File ? formData.image.name : formData.image ? "Current image" : "Choose image"}</span>
                  <span className="dm-file-upload-sub">PNG, JPG, WEBP up to 5MB</span>
                </div>
                <input type="file" accept="image/*" name="image" onChange={handleInputChange} required={!formData.id} />
              </div>
              {formData.image && (
                <div className="dm-img-preview">
                  <img
                    src={
                      formData.image instanceof File
                        ? URL.createObjectURL(formData.image)
                        : typeof formData.image === 'string' && formData.image.startsWith('http')
                          ? formData.image
                          : `${process.env.NEXT_PUBLIC_API_URL}${formData.image}`
                    }
                    alt="Preview"
                  />
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
