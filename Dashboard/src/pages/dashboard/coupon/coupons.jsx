import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Table, Pagination, Select } from "../../../components/ui";
import { PageHeader, Panel, StatTile, StatGrid, FilterBar, EmptyState } from "../../../components/Dashboard/primitives";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from '../../../components/common/AlertModal';
import { couponService } from "../../../services";
import { queryKeys } from '../../../lib/queryClient';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Search01Icon, PencilEdit02Icon, Delete02Icon, Ticket01Icon } from '@hugeicons/core-free-icons';

const IC = {
  add: <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />,
  search: <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />,
  edit: <HugeiconsIcon icon={PencilEdit02Icon} size={15} strokeWidth={2} />,
  trash: <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={2} />,
  coupon: <HugeiconsIcon icon={Ticket01Icon} size={48} strokeWidth={1.5} />,
};

const EMPTY_FORM = { code: "", description: "", type: "percentage", value: "", minPurchase: "", maxDiscount: "", usageLimit: "", usageCount: "", perUserLimit: "", status: "active", applicableCategories: [], applicableProducts: [], startDate: "", endDate: "", paymentModeRestriction: "all", firstOrderOnly: false, tieredDiscounts: [], quantityBasedDiscounts: [] };

export default function Coupons() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false); // opening edit must not reload the table
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState("");

  // ── React Query: coupons list ────────────────────────────────────
  const { data: coupons = [], isLoading: queryLoading } = useQuery({
    queryKey: queryKeys.couponsAdmin,
    queryFn: async () => {
      const data = await couponService.getAllCoupons();
      return Array.isArray(data?.coupons) ? data.coupons : [];
    },
    staleTime: 30 * 1000,
  });
  // Combined loading: React Query OR an in-flight mutation (we still
  // call setLoading() during save / delete).
  const isLoading = loading || queryLoading;

  // Mutations still use a manual loading flag (kept for the form UX).
  // After they finish we invalidate the query to refetch.
  const refetchCoupons = () => queryClient.invalidateQueries({ queryKey: queryKeys.couponsAdmin });
  const fetchCoupons = refetchCoupons;  // legacy callers

  useEffect(() => { setCurrentPage(1); }, [search]);

  const filteredData = coupons.filter(item => {
    if (statusFilter && item.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return item.code?.toLowerCase().includes(s) || item.description?.toLowerCase().includes(s);
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(start, start + itemsPerPage).map((item, i) => ({ ...item, serial_number: start + i + 1 }));

  const handleEdit = async (id) => {
    try {
      setEditLoading(true);
      const data = await couponService.getCouponById(id);
      const fmt = (d) => d ? new Date(d).toISOString().split('T')[0] : "";
      setFormData({ id: data.id, code: data.code || "", description: data.description || "", type: data.type || "percentage", value: data.value || "", minPurchase: data.minPurchase || "", maxDiscount: data.maxDiscount || "", usageLimit: data.usageLimit || "", usageCount: data.usageCount || "", perUserLimit: data.perUserLimit || "", status: data.status || "active", applicableCategories: data.applicableCategories || [], applicableProducts: data.applicableProducts || [], startDate: fmt(data.startDate), endDate: fmt(data.endDate), paymentModeRestriction: data.paymentModeRestriction || "all", firstOrderOnly: data.firstOrderOnly || false, tieredDiscounts: data.tieredDiscounts || [], quantityBasedDiscounts: data.quantityBasedDiscounts || [] });
      setIsModalOpen(true);
    } catch (err) { setError(err.message); }
    finally { setEditLoading(false); }
  };

  const handleDelete = (id) => {
    setConfirmState({ message: "Delete this coupon?", onConfirm: async () => {
      setConfirmState(null);
      try {
        setLoading(true);
        await couponService.deleteCoupon(id);
        await fetchCoupons();
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    }});
  };

  const handleModalClose = () => { setIsModalOpen(false); setFormData(EMPTY_FORM); setError(null); };
  const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.code.trim()) { setError("Coupon code is required"); return; }
    if (!formData.value || formData.value <= 0) { setError("Discount value must be greater than 0"); return; }
    if (formData.type === 'percentage' && formData.value > 100) { setError("Percentage cannot exceed 100%"); return; }
    if (!formData.startDate || !formData.endDate) { setError("Start and end dates are required"); return; }
    if (new Date(formData.endDate) <= new Date(formData.startDate)) { setError("End date must be after start date"); return; }
    try {
      setLoading(true);
      const payload = { ...formData };
      if (typeof payload.applicableCategories === 'string') payload.applicableCategories = payload.applicableCategories.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
      if (typeof payload.applicableProducts === 'string') payload.applicableProducts = payload.applicableProducts.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
      ['value', 'minPurchase', 'maxDiscount', 'usageLimit', 'perUserLimit'].forEach(f => { payload[f] = payload[f] === '' || payload[f] == null ? null : Number(payload[f]); });
      delete payload.usageCount;
      if (formData.id) { delete payload.id; await couponService.updateCoupon(formData.id, payload); }
      else await couponService.createCoupon(payload);
      await fetchCoupons();
      handleModalClose();
    } catch (err) { setError(err.message || "Failed to save coupon"); }
    finally { setLoading(false); }
  };

  const columns = [
    { header: "Sr. No", accessor: "serial_number" },
    { header: "Code", accessor: "code", cell: ({ code }) => <span className="cat-name-cell" style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px' }}>{code}</span> },
    { header: "Type", accessor: "type", cell: (row) => <span className="sl-cat-badge">{row.type === 'percentage' ? `${row.value}%` : `₹${row.value}`}</span> },
    { header: "Min Purchase", accessor: "minPurchase", cell: ({ minPurchase }) => minPurchase ? `₹${minPurchase}` : <span className="sl-na">—</span> },
    { header: "Usage", accessor: "usageCount", cell: (row) => <span>{row.usageCount || 0} / {row.usageLimit || '∞'}</span> },
    { header: "Expires", accessor: "endDate", cell: ({ endDate }) => { if (!endDate) return <span className="sl-na">No expiry</span>; const d = new Date(endDate); const expired = d < new Date(); return <span style={{ color: expired ? 'var(--ds-color-danger)' : 'var(--ds-color-text-muted)' }}>{d.toLocaleDateString()}</span>; } },
    { header: "Status", accessor: "status", cell: ({ status }) => <span className={`sl-status-badge sl-status-${status}`}>{status}</span> },
    {
      header: "Actions", accessor: "actions",
      cell: ({ id }) => (
        <div className="sl-actions">
          <button className="sl-btn-edit" title="Edit" onClick={() => handleEdit(id)}>{IC.edit}</button>
          <button className="sl-btn-delete" title="Delete" onClick={() => handleDelete(id)}>{IC.trash}</button>
        </div>
      )
    }
  ];

  const activeCount = coupons.filter(c => c.status === 'active').length;
  const expiredCount = coupons.filter(c => c.endDate && new Date(c.endDate) < new Date()).length;

  return (
    <>
      <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />
      <div className="dashboard-page">
        <PageHeader
          title="Coupons"
          subtitle={`${coupons.length} coupon${coupons.length !== 1 ? 's' : ''} total`}
          actions={
            <Button variant="primary" onClick={() => { setFormData(EMPTY_FORM); setIsModalOpen(true); }}>
              + Add Coupon
            </Button>
          }
        />

        <StatGrid>
          <StatTile label="Total coupons" value={coupons.length} />
          <StatTile label="Active" value={activeCount} />
          <StatTile label="Expired" value={expiredCount} sub="past end date" />
        </StatGrid>

        <Panel>
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search by code or description…"
          >
            <Select
              options={[{ value: '', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="All Status"
            />
          </FilterBar>

          {isLoading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Loader /></div>
          ) : error ? (
            <EmptyState title="Couldn't load coupons" message={error} />
          ) : filteredData.length === 0 ? (
            <EmptyState
              icon={IC.coupon}
              title={search || statusFilter ? "No coupons match" : "No coupons yet"}
              message={search || statusFilter ? "Try a different search or status filter." : "Create your first coupon to start running promotions."}
              action={!search && !statusFilter && (
                <Button variant="primary" onClick={() => { setFormData(EMPTY_FORM); setIsModalOpen(true); }}>+ Add Coupon</Button>
              )}
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

      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={formData.id ? "Edit Coupon" : "Add Coupon"} closeOnOverlayClick={false}>
        <form onSubmit={handleSubmit} className="seo-form">
          {error && <div className="dm-error-banner">{error}</div>}
          <div className="modal-body">
            <div className="dm-2col">
              <div className="dm-field">
                <label className="dm-label">Coupon Code <span className="dm-required">*</span></label>
                <input className="dm-input" type="text" name="code" value={formData.code} onChange={handleInputChange} placeholder="e.g., SAVE20" required />
              </div>
              <div className="dm-field">
                <label className="dm-label">Status <span className="dm-required">*</span></label>
                <Select
                  options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
                  value={formData.status}
                  onChange={v => setFormData(prev => ({ ...prev, status: v }))}
                />
              </div>
            </div>
            <div className="dm-field">
              <label className="dm-label">Description <span className="dm-required">*</span></label>
              <textarea className="dm-input dm-textarea" name="description" value={formData.description} onChange={handleInputChange} placeholder="Describe this coupon..." required />
            </div>
            <div className="dm-section-title">Discount</div>
            <div className="dm-2col">
              <div className="dm-field">
                <label className="dm-label">Discount Type <span className="dm-required">*</span></label>
                <Select
                  options={[
                    { value: 'percentage', label: 'Percentage' },
                    { value: 'fixed', label: 'Fixed Amount' },
                    { value: 'tiered', label: 'Tiered Discount' },
                    { value: 'quantity_based', label: 'Quantity Based' },
                  ]}
                  value={formData.type}
                  onChange={v => setFormData(prev => ({ ...prev, type: v }))}
                />
              </div>
              <div className="dm-field">
                <label className="dm-label">Discount Value <span className="dm-required">*</span></label>
                <input className="dm-input" type="number" name="value" value={formData.value} onChange={handleInputChange} placeholder={formData.type === 'percentage' ? '0–100' : '0.00'} required />
              </div>
              <div className="dm-field">
                <label className="dm-label">Min Purchase (₹)</label>
                <input className="dm-input" type="number" name="minPurchase" value={formData.minPurchase} onChange={handleInputChange} placeholder="0.00" />
              </div>
              <div className="dm-field">
                <label className="dm-label">Max Discount (₹)</label>
                <input className="dm-input" type="number" name="maxDiscount" value={formData.maxDiscount} onChange={handleInputChange} placeholder="0.00" />
              </div>
            </div>
            <div className="dm-section-title">Usage Limits</div>
            <div className="dm-2col">
              <div className="dm-field">
                <label className="dm-label">Usage Limit</label>
                <input className="dm-input" type="number" name="usageLimit" value={formData.usageLimit} onChange={handleInputChange} placeholder="Unlimited" />
              </div>
              <div className="dm-field">
                <label className="dm-label">Per User Limit</label>
                <input className="dm-input" type="number" name="perUserLimit" value={formData.perUserLimit} onChange={handleInputChange} placeholder="Unlimited" />
              </div>
            </div>
            <div className="dm-section-title">Validity</div>
            <div className="dm-2col">
              <div className="dm-field">
                <label className="dm-label">Start Date</label>
                <input className="dm-input" type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} />
              </div>
              <div className="dm-field">
                <label className="dm-label">End Date</label>
                <input className="dm-input" type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} />
              </div>
            </div>
            <div className="dm-section-title">Restrictions</div>
            <div className="dm-2col">
              <div className="dm-field">
                <label className="dm-label">Payment Mode</label>
                <Select
                  options={[
                    { value: 'all', label: 'All Payment Modes' },
                    { value: 'cod', label: 'Cash on Delivery Only' },
                    { value: 'prepaid', label: 'Prepaid Only' },
                  ]}
                  value={formData.paymentModeRestriction}
                  onChange={v => setFormData(prev => ({ ...prev, paymentModeRestriction: v }))}
                />
              </div>
              <div className="dm-field">
                <label className="dm-label">First Order Only</label>
                <Select
                  options={[{ value: false, label: 'No' }, { value: true, label: 'Yes' }]}
                  value={formData.firstOrderOnly}
                  onChange={v => setFormData(prev => ({ ...prev, firstOrderOnly: v }))}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" size="medium" onClick={handleModalClose} disabled={loading} type="button">Cancel</Button>
            <Button type="submit" variant="primary" size="medium" disabled={loading}>{loading ? "Saving..." : formData.id ? "Update Coupon" : "Add Coupon"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
