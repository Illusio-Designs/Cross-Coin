import { useState, useEffect, useCallback } from "react";
import { Button, Input, Modal, Table, Pagination } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import BrandTags from "../../../components/Dashboard/BrandTags";
import BrandAssignment from "../../../components/Dashboard/BrandAssignment";
import { categoryService } from "../../../services";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryService.getAllCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
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
      const data = await categoryService.getCategoryById(id);
      setFormData({ id: data.id, name: data.name || "", description: data.description || "", status: data.status || "active", metaKeywords: data.metaKeywords || "", image: data.image || null, brandIds: data.brands?.map(b => b.id) || [1] });
      setIsModalOpen(true);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      setLoading(true);
      await categoryService.deleteCategory(id);
      await fetchCategories();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
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
      const fd = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'image' && formData[key] instanceof File) fd.append('image', formData[key]);
        else if (key === 'brandIds') fd.append('brandIds', JSON.stringify(formData[key] || [1]));
        else if (key !== 'id' && formData[key] !== null && formData[key] !== undefined) fd.append(key, formData[key]);
      });
      if (formData.id) await categoryService.updateCategory(formData.id, fd);
      else await categoryService.createCategory(fd);
      await fetchCategories();
      handleModalClose();
    } catch (err) { console.error(err); }
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
            <select className="pay-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
            <Input label="Category Name" type="text" name="name" value={formData.name} onChange={handleInputChange} required />
            <Input label="Description" type="textarea" name="description" value={formData.description} onChange={handleInputChange} required />
            <Input label="Status" type="select" name="status" value={formData.status} onChange={handleInputChange} required options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
            <Input label="Meta Keywords" type="text" name="metaKeywords" value={formData.metaKeywords} onChange={handleInputChange} />
            <BrandAssignment selectedBrands={formData.brandIds || []} onChange={brandIds => setFormData(prev => ({ ...prev, brandIds }))} disabled={loading} />
            <div className="sl-form-field">
              <label className="sl-form-label">Category Image {!formData.id && <span className="sl-required">*</span>}</label>
              <input type="file" accept="image/*" name="image" onChange={handleInputChange} className="sl-file-input" required={!formData.id} />
              {formData.image && (
                <div className="sl-img-preview-wrap">
                  <img src={typeof formData.image === 'string' ? `${process.env.NEXT_PUBLIC_API_URL}${formData.image}` : URL.createObjectURL(formData.image)} alt="Preview" className="sl-img-preview" />
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" size="medium" onClick={handleModalClose} disabled={loading} type="button">Cancel</Button>
            <Button type="submit" variant="primary" size="medium" disabled={loading}>{loading ? "Saving..." : "Save Category"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
