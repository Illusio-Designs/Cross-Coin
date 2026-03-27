import { useEffect, useState } from "react";
import { lookbookService } from "../../../services";
import { showError, showSuccess } from "../../../utils/toastNotification";
import Loader from "../../../components/common/Loader";

export default function AdminLookbooks() {
  const [loading, setLoading] = useState(false);
  const [lookbooks, setLookbooks] = useState([]);
  const [products, setProducts] = useState([]);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    status: "active",
    display_order: 0,
  });
  const [imageForm, setImageForm] = useState({
    lookbookId: "",
    image: null,
    alt_text: "",
    display_order: 0,
  });
  const [hotspotForm, setHotspotForm] = useState({
    imageId: "",
    product_id: "",
    position_x: "",
    position_y: "",
    label: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [lbRes, prodRes] = await Promise.all([
        lookbookService.getAdminLookbooks(),
        fetchProducts(),
      ]);
      setLookbooks(Array.isArray(lbRes?.data) ? lbRes.data : []);
      setProducts(prodRes);
    } catch (error) {
      showError("loadingFailed", error?.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in"}/api/products?page=1&limit=500`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          "Content-Type": "application/json",
        },
      }
    );
    const data = await res.json();
    return Array.isArray(data?.products) ? data.products : [];
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateLookbook = async (e) => {
    e.preventDefault();
    try {
      await lookbookService.createLookbook(createForm);
      showSuccess("createSuccess");
      setCreateForm({ title: "", description: "", status: "active", display_order: 0 });
      await loadData();
    } catch (error) {
      showError("saveFailed", error?.message);
    }
  };

  const handleUploadImage = async (e) => {
    e.preventDefault();
    if (!imageForm.lookbookId || !imageForm.image) return showError("fieldRequired");
    try {
      const fd = new FormData();
      fd.append("image", imageForm.image);
      fd.append("alt_text", imageForm.alt_text || "");
      fd.append("display_order", String(imageForm.display_order || 0));
      await lookbookService.uploadLookbookImage(imageForm.lookbookId, fd);
      showSuccess("uploadSuccess");
      setImageForm({ lookbookId: "", image: null, alt_text: "", display_order: 0 });
      await loadData();
    } catch (error) {
      showError("saveFailed", error?.message);
    }
  };

  const handleAddHotspot = async (e) => {
    e.preventDefault();
    try {
      await lookbookService.addHotspot(hotspotForm.imageId, hotspotForm);
      showSuccess("createSuccess");
      setHotspotForm({ imageId: "", product_id: "", position_x: "", position_y: "", label: "" });
      await loadData();
    } catch (error) {
      showError("saveFailed", error?.message);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="sl-page-header">
        <div className="sl-header-left">
          <div>
            <h1 className="sl-page-title">Lookbooks</h1>
            <p className="sl-page-sub">Create lookbooks, upload images, and add product hotspots.</p>
          </div>
        </div>
      </div>

      <div className="dm-2col sc-form-grid">
        <form className="seo-form" onSubmit={handleCreateLookbook}>
          <h3 className="sc-form-title">Create Lookbook</h3>
          <div className="dm-field"><label className="dm-label">Title</label><input className="dm-input" value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} required /></div>
          <div className="dm-field"><label className="dm-label">Description</label><textarea className="dm-input" value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} /></div>
          <div className="dm-field"><label className="dm-label">Status</label><select className="dm-input dm-select" value={createForm.status} onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))}><option value="draft">Draft</option><option value="active">Active</option></select></div>
          <div className="dm-field"><label className="dm-label">Display Order</label><input className="dm-input" type="number" value={createForm.display_order} onChange={(e) => setCreateForm((p) => ({ ...p, display_order: Number(e.target.value || 0) }))} /></div>
          <button className="sl-add-btn" type="submit">Create</button>
        </form>

        <form className="seo-form" onSubmit={handleUploadImage}>
          <h3 className="sc-form-title">Upload Lookbook Image</h3>
          <div className="dm-field">
            <label className="dm-label">Lookbook</label>
            <select className="dm-input dm-select" value={imageForm.lookbookId} onChange={(e) => setImageForm((p) => ({ ...p, lookbookId: e.target.value }))} required>
              <option value="">Select lookbook</option>
              {lookbooks.map((lb) => <option key={lb.id} value={lb.id}>{lb.title}</option>)}
            </select>
          </div>
          <div className="dm-field"><label className="dm-label">Image</label><input className="dm-input" type="file" accept="image/*" onChange={(e) => setImageForm((p) => ({ ...p, image: e.target.files?.[0] || null }))} required /></div>
          <div className="dm-field"><label className="dm-label">Alt Text</label><input className="dm-input" value={imageForm.alt_text} onChange={(e) => setImageForm((p) => ({ ...p, alt_text: e.target.value }))} /></div>
          <button className="sl-add-btn" type="submit">Upload Image</button>
        </form>
      </div>

      <form className="seo-form sc-mt-16" onSubmit={handleAddHotspot}>
        <h3 className="sc-form-title">Add Hotspot</h3>
        <div className="dm-2col">
          <div className="dm-field">
            <label className="dm-label">Image</label>
            <select className="dm-input dm-select" value={hotspotForm.imageId} onChange={(e) => setHotspotForm((p) => ({ ...p, imageId: e.target.value }))} required>
              <option value="">Select image</option>
              {lookbooks.flatMap((lb) => (lb.Images || []).map((img) => (
                <option key={img.id} value={img.id}>{lb.title} - Image #{img.id}</option>
              )))}
            </select>
          </div>
          <div className="dm-field">
            <label className="dm-label">Product</label>
            <select className="dm-input dm-select" value={hotspotForm.product_id} onChange={(e) => setHotspotForm((p) => ({ ...p, product_id: e.target.value }))} required>
              <option value="">Select product</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="dm-field"><label className="dm-label">X (0-100)</label><input className="dm-input" type="number" min="0" max="100" step="0.1" value={hotspotForm.position_x} onChange={(e) => setHotspotForm((p) => ({ ...p, position_x: e.target.value }))} required /></div>
          <div className="dm-field"><label className="dm-label">Y (0-100)</label><input className="dm-input" type="number" min="0" max="100" step="0.1" value={hotspotForm.position_y} onChange={(e) => setHotspotForm((p) => ({ ...p, position_y: e.target.value }))} required /></div>
        </div>
        <div className="dm-field"><label className="dm-label">Label</label><input className="dm-input" value={hotspotForm.label} onChange={(e) => setHotspotForm((p) => ({ ...p, label: e.target.value }))} /></div>
        <button className="sl-add-btn" type="submit">Add Hotspot</button>
      </form>

      <div className="sc-mt-16">
        <div className="sc-list-head">
          <h3 className="sc-list-title">Lookbook Items</h3>
          <span className="sl-status-badge sl-status-active">{lookbooks.length}</span>
        </div>
        {loading ? (
          <div className="sl-loader-wrap"><Loader /></div>
        ) : (
          <div className="sc-card-grid">
            {lookbooks.map((lb) => (
              <div key={lb.id} className="sc-item-card">
                <div className="sc-item-top">
                  <div>
                    <strong>{lb.title}</strong> <span className={`sl-status-badge sl-status-${lb.status}`}>{lb.status}</span>
                    <div className="sc-item-sub">{lb.description || "No description"}</div>
                  </div>
                  <button className="sl-btn-delete" onClick={async () => { await lookbookService.deleteLookbook(lb.id); showSuccess("deleteSuccess"); loadData(); }}>Delete</button>
                </div>
                <div className="sc-item-meta">
                  {(lb.Images || []).length} images
                </div>
              </div>
            ))}
            {!lookbooks.length ? (
              <div className="sl-empty"><p>No lookbooks yet</p></div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
