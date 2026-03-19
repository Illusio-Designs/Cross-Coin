import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Table, Pagination } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { sliderService, categoryService, brandService } from "../../../services";
import { useRouter } from 'next/router';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-hot-toast';

const IC = {
  add: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  image: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  slides: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8"/><path d="M12 3v4"/></svg>,
};

const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (imagePath.includes('localhost')) {
    return imagePath.replace(/http:\/\/localhost(:\d+)?/, 'https://api.crosscoin.in');
  }
  return imagePath;
};

const EMPTY_FORM = {
  title: "", description: "", status: "active",
  image: null, categoryId: "", buttonText: "",
  brand_id: "", brand_ids: [],
};

export default function Slider() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sliders, setSliders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) router.push('/dashboard');
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          categoryService.getAllCategories(),
          brandService.getAllBrands(true),
        ]);
        setCategories(Array.isArray(catRes) ? catRes : []);
        if (brandRes.success && brandRes.data) setBrands(brandRes.data);
      } catch {}
    };
    fetchMeta();
  }, []);

  const fetchSliders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await sliderService.getAllSliders();
      setSliders(Array.isArray(res) ? res : (res.sliders || []));
    } catch (err) {
      setError(err.message || "Failed to fetch sliders");
      toast.error(err.message || "Failed to fetch sliders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSliders(); }, [fetchSliders]);

  const filteredData = sliders.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (item.title?.toLowerCase().includes(s)) ||
           (item.description?.toLowerCase().includes(s)) ||
           (item.categoryName?.toLowerCase().includes(s));
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(start, start + itemsPerPage).map((item, i) => ({
    ...item, serial_number: start + i + 1,
  }));

  useEffect(() => { setCurrentPage(1); }, [search]);

  const handleEdit = async (id) => {
    try {
      setLoading(true);
      const res = await sliderService.getSliderById(id);
      const data = res.slider || res;
      const brandIds = data.brands?.map(b => typeof b === 'object' ? b.id : b) || (data.brand_id ? [data.brand_id] : []);
      setFormData({ id: data.id, title: data.title || "", description: data.description || "",
        status: data.status || "active", categoryId: data.categoryId || "",
        image: data.image || null, buttonText: data.buttonText || "",
        brand_id: data.brand_id || "", brand_ids: brandIds });
      setIsModalOpen(true);
    } catch (err) { toast.error(err.message || "Failed to load slider"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this slider?")) return;
    try {
      setLoading(true);
      await sliderService.deleteSlider(id);
      await fetchSliders();
      toast.success("Slider deleted");
    } catch (err) { toast.error(err.message || "Failed to delete"); }
    finally { setLoading(false); }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setFormData(EMPTY_FORM);
    const fi = document.querySelector('input[type="file"][name="image"]');
    if (fi) fi.value = "";
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'file') {
      setFormData(p => ({ ...p, [name]: e.target.files?.[0] || null }));
    } else if (name === 'brand_ids') {
      setFormData(p => ({ ...p, brand_ids: Array.from(e.target.selectedOptions, o => parseInt(o.value)) }));
    } else {
      setFormData(p => ({ ...p, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("title", formData.title);
      fd.append("description", formData.description);
      fd.append("categoryId", formData.categoryId);
      fd.append("status", formData.status);
      fd.append("buttonText", formData.buttonText);
      if (formData.brand_ids?.length > 0) fd.append("brand_id", formData.brand_ids[0]);
      else if (formData.brand_id) fd.append("brand_id", formData.brand_id);
      if (formData.image instanceof File) fd.append("image", formData.image);

      if (formData.id) {
        await sliderService.updateSlider(formData.id, fd);
        if (formData.brand_ids?.length > 0) await sliderService.assignSliderToBrands(formData.id, formData.brand_ids);
        toast.success("Slider updated");
      } else {
        const res = await sliderService.createSlider(fd);
        const sliderId = res.data?.id || res.id;
        if (sliderId && formData.brand_ids?.length > 0) await sliderService.assignSliderToBrands(sliderId, formData.brand_ids);
        toast.success("Slider created");
      }
      handleModalClose();
      fetchSliders();
    } catch (err) { toast.error(err.message || "Failed to save slider"); }
    finally { setLoading(false); }
  };

  const columns = [
    { header: "Sr. No", accessor: "serial_number" },
    {
      header: "Preview",
      accessor: "image",
      cell: ({ image }) => {
        const url = getImageUrl(image);
        return (
          <div className="sl-thumb-wrap">
            {url
              ? <img src={url} alt="Slider" className="sl-thumb" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} crossOrigin="anonymous" data-no-optimize="true" />
              : null}
            <div className="sl-thumb-empty" style={{ display: url ? 'none' : 'flex' }}>{IC.image}</div>
          </div>
        );
      }
    },
    { header: "Title", accessor: "title", cell: ({ title }) => <span className="sl-title-cell">{title}</span> },
    { header: "Description", accessor: "description", cell: ({ description }) => <span className="sl-desc-cell">{description}</span> },
    { header: "Category", accessor: "categoryName", cell: ({ categoryName }) => categoryName ? <span className="sl-cat-badge">{categoryName}</span> : <span className="sl-na">—</span> },
    {
      header: "Brands",
      accessor: "id",
      cell: (row) => {
        const sliderBrands = row.brands || [];
        if (sliderBrands.length > 0) {
          return (
            <div className="sl-brands-wrap">
              {sliderBrands.map((b, i) => (
                <span key={i} className="sl-brand-tag">{typeof b === 'string' ? b : (b.name || b.display_name || 'Unknown')}</span>
              ))}
            </div>
          );
        }
        const brand = brands.find(b => b.id === row.brand_id);
        return brand ? <span className="sl-brand-tag">{brand.display_name || brand.name}</span> : <span className="sl-na">—</span>;
      }
    },
    {
      header: "Status",
      accessor: "status",
      cell: ({ status }) => (
        <span className={`sl-status-badge sl-status-${status}`}>{status}</span>
      )
    },
    {
      header: "Actions",
      accessor: "actions",
      cell: ({ id }) => (
        <div className="sl-actions">
          <button className="sl-btn-edit" title="Edit" onClick={() => handleEdit(id)}>{IC.edit}</button>
          <button className="sl-btn-delete" title="Delete" onClick={() => handleDelete(id)}>{IC.trash}</button>
        </div>
      )
    }
  ];

  if (authLoading) return <div style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader /></div>;
  if (!user || user.role !== 'admin') return null;

  return (
    <>
      <div className="dashboard-page">

        {/* Page Header */}
        <div className="sl-page-header">
          <div className="sl-header-left">
            <div className="sl-header-icon">{IC.slides}</div>
            <div>
              <h1 className="sl-page-title">Slider Management</h1>
              <p className="sl-page-sub">{sliders.length} slider{sliders.length !== 1 ? 's' : ''} total</p>
            </div>
          </div>
          <div className="sl-header-right">
            <div className="sl-search-wrap">
              <span className="sl-search-icon">{IC.search}</span>
              <input
                type="text"
                className="sl-search-input"
                placeholder="Search sliders..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="sl-add-btn" onClick={() => { setFormData(EMPTY_FORM); setIsModalOpen(true); }}>
              <span className="sl-add-btn-icon">{IC.add}</span>
              Add Slider
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="sl-table-wrap">
          {loading ? (
            <div className="sl-loader-wrap"><Loader /></div>
          ) : error ? (
            <div className="sl-error">{error}</div>
          ) : filteredData.length === 0 ? (
            <div className="sl-empty">
              <div className="sl-empty-icon">{IC.slides}</div>
              <p>{search ? "No sliders match your search" : "No sliders yet — add your first one"}</p>
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

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={formData.id ? "Edit Slider" : "Add New Slider"} closeOnOverlayClick={false}>
        <form onSubmit={handleSubmit} className="seo-form">
          <div className="modal-body">
            <div className="dm-field">
              <label className="dm-label">Title <span className="dm-required">*</span></label>
              <input className="dm-input" type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="Slider title..." required />
            </div>
            <div className="dm-field">
              <label className="dm-label">Description <span className="dm-required">*</span></label>
              <textarea className="dm-input dm-textarea" name="description" value={formData.description} onChange={handleInputChange} placeholder="Short description..." required />
            </div>
            <div className="dm-2col">
              <div className="dm-field">
                <label className="dm-label">Category</label>
                <select className="dm-input dm-select" name="categoryId" value={formData.categoryId} onChange={handleInputChange}>
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="dm-field">
                <label className="dm-label">Status <span className="dm-required">*</span></label>
                <select className="dm-input dm-select" name="status" value={formData.status} onChange={handleInputChange} required>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="dm-field">
              <label className="dm-label">Button Text</label>
              <input className="dm-input" type="text" name="buttonText" value={formData.buttonText} onChange={handleInputChange} placeholder="e.g., Shop Now" />
            </div>
            <div className="dm-field">
              <label className="dm-label">Brands <span className="dm-hint">(Hold Ctrl/Cmd for multiple)</span></label>
              <select name="brand_ids" multiple value={formData.brand_ids} onChange={handleInputChange} className="dm-multi-select" required>
                {brands.map(b => <option key={b.id} value={b.id}>{b.display_name || b.name}</option>)}
              </select>
              {formData.brand_ids?.length > 0 && (
                <div className="dm-selected-tags">
                  {formData.brand_ids.map(id => {
                    const b = brands.find(x => x.id === id);
                    return b ? <span key={id} className="sl-brand-tag">{b.display_name || b.name}</span> : null;
                  })}
                </div>
              )}
            </div>
            <div className="dm-field">
              <label className="dm-label">Slider Image {!formData.id && <span className="dm-required">*</span>}</label>
              <div className="dm-file-upload">
                <div className="dm-file-upload-icon">{IC.image}</div>
                <div className="dm-file-upload-text">
                  <span className="dm-file-upload-title">{formData.image instanceof File ? formData.image.name : formData.image ? "Current image" : "Choose image"}</span>
                  <span className="dm-file-upload-sub">PNG, JPG, WEBP — recommended 1920×600</span>
                </div>
                <input type="file" accept="image/*" name="image" onChange={handleInputChange} required={!formData.id} key={formData.id || 'new'} />
              </div>
              {formData.image && (
                <div className="dm-img-preview">
                  <img src={typeof formData.image === 'string' ? getImageUrl(formData.image) : URL.createObjectURL(formData.image)} alt="Preview" />
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" size="medium" onClick={handleModalClose} disabled={loading} type="button">Cancel</Button>
            <Button type="submit" variant="primary" size="medium" disabled={loading}>{loading ? "Saving..." : formData.id ? "Update Slider" : "Add Slider"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
