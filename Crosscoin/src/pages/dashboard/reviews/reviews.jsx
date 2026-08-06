import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Table, Pagination, Select } from "../../../components/ui";
import { PageHeader, Panel, StatTile, StatGrid, FilterBar, EmptyState } from "../../../components/Dashboard/primitives";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from '../../../components/common/AlertModal';
import { reviewService, brandService } from "../../../services";
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, CheckmarkCircle02Icon, Delete02Icon, Message01Icon } from '@hugeicons/core-free-icons';

const IC = {
  search: <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />,
  moderate: <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} strokeWidth={2} />,
  trash: <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={2} />,
  // filled star kept inline for the rating (Hugeicons free set has no solid star)
  star: <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  reviews: <HugeiconsIcon icon={Message01Icon} size={48} strokeWidth={1.5} />,
};

const StarRating = ({ rating }) => (
  <div style={{ display: 'flex', gap: '2px', color: 'var(--ds-color-text)' }}>
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
  const [brands, setBrands] = useState([]);
  const [brandFilter, setBrandFilter] = useState("");

  useEffect(() => {
    brandService.getAllBrands().then(res => {
      setBrands(res?.data || res?.brands || (Array.isArray(res) ? res : []));
    }).catch(() => {});
  }, []);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const selectedBrand = (Array.isArray(brands) ? brands : []).find(b => String(b.id) === brandFilter);
      const response = await reviewService.getAllReviews('all', {
        page: currentPage, limit: itemsPerPage, status: 'all',
        brandId: brandFilter || undefined,
        brandSlug: selectedBrand?.slug || undefined,
      });
      const list = response?.reviews || response || [];
      setReviews(list.map(r => ({
        id: r.id,
        customerName: r.customerName || 'Guest',
        productName: r.productName || 'N/A',
        brandName: r.brandName || r.Brand?.display_name || r.Brand?.name || null,
        Product: r.Product,
        rating: r.rating,
        review: r.review,
        status: r.status,
        is_featured: r.is_featured,
        admin_notes: r.admin_notes,
      })));
      setTotalReviews(response?.pagination?.total || list.length);
      setTotalPages(response?.pagination?.totalPages || Math.ceil(list.length / itemsPerPage));
    } catch (err) {
      setError(err.message || "Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, brandFilter]);

  const fetchStatusCounts = useCallback(async () => {
    try {
      const opts = { page: 1, limit: 1, brandId: brandFilter || undefined };
      const [a, p, r] = await Promise.all([
        reviewService.getAllReviews('approved', opts),
        reviewService.getAllReviews('pending', opts),
        reviewService.getAllReviews('rejected', opts),
      ]);
      setStatusCounts({
        approved: a?.pagination?.total || 0,
        pending:  p?.pagination?.total  || 0,
        rejected: r?.pagination?.total  || 0,
      });
    } catch {}
  }, [brandFilter]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);
  useEffect(() => { fetchStatusCounts(); }, [fetchStatusCounts]);
  useEffect(() => { setCurrentPage(1); }, [search, brandFilter]);

  const filteredData = reviews.filter(item => {
    if (statusFilter && item.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return item.customerName?.toLowerCase().includes(s) ||
           item.productName?.toLowerCase().includes(s) ||
           item.review?.toLowerCase().includes(s);
  });

  const currentItemsWithSN = filteredData.map((item, idx) => ({
    ...item, serial_number: (currentPage - 1) * itemsPerPage + idx + 1,
  }));

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

  const handleModalClose = () => {
    setIsModalOpen(false);
    setFormData({ status: "pending", is_featured: false, admin_notes: "" });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.id) return;
    try {
      setLoading(true);
      await reviewService.moderateReview(formData.id, {
        status: formData.status, is_featured: formData.is_featured, admin_notes: formData.admin_notes,
      });
      setReviews(prev => prev.map(r =>
        r.id === formData.id ? { ...r, ...formData } : r
      ));
      fetchStatusCounts();
      handleModalClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const brandOptions = [
    { value: '', label: 'All Brands' },
    ...(Array.isArray(brands) ? brands : []).map(b => ({ value: String(b.id), label: b.display_name || b.name })),
  ];

  const selectedBrandName = brandFilter
    ? ((Array.isArray(brands) ? brands : []).find(b => String(b.id) === brandFilter)?.display_name || (Array.isArray(brands) ? brands : []).find(b => String(b.id) === brandFilter)?.name || '')
    : '';

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '0.0';

  const columns = [
    { header: "Sr. No", accessor: "serial_number" },
    { header: "Customer", accessor: "customerName", cell: ({ customerName }) => <span className="cat-name-cell">{customerName}</span> },
    { header: "Product", accessor: "productName", cell: ({ productName }) => <span className="cat-desc-cell">{productName}</span> },
    { header: "Brand", accessor: "brandName", cell: ({ brandName }) => brandName ? <span className="sl-cat-badge">{brandName}</span> : <span className="sl-na">—</span> },
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

  return (
    <>
      <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />
      <div className="dashboard-page">
        <PageHeader
          title={`Reviews${selectedBrandName ? ` — ${selectedBrandName}` : ''}`}
          subtitle={`${totalReviews} review${totalReviews !== 1 ? 's' : ''}${brandFilter ? ' for this brand' : ' total'}`}
        />

        <StatGrid>
          <StatTile label="Total" value={totalReviews} tone="info" />
          <StatTile label="Approved" value={statusCounts.approved} tone="good" />
          <StatTile label="Pending" value={statusCounts.pending} tone="warn" />
          <StatTile label="Avg. rating" value={`${avgRating} / 5`} tone="default" />
        </StatGrid>

        <Panel>
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search reviews…"
          >
            <Select options={brandOptions} value={brandFilter} onChange={setBrandFilter} placeholder="All Brands" />
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
          </FilterBar>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Loader /></div>
          ) : error ? (
            <EmptyState title="Couldn't load reviews" message={error} />
          ) : filteredData.length === 0 ? (
            <EmptyState
              icon={IC.reviews}
              title={search ? "No reviews match" : brandFilter ? "No reviews for this brand" : "No reviews yet"}
              message={search ? "Try a different search term." : "Reviews will appear here as customers submit them."}
            />
          ) : (
            <>
              <Table columns={columns} data={currentItemsWithSN} striped hoverable />
              {totalReviews > itemsPerPage && (
                <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}>
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </Panel>
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
