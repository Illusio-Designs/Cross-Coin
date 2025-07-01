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
import { apiService } from '../../../services';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterValue, setFilterValue] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [paymentTypeFilter, setPaymentTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState("desc");
    const [activeTab, setActiveTab] = useState("local"); // "local" or "shiprocket"
    const [shiprocketOrders, setShiprocketOrders] = useState([]);
    const [loadingShiprocket, setLoadingShiprocket] = useState(false);
    const [shiprocketError, setShiprocketError] = useState(null);
    const [notification, setNotification] = useState(null);

    const fetchOrders = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await orderService.getAllOrders({ limit: 1000 });
            setOrders(data.orders);
        } catch (err) {
            setError(err.message || 'Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };

    const fetchShiprocketOrders = async () => {
        setLoadingShiprocket(true);
        setShiprocketError(null);
        try {
            const data = await orderService.getAllShiprocketOrders({ limit: 1000 });
            setShiprocketOrders(data.data || data || []);
        } catch (err) {
            setShiprocketError(err.message || 'Failed to fetch Shiprocket orders');
        } finally {
            setLoadingShiprocket(false);
        }
    };

    const testCredentials = async () => {
        setLoading(true);
        try {
            console.log('=== Testing Shiprocket Credentials ===');
            const result = await apiService.testShiprocketCredentials();
            console.log('Credentials test result:', result);
            toast.success(result.message);
        } catch (error) {
            console.error('Credentials test failed:', error);
            console.error('Error details:', {
                message: error.message,
                status: error.status,
                data: error.data
            });
            toast.error(error.message || 'Failed to test credentials');
        } finally {
            setLoading(false);
        }
    };

    const syncOrders = async () => {
        setLoading(true);
        try {
            console.log('=== Starting Order Sync with Shiprocket ===');
            console.log('Current orders state:', orders);
            
            const result = await orderService.syncOrdersWithShiprocket();
            console.log('Sync result:', result);
            
            if (result.results.successful > 0) {
                toast.success(`Successfully synced ${result.results.successful} orders`);
            }
            
            if (result.results.failed > 0) {
                console.error('Failed orders:', result.results.errors);
                toast.error(`Failed to sync ${result.results.failed} orders. Check console for details.`);
            }
            
            // Refresh orders after sync
            fetchOrders();
        } catch (error) {
            console.error('=== Order Sync Failed ===');
            console.error('Error object:', error);
            console.error('Error message:', error.message);
            console.error('Error status:', error.status);
            console.error('Error data:', error.data);
            console.error('Full error details:', {
                name: error.name,
                stack: error.stack,
                response: error.response,
                request: error.request
            });
            
            toast.error(error.message || 'Failed to sync orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    useEffect(() => {
        if (activeTab === "shiprocket") {
            fetchShiprocketOrders();
        }
    }, [activeTab]);

    const debouncedSearch = useCallback(debounce((searchTerm) => setFilterValue(searchTerm), 300), []);
    const handleSearchChange = (e) => debouncedSearch(e.target.value);

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await orderService.updateOrderStatus(orderId, { status: newStatus });
            fetchOrders();
        } catch (err) {
            alert(`Failed to update status: ${err.message || 'Unknown error'}`);
        }
    };

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
            averageOrderValue: 0
        };

        orders.forEach(order => {
            const paymentType = order.payment_type?.toLowerCase();
            const paymentStatus = order.payment_status?.toLowerCase();
            const orderTotal = getOrderTotal(order);
            
            stats.totalRevenue += orderTotal;
            
            if (['credit_card', 'debit_card', 'upi', 'wallet'].includes(paymentType)) {
                stats.prepaid++;
                stats.paid++;
            } else if (paymentType === 'cod') {
                stats.cod++;
                if (paymentStatus === 'paid') {
                    stats.paid++;
                } else {
                    stats.pending++;
                }
            } else {
                if (paymentStatus === 'paid') {
                    stats.paid++;
                } else {
                    stats.pending++;
                }
            }
        });

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

    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
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
                    <div className="customer-name">{row.User?.username || 'N/A'}</div>
                    <div className="customer-email">{row.User?.email || ''}</div>
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
                    <select 
                        value={row.status} 
                        onChange={(e) => handleStatusChange(row.id, e.target.value)} 
                        className="action-btn status-select-action"
                    >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
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
                    <div className="adding-button">
                        <button 
                            className="sync-button"
                            onClick={syncOrders}
                            title="Sync orders with Shiprocket"
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Sync Shiprocket
                        </button>
                        <button 
                            className="test-credentials-button"
                            onClick={testCredentials}
                            title="Test Shiprocket credentials"
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Test Credentials
                        </button>
                        <div className="shiprocket-controls">
                            <button 
                                onClick={testCredentials}
                                disabled={loading}
                                className="btn btn-secondary"
                            >
                                {loading ? 'Testing...' : 'Test Credentials'}
                            </button>
                            <button 
                                onClick={syncOrders}
                                disabled={loading}
                                className="btn btn-primary"
                            >
                                {loading ? 'Syncing...' : 'Sync Orders'}
                            </button>
                        </div>
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

                {/* Tab Navigation */}
                <div className="orders-tab-navigation">
                    <button 
                        className={`tab-button ${activeTab === 'local' ? 'active' : ''}`}
                        onClick={() => setActiveTab('local')}
                    >
                        Local Orders
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'shiprocket' ? 'active' : ''}`}
                        onClick={() => setActiveTab('shiprocket')}
                    >
                        Shiprocket Orders
                    </button>
                </div>

                <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Button onClick={syncOrders} variant="primary" disabled={loading}>
                        {loading ? 'Syncing...' : 'Sync with Shiprocket'}
                    </Button>
                    <span style={{ fontSize: '14px', color: '#888' }}>
                        This will sync all unsynced orders to Shiprocket.
                    </span>
                </div>

                <div className="seo-table-container">
                    {activeTab === 'local' ? (
                        // Local Orders Section
                        <>
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
                                        <strong>Note:</strong> Pre-paid orders (Card/UPI/Wallet) automatically show as "Paid". COD orders show actual payment status (Paid/Pending).
                                    </div>

                                    <Table 
                                        columns={columns} 
                                        data={currentItemsWithSN} 
                                        className="w-full" 
                                        striped={true} 
                                        hoverable={true} 
                                    />
                                    {sortedData.length > itemsPerPage && (
                                        <div className="seo-pagination-container">
                                            <Pagination 
                                                currentPage={currentPage} 
                                                totalItems={sortedData.length} 
                                                itemsPerPage={itemsPerPage} 
                                                onPageChange={setCurrentPage} 
                                            />
                                        </div>
                                    )}
                                </>
                            }
                        </>
                    }
                        </>
                    ) : (
                        // Shiprocket Orders Section
                        <>
                            {loadingShiprocket ? <div className="seo-loading">Loading Shiprocket orders...</div> :
                                <>
                                    {shiprocketError ? <div className="seo-error-state">Error: {shiprocketError}</div> :
                                        shiprocketOrders.length === 0 ? <div className="seo-empty-state">No Shiprocket orders found.</div> :
                                        <>
                                            <div className="shiprocket-stats">
                                                <div className="stat-item">
                                                    <span className="stat-label">Total Shiprocket Orders:</span>
                                                    <span className="stat-badge total">{shiprocketOrders.length}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="shiprocket-orders-table">
                                                <table className="w-full border-collapse border border-gray-300">
                                                    <thead>
                                                        <tr className="bg-gray-100">
                                                            <th className="border border-gray-300 px-4 py-2">Order ID</th>
                                                            <th className="border border-gray-300 px-4 py-2">Customer</th>
                                                            <th className="border border-gray-300 px-4 py-2">Status</th>
                                                            <th className="border border-gray-300 px-4 py-2">Payment Method</th>
                                                            <th className="border border-gray-300 px-4 py-2">Amount</th>
                                                            <th className="border border-gray-300 px-4 py-2">Shipment ID</th>
                                                            <th className="border border-gray-300 px-4 py-2">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {shiprocketOrders.map((order, index) => (
                                                            <tr key={order.order_id || index} className="hover:bg-gray-50">
                                                                <td className="border border-gray-300 px-4 py-2">{order.order_id}</td>
                                                                <td className="border border-gray-300 px-4 py-2">
                                                                    <div>
                                                                        <div className="font-medium">{order.billing_customer_name}</div>
                                                                        <div className="text-sm text-gray-600">{order.billing_email}</div>
                                                                        <div className="text-sm text-gray-600">{order.billing_phone}</div>
                                                                    </div>
                                                                </td>
                                                                <td className="border border-gray-300 px-4 py-2">
                                                                    <span className={`status-badge status-${order.status?.toLowerCase() || 'unknown'}`}>
                                                                        {order.status || 'Unknown'}
                                                                    </span>
                                                                </td>
                                                                <td className="border border-gray-300 px-4 py-2">{order.payment_method || 'N/A'}</td>
                                                                <td className="border border-gray-300 px-4 py-2">{formatCurrency(order.sub_total || 0)}</td>
                                                                <td className="border border-gray-300 px-4 py-2">
                                                                    {order.shipments && order.shipments[0]?.shipment_id || 'N/A'}
                                                                </td>
                                                                <td className="border border-gray-300 px-4 py-2">
                                                                    <div className="flex gap-2">
                                                                        <button 
                                                                            className="action-btn edit"
                                                                            onClick={() => {
                                                                                // View Shiprocket order details
                                                                                console.log('Shiprocket order details:', order);
                                                                            }}
                                                                        >
                                                                            View
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    }
                                </>
                            }
                        </>
                    )}
                </div>
            </div>

            <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={`Order Details: #${selectedOrder?.order_number}`}>
                {selectedOrder && (
                    <div className="order-details-modal">
                        <div className="order-info-grid">
                            <div><strong>Customer:</strong> {selectedOrder.User?.username}</div>
                            <div><strong>Email:</strong> {selectedOrder.User?.email}</div>
                            <div><strong>Date:</strong> {formatDate(selectedOrder.createdAt)}</div>
                            <div><strong>Payment Type:</strong> {formatPaymentType(selectedOrder.payment_type)}</div>
                            <div><strong>Payment Status:</strong> <span className={`status-badge status-${getPaymentStatusClass(selectedOrder)}`}>{getPaymentStatusDisplay(selectedOrder)}</span></div>
                            <div><strong>Order Status:</strong> <span className={`status-badge status-${selectedOrder.status}`}>{selectedOrder.status}</span></div>
                            {/* Shiprocket Information */}
                            {(selectedOrder.shiprocket_order_id || selectedOrder.shiprocket_shipment_id) && (
                                <>
                                    <div><strong>Shiprocket Order ID:</strong> {selectedOrder.shiprocket_order_id || 'N/A'}</div>
                                    <div><strong>Shiprocket Shipment ID:</strong> {selectedOrder.shiprocket_shipment_id || 'N/A'}</div>
                                </>
                            )}
                        </div>
                        <h4>Items Ordered</h4>
                        <table className="items-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Price</th>
                                    <th>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedOrder.OrderItems.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.Product?.name || 'N/A'}</td>
                                        <td>{item.quantity}</td>
                                        <td>{formatCurrency(item.price)}</td>
                                        <td>{formatCurrency(item.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="order-summary-grid">
                            <div><strong>Subtotal:</strong> {formatCurrency(calculateOrderSubtotal(selectedOrder.OrderItems))}</div>
                            <div><strong>Shipping:</strong> {formatCurrency(selectedOrder.shipping_fee || 0)}</div>
                            <div><strong>Discount:</strong> - {formatCurrency(selectedOrder.discount_amount || 0)}</div>
                            <div><strong>Total:</strong> {formatCurrency(getOrderTotal(selectedOrder))}</div>
                        </div>
                         <div className="modal-footer">
                            <Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>Close</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default Orders; 