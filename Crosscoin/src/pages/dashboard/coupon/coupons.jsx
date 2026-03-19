import { useState, useEffect, useCallback } from "react";
import { Button, Input, Modal, Table, Pagination } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { couponService } from "../../../services";

const IC = {
  add: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  coupon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
};

const EMPTY_FORM = { code: "", description: "", type: "percentage", value: "", minPurchase: "", maxDiscount: "", usageLimit: "", usageCount: "", perUserLimit: "", status: "active", applicableCategories: [], applicableProducts: [], startDate: "", endDate: "", paymentModeRestriction: "all", firstOrderOnly: false, tieredDiscounts: [], quantityBasedDiscounts: [] };

export default function Coupons() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [statusFilter, setStatusFilter] = useState("");

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await couponService.getAllCoupons();
      setCoupons(Array.isArray(data?.coupons) ? data.coupons : []);
    } catch (err) {
      setError(err.message || "Failed to fetch coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCoupons(); }, []);
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
      setLoading(true);
      const data = await couponService.getCouponById(id);
      const fmt = (d) => d ? new Date(d).toISOString().split('T')[0] : "";
      setFormData({ id: data.id, code: data.code || "", description: data.description || "", type: data.type || "percentage", value: data.value || "", minPurchase: data.minPurchase || "", maxDiscount: data.maxDiscount || "", usageLimit: data.usageLimit || "", usageCount: data.usageCount || "", perUserLimit: data.perUserLimit || "", status: data.status || "active", applicableCategories: data.applicableCategories || [], applicableProducts: data.applicableProducts || [], startDate: fmt(data.startDate), endDate: fmt(data.endDate), paymentModeRestriction: data.paymentModeRestriction || "all", firstOrderOnly: data.firstOrderOnly || false, tieredDiscounts: data.tieredDiscounts || [], quantityBasedDiscounts: data.quantityBasedDiscounts || [] });
      setIsModalOpen(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this coupon?")) return;
    try {
      setLoading(true);
      await couponService.deleteCoupon(id);
      await fetchCoupons();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
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
    { header: "Type", accessor: "type", cell: (row) => <span className={`sl-status-badge sl-status-${row.type === 'percentage' ? 'active' : 'inactive'}`}>{row.type === 'percentage' ? `${row.value}%` : `₹${row.value}`}</span> },
    { header: "Min Purchase", accessor: "minPurchase", cell: ({ minPurchase }) => minPurchase ? `₹${minPurchase}` : <span className="sl-na">—</span> },
    { header: "Usage", accessor: "usageCount", cell: (row) => <span>{row.usageCount || 0} / {row.usageLimit || '∞'}</span> },
    { header: "Expires", accessor: "endDate", cell: ({ endDate }) => { if (!endDate) return <span className="sl-na">No expiry</span>; const d = new Date(endDate); const expired = d < new Date(); return <span style={{ color: expired ? '#CE1E36' : '#1a7a4a' }}>{d.toLocaleDateString()}</span>; } },
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
      <div className="dashboard-page">
        <div className="sl-page-header">
          <div className="sl-header-left">
            <div className="sl-header-icon">{IC.coupon}</div>
            <div>
              <h1 className="sl-page-title">Coupons</h1>
              <p className="sl-page-sub">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''} total</p>
            </div>
          </div>
          <div className="sl-header-right">
            <div className="sl-search-wrap">
              <span className="sl-search-icon">{IC.search}</span>
              <input type="text" className="sl-search-input" placeholder="Search coupons..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="sl-add-btn" onClick={() => { setFormData(EMPTY_FORM); setIsModalOpen(true); }}>
              <span className="sl-add-btn-icon">{IC.add}</span>Add Coupon
            </button>
            <select className="pay-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="sl-stat-cards">
          <div className="sl-stat-card">
            <div className="sl-stat-icon sl-stat-icon--blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            </div>
            <div className="sl-stat-body">
              <span className="sl-stat-label">Total Coupons</span>
              <span className="sl-stat-value">{coupons.length}</span>
            </div>
          </div>
          <div className="sl-stat-card">
            <div className="sl-stat-icon sl-stat-icon--green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div className="sl-stat-body">
              <span className="sl-stat-label">Active</span>
              <span className="sl-stat-value">{activeCount}</span>
            </div>
          </div>
          <div className="sl-stat-card">
            <div className="sl-stat-icon sl-stat-icon--red">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <div className="sl-stat-body">
              <span className="sl-stat-label">Expired</span>
              <span className="sl-stat-value">{expiredCount}</span>
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
              <div className="sl-empty-icon">{IC.coupon}</div>
              <p>{search ? "No coupons match your search" : "No coupons yet"}</p>
            </div>
          ) : (
            <>
              <Table columns={columns} data={currentItems} striped hoverable />
              {filteredData.length > itemsPerPage && (
                <div className="sl-pagination">
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={formData.id ? "Edit Coupon" : "Add Coupon"} closeOnOverlayClick={false}>
        <form onSubmit={handleSubmit} className="seo-form">
          {error && <div className="modal-error-banner">{error}</div>}
          <div className="modal-body">
            <Input label="Coupon Code" type="text" name="code" value={formData.code} onChange={handleInputChange} required />
            <Input label="Description" type="textarea" name="description" value={formData.description} onChange={handleInputChange} required />
            <Input label="Discount Type" type="select" name="type" value={formData.type} onChange={handleInputChange} required options={[{ value: "percentage", label: "Percentage" }, { value: "fixed", label: "Fixed Amount" }, { value: "tiered", label: "Tiered Discount" }, { value: "quantity_based", label: "Quantity Based" }]} />
            <Input label="Discount Value" type="number" name="value" value={formData.value} onChange={handleInputChange} required />
            <Input label="Minimum Purchase Amount" type="number" name="minPurchase" value={formData.minPurchase} onChange={handleInputChange} />
            <Input label="Maximum Discount Amount" type="number" name="maxDiscount" value={formData.maxDiscount} onChange={handleInputChange} />
            <Input label="Usage Limit" type="number" name="usageLimit" value={formData.usageLimit} onChange={handleInputChange} />
            <Input label="Per User Limit" type="number" name="perUserLimit" value={formData.perUserLimit} onChange={handleInputChange} />
            <Input label="Status" type="select" name="status" value={formData.status} onChange={handleInputChange} required options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
            <Input label="Start Date" type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} />
            <Input label="End Date" type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} />
            <Input label="Payment Mode Restriction" type="select" name="paymentModeRestriction" value={formData.paymentModeRestriction} onChange={handleInputChange} options={[{ value: "all", label: "All Payment Modes" }, { value: "cod", label: "Cash on Delivery Only" }, { value: "prepaid", label: "Prepaid Only" }]} />
            <Input label="First Order Only" type="select" name="firstOrderOnly" value={formData.firstOrderOnly} onChange={handleInputChange} options={[{ value: false, label: "No" }, { value: true, label: "Yes" }]} />
          </div>
          <div className="modal-footer">
            <Button variant="secondary" size="medium" onClick={handleModalClose} disabled={loading} type="button">Cancel</Button>
            <Button type="submit" variant="primary" size="medium" disabled={loading}>{loading ? "Saving..." : "Save Coupon"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
