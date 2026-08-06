import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Table, Pagination, Input, Select } from "../../../components/ui";
import { PageHeader, Panel, StatTile, StatGrid, FilterBar, EmptyState } from "../../../components/Dashboard/primitives";
import Loader from "../../../components/common/Loader";
import { sliderService, categoryService, brandService } from "../../../services";
import BrandAssignment from '../../../components/Dashboard/BrandAssignment';
import { useRouter } from 'next/router';
import { useAuth } from '../../../context/AuthContext';
import { showSuccess, showError } from "../../../utils/toastNotification";
import { ConfirmModal } from '../../../components/common/AlertModal';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Search01Icon, PencilEdit02Icon, Delete02Icon, Image02Icon, SlideIcon } from '@hugeicons/core-free-icons';

const IC = {
  add: <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />,
  search: <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />,
  edit: <HugeiconsIcon icon={PencilEdit02Icon} size={16} strokeWidth={2} />,
  trash: <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} />,
  image: <HugeiconsIcon icon={Image02Icon} size={20} strokeWidth={2} />,
  slides: <HugeiconsIcon icon={SlideIcon} size={20} strokeWidth={2} />,
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
  const [confirmState, setConfirmState] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false); // opening edit must not reload the table
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
      showError('loadingFailed', err.message);
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
      setEditLoading(true);
      const res = await sliderService.getSliderById(id);
      const data = res.slider || res;
      const brandIds = data.brands?.map(b => Number(typeof b === 'object' ? b.id : b)).filter(Boolean) || (data.brand_id ? [Number(data.brand_id)] : []);
      setFormData({ id: data.id, title: data.title || "", description: data.description || "",
        status: data.status || "active", categoryId: data.categoryId || "",
        image: data.image || null, buttonText: data.buttonText || "",
        brand_id: data.brand_id || "", brand_ids: brandIds });
      setIsModalOpen(true);
    } catch (err) { showError('loadingFailed', err.message); }
    finally { setEditLoading(false); }
  };

  const handleDelete = (id) => {
    setConfirmState({ message: "Delete this slider?", onConfirm: async () => {
      setConfirmState(null);
      try {
        setLoading(true);
        await sliderService.deleteSlider(id);
        await fetchSliders();
        showSuccess('deleteSuccess');
      } catch (err) { showError('deleteFailed', err.message); }
      finally { setLoading(false); }
    }});
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
        // Always update brand assignments (even if empty — to remove all)
        await sliderService.assignSliderToBrands(formData.id, formData.brand_ids || []);
        showSuccess('updateSuccess');
      } else {
        const res = await sliderService.createSlider(fd);
        const sliderId = res.data?.id || res.id;
        if (sliderId) await sliderService.assignSliderToBrands(sliderId, formData.brand_ids || []);
        showSuccess('createSuccess');
      }
      handleModalClose();
      fetchSliders();
    } catch (err) { showError('saveFailed', err.message); }
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
      <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />
      <div className="dashboard-page">
        <PageHeader
          title="Slider Management"
          subtitle={`${sliders.length} slider${sliders.length !== 1 ? 's' : ''} total`}
          actions={
            <Button variant="primary" onClick={() => { setFormData(EMPTY_FORM); setIsModalOpen(true); }}>+ Add Slider</Button>
          }
        />

        <Panel>
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search sliders…"
          />
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Loader /></div>
          ) : error ? (
            <EmptyState title="Couldn't load sliders" message={error} />
          ) : filteredData.length === 0 ? (
            <EmptyState
              icon={IC.slides}
              title={search ? "No sliders match your search" : "No sliders yet"}
              message={search ? "Try a different search term." : "Add your first hero slider to start customizing the homepage."}
              action={!search && <Button variant="primary" onClick={() => { setFormData(EMPTY_FORM); setIsModalOpen(true); }}>+ Add Slider</Button>}
            />
          ) : (
            <>
              <Table columns={columns} data={currentItems} striped hoverable />
              {filteredData.length > itemsPerPage && (
                <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}>
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </Panel>
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={formData.id ? "Edit Slider" : "Add New Slider"} closeOnOverlayClick={false}>
        <form onSubmit={handleSubmit} className="seo-form">
          <div className="modal-body">
            <Input
              label="Title"
              required
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Slider title..."
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
            />
            <div className="dm-2col">
              <Select
                label="Category"
                options={[{ value: '', label: 'Select Category' }, ...categories.map(c => ({ value: String(c.id), label: c.name }))]}
                value={formData.categoryId ? String(formData.categoryId) : ''}
                onChange={v => setFormData(p => ({ ...p, categoryId: v }))}
                searchable
              />
              <Select
                label="Status"
                required
                options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
                value={formData.status}
                onChange={v => setFormData(p => ({ ...p, status: v }))}
              />
            </div>
            <Input
              label="Button Text"
              name="buttonText"
              value={formData.buttonText}
              onChange={handleInputChange}
              placeholder="e.g., Shop Now"
            />
            <div className="dm-field">
              <BrandAssignment
                selectedBrands={formData.brand_ids || []}
                onChange={brandIds => setFormData(p => ({ ...p, brand_ids: brandIds }))}
                disabled={loading}
              />
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
