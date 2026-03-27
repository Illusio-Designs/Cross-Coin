import { useEffect, useState } from "react";
import { reelService } from "../../../services";
import { showError, showSuccess } from "../../../utils/toastNotification";
import { Button, Modal, Table } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from "../../../components/common/AlertModal";

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
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
          </div>
          <div>
            <h1 className="sl-page-title">Reels</h1>
            <p className="sl-page-sub">Create reels and assign products.</p>
          </div>
        </div>
        <div className="sl-header-right">
          <button className="sl-add-btn" onClick={() => setAssignOpen(true)}>
            <span className="sl-add-btn-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg></span>
            Assign Products
          </button>
          <button className="sl-add-btn" onClick={() => setIsModalOpen(true)}>
            <span className="sl-add-btn-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
            Add Reel
          </button>
        </div>
      </div>

      {loading ? <div className="sl-loader-wrap"><Loader /></div> : (
        <Table columns={columns} data={reels} emptyMessage="No reels yet" />
      )}

      {/* Create Reel Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Reel">
        <form onSubmit={handleCreate}>
          <div className="modal-body">
            <div className="dm-field"><label className="dm-label">Title</label><input className="dm-input" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required /></div>
            <div className="dm-field"><label className="dm-label">Status</label>
              <select className="dm-input dm-select" value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                <option value="draft">Draft</option><option value="active">Active</option>
              </select>
            </div>
            <div className="dm-field"><label className="dm-label">Display Order</label><input className="dm-input" type="number" value={form.display_order} onChange={e => setForm(p => ({...p, display_order: Number(e.target.value || 0)}))} /></div>
            <div className="dm-field"><label className="dm-label">Video (.mp4 / .webm)</label><input className="dm-input" type="file" accept="video/mp4,video/webm" onChange={e => setForm(p => ({...p, video: e.target.files?.[0] || null}))} required /></div>
            <div className="dm-field"><label className="dm-label">Thumbnail (optional)</label><input className="dm-input" type="file" accept="image/*" onChange={e => setForm(p => ({...p, thumbnail: e.target.files?.[0] || null}))} /></div>
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
            <div className="dm-field"><label className="dm-label">Reel</label>
              <select className="dm-input dm-select" value={assignForm.reelId} onChange={e => setAssignForm(p => ({...p, reelId: e.target.value}))} required>
                <option value="">Select reel</option>
                {reels.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
            </div>
            <div className="dm-field"><label className="dm-label">Product IDs (comma separated)</label>
              <input className="dm-input" placeholder="12, 45, 77" value={assignForm.product_ids} onChange={e => setAssignForm(p => ({...p, product_ids: e.target.value}))} required />
            </div>
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
