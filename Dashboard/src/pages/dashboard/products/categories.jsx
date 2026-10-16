import { useState, useEffect, useCallback } from "react";
import { Button, Input, Modal, Pagination, Select, Switch, Badge } from "../../../components/ui";
import { PageHeader, Panel, StatGrid, StatTile, FilterBar, ResponsiveTable } from "../../../components/Dashboard/primitives";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from '../../../components/common/AlertModal';
import BrandTags from "../../../components/Dashboard/BrandTags";
import BrandAssignment from "../../../components/Dashboard/BrandAssignment";
import { categoryService } from "../../../services";
import { brandService } from "../../../services";
import { extractErrorMessage, formatErrorForDisplay } from "../../../utils/errorMessages";
import { showSuccess, showError } from "../../../utils/toastNotification";
import { validateForm, isFormValid } from "../../../utils/formValidation";
import SerpPreview, { brandSiteName, brandUrl } from "../../../components/common/SerpPreview";
import SeoLengthMeter from "../../../components/common/SeoLengthMeter";
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, PencilEdit02Icon, Delete02Icon, Image02Icon } from '@hugeicons/core-free-icons';

const IC = {
  add: <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />,
  edit: <HugeiconsIcon icon={PencilEdit02Icon} size={16} strokeWidth={2} />,
  trash: <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} />,
  image: <HugeiconsIcon icon={Image02Icon} size={20} strokeWidth={2} />,
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

  // Brand backing the SERP preview — the category's first assigned brand, so the
  // preview reflects that brand's domain/name instead of a hardcoded CrossCoin.
  const previewBrand = brands.find(b => Number(b.id) === Number(formData.brandIds?.[0]));

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
    { key: "serial_number", label: "Sr. No", render: (r) => r.serial_number },
    { key: "name", label: "Name", render: (r) => <span className="cat-name-cell">{r.name}</span> },
    { key: "description", label: "Description", render: (r) => <span className="cat-desc-cell">{r.description}</span> },
    { key: "brands", label: "Brands", render: (r) => <BrandTags brands={r.brands || []} /> },
    { key: "status", label: "Status", render: (r) => <Badge variant={r.status === 'active' ? 'success' : 'default'}>{r.status}</Badge> },
    {
      key: "actions", label: "Actions",
      render: ({ id }) => (
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
        <div role="alert" style={{ backgroundColor: 'var(--ds-color-danger-bg)', border: '1px solid var(--ds-color-danger)', borderRadius: '6px', padding: '12px 16px', margin: '16px', color: 'var(--ds-color-danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
      )}
      <div className="dashboard-page">
        <PageHeader
          title="Categories"
          subtitle={`${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'} total`}
          actions={
            <button className="ds-btn ds-btn--primary" onClick={() => { setFormData(EMPTY_FORM); setIsModalOpen(true); }}>
              {IC.add}Add Category
            </button>
          }
        />

        <StatGrid>
          <StatTile label="Total Categories" value={categories.length} tone="info" />
          <StatTile label="Active" value={activeCount} tone="good" />
        </StatGrid>

        <Panel style={{ marginBottom: 16 }}>
        <FilterBar search={search} onSearchChange={setSearch} placeholder="Search categories...">
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
        </FilterBar>
        </Panel>

        <Panel flush>
          {loading ? (
            <div className="sl-loader-wrap"><Loader /></div>
          ) : (
            <>
              <ResponsiveTable
                columns={columns}
                data={currentItems}
                rowKey="id"
                emptyMessage={search ? "No categories match your search" : "No categories yet"}
              />
              {filteredData.length > itemsPerPage && (
                <div className="sl-pagination">
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </Panel>
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
            <Input
              label="Category Name"
              required
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Footwear"
              error={formErrors.name}
            />
            <Input
              label="Description"
              required
              multiline
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Short description..."
              error={formErrors.description}
            />
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
              <Input
                label="Meta Keywords"
                name="metaKeywords"
                value={formData.metaKeywords}
                onChange={handleInputChange}
                placeholder="keyword1, keyword2"
              />
            </div>

            {/* ── SEO ── */}
            <div style={{ marginTop: 8, padding: 12, background: 'var(--ds-color-surface-soft)', border: '1px solid var(--ds-color-border)', borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ds-color-text)', marginBottom: 8 }}>SEO</div>
              <div style={{ fontSize: 12, color: 'var(--ds-color-text-muted)', marginBottom: 12 }}>
                Empty fields fall back to the category name and description on the live page.
              </div>

              <div className="dm-field">
                <Input
                  label="Meta Title"
                  name="metaTitle"
                  value={formData.metaTitle}
                  onChange={handleInputChange}
                  placeholder={`Auto: ${formData.name || 'Category Name'} | CrossCoin`}
                />
                <SeoLengthMeter value={formData.metaTitle || ''} type="title" />
              </div>

              <div className="dm-field">
                <Input
                  label="Meta Description"
                  multiline
                  rows={3}
                  name="metaDescription"
                  value={formData.metaDescription}
                  onChange={handleInputChange}
                  placeholder="Auto: first 160 chars of category description"
                />
                <SeoLengthMeter value={formData.metaDescription || ''} type="description" />
              </div>

              <div className="dm-2col">
                <Input
                  label="OG Image URL"
                  name="ogImage"
                  value={formData.ogImage}
                  onChange={handleInputChange}
                  placeholder="Auto: category image"
                />
                <Input
                  label="Canonical URL"
                  name="canonicalUrl"
                  value={formData.canonicalUrl}
                  onChange={handleInputChange}
                  placeholder={`Auto: https://crosscoin.in/collections/${formData.slug || '<slug>'}`}
                />
              </div>

              <Input
                label="Structured Data (JSON-LD) — optional override"
                multiline
                rows={3}
                name="structuredData"
                value={formData.structuredData}
                onChange={handleInputChange}
                placeholder="Auto: CollectionPage + ItemList of all category products"
              />

              <div className="dm-field">
                <Switch
                  checked={!!formData.seoIndex}
                  onChange={(checked) => setFormData(prev => ({ ...prev, seoIndex: checked }))}
                  label="Allow Google to index this category (uncheck for sale-ended or deprecated categories)"
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ds-color-text-muted)', marginBottom: 6 }}>LIVE SEARCH PREVIEW</div>
                <SerpPreview
                  title={formData.metaTitle || `${formData.name || 'Category'} | ${brandSiteName(previewBrand)}`}
                  description={formData.metaDescription || (formData.description || '').slice(0, 160)}
                  siteName={brandSiteName(previewBrand)}
                  url={formData.canonicalUrl || brandUrl(previewBrand, 'collections/' + (formData.slug || formData.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || ''))}
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
