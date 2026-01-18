import React, { useState, useEffect, useCallback } from 'react';
import { orderService } from '../../../services';
import { debounce } from 'lodash';
import Table from "@/components/common/Table";
import Pagination from "@/components/common/Pagination";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import '../../../styles/dashboard/orders.css';
import "../../../styles/dashboard/seo.css"; // Reusing styles for consistency
import { toast } from 'react-hot-toast';
import { getProductImageSrc } from '../../../utils/imageUtils';
import { getAttributeComponents } from '../../../utils/productAttributeFormatter';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterValue, setFilterValue] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20); // Increased from 10 to 20
    const [totalPages, setTotalPages] = useState(0);
    const [totalOrders, setTotalOrders] = useState(0);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [paymentTypeFilter, setPaymentTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState("desc");
    const [notification, setNotification] = useState(null);

    const fetchOrders = async (page = currentPage) => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page,
                limit: itemsPerPage,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                payment_status: paymentTypeFilter !== 'all' ? paymentTypeFilter : undefined,
                sort: sortBy,
                order: sortOrder
            };
            
            const data = await orderService.getAllOrders(params);
            
            console.log('=== FRONTEND ORDERS DEBUG ===');
            console.log('API Response:', data);
            console.log('Orders received:', data.orders?.length || 0);
            console.log('Total orders:', data.total);
            console.log('Total pages:', data.totalPages);
            console.log('Current page:', page);
            console.log('Items per page:', itemsPerPage);
            
            setOrders(data.orders || data.data || []);
            setTotalPages(data.totalPages || Math.ceil((data.total || 0) / itemsPerPage));
            setTotalOrders(data.total || 0);
        } catch (err) {
            setError(err.message || 'Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };



    const syncOrders = async () => {
        setLoading(true);
        try {
            const result = await orderService.syncOrdersWithShiprocket();
            
            // Show detailed results
            const { results } = result;
            let message = `Sync completed! `;
            
            if (results.total_orders_processed > 0) {
                message += `Processed ${results.total_orders_processed} orders. `;
            }
            
            if (results.new_orders_synced > 0) {
                message += `${results.new_orders_synced} new orders synced. `;
            }
            
            if (results.existing_orders_updated > 0) {
                message += `${results.existing_orders_updated} existing orders updated. `;
            }
            
            if (results.status_updates > 0) {
                message += `${results.status_updates} status updates. `;
            }
            
            if (results.tracking_updates > 0) {
                message += `${results.tracking_updates} tracking updates. `;
            }
            
            if (results.failed > 0) {
                message += `${results.failed} orders failed. `;
                console.error('Failed orders:', results.errors);
            }
            
            toast.success(message);
            
            // Refresh orders after sync
            fetchOrders();
        } catch (error) {
            console.error('=== Order Sync Failed ===');
            console.error('Error object:', error);
            
            let errorMessage = 'Failed to sync orders';
            if (error.message) {
                errorMessage = error.message;
            } else if (error.error) {
                errorMessage = error.error;
            }
            
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchOrders(1);
    }, []);


    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
        fetchOrders(1);
    }, [filterValue, paymentTypeFilter, statusFilter, sortBy, sortOrder]);

    // Load orders when page changes
    useEffect(() => {
        if (currentPage > 1) {
            fetchOrders(currentPage);
        }
    }, [currentPage]);

    const debouncedSearch = useCallback(debounce((searchTerm) => setFilterValue(searchTerm), 300), []);
    const handleSearchChange = (e) => debouncedSearch(e.target.value);

    // Remove manual status change - now handled automatically by Shiprocket sync
    // const handleStatusChange = async (orderId, newStatus) => {
    //     try {
    //         await orderService.updateOrderStatus(orderId, { status: newStatus });
    //         fetchOrders();
    //     } catch (err) {
    //         alert(`Failed to update status: ${err.message || 'Unknown error'}`);
    //     }
    // };

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    const formatCurrency = (amount) => {
        return `₹${parseFloat(amount || 0).toFixed(2)}`;
    };

    const calculateOrderSubtotal = (orderItems) => {
        return orderItems.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
    };

    const calculateOrderTotal = (subtotal, shippingFee, discountAmount) => {
        const finalDiscount = parseFloat(discountAmount || 0);
        const finalShippingFee = parseFloat(shippingFee || 0);
        return Math.max(0, subtotal - finalDiscount + finalShippingFee);
    };

    const getOrderTotal = (order) => {
        if (!order || !order.OrderItems || order.OrderItems.length === 0) {
            return parseFloat(order.final_amount || 0);
        }
        
        const subtotal = calculateOrderSubtotal(order.OrderItems);
        const shippingFee = parseFloat(order.shipping_fee || 0);
        const discountAmount = parseFloat(order.discount_amount || 0);
        
        return calculateOrderTotal(subtotal, shippingFee, discountAmount);
    };

    const getPaymentStatusDisplay = (order) => {
        const paymentType = order.payment_type?.toLowerCase();
        const paymentStatus = order.payment_status?.toLowerCase();
        
        if (['credit_card', 'debit_card', 'upi', 'wallet'].includes(paymentType)) {
            return 'Paid';
        }
        
        if (paymentType === 'cod') {
            return paymentStatus === 'paid' ? 'Paid' : 'Pending';
        }
        
        return paymentStatus === 'paid' ? 'Paid' : 'Pending';
    };

    const getPaymentStatusClass = (order) => {
        const paymentType = order.payment_type?.toLowerCase();
        const paymentStatus = order.payment_status?.toLowerCase();
        
        if (['credit_card', 'debit_card', 'upi', 'wallet'].includes(paymentType)) {
            return 'paid';
        }
        
        if (paymentType === 'cod') {
            return paymentStatus === 'paid' ? 'paid' : 'pending';
        }
        
        return paymentStatus === 'paid' ? 'paid' : 'pending';
    };

    const formatPaymentType = (paymentType) => {
        if (!paymentType) return 'N/A';
        
        const type = paymentType.toLowerCase();
        switch (type) {
            case 'cod':
                return 'COD';
            case 'credit_card':
            case 'debit_card':
                return 'Pre-paid';
            case 'upi':
                return 'Pre-paid';
            case 'wallet':
                return 'Pre-paid';
            default:
                return paymentType.toUpperCase();
        }
    };

    const getPaymentStats = () => {
        const stats = {
            total: orders.length,
            prepaid: 0,
            cod: 0,
            paid: 0,
            pending: 0,
            totalRevenue: 0,
            averageOrderValue: 0,
            deliveredOrders: 0
        };

        orders.forEach(order => {
            const paymentType = order.payment_type?.toLowerCase();
            const paymentStatus = order.payment_status?.toLowerCase();
            const orderStatus = order.status?.toLowerCase();
            
            // Calculate revenue from all orders (not just delivered)
            // For better business insights, include all paid orders
            let includeInRevenue = false;
            const orderTotal = parseFloat(order.final_amount || 0);
            
            if (paymentType === 'cod') {
                // COD orders: include revenue only if delivered (payment collected on delivery)
                if (orderStatus === 'delivered') {
                    includeInRevenue = true;
                    stats.deliveredOrders++;
                }
            } else if (['credit_card', 'debit_card', 'upi', 'wallet'].includes(paymentType)) {
                // Prepaid orders: include revenue if paid (regardless of delivery status)
                if (paymentStatus === 'paid') {
                    includeInRevenue = true;
                }
                // Count delivered prepaid orders
                if (orderStatus === 'delivered') {
                    stats.deliveredOrders++;
                }
            }
            
            if (includeInRevenue) {
                stats.totalRevenue += orderTotal;
            }
            
            // Count payment types and statuses
            if (['credit_card', 'debit_card', 'upi', 'wallet'].includes(paymentType)) {
                stats.prepaid++;
                if (paymentStatus === 'paid') {
                    stats.paid++;
                } else {
                    stats.pending++;
                }
            } else if (paymentType === 'cod') {
                stats.cod++;
                if (orderStatus === 'delivered' || paymentStatus === 'paid') {
                    stats.paid++;
                } else {
                    stats.pending++;
                }
            } else {
                // Handle other payment types
                if (paymentStatus === 'paid') {
                    stats.paid++;
                } else {
                    stats.pending++;
                }
            }
        });

        // Calculate average order value based on total orders (not just delivered)
        stats.averageOrderValue = stats.total > 0 ? stats.totalRevenue / stats.total : 0;
        return stats;
    };

    const getSyncStats = () => {
        const stats = {
            total: orders.length,
            synced: 0,
            notSynced: 0,
            syncPercentage: 0
        };

        orders.forEach(order => {
            if (order.shiprocket_order_id || order.shiprocket_shipment_id) {
                stats.synced++;
            } else {
                stats.notSynced++;
            }
        });

        stats.syncPercentage = stats.total > 0 ? Math.round((stats.synced / stats.total) * 100) : 0;
        return stats;
    };

    const filteredData = orders.filter(order => {
        if (filterValue) {
        const searchTerm = filterValue.toLowerCase();
            const matchesSearch = (
            order.order_number.toLowerCase().includes(searchTerm) ||
                order.User?.username.toLowerCase().includes(searchTerm) ||
                order.User?.email?.toLowerCase().includes(searchTerm)
            );
            if (!matchesSearch) return false;
        }
        
        if (paymentTypeFilter !== "all") {
            const orderPaymentType = order.payment_type?.toLowerCase();
            if (paymentTypeFilter === "prepaid") {
                if (!['credit_card', 'debit_card', 'upi', 'wallet'].includes(orderPaymentType)) {
                    return false;
                }
            } else if (paymentTypeFilter === "cod") {
                if (orderPaymentType !== 'cod') {
                    return false;
                }
            }
        }

        if (statusFilter !== "all") {
            if (order.status?.toLowerCase() !== statusFilter) {
                return false;
            }
        }
        
        return true;
    });

    const sortedData = [...filteredData].sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
            case 'order_number':
                aValue = a.order_number;
                bValue = b.order_number;
                break;
            case 'total':
                aValue = getOrderTotal(a);
                bValue = getOrderTotal(b);
                break;
            case 'status':
                aValue = a.status;
                bValue = b.status;
                break;
            case 'payment_status':
                aValue = getPaymentStatusDisplay(a);
                bValue = getPaymentStatusDisplay(b);
                break;
            default:
                aValue = new Date(a.createdAt);
                bValue = new Date(b.createdAt);
        }
        
        if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);
    const currentItemsWithSN = currentItems.map((item, idx) => ({
        ...item,
        serial_number: indexOfFirstItem + idx + 1
    }));

    useEffect(() => {
        setCurrentPage(1);
    }, [filterValue, paymentTypeFilter, statusFilter]);

    const columns = [
        { header: "S/N", accessor: "serial_number" },
        { header: "Order ID", accessor: "order_number" },
        { 
            header: "Customer", 
            cell: (row) => (
                <div className="customer-info">
                    <div className="customer-name">
                        {row.User?.username || 
                         (row.GuestUser ? `${row.GuestUser.firstName} ${row.GuestUser.lastName}` : 'N/A')}
                    </div>
                    <div className="customer-email">
                        {row.User?.email || row.GuestUser?.email || ''}
                        {row.GuestUser && <span className="guest-badge" style={{
                          background: '#e3f2fd',
                          color: '#1976d2',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '500',
                          marginLeft: '4px'
                        }}>(Guest)</span>}
                    </div>
                </div>
            )
        },
        { header: "Date", cell: (row) => formatDate(row.createdAt) },
        { header: "Payment Type", cell: (row) => formatPaymentType(row.payment_type) },
        { 
            header: "Payment Status", 
            cell: (row) => <span className={`status-badge status-${getPaymentStatusClass(row)}`}>{getPaymentStatusDisplay(row)}</span> 
        },
        { header: "Total", cell: (row) => formatCurrency(getOrderTotal(row)) },
        { 
            header: "Order Status", 
            cell: (row) => <span className={`status-badge status-${row.status}`}>{row.status}</span> 
        },
        {
            header: "Shiprocket Sync",
            cell: (row) =>
                row.shiprocket_order_id
                    ? <span className="status-badge status-synced">Synced<br/><small>ID: {row.shiprocket_order_id}</small></span>
                    : <span className="status-badge status-unsynced">Not Synced</span>
        },
        {
            header: "Actions",
            cell: (row) => (
                <div className="action-buttons">
                    <button 
                        className="action-btn edit" 
                        title="View Details" 
                        onClick={() => { setSelectedOrder(row); setIsViewModalOpen(true); }}
                    >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                    </button>
                    <div className="status-info" style={{
                        fontSize: '11px',
                        color: '#666',
                        marginTop: '4px',
                        fontStyle: 'italic'
                    }}>
                        Status auto-synced
                    </div>
                </div>
            )
        }
    ];

    // Notification system
    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    return (
        <>
            <div className="dashboard-page">
                {/* Notification */}
                {notification && (
                    <div className={`notification notification-${notification.type}`}>
                        <div className="notification-content">
                            <span className="notification-message">{notification.message}</span>
                            <button 
                                className="notification-close"
                                onClick={() => setNotification(null)}
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}

                <div className="seo-header-container">
                    <h1 className="seo-title">Manage Orders</h1>
                    <div className="orders-summary" style={{
                        display: 'flex',
                        gap: '20px',
                        marginBottom: '20px',
                        padding: '10px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        fontSize: '14px'
                    }}>
                        <span className="total-orders" style={{color: '#007bff', fontWeight: 'bold'}}>
                            Total Orders: <strong>{totalOrders}</strong>
                        </span>
                        <span className="page-info" style={{color: '#6c757d'}}>
                            Page {currentPage} of {totalPages}
                        </span>
                        <span className="showing-info" style={{color: '#28a745'}}>
                            Showing {orders.length} orders
                        </span>
                    </div>
                    <div className="adding-button">
                        <button 
                            className="sync-button"
                            onClick={syncOrders}
                            title="Comprehensive Shiprocket sync - Tests credentials, syncs new orders, and updates statuses"
                            disabled={loading}
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {loading ? 'Syncing...' : 'Comprehensive Sync'}
                        </button>
                        <form className="modern-searchbar-form" onSubmit={e => e.preventDefault()}>
                            <div className="modern-searchbar-group">
                                <span className="modern-searchbar-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </span>
                                <input type="text" className="modern-searchbar-input" placeholder="Search orders, customers..." onChange={handleSearchChange} />
                            </div>
                        </form>
                        <select 
                            value={paymentTypeFilter} 
                            onChange={(e) => setPaymentTypeFilter(e.target.value)}
                            className="payment-filter-dropdown"
                        >
                            <option value="all">All Payments</option>
                            <option value="prepaid">Prepaid</option>
                            <option value="cod">Cash on Delivery</option>
                        </select>
                        <select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="payment-filter-dropdown"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>


                <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#888' }}>
                        Comprehensive Shiprocket sync: Automatically tests credentials, syncs new orders, and updates existing order statuses.
                    </span>
                </div>

                {notification && (
                    <div style={{
                        marginBottom: '16px',
                        padding: '12px',
                        borderRadius: '6px',
                        backgroundColor: notification.type === 'success' ? '#d1fae5' : '#fee2e2',
                        color: notification.type === 'success' ? '#065f46' : '#dc2626',
                        border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`
                    }}>
                        {notification.message}
                    </div>
                )}

                <div className="seo-table-container">
                    {loading ? <div className="seo-loading">Loading...</div> :
                        <>
                            {filteredData.length === 0 ? <div className="seo-empty-state">No orders found.</div> :
                                <>
                            {/* Payment Statistics */}
                            <div className="payment-stats">
                                {(() => {
                                    const stats = getPaymentStats();
                                    return (
                                        <>
                                            <div className="stat-item">
                                                <span className="stat-label">Total Orders:</span>
                                                <span className="stat-badge total">{stats.total}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Prepaid:</span>
                                                <span className="stat-badge prepaid">{stats.prepaid}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">COD:</span>
                                                <span className="stat-badge cod">{stats.cod}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Paid:</span>
                                                <span className="stat-badge paid">{stats.paid}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Pending:</span>
                                                <span className="stat-badge pending">{stats.pending}</span>
                                            </div>
                                            <div className="stat-item revenue">
                                                <span className="stat-label">Total Revenue:</span>
                                                <span className="stat-badge revenue">{formatCurrency(stats.totalRevenue)}</span>
                                            </div>
                                            <div className="stat-item avg">
                                                <span className="stat-label">Avg Order:</span>
                                                <span className="stat-badge avg">{formatCurrency(stats.averageOrderValue)}</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Sort Controls */}
                            <div className="sort-controls">
                                <div className="sort-group">
                                    <label>Sort by:</label>
                                    <select 
                                        value={sortBy} 
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="sort-select"
                                    >
                                        <option value="createdAt">Date</option>
                                        <option value="order_number">Order ID</option>
                                        <option value="total">Total Amount</option>
                                        <option value="status">Order Status</option>
                                        <option value="payment_status">Payment Status</option>
                                    </select>
                                </div>
                                <div className="sort-group">
                                    <label>Order:</label>
                                    <select 
                                        value={sortOrder} 
                                        onChange={(e) => setSortOrder(e.target.value)}
                                        className="sort-select"
                                    >
                                        <option value="desc">Newest First</option>
                                        <option value="asc">Oldest First</option>
                                    </select>
                                </div>
                            </div>

                            <div className="info-note">
                                <strong>Note:</strong> Order statuses are automatically synchronized with Shiprocket. Use "Comprehensive Sync" to update all orders at once. Manual status changes have been disabled to maintain sync integrity.
                            </div>

                            <Table 
                                columns={columns} 
                                data={currentItemsWithSN} 
                                className="w-full" 
                                striped={true} 
                                hoverable={true} 
                            />
                            {totalPages > 1 && (
                                <div className="seo-pagination-container">
                                    <Pagination 
                                        currentPage={currentPage} 
                                        totalItems={totalOrders} 
                                        itemsPerPage={itemsPerPage} 
                                        onPageChange={(page) => {
                                            setCurrentPage(page);
                                            fetchOrders(page);
                                        }} 
                                    />
                                </div>
                            )}
                                </>
                            }
                        </>
                    }
                </div>
            </div>

            <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={`Order Details: #${selectedOrder?.order_number}`}>
                {selectedOrder && (
                    <div className="order-details-modal">
                        {/* Customer Information Section */}
                        <div className="order-section">
                            <h4 style={{ marginBottom: '12px', color: '#333', borderBottom: '2px solid #007bff', paddingBottom: '8px' }}>
                                Customer Information
                            </h4>
                            <div className="order-info-grid">
                                <div><strong>Name:</strong> {
                                    selectedOrder.User?.username || 
                                    (selectedOrder.GuestUser ? `${selectedOrder.GuestUser.firstName} ${selectedOrder.GuestUser.lastName}` : 'N/A')
                                } {selectedOrder.GuestUser && <span className="guest-badge" style={{
                                  background: '#e3f2fd',
                                  color: '#1976d2',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: '500',
                                  marginLeft: '4px'
                                }}>(Guest)</span>}</div>
                                <div><strong>Email:</strong> {selectedOrder.User?.email || selectedOrder.GuestUser?.email || 'N/A'}</div>
                                <div><strong>Phone:</strong> {selectedOrder.ShippingAddress?.phone || selectedOrder.GuestUser?.phone || 'N/A'}</div>
                            </div>
                        </div>

                        {/* Shipping Address Section */}
                        {selectedOrder.ShippingAddress && (
                            <div className="order-section" style={{ marginTop: '20px' }}>
                                <h4 style={{ marginBottom: '12px', color: '#333', borderBottom: '2px solid #28a745', paddingBottom: '8px' }}>
                                    Shipping Address
                                </h4>
                                <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px', lineHeight: '1.6' }}>
                                    <div><strong>{selectedOrder.ShippingAddress.full_name}</strong></div>
                                    <div>{selectedOrder.ShippingAddress.address}</div>
                                    <div>{selectedOrder.ShippingAddress.city}, {selectedOrder.ShippingAddress.state} - {selectedOrder.ShippingAddress.pincode}</div>
                                    <div>{selectedOrder.ShippingAddress.country || 'India'}</div>
                                    <div><strong>Phone:</strong> {selectedOrder.ShippingAddress.phone}</div>
                                </div>
                            </div>
                        )}

                        {/* Order Information Section */}
                        <div className="order-section" style={{ marginTop: '20px' }}>
                            <h4 style={{ marginBottom: '12px', color: '#333', borderBottom: '2px solid #ff9800', paddingBottom: '8px' }}>
                                Order Information
                            </h4>
                            <div className="order-info-grid">
                                <div><strong>Order Date:</strong> {formatDate(selectedOrder.createdAt)}</div>
                                <div><strong>Payment Type:</strong> <span style={{ 
                                    padding: '4px 8px', 
                                    backgroundColor: selectedOrder.payment_type?.toLowerCase() === 'cod' ? '#fff3cd' : '#d1ecf1',
                                    color: selectedOrder.payment_type?.toLowerCase() === 'cod' ? '#856404' : '#0c5460',
                                    borderRadius: '4px',
                                    fontWeight: '500'
                                }}>{formatPaymentType(selectedOrder.payment_type)}</span></div>
                                <div><strong>Payment Status:</strong> <span className={`status-badge status-${getPaymentStatusClass(selectedOrder)}`}>{getPaymentStatusDisplay(selectedOrder)}</span></div>
                                <div><strong>Order Status:</strong> <span className={`status-badge status-${selectedOrder.status}`}>{selectedOrder.status}</span></div>
                                {selectedOrder.notes && <div style={{ gridColumn: '1 / -1' }}><strong>Order Notes:</strong> {selectedOrder.notes}</div>}
                                {/* Shiprocket Information */}
                                {(selectedOrder.shiprocket_order_id || selectedOrder.shiprocket_shipment_id || selectedOrder.tracking_number) && (
                                    <>
                                        <div style={{ gridColumn: '1 / -1', marginTop: '12px', padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '6px' }}>
                                            <h5 style={{ margin: '0 0 8px 0', color: '#2e7d32' }}>Shiprocket Tracking Information</h5>
                                            {selectedOrder.shiprocket_order_id && <div><strong>Shiprocket Order ID:</strong> {selectedOrder.shiprocket_order_id}</div>}
                                            {selectedOrder.shiprocket_shipment_id && <div><strong>Shipment ID:</strong> {selectedOrder.shiprocket_shipment_id}</div>}
                                            {selectedOrder.tracking_number && <div><strong>AWB Number:</strong> {selectedOrder.tracking_number}</div>}
                                            {selectedOrder.courier_name && <div><strong>Courier:</strong> {selectedOrder.courier_name}</div>}
                                            {selectedOrder.tracking_url && (
                                                <div><strong>Track Package:</strong> <a href={selectedOrder.tracking_url} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2' }}>Click to track</a></div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Products Ordered Section */}
                        <div className="order-section" style={{ marginTop: '20px' }}>
                            <h4 style={{ marginBottom: '12px', color: '#333', borderBottom: '2px solid #6f42c1', paddingBottom: '8px' }}>
                                Products Ordered
                            </h4>
                            <table className="items-table">
                                <thead>
                                    <tr>
                                        <th>Image</th>
                                        <th>Product Name</th>
                                        <th>SKU</th>
                                        <th>Quantity</th>
                                        <th>Price</th>
                                        <th>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedOrder.OrderItems.map(item => {
                                        // Get the primary product image
                                        const primaryImage = item.Product?.ProductImages?.find(img => img.is_primary) || 
                                                           item.Product?.ProductImages?.[0];
                                        const imageUrl = getProductImageSrc(primaryImage);
                                        
                                        // Get SKU from ProductVariation if available, otherwise show 'N/A'
                                        const sku = item.ProductVariation?.sku || 'N/A';
                                        
                                        return (
                                            <tr key={item.id}>
                                                <td>
                                                    <div className="product-image-container">
                                                        <img 
                                                            src={imageUrl} 
                                                            alt={item.Product?.name || 'Product'} 
                                                            className="product-image"
                                                            onError={(e) => {
                                                                e.target.src = '/assets/card1-left.webp';
                                                            }}
                                                        />
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="product-details-cell">
                                                        <div className="product-name">{item.Product?.name || 'N/A'}</div>
                                                        {item.Product?.brand && <div className="product-brand">Brand: {item.Product.brand}</div>}
                                                        {item.ProductVariation?.attributes && (
                                                            <div className="product-attributes">
                                                                {getAttributeComponents(item.ProductVariation.attributes).map(({ key, value }) => (
                                                                    <span key={key} className="attribute-item">
                                                                        {key}: {value}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="product-sku">
                                                        {sku}
                                                    </div>
                                                </td>
                                                <td><span className="quantity-badge">{item.quantity}</span></td>
                                                <td className="price-cell">{formatCurrency(item.price)}</td>
                                                <td className="subtotal-cell">{formatCurrency(item.subtotal)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Order Summary Section */}
                        <div className="order-section" style={{ marginTop: '20px' }}>
                            <h4 style={{ marginBottom: '12px', color: '#333', borderBottom: '2px solid #dc3545', paddingBottom: '8px' }}>
                                Order Summary
                            </h4>
                            <div className="order-summary-grid" style={{ 
                                backgroundColor: '#f8f9fa', 
                                padding: '16px', 
                                borderRadius: '6px',
                                display: 'grid',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <strong>Subtotal:</strong> 
                                    <span>{formatCurrency(calculateOrderSubtotal(selectedOrder.OrderItems))}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <strong>Shipping Fee:</strong> 
                                    <span>{formatCurrency(selectedOrder.shipping_fee || 0)}</span>
                                </div>
                                {selectedOrder.discount_amount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#28a745' }}>
                                        <strong>Discount:</strong> 
                                        <span>- {formatCurrency(selectedOrder.discount_amount || 0)}</span>
                                    </div>
                                )}
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    paddingTop: '12px', 
                                    borderTop: '2px solid #dee2e6',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    color: '#007bff'
                                }}>
                                    <strong>Total Amount:</strong> 
                                    <span>{formatCurrency(getOrderTotal(selectedOrder))}</span>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer" style={{ marginTop: '24px' }}>
                            <Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>Close</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default Orders; 