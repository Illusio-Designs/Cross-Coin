import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Table, Pagination, Select } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from '../../../components/common/AlertModal';
import BrandTags from "../../../components/Dashboard/BrandTags";
import BrandAssignment from "../../../components/Dashboard/BrandAssignment";
import { categoryService } from "../../../services";
import { extractErrorMessage, formatErrorForDisplay } from "../../../utils/errorMessages";

const IC = {
  add: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  image: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  category: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
};

const EMPTY_FORM = { name: "", description: "", status: "active", metaKeywords: "", image: null, brandIds: [1] };

export default function Categories() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryService.getAllCategories();
      setCategories(data);
    } catch (err) {
      const errorMsg = formatErrorForDisplay(extractErrorMessage(err));
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { setCurrentPage(1); }, [search]);

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
      setLoading(true);
      setError(null);
      const data = await categoryService.getCategoryById(id);
      setFormData({ id: data.id, name: data.name || "", description: data.description || "", status: data.status || "active", metaKeywords: data.metaKeywords || "", image: data.image || null, brandIds: data.brands?.map(b => Number(b.id)).filter(Boolean) || [] });
      setIsModalOpen(true);
    } catch (err) {
      const errorMsg = formatErrorForDisplay(extractErrorMessage(err));
      setError(errorMsg);
    }
    finally { setLoading(false); }
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
    setFormData(prev => ({ ...prev, [name]: type === 'file' ? e.target.files[0] : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      if (formData.id) await categoryService.updateCategory(formData.id, fd);
      else await categoryService.createCategory(fd);
      await fetchCategories();
      handleModalClose();
    } catch (err) {
      const errorMsg = formatErrorForDisplay(extractErrorMessage(err));
      setError(errorMsg);
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
          <button className="sl-btn-edit" title="Edit" onClick={() => handleEdit(id)}>{IC.edit}</button>
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
            <button className="sl-add-btn" onClick={() => { setFormData(EMPTY_FORM); setIsModalOpen(true); }}>
              <span className="sl-add-btn-icon">{IC.add}</span>Add Category
            </button>
            <Select
              options={[{ value: '', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="All Status"
            />
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

      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={formData.id ? "Edit Category" : "Add Category"} closeOnOverlayClick={false}>
        <form onSubmit={handleSubmit} className="seo-form">
          <div className="modal-body">
            <div className="dm-field">
              <label className="dm-label">Category Name <span className="dm-required">*</span></label>
              <input className="dm-input" type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., Footwear" required />
            </div>
            <div className="dm-field">
              <label className="dm-label">Description <span className="dm-required">*</span></label>
              <textarea className="dm-input dm-textarea" name="description" value={formData.description} onChange={handleInputChange} placeholder="Short description..." required />
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
          <div className="modal-footer">
            <Button variant="secondary" size="medium" onClick={handleModalClose} disabled={loading} type="button">Cancel</Button>
            <Button type="submit" variant="primary" size="medium" disabled={loading}>{loading ? "Saving..." : formData.id ? "Update Category" : "Add Category"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
