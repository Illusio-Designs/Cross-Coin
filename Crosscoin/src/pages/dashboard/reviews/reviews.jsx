import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Table, Pagination, Select } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from '../../../components/common/AlertModal';
import BrandTags from "../../../components/Dashboard/BrandTags";
import { reviewService } from "../../../services";

const IC = {
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  moderate: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  star: <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  reviews: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
};

const StarRating = ({ rating }) => (
  <div style={{ display: 'flex', gap: '2px', color: '#f59e0b' }}>
    {[1,2,3,4,5].map(i => (
      <span key={i} style={{ width: '14px', height: '14px', opacity: i <= rating ? 1 : 0.25 }}>{IC.star}</span>
    ))}
  </div>
);

export default function Reviews() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusCounts, setStatusCounts] = useState({ approved: 0, pending: 0, rejected: 0 });
  const [formData, setFormData] = useState({ status: "pending", is_featured: false, admin_notes: "" });

  const [statusFilter, setStatusFilter] = useState("");

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reviewService.getAllReviews('all', { page: currentPage, limit: itemsPerPage, status: 'all' });
      const list = response?.reviews || response || [];
      const mapped = list.map(r => ({ id: r.id, customerName: r.customerName || 'Guest', productName: r.productName || 'N/A', Product: r.Product, rating: r.rating, review: r.review, status: r.status, is_featured: r.is_featured, admin_notes: r.admin_notes }));
      setReviews(mapped);
      setTotalReviews(response?.pagination?.total || mapped.length);
      setTotalPages(response?.pagination?.totalPages || Math.ceil(mapped.length / itemsPerPage));
    } catch (err) {
      setError(err.message || "Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  // Fetch total counts per status independently (not affected by pagination)
  const fetchStatusCounts = useCallback(async () => {
    try {
      const [approvedRes, pendingRes, rejectedRes] = await Promise.all([
        reviewService.getAllReviews('approved', { page: 1, limit: 1 }),
        reviewService.getAllReviews('pending', { page: 1, limit: 1 }),
        reviewService.getAllReviews('rejected', { page: 1, limit: 1 }),
      ]);
      setStatusCounts({
        approved: approvedRes?.pagination?.total || 0,
        pending: pendingRes?.pagination?.total || 0,
        rejected: rejectedRes?.pagination?.total || 0,
      });
    } catch {}
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);
  useEffect(() => { fetchStatusCounts(); }, [fetchStatusCounts]);
  useEffect(() => { setCurrentPage(1); }, [search]);

  const filteredData = reviews.filter(item => {
    if (statusFilter && item.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return item.customerName?.toLowerCase().includes(s) || item.productName?.toLowerCase().includes(s) || item.review?.toLowerCase().includes(s);
  });

  const currentItemsWithSN = filteredData.map((item, idx) => ({ ...item, serial_number: (currentPage - 1) * itemsPerPage + idx + 1 }));

  const handleModerate = async (id) => {
    try {
      setLoading(true);
      const data = await reviewService.getReviewById(id);
      setFormData({ id, status: data.status || "pending", is_featured: data.is_featured || false, admin_notes: data.admin_notes || "" });
      setIsModalOpen(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = (id) => {
    setConfirmState({ message: "Delete this review?", onConfirm: async () => {
      setConfirmState(null);
      try {
        setLoading(true);
        await reviewService.deleteReview(id);
        await Promise.all([fetchReviews(), fetchStatusCounts()]);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    }});
  };

  const handleModalClose = () => { setIsModalOpen(false); setFormData({ status: "pending", is_featured: false, admin_notes: "" }); };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.id) return;
    try {
      setLoading(true);
      await reviewService.moderateReview(formData.id, { status: formData.status, is_featured: formData.is_featured, admin_notes: formData.admin_notes });
      setReviews(prev => prev.map(r => r.id === formData.id ? { ...r, status: formData.status, is_featured: formData.is_featured, admin_notes: formData.admin_notes } : r));
      fetchStatusCounts();
      handleModalClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const columns = [
    { header: "Sr. No", accessor: "serial_number" },
    { header: "Customer", accessor: "customerName", cell: ({ customerName }) => <span className="cat-name-cell">{customerName}</span> },
    { header: "Product", accessor: "productName", cell: ({ productName }) => <span className="cat-desc-cell">{productName}</span> },
    { header: "Brands", accessor: row => { const brands = row.Product?.Brands || row.Product?.brands || []; return <BrandTags brands={brands} />; } },
    { header: "Rating", accessor: "rating", cell: ({ rating }) => <StarRating rating={rating} /> },
    { header: "Review", accessor: "review", cell: ({ review }) => <span className="cat-desc-cell">{review}</span> },
    { header: "Status", accessor: "status", cell: ({ status }) => <span className={`sl-status-badge sl-status-${status}`}>{status}</span> },
    {
      header: "Actions", accessor: "actions",
      cell: (row) => (
        <div className="sl-actions">
          <button className="sl-btn-edit" title="Moderate" onClick={() => handleModerate(row.id)}>{IC.moderate}</button>
          <button className="sl-btn-delete" title="Delete" onClick={() => handleDelete(row.id)}>{IC.trash}</button>
        </div>
      )
    }
  ];

  const approvedCount = statusCounts.approved;
  const pendingCount = statusCounts.pending;
  const rejectedCount = statusCounts.rejected;
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : '0.0';

  return (
    <>
      <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />
      <div className="dashboard-page">
        <div className="sl-page-header">
          <div className="sl-header-left">
            <div className="sl-header-icon">{IC.reviews}</div>
            <div>
              <h1 className="sl-page-title">Reviews</h1>
              <p className="sl-page-sub">{totalReviews} review{totalReviews !== 1 ? 's' : ''} total</p>
            </div>
          </div>
          <div className="sl-header-right">
            <div className="sl-search-wrap">
              <span className="sl-search-icon">{IC.search}</span>
              <input type="text" className="sl-search-input" placeholder="Search reviews..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select
              options={[
                { value: '', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="All Status"
            />
          </div>
        </div>

        {/* Stat Cards */}
        <div className="sl-stat-cards">
          <div className="sl-stat-card">
            <div className="sl-stat-icon sl-stat-icon--blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </div>
            <div className="sl-stat-body">
              <span className="sl-stat-label">Total Reviews</span>
              <span className="sl-stat-value">{totalReviews}</span>
            </div>
          </div>
          <div className="sl-stat-card">
            <div className="sl-stat-icon sl-stat-icon--green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div className="sl-stat-body">
              <span className="sl-stat-label">Approved</span>
              <span className="sl-stat-value">{approvedCount}</span>
            </div>
          </div>
          <div className="sl-stat-card">
            <div className="sl-stat-icon sl-stat-icon--yellow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div className="sl-stat-body">
              <span className="sl-stat-label">Pending</span>
              <span className="sl-stat-value">{pendingCount}</span>
            </div>
          </div>
          <div className="sl-stat-card">
            <div className="sl-stat-icon sl-stat-icon--purple">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div className="sl-stat-body">
              <span className="sl-stat-label">Avg. Rating</span>
              <span className="sl-stat-value">{avgRating} / 5</span>
            </div>
          </div>
        </div>

        <div className="sl-table-wrap">
          {loading ? (
            <div className="sl-loader-wrap"><Loader /></div>
          ) : error ? (
            <div className="sl-error">{error}</div>
          ) : filteredData.length === 0 ? (
            <div className="sl-empty">
              <div className="sl-empty-icon">{IC.reviews}</div>
              <p>{search ? "No reviews match your search" : "No reviews yet"}</p>
            </div>
          ) : (
            <>
              <Table columns={columns} data={currentItemsWithSN} striped hoverable />
              {totalReviews > itemsPerPage && (
                <div className="sl-pagination">
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleModalClose} title="Moderate Review" closeOnOverlayClick={false}>
        <form onSubmit={handleSubmit} className="seo-form">
          <div className="modal-body">
            <div className="dm-field">
              <label className="dm-label">Status <span className="dm-required">*</span></label>
              <Select
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                ]}
                value={formData.status}
                onChange={v => setFormData(prev => ({ ...prev, status: v }))}
              />
            </div>
            <div className="dm-field">
              <label className="dm-checkbox-row">
                <input type="checkbox" name="is_featured" checked={formData.is_featured} onChange={handleInputChange} />
                <span className="dm-checkbox-label">Mark as Featured Review</span>
              </label>
            </div>
            <div className="dm-field">
              <label className="dm-label">Admin Notes</label>
              <textarea className="dm-input dm-textarea" name="admin_notes" value={formData.admin_notes} onChange={handleInputChange} placeholder="Internal notes about this review..." />
            </div>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" size="medium" onClick={handleModalClose} disabled={loading} type="button">Cancel</Button>
            <Button type="submit" variant="primary" size="medium" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
