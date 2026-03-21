import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Table, Pagination, Select } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { paymentService } from "../../../services";
import { showSuccess, showError } from "../../../utils/toastNotification";

const IC = {
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  view: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  refund: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>,
  payments: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  filter: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
};

const METHOD_LABELS = { credit_card: "Credit Card", debit_card: "Debit Card", razorpay: "Razorpay", upi: "UPI", cod: "COD", wallet: "Wallet", bank_transfer: "Bank Transfer" };

const getMethodLabel = (m) => !m || m === 'N/A' ? 'Not Specified' : (METHOD_LABELS[m.toLowerCase()] || m.toUpperCase());

const StatusBadge = ({ status }) => {
  const map = { successful: 'active', pending: 'pending', failed: 'inactive', refunded: 'refunded' };
  return <span className={`sl-status-badge sl-status-${map[status] || 'inactive'}`}>{status}</span>;
};

export default function Payments() {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await paymentService.getAllPayments();
      if (response.success && response.payments) {
        const transformed = response.payments.map(p => {
          let customerName = 'Guest User';
          if (p.Order?.User?.username) customerName = p.Order.User.username;
          else if (p.Order?.GuestUser) { const g = p.Order.GuestUser; customerName = `${g.firstName || ''} ${g.lastName || ''}`.trim() || g.email || 'Guest User'; }
          let method = p.payment_type || p.Order?.payment_type;
          if (!method && p.payment_gateway) method = p.payment_gateway.toLowerCase();
          if (!method && p.transaction_id?.startsWith('pay_')) method = 'razorpay';
          return { ...p, customerName, orderNumber: p.Order?.order_number || `ORD-${p.order_id}`, displayPaymentMethod: method || 'N/A' };
        });
        setPayments(transformed);
      } else {
        setPayments([]);
      }
    } catch (err) {
      showError('loadingFailed');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, methodFilter]);

  const filteredData = payments.filter(item => {
    if (search) {
      const s = search.toLowerCase();
      if (!item.orderNumber?.toLowerCase().includes(s) && !item.customerName?.toLowerCase().includes(s) && !item.transaction_id?.toLowerCase().includes(s)) return false;
    }
    if (statusFilter && item.status !== statusFilter) return false;
    if (methodFilter && item.displayPaymentMethod !== methodFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(start, start + itemsPerPage).map((item, i) => ({ ...item, serial_number: start + i + 1 }));

  const handleRefund = async (payment) => {
    if (!window.confirm(`Refund payment ${payment.transaction_id || payment.id}?`)) return;
    try {
      await paymentService.updatePaymentStatus(payment.id, { status: 'refunded' });
      showSuccess('updateSuccess');
      fetchPayments();
    } catch { showError('saveFailed'); }
  };

  const columns = [
    { header: "Sr. No", accessor: "serial_number" },
    { header: "Order", accessor: "orderNumber", cell: ({ orderNumber }) => <span className="cat-name-cell">{orderNumber}</span> },
    { header: "Customer", accessor: "customerName" },
    { header: "Amount", accessor: "amount_paid", cell: (row) => `₹${parseFloat(row.amount_paid || 0).toFixed(2)}` },
    { header: "Method", accessor: "displayPaymentMethod", cell: (row) => getMethodLabel(row.displayPaymentMethod) },
    { header: "Status", accessor: "status", cell: (row) => <StatusBadge status={row.status} /> },
    { header: "Date", accessor: "createdAt", cell: (row) => new Date(row.createdAt).toLocaleDateString('en-IN') },
    {
      header: "Actions", accessor: "actions",
      cell: (row) => (
        <div className="sl-actions">
          <button className="sl-btn-edit" title="View" onClick={() => { setSelectedPayment(row); setIsViewModalOpen(true); }}>{IC.view}</button>
          {row.status === 'successful' && <button className="sl-btn-delete" title="Refund" onClick={() => handleRefund(row)}>{IC.refund}</button>}
        </div>
      )
    }
  ];

  const totalAmount = filteredData.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
  const successCount = payments.filter(p => p.status === 'successful').length;
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const refundedCount = payments.filter(p => p.status === 'refunded').length;

  return (
    <>
      <div className="dashboard-page">
        <div className="sl-page-header">
          <div className="sl-header-left">
            <div className="sl-header-icon">{IC.payments}</div>
            <div>
              <h1 className="sl-page-title">Payments</h1>
              <p className="sl-page-sub">{payments.length} payment{payments.length !== 1 ? 's' : ''} total</p>
            </div>
          </div>
          <div className="sl-header-right">
            <div className="sl-search-wrap">
              <span className="sl-search-icon">{IC.search}</span>
              <input type="text" className="sl-search-input" placeholder="Search by order, customer, transaction..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="sl-stat-cards">
          <div className="sl-stat-card">
            <div className="sl-stat-icon sl-stat-icon--blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <div className="sl-stat-body">
              <span className="sl-stat-label">Total Payments</span>
              <span className="sl-stat-value">{payments.length}</span>
            </div>
          </div>
          <div className="sl-stat-card">
            <div className="sl-stat-icon sl-stat-icon--green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div className="sl-stat-body">
              <span className="sl-stat-label">Successful</span>
              <span className="sl-stat-value">{successCount}</span>
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
            <div className="sl-stat-icon sl-stat-icon--red">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
            </div>
            <div className="sl-stat-body">
              <span className="sl-stat-label">Total Revenue</span>
              <span className="sl-stat-value">₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="pay-filters">
          <div className="pay-filter-group">
            <span className="pay-filter-label">{IC.filter} Status</span>
            <Select
              options={[
                { value: '', label: 'All Status' },
                { value: 'successful', label: 'Successful' },
                { value: 'pending', label: 'Pending' },
                { value: 'failed', label: 'Failed' },
                { value: 'refunded', label: 'Refunded' },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="All Status"
            />
          </div>
          <div className="pay-filter-group">
            <span className="pay-filter-label">Method</span>
            <Select
              options={[
                { value: '', label: 'All Methods' },
                { value: 'cod', label: 'COD' },
                { value: 'upi', label: 'UPI' },
                { value: 'razorpay', label: 'Razorpay' },
                { value: 'credit_card', label: 'Credit Card' },
                { value: 'debit_card', label: 'Debit Card' },
                { value: 'wallet', label: 'Wallet' },
              ]}
              value={methodFilter}
              onChange={setMethodFilter}
              placeholder="All Methods"
            />
          </div>
          {(statusFilter || methodFilter) && (
            <button className="pay-clear-btn" onClick={() => { setStatusFilter(''); setMethodFilter(''); }}>Clear Filters</button>
          )}
        </div>

        <div className="sl-table-wrap">
          {loading ? (
            <div className="sl-loader-wrap"><Loader /></div>
          ) : filteredData.length === 0 ? (
            <div className="sl-empty">
              <div className="sl-empty-icon">{IC.payments}</div>
              <p>{search ? "No payments match your search" : "No payments found"}</p>
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

      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Payment Details">
        {selectedPayment && (
          <div className="seo-form">
            <div className="modal-body">
              <div className="con-detail-grid">
                <div className="con-detail-item"><span className="con-detail-label">Order Number</span><span className="con-detail-value">{selectedPayment.orderNumber}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Customer</span><span className="con-detail-value">{selectedPayment.customerName}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Amount</span><span className="con-detail-value">₹{parseFloat(selectedPayment.amount_paid || 0).toFixed(2)}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Method</span><span className="con-detail-value">{getMethodLabel(selectedPayment.displayPaymentMethod)}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Status</span><span className="con-detail-value"><StatusBadge status={selectedPayment.status} /></span></div>
                <div className="con-detail-item"><span className="con-detail-label">Date</span><span className="con-detail-value">{new Date(selectedPayment.createdAt).toLocaleString('en-IN')}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Transaction ID</span><span className="con-detail-value" style={{ fontFamily: 'monospace', fontSize: '13px' }}>{selectedPayment.transaction_id || '—'}</span></div>
                {selectedPayment.payment_gateway && <div className="con-detail-item"><span className="con-detail-label">Gateway</span><span className="con-detail-value">{selectedPayment.payment_gateway}</span></div>}
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>Close</Button>
              {selectedPayment.status === "successful" && (
                <Button variant="danger" onClick={async () => { try { await paymentService.updatePaymentStatus(selectedPayment.id, { status: 'refunded' }); showSuccess('updateSuccess'); setIsViewModalOpen(false); fetchPayments(); } catch { showError('saveFailed'); } }}>Refund Payment</Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
