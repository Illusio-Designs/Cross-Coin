import { useEffect, useState } from "react";
import { lookbookService } from "../../../services";
import { showError, showSuccess } from "../../../utils/toastNotification";
import { Button, Modal, Table } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from "../../../components/common/AlertModal";

const EMPTY_FORM    = { title: "", description: "", status: "active", display_order: 0 };
const EMPTY_IMG     = { lookbookId: "", image: null, alt_text: "", display_order: 0 };
const EMPTY_HOTSPOT = { imageId: "", product_id: "", position_x: "", position_y: "", label: "" };

export default function AdminLookbooks() {
  const [loading, setLoading]           = useState(false);
  const [lookbooks, setLookbooks]       = useState([]);
  const [products, setProducts]         = useState([]);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [imgModalOpen, setImgModalOpen] = useState(false);
  const [hotspotOpen, setHotspotOpen]   = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [imgForm, setImgForm]           = useState(EMPTY_IMG);
  const [hotspotForm, setHotspotForm]   = useState(EMPTY_HOTSPOT);
  const [confirmState, setConfirmState] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [lbRes, prodRes] = await Promise.all([
        lookbookService.getAdminLookbooks(),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in"}/api/products?page=1&limit=500`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        }).then(r => r.json()).then(d => Array.isArray(d?.products) ? d.products : []),
      ]);
      setLookbooks(Array.isArray(lbRes?.data) ? lbRes.data : []);
      setProducts(prodRes);
    } catch (e) { showError("loadingFailed", e?.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await lookbookService.createLookbook(form);
      showSuccess("createSuccess");
      setForm(EMPTY_FORM);
      setIsModalOpen(false);
      load();
    } catch (e) { showError("saveFailed", e?.message); }
  };

  const handleUploadImage = async (e) => {
    e.preventDefault();
    if (!imgForm.lookbookId || !imgForm.image) return showError("fieldRequired");
    try {
      const fd = new FormData();
      fd.append("image", imgForm.image);
      fd.append("alt_text", imgForm.alt_text || "");
      fd.append("display_order", String(imgForm.display_order || 0));
      await lookbookService.uploadLookbookImage(imgForm.lookbookId, fd);
      showSuccess("uploadSuccess");
      setImgForm(EMPTY_IMG);
      setImgModalOpen(false);
      load();
    } catch (e) { showError("saveFailed", e?.message); }
  };

  const handleAddHotspot = async (e) => {
    e.preventDefault();
    try {
      await lookbookService.addHotspot(hotspotForm.imageId, hotspotForm);
      showSuccess("createSuccess");
      setHotspotForm(EMPTY_HOTSPOT);
      setHotspotOpen(false);
      load();
    } catch (e) { showError("saveFailed", e?.message); }
  };

  const handleDelete = (id) => {
    setConfirmState({ message: "Delete this lookbook?", onConfirm: async () => {
      setConfirmState(null);
      await lookbookService.deleteLookbook(id);
      showSuccess("deleteSuccess");
      load();
    }});
  };

  const columns = [
    { header: "Title",  cell: r => <strong>{r.title}</strong> },
    { header: "Status", cell: r => <span className={`sl-status-badge sl-status-${r.status}`}>{r.status}</span> },
    { header: "Images", cell: r => (r.Images || []).length },
    { header: "Order",  cell: r => r.display_order },
    { header: "Actions", cell: r => (
      <button className="sl-btn-delete" onClick={() => handleDelete(r.id)}>Delete</button>
    )},
  ];

  return (
    <div className="dashboard-page">
      <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />

      <div className="sl-page-header">
        <div className="sl-header-left">
          <div className="sl-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <div>
            <h1 className="sl-page-title">Lookbooks</h1>
            <p className="sl-page-sub">Create lookbooks, upload images, and add product hotspots.</p>
          </div>
        </div>
        <div className="sl-header-right">
          <button className="sl-add-btn" onClick={() => setHotspotOpen(true)}>
            <span className="sl-add-btn-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg></span>
            Add Hotspot
          </button>
          <button className="sl-add-btn" onClick={() => setImgModalOpen(true)}>
            <span className="sl-add-btn-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></span>
            Upload Image
          </button>
          <button className="sl-add-btn" onClick={() => setIsModalOpen(true)}>
            <span className="sl-add-btn-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
            Add Lookbook
          </button>
        </div>
      </div>

      {loading ? <div className="sl-loader-wrap"><Loader /></div> : (
        <Table columns={columns} data={lookbooks} emptyMessage="No lookbooks yet" />
      )}

      {/* Create Lookbook Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Lookbook">
        <form onSubmit={handleCreate}>
          <div className="modal-body">
            <div className="dm-field"><label className="dm-label">Title</label><input className="dm-input" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required /></div>
            <div className="dm-field"><label className="dm-label">Description</label><textarea className="dm-input" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} /></div>
            <div className="dm-field"><label className="dm-label">Status</label>
              <select className="dm-input dm-select" value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                <option value="draft">Draft</option><option value="active">Active</option>
              </select>
            </div>
            <div className="dm-field"><label className="dm-label">Display Order</label><input className="dm-input" type="number" value={form.display_order} onChange={e => setForm(p => ({...p, display_order: Number(e.target.value || 0)}))} /></div>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      {/* Upload Image Modal */}
      <Modal isOpen={imgModalOpen} onClose={() => setImgModalOpen(false)} title="Upload Lookbook Image">
        <form onSubmit={handleUploadImage}>
          <div className="modal-body">
            <div className="dm-field"><label className="dm-label">Lookbook</label>
              <select className="dm-input dm-select" value={imgForm.lookbookId} onChange={e => setImgForm(p => ({...p, lookbookId: e.target.value}))} required>
                <option value="">Select lookbook</option>
                {lookbooks.map(lb => <option key={lb.id} value={lb.id}>{lb.title}</option>)}
              </select>
            </div>
            <div className="dm-field"><label className="dm-label">Image</label><input className="dm-input" type="file" accept="image/*" onChange={e => setImgForm(p => ({...p, image: e.target.files?.[0] || null}))} required /></div>
            <div className="dm-field"><label className="dm-label">Alt Text</label><input className="dm-input" value={imgForm.alt_text} onChange={e => setImgForm(p => ({...p, alt_text: e.target.value}))} /></div>
            <div className="dm-field"><label className="dm-label">Display Order</label><input className="dm-input" type="number" value={imgForm.display_order} onChange={e => setImgForm(p => ({...p, display_order: Number(e.target.value || 0)}))} /></div>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setImgModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Upload</Button>
          </div>
        </form>
      </Modal>

      {/* Add Hotspot Modal */}
      <Modal isOpen={hotspotOpen} onClose={() => setHotspotOpen(false)} title="Add Hotspot">
        <form onSubmit={handleAddHotspot}>
          <div className="modal-body">
            <div className="dm-field"><label className="dm-label">Image</label>
              <select className="dm-input dm-select" value={hotspotForm.imageId} onChange={e => setHotspotForm(p => ({...p, imageId: e.target.value}))} required>
                <option value="">Select image</option>
                {lookbooks.flatMap(lb => (lb.Images || []).map(img => (
                  <option key={img.id} value={img.id}>{lb.title} — Image #{img.id}</option>
                )))}
              </select>
            </div>
            <div className="dm-field"><label className="dm-label">Product</label>
              <select className="dm-input dm-select" value={hotspotForm.product_id} onChange={e => setHotspotForm(p => ({...p, product_id: e.target.value}))} required>
                <option value="">Select product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="dm-field"><label className="dm-label">X Position (0–100)</label><input className="dm-input" type="number" min="0" max="100" step="0.1" value={hotspotForm.position_x} onChange={e => setHotspotForm(p => ({...p, position_x: e.target.value}))} required /></div>
            <div className="dm-field"><label className="dm-label">Y Position (0–100)</label><input className="dm-input" type="number" min="0" max="100" step="0.1" value={hotspotForm.position_y} onChange={e => setHotspotForm(p => ({...p, position_y: e.target.value}))} required /></div>
            <div className="dm-field"><label className="dm-label">Label</label><input className="dm-input" value={hotspotForm.label} onChange={e => setHotspotForm(p => ({...p, label: e.target.value}))} /></div>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setHotspotOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Add Hotspot</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
