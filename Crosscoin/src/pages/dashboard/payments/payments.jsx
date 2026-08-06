import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Table, Pagination, Select, DateRangePicker } from "../../../components/ui";
import { PageHeader, Panel, StatTile, StatGrid, FilterBar, EmptyState } from "../../../components/Dashboard/primitives";
import Loader from "../../../components/common/Loader";
import { paymentService } from "../../../services";
import { showSuccess, showError } from "../../../utils/toastNotification";
import { ConfirmModal } from '../../../components/common/AlertModal';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, ViewIcon, ArrowTurnBackwardIcon, CreditCardIcon, FilterIcon } from '@hugeicons/core-free-icons';

const IC = {
  search: <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />,
  view: <HugeiconsIcon icon={ViewIcon} size={16} strokeWidth={2} />,
  refund: <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={16} strokeWidth={2} />,
  payments: <HugeiconsIcon icon={CreditCardIcon} size={20} strokeWidth={2} />,
  filter: <HugeiconsIcon icon={FilterIcon} size={16} strokeWidth={2} />,
};

const METHOD_LABELS = { credit_card: "Credit Card", debit_card: "Debit Card", razorpay: "Razorpay", upi: "UPI", cod: "COD", wallet: "Wallet", bank_transfer: "Bank Transfer" };

const getMethodLabel = (m) => !m || m === 'N/A' ? 'Not Specified' : (METHOD_LABELS[m.toLowerCase()] || m.toUpperCase());

const StatusBadge = ({ status }) => {
  const map = { successful: 'active', pending: 'pending', failed: 'inactive', refunded: 'refunded' };
  return <span className={`sl-status-badge sl-status-${map[status] || 'inactive'}`}>{status}</span>;
};

export default function Payments() {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [statsStartDate, setStatsStartDate] = useState("");
  const [statsEndDate, setStatsEndDate] = useState("");

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statsStartDate) params.start_date = statsStartDate;
      if (statsEndDate) params.end_date = statsEndDate;
      const response = await paymentService.getAllPayments(params);
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
  }, [statsStartDate, statsEndDate]);

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

  const handleRefund = (payment) => {
    setConfirmState({ message: `Refund payment ${payment.transaction_id || payment.id}?`, onConfirm: async () => {
      setConfirmState(null);
      try {
        await paymentService.updatePaymentStatus(payment.id, { status: 'refunded' });
        showSuccess('updateSuccess');
        fetchPayments();
      } catch { showError('saveFailed'); }
    }});
  };

  const columns = [
    { header: "Sr. No", accessor: "serial_number" },
    { header: "Order", accessor: "orderNumber", cell: ({ orderNumber }) => <span className="cat-name-cell">{orderNumber}</span> },
    { header: "Customer", accessor: "customerName" },
    { header: "Amount", accessor: "amount_paid", cell: (row) => `₹${(parseFloat(row.amount_paid || 0) / 100).toFixed(2)}` },
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

  const totalAmount = filteredData.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0) / 100;
  const successCount = filteredData.filter(p => p.status === 'successful').length;
  const pendingCount = filteredData.filter(p => p.status === 'pending').length;
  const refundedCount = filteredData.filter(p => p.status === 'refunded').length;

  return (
    <>
      <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />
      <div className="dashboard-page">
        <PageHeader
          title="Payments"
          subtitle={`${payments.length} payment${payments.length !== 1 ? 's' : ''} total`}
        />

        <Panel style={{ marginBottom: 12 }}>
          <DateRangePicker
            label="Stats Date Range"
            inline
            startDate={statsStartDate}
            endDate={statsEndDate}
            onStartChange={setStatsStartDate}
            onEndChange={setStatsEndDate}
            onClear={() => { setStatsStartDate(''); setStatsEndDate(''); }}
          />
        </Panel>

        <StatGrid>
          <StatTile label="Total payments" value={filteredData.length} tone="info" />
          <StatTile label="Successful" value={successCount} tone="good" />
          <StatTile label="Pending" value={pendingCount} tone="warn" />
          <StatTile label="Total revenue" value={`₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} tone="default" sub="from filtered set" />
        </StatGrid>

        <Panel>
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search by order, customer, transaction…"
          >
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
            {(statusFilter || methodFilter) && (
              <button className="pay-clear-btn" onClick={() => { setStatusFilter(''); setMethodFilter(''); }}>Clear</button>
            )}
          </FilterBar>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Loader /></div>
          ) : filteredData.length === 0 ? (
            <EmptyState
              icon={IC.payments}
              title={search ? "No payments match your search" : "No payments found"}
              message={search ? "Try a different search term or clear filters." : "Payments will appear here as customers check out."}
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

      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Payment Details">
        {selectedPayment && (
          <div className="seo-form">
            <div className="modal-body">
              <div className="con-detail-grid">
                <div className="con-detail-item"><span className="con-detail-label">Order Number</span><span className="con-detail-value">{selectedPayment.orderNumber}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Customer</span><span className="con-detail-value">{selectedPayment.customerName}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Amount</span><span className="con-detail-value">₹{(parseFloat(selectedPayment.amount_paid || 0) / 100).toFixed(2)}</span></div>
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
