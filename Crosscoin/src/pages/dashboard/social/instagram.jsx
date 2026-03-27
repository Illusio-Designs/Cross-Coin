import { useEffect, useState } from "react";
import { instagramService } from "../../../services";
import { showError, showSuccess } from "../../../utils/toastNotification";
import { Button, Modal, Table, Input, Select } from "../../../components/ui";
import Loader from "../../../components/common/Loader";

const IC = {
  tag: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
};

const EMPTY_TAG = { instagram_post_id: "", product_id: "" };

export default function AdminInstagramFeed() {
  const [loading, setLoading] = useState(false);
  const [posts, setPosts]     = useState([]);
  const [tagOpen, setTagOpen] = useState(false);
  const [tagForm, setTagForm] = useState(EMPTY_TAG);

  const load = async () => {
    setLoading(true);
    try {
      const res = await instagramService.getFeed();
      setPosts(Array.isArray(res?.data) ? res.data : []);
    } catch (e) { showError("loadingFailed", e?.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = async () => {
    try {
      await instagramService.refreshFeed();
      showSuccess("updateSuccess");
      load();
    } catch (e) { showError("saveFailed", e?.message); }
  };

  const handleTag = async (e) => {
    e.preventDefault();
    try {
      await instagramService.tagPost({ instagram_post_id: tagForm.instagram_post_id, product_id: tagForm.product_id });
      showSuccess("createSuccess");
      setTagForm(EMPTY_TAG);
      setTagOpen(false);
      load();
    } catch (e) { showError("saveFailed", e?.message); }
  };

  const columns = [
    { header: "Post ID",  cell: r => <span className="sl-id-badge">{r.id}</span> },
    { header: "Preview",  cell: r => r.media_url ? (
      <img src={r.media_type === "VIDEO" ? r.thumbnail_url || r.media_url : r.media_url}
        alt={r.caption || "post"} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6 }} />
    ) : "—" },
    { header: "Caption",  cell: r => <span style={{ fontSize: 12 }}>{(r.caption || "").slice(0, 60)}</span> },
    { header: "Tagged Products", cell: r => Array.isArray(r.tagged_products) ? r.tagged_products.length : 0 },
    { header: "Actions", cell: r => (
      <div className="sl-actions">
        <button className="sl-btn-edit" title="Tag Product" onClick={() => { setTagForm(p => ({ ...p, instagram_post_id: r.id })); setTagOpen(true); }}>{IC.tag}</button>
      </div>
    )},
  ];

  return (
    <div className="dashboard-page">
      <div className="sl-page-header">
        <div className="sl-header-left">
          <div className="sl-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
          </div>
          <div>
            <h1 className="sl-page-title">Instagram Feed</h1>
            <p className="sl-page-sub">Refresh feed and tag posts with products.</p>
          </div>
        </div>
        <div className="sl-header-right">
          <button className="sl-add-btn" onClick={handleRefresh}>
            <span className="sl-add-btn-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg></span>
            Refresh Feed
          </button>
          <button className="sl-add-btn" onClick={() => setTagOpen(true)}>
            <span className="sl-add-btn-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
            Tag Product
          </button>
        </div>
      </div>

      {loading ? <div className="sl-loader-wrap"><Loader /></div> : (
        <Table columns={columns} data={posts} emptyMessage="No posts found" />
      )}

      {/* Tag Product Modal */}
      <Modal isOpen={tagOpen} onClose={() => setTagOpen(false)} title="Tag Product To Instagram Post">
        <form onSubmit={handleTag}>
          <div className="modal-body">
            <Select label="Instagram Post" value={tagForm.instagram_post_id} onChange={v => setTagForm(p => ({...p, instagram_post_id: v}))} required
              options={[{ value: '', label: 'Select post' }, ...posts.map(p => ({ value: String(p.id), label: `${p.id} — ${(p.caption || 'No caption').slice(0, 40)}` }))]} searchable />
            <Input label="Product ID" type="number" value={tagForm.product_id} onChange={e => setTagForm(p => ({...p, product_id: e.target.value}))} required placeholder="Enter product ID" />
          </div>
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setTagOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Tag Post</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
