import React, { useState, useEffect, useCallback } from 'react';
import { orderService } from '../../../services';
import { debounce } from 'lodash';
import Table from "@/components/common/Table";
import Pagination from "@/components/common/Pagination";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import SafeImage from "@/components/common/SafeImage";
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
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalOrders, setTotalOrders] = useState(0);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [paymentTypeFilter, setPaymentTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState("desc");
    const [notification, setNotification] = useState(null);
    const [allOrdersStats, setAllOrdersStats] = useState({
        total: 0,
        prepaid: 0,
        cod: 0,
        paid: 0,
        pending: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        deliveredOrders: 0
    });

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
            
            setOrders(data.orders || data.data || []);
            // Always calculate totalPages correctly on frontend to avoid backend errors
            const totalOrdersCount = data.total || 0;
            const calculatedTotalPages = Math.ceil(totalOrdersCount / itemsPerPage);
            setTotalPages(calculatedTotalPages);
            setTotalOrders(totalOrdersCount);
        } catch (err) {
            setError(err.message || 'Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };

    // Fetch all orders for stats calculation
    const fetchAllOrdersForStats = async () => {
        try {
            const params = {
                page: 1,
                limit: 10000, // Get all orders
                status: statusFilter !== 'all' ? statusFilter : undefined,
                payment_status: paymentTypeFilter !== 'all' ? paymentTypeFilter : undefined
            };
            
            const data = await orderService.getAllOrders(params);
            const allOrders = data.orders || data.data || [];
            
            // Calculate stats from all orders
            const stats = {
                total: allOrders.length,
                prepaid: 0,
                cod: 0,
                paid: 0,
                pending: 0,
                totalRevenue: 0,
                averageOrderValue: 0,
                deliveredOrders: 0
            };

            allOrders.forEach(order => {
                const paymentType = order.payment_type?.toLowerCase();
                const paymentStatus = order.payment_status?.toLowerCase();
                const orderStatus = order.status?.toLowerCase();
                
                const orderTotal = parseFloat(order.final_amount || 0);
                
                // Include all orders except cancelled ones
                if (orderStatus !== 'cancelled') {
                    stats.totalRevenue += orderTotal;
                }
                
                // Count delivered orders separately for tracking
                if (orderStatus === 'delivered') {
                    stats.deliveredOrders++;
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

            // Calculate average order value based on non-cancelled orders
            const nonCancelledOrders = allOrders.filter(order => order.status?.toLowerCase() !== 'cancelled');
            stats.averageOrderValue = nonCancelledOrders.length > 0 ? stats.totalRevenue / nonCancelledOrders.length : 0;
            
            setAllOrdersStats(stats);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };



    const syncOrders = async () => {
        setLoading(true);
        try {
            const result = await orderService.syncOrdersWithFShip();
            
            // Show detailed results
            const { results } = result;
            let message = `FShip sync completed! `;
            
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
            fetchAllOrdersForStats();
        } catch (error) {
            console.error('=== FShip Order Sync Failed ===');
            console.error('Error object:', error);
            
            let errorMessage = 'Failed to sync orders with FShip';
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

    const updateSingleOrder = async (orderId) => {
        try {
            const result = await orderService.updateSingleOrderFromFShip(orderId);
            
            if (result.success) {
                let message = result.message;
                if (result.update_result?.updated) {
                    if (result.update_result.status_changed) {
                        message += ` Status: ${result.update_result.old_status} → ${result.update_result.new_status}`;
                    }
                    if (result.update_result.tracking_updated) {
                        message += ` Tracking updated.`;
                    }
                }
                toast.success(message);
                
                // Refresh orders after update
                fetchOrders();
                fetchAllOrdersForStats();
            } else {
                toast.error(result.message || 'Failed to update order');
            }
        } catch (error) {
            console.error('=== Single Order Update Failed ===');
            console.error('Error object:', error);
            
            let errorMessage = 'Failed to update order from FShip';
            if (error.message) {
                errorMessage = error.message;
            } else if (error.error) {
                errorMessage = error.error;
            }
            
            toast.error(errorMessage);
        }
    };

    const testFShipCredentials = async () => {
        try {
            const result = await orderService.testFShipCredentials();
            
            if (result.success) {
                toast.success('FShip credentials are valid and working!');
            } else {
                toast.error(result.message || 'FShip credentials test failed');
            }
        } catch (error) {
            console.error('=== FShip Test Failed ===');
            console.error('Error object:', error);
            
            let errorMessage = 'Failed to test FShip credentials';
            if (error.message) {
                errorMessage = error.message;
            } else if (error.error) {
                errorMessage = error.error;
            }
            
            toast.error(errorMessage);
        }
    };

    // Initial load
    useEffect(() => {
        fetchOrders(1);
        fetchAllOrdersForStats();
    }, []);


    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
        fetchOrders(1);
        fetchAllOrdersForStats();
    }, [filterValue, paymentTypeFilter, statusFilter, sortBy, sortOrder, itemsPerPage]);

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
            
            // Calculate revenue from ALL orders EXCEPT cancelled orders
            // This gives the total business value of valid orders
            const orderTotal = parseFloat(order.final_amount || 0);
            
            // Include all orders except cancelled ones
            if (orderStatus !== 'cancelled') {
                stats.totalRevenue += orderTotal;
            }
            
            // Count delivered orders separately for tracking
            if (orderStatus === 'delivered') {
                stats.deliveredOrders++;
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

        // Calculate average order value based on non-cancelled orders
        const nonCancelledOrders = orders.filter(order => order.status?.toLowerCase() !== 'cancelled');
        stats.averageOrderValue = nonCancelledOrders.length > 0 ? stats.totalRevenue / nonCancelledOrders.length : 0;
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
            if (order.fship_order_id || order.fship_waybill) {
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

    // Backend already handles pagination, so we just add serial numbers based on current page
    const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
    const currentItemsWithSN = sortedData.map((item, idx) => ({
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
            header: "FShip Sync",
            cell: (row) =>
                row.fship_order_id || row.fship_waybill
                    ? <span className="status-badge status-synced">Synced<br/><small>AWB: {row.fship_waybill || 'Pending'}</small></span>
                    : <span className="status-badge status-unsynced">Not Synced</span>
        },
        {
            header: "Actions",
            cell: (row) => (
                <div className="action-buttons">
                    <button 
                        className="action-btn view" 
                        title="View Details" 
                        onClick={() => { setSelectedOrder(row); setIsViewModalOpen(true); }}
                    >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                    
                    {(row.fship_order_id || row.fship_waybill) && (
                        <button 
                            className="action-btn edit" 
                            title="Update" 
                            onClick={() => updateSingleOrder(row.id)}
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                        </button>
                    )}
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
                        fontSize: '14px',
                        alignItems: 'center',
                        flexWrap: 'wrap'
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                            <label style={{ color: '#495057', fontWeight: '600', fontSize: '13px' }}>Show:</label>
                            <select 
                                value={itemsPerPage} 
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '2px solid #180D3E',
                                    background: '#fff',
                                    color: '#374151',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span style={{ color: '#6c757d', fontSize: '13px' }}>per page</span>
                        </div>
                    </div>
                    <div className="adding-button">
                        <button 
                            className="sync-button"
                            onClick={syncOrders}
                            title="Comprehensive FShip sync - Tests credentials, syncs new orders, and updates statuses"
                            disabled={loading}
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {loading ? 'Syncing...' : 'FShip Sync'}
                        </button>
                        
                        <button 
                            className="test-credentials-button"
                            onClick={testFShipCredentials}
                            title="Test FShip API credentials"
                            disabled={loading}
                            style={{
                                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.75rem 1rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.3s ease',
                                fontSize: '0.875rem'
                            }}
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Test FShip API
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
                    <div style={{ fontSize: '14px', color: '#888', lineHeight: '1.4' }}>
                        <strong>FShip Integration:</strong><br/>
                        • <strong>FShip Sync:</strong> Tests credentials, syncs new orders, updates statuses<br/>
                        • <strong>Single Update:</strong> Update individual orders (available for synced orders)<br/>
                        • <strong>Test FShip API:</strong> Verify FShip credentials and connection
                    </div>
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

                <div className="seo-table-container orders-table">
                    {loading ? <div className="seo-loading">Loading...</div> :
                        <>
                            {filteredData.length === 0 ? <div className="seo-empty-state">No orders found.</div> :
                                <>
                            {/* Payment Statistics */}
                            <div className="payment-stats">
                                <div className="stat-item">
                                    <span className="stat-label">Total Orders:</span>
                                    <span className="stat-badge total">{allOrdersStats.total}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Prepaid:</span>
                                    <span className="stat-badge prepaid">{allOrdersStats.prepaid}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">COD:</span>
                                    <span className="stat-badge cod">{allOrdersStats.cod}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Paid:</span>
                                    <span className="stat-badge paid">{allOrdersStats.paid}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Pending:</span>
                                    <span className="stat-badge pending">{allOrdersStats.pending}</span>
                                </div>
                                <div className="stat-item revenue">
                                    <span className="stat-label">Total Revenue:</span>
                                    <span className="stat-badge revenue">{formatCurrency(allOrdersStats.totalRevenue)}</span>
                                </div>
                                <div className="stat-item avg">
                                    <span className="stat-label">Avg Order:</span>
                                    <span className="stat-badge avg">{formatCurrency(allOrdersStats.averageOrderValue)}</span>
                                </div>
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
                                <strong>FShip Integration:</strong> Order statuses are automatically synchronized with FShip. 
                                Use "FShip Sync" for new orders and status updates, 
                                or "Update" button for individual orders. Manual status changes are disabled to maintain sync integrity.
                            </div>

                            <div className="orders-table">
                            <Table 
                                columns={columns} 
                                data={currentItemsWithSN} 
                                className="w-full" 
                                striped={true} 
                                hoverable={true} 
                            />
                            </div>
                            {totalOrders > itemsPerPage && (
                                <div className="seo-pagination-container">
                                    <Pagination 
                                        currentPage={currentPage} 
                                        totalPages={totalPages}
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
                                {/* FShip Information */}
                                {(selectedOrder.fship_order_id || selectedOrder.fship_waybill || selectedOrder.tracking_number) && (
                                    <>
                                        <div style={{ gridColumn: '1 / -1', marginTop: '12px', padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '6px' }}>
                                            <h5 style={{ margin: '0 0 8px 0', color: '#2e7d32' }}>FShip Tracking Information</h5>
                                            {selectedOrder.fship_order_id && <div><strong>FShip Order ID:</strong> {selectedOrder.fship_order_id}</div>}
                                            {selectedOrder.fship_waybill && <div><strong>AWB Number:</strong> {selectedOrder.fship_waybill}</div>}
                                            {selectedOrder.fship_route_code && <div><strong>Route Code:</strong> {selectedOrder.fship_route_code}</div>}
                                            {selectedOrder.tracking_number && <div><strong>Tracking Number:</strong> {selectedOrder.tracking_number}</div>}
                                            {selectedOrder.courier_name && <div><strong>Courier:</strong> {selectedOrder.courier_name}</div>}
                                        </div>
                                    </>
                                )}
                                {/* Legacy Shiprocket Information (if exists) */}
                                {(selectedOrder.shiprocket_order_id || selectedOrder.shiprocket_shipment_id) && (
                                    <>
                                        <div style={{ gridColumn: '1 / -1', marginTop: '12px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '6px' }}>
                                            <h5 style={{ margin: '0 0 8px 0', color: '#856404' }}>Legacy Shiprocket Information</h5>
                                            {selectedOrder.shiprocket_order_id && <div><strong>Shiprocket Order ID:</strong> {selectedOrder.shiprocket_order_id}</div>}
                                            {selectedOrder.shiprocket_shipment_id && <div><strong>Shipment ID:</strong> {selectedOrder.shiprocket_shipment_id}</div>}
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
                            <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
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
                                        // Get variation-specific image first, then fallback to product image
                                        let imageToDisplay = null;
                                        
                                        // Debug: Log the available data
                                        console.log('=== Order Item Image Debug ===');
                                        console.log('Item:', item);
                                        console.log('ProductVariation:', item.ProductVariation);
                                        console.log('ProductVariation VariationImages:', item.ProductVariation?.VariationImages);
                                        console.log('Product images:', item.Product?.ProductImages);
                                        
                                        // First try to get image from the specific variation (SKU-based)
                                        // Check if ProductVariation has VariationImages array
                                        if (item.ProductVariation?.VariationImages && Array.isArray(item.ProductVariation.VariationImages) && item.ProductVariation.VariationImages.length > 0) {
                                            // Use the primary image or first image from the variation
                                            imageToDisplay = item.ProductVariation.VariationImages.find(img => img.is_primary) || 
                                                           item.ProductVariation.VariationImages[0];
                                            console.log('Using variation image:', imageToDisplay);
                                        } 
                                        // Check if ProductVariation has a single image property (legacy)
                                        else if (item.ProductVariation?.image) {
                                            imageToDisplay = { image_url: item.ProductVariation.image };
                                            console.log('Using variation single image:', imageToDisplay);
                                        }
                                        // Check if the variation has image_url directly (legacy)
                                        else if (item.ProductVariation?.image_url) {
                                            imageToDisplay = { image_url: item.ProductVariation.image_url };
                                            console.log('Using variation image_url:', imageToDisplay);
                                        }
                                        // Fallback to primary product image
                                        else {
                                            imageToDisplay = item.Product?.ProductImages?.find(img => img.is_primary) || 
                                                           item.Product?.ProductImages?.[0];
                                            console.log('Using product image (fallback):', imageToDisplay);
                                        }
                                        
                                        const imageUrl = getProductImageSrc(imageToDisplay);
                                        console.log('Final image URL:', imageUrl);
                                        console.log('===============================');
                                        
                                        // Get SKU from ProductVariation if available, otherwise show 'N/A'
                                        const sku = item.ProductVariation?.sku || 'N/A';
                                        
                                        return (
                                            <tr key={item.id}>
                                                <td>
                                                    <div className="product-image-container">
                                                        <SafeImage 
                                                            imageData={{ image_url: imageUrl }}
                                                            alt={item.Product?.name || 'Product'} 
                                                            className="product-image"
                                                            width="80px"
                                                            height="80px"
                                                            style={{ 
                                                                objectFit: 'cover',
                                                                borderRadius: '8px'
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
                                                        <div className="product-sku-display" style={{
                                                            marginTop: '8px',
                                                            fontSize: '11px',
                                                            color: '#666',
                                                            fontFamily: 'monospace',
                                                            background: '#f8f9fa',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            display: 'inline-block'
                                                        }}>
                                                            SKU: {sku}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="product-sku" style={{
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        color: '#495057',
                                                        background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                                        padding: '8px 12px',
                                                        borderRadius: '8px',
                                                        border: '1px solid #90caf9',
                                                        textAlign: 'center',
                                                        fontFamily: 'monospace',
                                                        letterSpacing: '0.5px'
                                                    }}>
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