import { useEffect, useState } from "react";
import { reelService } from "../../../services";
import { showError, showSuccess } from "../../../utils/toastNotification";
import Loader from "../../../components/common/Loader";

export default function AdminReels() {
  const [loading, setLoading] = useState(false);
  const [reels, setReels] = useState([]);
  const [createForm, setCreateForm] = useState({
    title: "",
    status: "active",
    display_order: 0,
    video: null,
    thumbnail: null,
  });
  const [assignForm, setAssignForm] = useState({ reelId: "", product_ids: "" });

  const loadReels = async () => {
    setLoading(true);
    try {
      const response = await reelService.getAdminReels();
      setReels(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      showError("loadingFailed", error?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReels();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.video) return showError("fieldRequired");
    try {
      const fd = new FormData();
      fd.append("title", createForm.title);
      fd.append("status", createForm.status);
      fd.append("display_order", String(createForm.display_order || 0));
      fd.append("video", createForm.video);
      if (createForm.thumbnail) fd.append("thumbnail", createForm.thumbnail);
      await reelService.createReel(fd);
      showSuccess("createSuccess");
      setCreateForm({ title: "", status: "active", display_order: 0, video: null, thumbnail: null });
      await loadReels();
    } catch (error) {
      showError("saveFailed", error?.message);
    }
  };

  const handleAssignProducts = async (e) => {
    e.preventDefault();
    try {
      const ids = assignForm.product_ids
        .split(",")
        .map((v) => parseInt(v.trim(), 10))
        .filter((v) => Number.isFinite(v));
      if (!assignForm.reelId || ids.length === 0) return showError("fieldRequired");
      await reelService.assignProducts(assignForm.reelId, ids);
      showSuccess("updateSuccess");
      setAssignForm({ reelId: "", product_ids: "" });
      await loadReels();
    } catch (error) {
      showError("saveFailed", error?.message);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="sl-page-header">
        <div className="sl-header-left">
          <div>
            <h1 className="sl-page-title">Reels</h1>
            <p className="sl-page-sub">Create reels and assign products.</p>
          </div>
        </div>
      </div>

      <div className="dm-2col sc-form-grid">
        <form className="seo-form" onSubmit={handleCreate}>
          <h3 className="sc-form-title">Create Reel</h3>
          <div className="dm-field"><label className="dm-label">Title</label><input className="dm-input" value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} required /></div>
          <div className="dm-field"><label className="dm-label">Status</label><select className="dm-input dm-select" value={createForm.status} onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))}><option value="draft">Draft</option><option value="active">Active</option></select></div>
          <div className="dm-field"><label className="dm-label">Display Order</label><input className="dm-input" type="number" value={createForm.display_order} onChange={(e) => setCreateForm((p) => ({ ...p, display_order: Number(e.target.value || 0) }))} /></div>
          <div className="dm-field"><label className="dm-label">Video (.mp4/.webm)</label><input className="dm-input" type="file" accept="video/mp4,video/webm" onChange={(e) => setCreateForm((p) => ({ ...p, video: e.target.files?.[0] || null }))} required /></div>
          <div className="dm-field"><label className="dm-label">Thumbnail (optional)</label><input className="dm-input" type="file" accept="image/*" onChange={(e) => setCreateForm((p) => ({ ...p, thumbnail: e.target.files?.[0] || null }))} /></div>
          <button className="sl-add-btn" type="submit">Create Reel</button>
        </form>

        <form className="seo-form" onSubmit={handleAssignProducts}>
          <h3 className="sc-form-title">Assign Products To Reel</h3>
          <div className="dm-field">
            <label className="dm-label">Reel</label>
            <select className="dm-input dm-select" value={assignForm.reelId} onChange={(e) => setAssignForm((p) => ({ ...p, reelId: e.target.value }))} required>
              <option value="">Select reel</option>
              {reels.map((reel) => <option key={reel.id} value={reel.id}>{reel.title}</option>)}
            </select>
          </div>
          <div className="dm-field">
            <label className="dm-label">Product IDs (comma separated)</label>
            <input className="dm-input" placeholder="12, 45, 77" value={assignForm.product_ids} onChange={(e) => setAssignForm((p) => ({ ...p, product_ids: e.target.value }))} required />
          </div>
          <button className="sl-add-btn" type="submit">Assign Products</button>
        </form>
      </div>

      <div className="sc-mt-16">
        <div className="sc-list-head">
          <h3 className="sc-list-title">Reel Items</h3>
          <span className="sl-status-badge sl-status-active">{reels.length}</span>
        </div>
        {loading ? (
          <div className="sl-loader-wrap"><Loader /></div>
        ) : (
          <div className="sc-card-grid">
            {reels.map((reel) => (
              <div key={reel.id} className="sc-item-card">
                <div className="sc-item-top">
                  <div>
                    <strong>{reel.title}</strong> <span className={`sl-status-badge sl-status-${reel.status}`}>{reel.status}</span>
                    <div className="sc-item-sub">
                      Products tagged: {Array.isArray(reel.Products) ? reel.Products.length : 0}
                    </div>
                  </div>
                  <button className="sl-btn-delete" onClick={async () => { await reelService.deleteReel(reel.id); showSuccess("deleteSuccess"); loadReels(); }}>Delete</button>
                </div>
              </div>
            ))}
            {!reels.length ? (
              <div className="sl-empty"><p>No reels yet</p></div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
