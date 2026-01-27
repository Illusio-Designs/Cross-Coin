import { useState, useEffect, useCallback } from "react";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import Table from "@/components/common/Table";
import Pagination from "@/components/common/Pagination";
import { paymentService } from "@/services";
import { debounce } from 'lodash';
import { toast } from "react-hot-toast";
import "../../../styles/dashboard/seo.css";
import "../../../styles/dashboard/payments.css";

export default function Payments() {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [totalPayments, setTotalPayments] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchTerm) => {
      setFilterValue(searchTerm);
    }, 300),
    []
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    debouncedSearch(value);
  };

  // Fetch payments data
  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      const response = await paymentService.getAllPayments();
      console.log('Payment API Response:', response);
      
      if (response.success && response.payments) {
        // Transform payments to include customer name properly
        const transformedPayments = response.payments.map(payment => {
          let customerName = 'Guest User';
          
          // Check if order has a registered user
          if (payment.Order?.User?.username) {
            customerName = payment.Order.User.username;
          } 
          // Check if order has a guest user
          else if (payment.Order?.GuestUser) {
            const guest = payment.Order.GuestUser;
            customerName = `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || guest.email || 'Guest User';
          }
          
          // Determine actual payment method - use Payment table first, then Order table
          let paymentMethod = payment.payment_type || payment.Order?.payment_type;
          
          // If still missing but we have payment_gateway, use that
          if (!paymentMethod && payment.payment_gateway) {
            paymentMethod = payment.payment_gateway.toLowerCase();
          }
          
          // If transaction_id exists and starts with certain patterns, infer the method
          if (!paymentMethod && payment.transaction_id) {
            if (payment.transaction_id.startsWith('pay_')) {
              paymentMethod = 'razorpay';
            }
          }
          
          return {
            ...payment,
            customerName,
            orderNumber: payment.Order?.order_number || `ORD-${payment.order_id}`,
            displayPaymentMethod: paymentMethod || 'N/A'
          };
        });
        
        console.log('Transformed Payments:', transformedPayments);
        
        setPayments(transformedPayments);
        setTotalPayments(response.pagination?.total || transformedPayments.length);
        setTotalPages(Math.ceil((response.pagination?.total || transformedPayments.length) / itemsPerPage));
      } else {
        console.log('No payments data in response');
        setPayments([]);
        setTotalPayments(0);
        setTotalPages(0);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
      toast.error('Failed to load payments');
      setPayments([]);
      setTotalPayments(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // Filter data based on search
  const filteredData = payments.filter(item => {
    // Search filter
    if (filterValue) {
      const searchTerm = filterValue.toLowerCase();
      const matchesSearch = (
        (item.orderNumber?.toLowerCase().includes(searchTerm)) ||
        (item.customerName?.toLowerCase().includes(searchTerm)) ||
        (item.transaction_id?.toLowerCase().includes(searchTerm))
      );
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (statusFilter && item.status !== statusFilter) {
      return false;
    }
    
    // Method filter
    if (methodFilter && item.displayPaymentMethod !== methodFilter) {
      return false;
    }
    
    return true;
  });

  // Calculate pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  // Get current page items
  const currentItems = filteredData.slice(startIndex, endIndex);

  // Add serial number to each row based on current page
  const currentItemsWithSN = currentItems.map((item, idx) => ({
    ...item,
    serial_number: startIndex + idx + 1
  }));

  // Calculate total pages based on filtered data
  const calculatedTotalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue, statusFilter, methodFilter]);

  const handleViewPayment = (payment) => {
    setSelectedPayment(payment);
    setIsViewModalOpen(true);
  };

  const handleRefund = async (payment) => {
    if (window.confirm(`Are you sure you want to refund payment ${payment.transaction_id || payment.id}?`)) {
      try {
        await paymentService.updatePaymentStatus(payment.id, { status: 'refunded' });
        toast.success('Payment refunded successfully');
        fetchPayments();
      } catch (error) {
        console.error('Error refunding payment:', error);
        toast.error('Failed to refund payment');
      }
    }
  };

  const getPaymentMethodLabel = (method) => {
    if (!method || method === 'N/A') return 'Not Specified';
    
    const methods = {
      credit_card: "Credit Card",
      debit_card: "Debit Card",
      razorpay: "Razorpay",
      upi: "UPI",
      cod: "COD",
      wallet: "Wallet",
      bank_transfer: "Bank Transfer"
    };
    return methods[method.toLowerCase()] || method.toUpperCase();
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      successful: "status-badge status-active",
      pending: "status-badge status-pending",
      failed: "status-badge status-inactive",
      refunded: "status-badge status-refunded"
    };
    return (
      <span className={statusStyles[status] || "status-badge"}>
        {status}
      </span>
    );
  };

  // Columns definition
  const columns = [
    {
      header: "S/N",
      accessor: "serial_number"
    },
    { 
      header: "Order Number",
      accessor: "orderNumber"
    },
    { 
      header: "Customer",
      accessor: "customerName"
    },
    { 
      header: "Amount",
      accessor: "amount_paid",
      cell: (row) => `₹${parseFloat(row.amount_paid || 0).toFixed(2)}`
    },
    { 
      header: "Method",
      accessor: "displayPaymentMethod",
      cell: (row) => getPaymentMethodLabel(row.displayPaymentMethod || row.payment_type)
    },
    { 
      header: "Status",
      accessor: "status",
      cell: (row) => getStatusBadge(row.status)
    },
    { 
      header: "Date",
      accessor: "createdAt",
      cell: (row) => new Date(row.createdAt).toLocaleDateString('en-IN')
    },
    {
      header: "Actions",
      accessor: "actions",
      cell: (row) => (
        <div className="action-buttons">
          <button
            className="action-btn view"
            data-tooltip="View"
            onClick={() => handleViewPayment(row)}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          {row.status === 'successful' && (
            <button
              className="action-btn delete"
              data-tooltip="Refund"
              onClick={() => handleRefund(row)}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <>
      <div className="dashboard-page">
        <div className="seo-header-container">
          <h1 className="seo-title">Payments Management</h1>
          <div className="adding-button">
            <form className="modern-searchbar-form" onSubmit={e => e.preventDefault()}>
              <div className="modern-searchbar-group">
                <span className="modern-searchbar-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  className="modern-searchbar-input"
                  placeholder="Search by order, customer, or transaction ID..."
                  onChange={handleSearchChange}
                  defaultValue={filterValue}
                />
              </div>
            </form>
          </div>
        </div>

        {/* Filter Section */}
        <div className="seo-controls" style={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ fontWeight: '600', color: '#374151', minWidth: '80px' }}>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                backgroundColor: 'white',
                cursor: 'pointer',
                minWidth: '150px',
                fontSize: '14px'
              }}
            >
              <option value="">All Status</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ fontWeight: '600', color: '#374151', minWidth: '80px' }}>Method:</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                backgroundColor: 'white',
                cursor: 'pointer',
                minWidth: '150px',
                fontSize: '14px'
              }}
            >
              <option value="">All Methods</option>
              <option value="cod">COD</option>
              <option value="upi">UPI</option>
              <option value="razorpay">Razorpay</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="wallet">Wallet</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

          {(statusFilter || methodFilter) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setMethodFilter('');
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#6b7280',
                fontWeight: '500'
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Table Section */}
        <div className="seo-table-container">
          {loading ? (
            <div className="seo-loading">Loading payments...</div>
          ) : (
            <>
              {filteredData.length === 0 ? (
                <div className="seo-empty-state">
                  {filterValue ? "No results found for your search" : "No payments found"}
                </div>
              ) : (
                <>
                  <Table
                    columns={columns}
                    data={currentItemsWithSN}
                    className="w-full"
                    striped={true}
                    hoverable={true}
                  />
                  {calculatedTotalPages > 1 && (
                    <div className="seo-pagination-container">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={calculatedTotalPages}
                        onPageChange={setCurrentPage}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* View Payment Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Payment Details"
      >
        {selectedPayment && (
          <div className="seo-form">
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Order Number:</label>
                  <p>{selectedPayment.orderNumber}</p>
                </div>
                
                <div className="form-group">
                  <label>Customer:</label>
                  <p>{selectedPayment.customerName}</p>
                </div>
                
                <div className="form-group">
                  <label>Amount:</label>
                  <p>₹{parseFloat(selectedPayment.amount_paid || 0).toFixed(2)}</p>
                </div>
                
                <div className="form-group">
                  <label>Payment Method:</label>
                  <p>{getPaymentMethodLabel(selectedPayment.displayPaymentMethod || selectedPayment.payment_type)}</p>
                </div>
                
                <div className="form-group">
                  <label>Status:</label>
                  <p>{getStatusBadge(selectedPayment.status)}</p>
                </div>
                
                <div className="form-group">
                  <label>Date:</label>
                  <p>{new Date(selectedPayment.createdAt).toLocaleString('en-IN')}</p>
                </div>
                
                <div className="form-group">
                  <label>Transaction ID:</label>
                  <p>{selectedPayment.transaction_id || 'N/A'}</p>
                </div>
                
                {selectedPayment.payment_gateway && selectedPayment.payment_gateway !== 'N/A' && (
                  <div className="form-group">
                    <label>Payment Gateway:</label>
                    <p>{selectedPayment.payment_gateway}</p>
                  </div>
                )}
                
                {selectedPayment.notes && (
                  <div className="form-group full-width">
                    <label>Notes:</label>
                    <p>{selectedPayment.notes}</p>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <Button
                  variant="secondary"
                  onClick={() => setIsViewModalOpen(false)}
                >
                  Close
                </Button>
                {selectedPayment.status === "successful" && (
                  <Button
                    variant="danger"
                    onClick={async () => {
                      try {
                        await paymentService.updatePaymentStatus(selectedPayment.id, { status: 'refunded' });
                        toast.success('Payment refunded successfully');
                        setIsViewModalOpen(false);
                        fetchPayments();
                      } catch (error) {
                        console.error('Error refunding payment:', error);
                        toast.error('Failed to refund payment');
                      }
                    }}
                  >
                    Refund Payment
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
