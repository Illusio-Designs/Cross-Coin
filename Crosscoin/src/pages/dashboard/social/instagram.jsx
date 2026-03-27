import { useEffect, useState } from "react";
import { instagramService } from "../../../services";
import { showError, showSuccess } from "../../../utils/toastNotification";

export default function AdminInstagramFeed() {
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [tagForm, setTagForm] = useState({ instagram_post_id: "", product_id: "" });

  const loadFeed = async () => {
    setLoading(true);
    try {
      const response = await instagramService.getFeed();
      setPosts(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      showError("loadingFailed", error?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const handleRefresh = async () => {
    try {
      await instagramService.refreshFeed();
      showSuccess("updateSuccess");
      await loadFeed();
    } catch (error) {
      showError("saveFailed", error?.message);
    }
  };

  const handleTag = async (e) => {
    e.preventDefault();
    try {
      await instagramService.tagPost({
        instagram_post_id: tagForm.instagram_post_id,
        product_id: tagForm.product_id,
      });
      showSuccess("createSuccess");
      setTagForm({ instagram_post_id: "", product_id: "" });
      await loadFeed();
    } catch (error) {
      showError("saveFailed", error?.message);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="sl-page-header">
        <div className="sl-header-left">
          <div>
            <h1 className="sl-page-title">Instagram Feed</h1>
            <p className="sl-page-sub">Refresh Instagram feed and tag post with product.</p>
          </div>
        </div>
        <div className="sl-header-right">
          <button className="sl-add-btn" onClick={handleRefresh}>Refresh Feed</button>
        </div>
      </div>

      <form className="seo-form" onSubmit={handleTag}>
        <h3>Tag Product To Instagram Post</h3>
        <div className="dm-2col">
          <div className="dm-field">
            <label className="dm-label">Instagram Post</label>
            <select className="dm-input dm-select" value={tagForm.instagram_post_id} onChange={(e) => setTagForm((p) => ({ ...p, instagram_post_id: e.target.value }))} required>
              <option value="">Select post</option>
              {posts.map((post) => (
                <option key={post.id} value={post.id}>
                  {post.id} - {(post.caption || "No caption").slice(0, 35)}
                </option>
              ))}
            </select>
          </div>
          <div className="dm-field">
            <label className="dm-label">Product ID</label>
            <input className="dm-input" type="number" value={tagForm.product_id} onChange={(e) => setTagForm((p) => ({ ...p, product_id: e.target.value }))} placeholder="Enter product id" required />
          </div>
        </div>
        <button className="sl-add-btn" type="submit">Tag Post</button>
      </form>

      <div style={{ marginTop: 16 }}>
        <h3>Posts ({posts.length})</h3>
        {loading ? <p>Loading...</p> : (
          <div className="brand-cards-grid">
            {posts.map((post) => (
              <div key={post.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{post.id}</div>
                {post.media_url ? (
                  <img
                    src={post.media_type === "VIDEO" ? post.thumbnail_url || post.media_url : post.media_url}
                    alt={post.caption || "Instagram media"}
                    style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 6 }}
                  />
                ) : null}
                <div style={{ marginTop: 8, fontSize: 13 }}>{(post.caption || "").slice(0, 80)}</div>
                <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                  Tagged products: {Array.isArray(post.tagged_products) ? post.tagged_products.length : 0}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
