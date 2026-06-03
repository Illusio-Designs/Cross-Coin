import { useEffect, useState } from "react";
import { reelService } from "../../../services";
import { showError, showSuccess } from "../../../utils/toastNotification";
import { Button, Modal, Table, Input, Select } from "../../../components/ui";
import { PageHeader, Panel, EmptyState } from "../../../components/Dashboard/primitives";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from "../../../components/common/AlertModal";

const IC = {
  edit:  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z"/></svg>,
  trash: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
};

const EMPTY_FORM   = { title: "", status: "active", display_order: 0, video: null, thumbnail: null };
const EMPTY_ASSIGN = { reelId: "", product_ids: "" };

export default function AdminReels() {
  const [loading, setLoading]         = useState(false);
  const [reels, setReels]             = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignOpen, setAssignOpen]   = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [assignForm, setAssignForm]   = useState(EMPTY_ASSIGN);
  const [confirmState, setConfirmState] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await reelService.getAdminReels();
      setReels(Array.isArray(res?.data) ? res.data : []);
    } catch (e) { showError("loadingFailed", e?.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.video) return showError("fieldRequired");
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("status", form.status);
      fd.append("display_order", String(form.display_order || 0));
      fd.append("video", form.video);
      if (form.thumbnail) fd.append("thumbnail", form.thumbnail);
      await reelService.createReel(fd);
      showSuccess("createSuccess");
      setForm(EMPTY_FORM);
      setIsModalOpen(false);
      load();
    } catch (e) { showError("saveFailed", e?.message); }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      const ids = assignForm.product_ids.split(",").map(v => parseInt(v.trim(), 10)).filter(v => Number.isFinite(v));
      if (!assignForm.reelId || ids.length === 0) return showError("fieldRequired");
      await reelService.assignProducts(assignForm.reelId, ids);
      showSuccess("updateSuccess");
      setAssignForm(EMPTY_ASSIGN);
      setAssignOpen(false);
      load();
    } catch (e) { showError("saveFailed", e?.message); }
  };

  const handleDelete = (id) => {
    setConfirmState({ message: "Delete this reel?", onConfirm: async () => {
      setConfirmState(null);
      await reelService.deleteReel(id);
      showSuccess("deleteSuccess");
      load();
    }});
  };

  const columns = [
    { header: "Title",    cell: r => <strong>{r.title}</strong> },
    { header: "Status",   cell: r => <span className={`sl-status-badge sl-status-${r.status}`}>{r.status}</span> },
    { header: "Products", cell: r => Array.isArray(r.Products) ? r.Products.length : 0 },
    { header: "Order",    cell: r => r.display_order },
    { header: "Actions",  cell: r => (
      <div className="sl-actions">
        <button className="sl-btn-edit" title="Edit" onClick={() => { setForm(p => ({ ...p, title: r.title, status: r.status, display_order: r.display_order })); setIsModalOpen(true); }}>{IC.edit}</button>
        <button className="sl-btn-delete" title="Delete" onClick={() => handleDelete(r.id)}>{IC.trash}</button>
      </div>
    )},
  ];

  return (
    <div className="dashboard-page">
      <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />

      <PageHeader
        title="Reels"
        subtitle="Create reels and assign products."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setAssignOpen(true)}>Assign Products</Button>
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>+ Add Reel</Button>
          </div>
        }
      />

      <Panel>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><Loader /></div>
        ) : reels.length === 0 ? (
          <EmptyState
            title="No reels yet"
            message="Create your first reel to feature shoppable short-form video on the storefront."
            action={<Button variant="primary" onClick={() => setIsModalOpen(true)}>+ Add Reel</Button>}
          />
        ) : (
          <Table columns={columns} data={reels} striped hoverable />
        )}
      </Panel>

      {/* Create Reel Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Reel">
        <form onSubmit={handleCreate}>
          <div className="modal-body">
            <Input label="Title" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required placeholder="Reel title..." />
            <Select label="Status" value={form.status} onChange={v => setForm(p => ({...p, status: v}))} options={[{ value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }]} />
            <Input label="Display Order" type="number" value={form.display_order} onChange={e => setForm(p => ({...p, display_order: Number(e.target.value || 0)}))} />
            <div className="dm-field">
              <label className="dm-label">Video (.mp4 / .webm) <span className="dm-required">*</span></label>
              <div className="dm-file-upload">
                <div className="dm-file-upload-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                </div>
                <div className="dm-file-upload-text">
                  <span className="dm-file-upload-title">{form.video instanceof File ? form.video.name : 'Choose video'}</span>
                  <span className="dm-file-upload-sub">MP4, WEBM</span>
                </div>
                <input type="file" accept="video/mp4,video/webm" onChange={e => setForm(p => ({...p, video: e.target.files?.[0] || null}))} required />
              </div>
            </div>
            <div className="dm-field">
              <label className="dm-label">Thumbnail (optional)</label>
              <div className="dm-file-upload">
                <div className="dm-file-upload-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <div className="dm-file-upload-text">
                  <span className="dm-file-upload-title">{form.thumbnail instanceof File ? form.thumbnail.name : 'Choose thumbnail'}</span>
                  <span className="dm-file-upload-sub">PNG, JPG, WEBP</span>
                </div>
                <input type="file" accept="image/*" onChange={e => setForm(p => ({...p, thumbnail: e.target.files?.[0] || null}))} />
              </div>
              {form.thumbnail instanceof File && (
                <div className="dm-img-preview">
                  <img src={URL.createObjectURL(form.thumbnail)} alt="Thumbnail preview" />
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Reel</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Products Modal */}
      <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Products To Reel">
        <form onSubmit={handleAssign}>
          <div className="modal-body">
            <Select label="Reel" value={assignForm.reelId} onChange={v => setAssignForm(p => ({...p, reelId: v}))} required
              options={[{ value: '', label: 'Select reel' }, ...reels.map(r => ({ value: String(r.id), label: r.title }))]} searchable />
            <Input label="Product IDs (comma separated)" value={assignForm.product_ids} onChange={e => setAssignForm(p => ({...p, product_ids: e.target.value}))} required placeholder="12, 45, 77" />
          </div>
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Assign Products</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
