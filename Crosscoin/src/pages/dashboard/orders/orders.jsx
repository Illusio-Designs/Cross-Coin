import React, { useState, useEffect, useCallback } from 'react';
import { orderService } from '../../../services';
import { debounce } from 'lodash';
import Table from "@/components/common/Table";
import Pagination from "@/components/common/Pagination";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import SafeImage from "@/components/common/SafeImage";
import Loader from "@/components/Loader";
import '../../../styles/dashboard/orders.css';
import "../../../styles/dashboard/seo.css"; // Reusing styles for consistency
import { toast } from 'react-hot-toast';
import { getProductImageSrc } from '../../../utils/imageUtils';
import { getAttributeComponents } from '../../../utils/productAttributeFormatter';
import { getStatusClassName, getStatusDisplayText } from '../../../utils/statusUtils';
import PaymentChart from '../../../components/Dashboard/PaymentChart';
import ShippingChart from '../../../components/Dashboard/ShippingChart';
import PaymentStatusChart from '../../../components/Dashboard/PaymentStatusChart';

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
    const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
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
        deliveredOrders: 0,
        cancelledOrders: 0,
        // Payment status breakdown (from Order model)
        paymentStatusPending: 0,
        paymentStatusPaid: 0,
        paymentStatusFailed: 0,
        paymentStatusRefunded: 0,
        paymentStatusCancelled: 0,
        paymentStatusRefundPending: 0
    });
    const [allOrdersData, setAllOrdersData] = useState([]); // Add this to store all orders for charts
    const [syncingOrders, setSyncingOrders] = useState(new Set());
    const [syncingAll, setSyncingAll] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [isAwbModalOpen, setIsAwbModalOpen] = useState(false);
    const [awbOrderId, setAwbOrderId] = useState(null);
    const [awbNumber, setAwbNumber] = useState('');
    const [courierName, setCourierName] = useState('');

    const fetchOrders = useCallback(async (page = currentPage) => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page,
                limit: itemsPerPage,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                payment_type: paymentTypeFilter !== 'all' ? paymentTypeFilter : undefined,
                payment_status: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
                search: filterValue || undefined,
                sort: sortBy,
                order: sortOrder
            };
            
            Object.keys(params).forEach(key => {
                if (params[key] === undefined) {
                    delete params[key];
                }
            });
            
            const data = await orderService.getAllOrders(params);
            
            setOrders(data.orders || data.data || []);
            const totalOrdersCount = data.total || 0;
            const calculatedTotalPages = Math.ceil(totalOrdersCount / itemsPerPage);
            setTotalPages(calculatedTotalPages);
            setTotalOrders(totalOrdersCount);
        } catch (err) {
            setError(err.message || 'Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, statusFilter, paymentTypeFilter, paymentStatusFilter, filterValue, sortBy, sortOrder]);

    // Fetch all orders for stats calculation
    const fetchAllOrdersForStats = useCallback(async () => {
        try {
            const params = {
                page: 1,
                limit: 10000, // Get all orders
                status: statusFilter !== 'all' ? statusFilter : undefined,
                payment_type: paymentTypeFilter !== 'all' ? paymentTypeFilter : undefined,
                payment_status: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
                search: filterValue || undefined // Add search parameter
            };
            
            // Remove undefined values
            Object.keys(params).forEach(key => {
                if (params[key] === undefined) {
                    delete params[key];
                }
            });
            
            const data = await orderService.getAllOrders(params);
            const allOrders = data.orders || data.data || [];
            
            // Store all orders data for charts
            setAllOrdersData(allOrders);
            
            // Calculate stats from all orders
            const stats = {
                total: allOrders.length,
                prepaid: 0,
                cod: 0,
                paid: 0,
                pending: 0,
                totalRevenue: 0,
                averageOrderValue: 0,
                deliveredOrders: 0,
                cancelledOrders: 0,
                // Payment status breakdown (from Order model)
                paymentStatusPending: 0,
                paymentStatusPaid: 0,
                paymentStatusFailed: 0,
                paymentStatusRefunded: 0,
                paymentStatusCancelled: 0,
                paymentStatusRefundPending: 0
            };

            allOrders.forEach(order => {
                const paymentType = order.payment_type?.toLowerCase();
                const paymentStatus = order.payment_status?.toLowerCase();
                const orderStatus = order.status?.toLowerCase();
                
                const orderTotal = parseFloat(order.final_amount || 0);
                
                // Count cancelled orders
                if (orderStatus === 'cancelled') {
                    stats.cancelledOrders++;
                } else {
                    // Include all orders except cancelled ones in revenue
                    stats.totalRevenue += orderTotal;
                }
                
                // Count delivered orders separately for tracking
                if (orderStatus === 'delivered') {
                    stats.deliveredOrders++;
                }
                
                // Count payment status breakdown (all statuses from Order model)
                switch (paymentStatus) {
                    case 'pending':
                        stats.paymentStatusPending++;
                        break;
                    case 'paid':
                        stats.paymentStatusPaid++;
                        break;
                    case 'failed':
                        stats.paymentStatusFailed++;
                        break;
                    case 'refunded':
                        stats.paymentStatusRefunded++;
                        break;
                    case 'cancelled':
                        stats.paymentStatusCancelled++;
                        break;
                    case 'refund_pending':
                        stats.paymentStatusRefundPending++;
                        break;
                }
                
                // Count payment types and statuses (legacy logic for backward compatibility)
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
    }, [statusFilter, paymentTypeFilter, paymentStatusFilter, filterValue]);



    const syncOrders = async () => {
        // Prevent double-clicking and conflicts with individual sync
        if (syncingAll || syncingOrders.size > 0) {
            toast.error('Sync already in progress. Please wait...');
            return;
        }

        setSyncingAll(true);
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
            
            if (results.skipped_final_state > 0) {
                message += `${results.skipped_final_state} orders skipped (delivered/cancelled). `;
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
            setSyncingAll(false);
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

    const syncSingleOrder = async (orderId, orderNumber) => {
        // Prevent double-clicking and conflicts with bulk sync
        if (syncingOrders.has(orderId) || syncingAll) {
            toast.error('Order sync already in progress...');
            return;
        }

        try {
            // Add to syncing set
            setSyncingOrders(prev => new Set(prev).add(orderId));
            
            const result = await orderService.syncSingleOrderWithFShip(orderId);
            
            if (result.success) {
                toast.success(`Order ${orderNumber} synced successfully with FShip! AWB: ${result.data?.fship_response?.waybill || result.data?.order?.fship_waybill || 'Generated'}`);
                
                // Refresh orders after sync
                fetchOrders();
                fetchAllOrdersForStats();
            } else {
                toast.error(result.message || 'Failed to sync order with FShip');
            }
        } catch (error) {
            console.error('=== Single Order Sync Failed ===');
            console.error('Error object:', error);
            
            let errorMessage = 'Failed to sync order with FShip';
            if (error.message) {
                errorMessage = error.message;
            } else if (error.error) {
                errorMessage = error.error;
            }
            
            toast.error(errorMessage);
        } finally {
            // Remove from syncing set
            setSyncingOrders(prev => {
                const newSet = new Set(prev);
                newSet.delete(orderId);
                return newSet;
            });
        }
    };

    const cancelOrder = async (orderId, orderNumber) => {
        const reason = prompt(`Enter cancellation reason for order ${orderNumber}:`);
        if (!reason) return;

        try {
            const result = await orderService.adminCancelOrder(orderId, reason);
            
            if (result.success) {
                toast.success(`Order ${orderNumber} cancelled successfully`);
                // Refresh orders after cancellation
                fetchOrders();
                fetchAllOrdersForStats();
            } else {
                toast.error(result.message || 'Failed to cancel order');
            }
        } catch (error) {
            console.error('=== Order Cancellation Failed ===');
            console.error('Error object:', error);
            
            let errorMessage = 'Failed to cancel order';
            if (error.message) {
                errorMessage = error.message;
            } else if (error.error) {
                errorMessage = error.error;
            }
            
            toast.error(errorMessage);
        }
    };

    // Manual AWB Update Handler
    const handleAwbUpdate = (orderId, currentAwb, currentCourier) => {
        setAwbOrderId(orderId);
        setAwbNumber(currentAwb || '');
        setCourierName(currentCourier || '');
        setIsAwbModalOpen(true);
    };

    const submitAwbUpdate = async () => {
        if (!awbNumber.trim()) {
            toast.error('Please enter AWB number');
            return;
        }

        try {
            await orderService.updateAwbNumber(awbOrderId, {
                awbNumber: awbNumber.trim(),
                courierName: courierName.trim() || 'Manual Entry'
            });
            
            toast.success('AWB number updated successfully!');
            setIsAwbModalOpen(false);
            setAwbNumber('');
            setCourierName('');
            setAwbOrderId(null);
            
            // Refresh orders
            fetchOrders(currentPage);
        } catch (error) {
            console.error('AWB update error:', error);
            toast.error(error.message || 'Failed to update AWB number');
        }
    };

    // Export delivered orders to Excel
    const handleExportDeliveredOrders = async () => {
        if (!exportStartDate || !exportEndDate) {
            toast.error('Please select both start and end dates');
            return;
        }

        if (new Date(exportStartDate) > new Date(exportEndDate)) {
            toast.error('Start date must be before end date');
            return;
        }

        setIsExporting(true);
        try {
            await orderService.exportDeliveredOrders(exportStartDate, exportEndDate);
            toast.success('Delivered orders exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            toast.error(error.message || 'Failed to export delivered orders');
        } finally {
            setIsExporting(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchOrders(1);
        fetchAllOrdersForStats();
    }, [fetchOrders, fetchAllOrdersForStats]);


    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
        fetchOrders(1);
        fetchAllOrdersForStats();
    }, [filterValue, paymentTypeFilter, paymentStatusFilter, statusFilter, sortBy, sortOrder, itemsPerPage, fetchOrders, fetchAllOrdersForStats]);

    // Load orders when page changes
    useEffect(() => {
        if (currentPage > 1) {
            fetchOrders(currentPage);
        }
    }, [currentPage, fetchOrders]);

    const debouncedSearch = useCallback((searchTerm) => {
        const timeoutId = setTimeout(() => {
            setCurrentPage(1);
            fetchOrders(1);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [fetchOrders]);
    
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setFilterValue(value); // Update immediately for UI responsiveness
        debouncedSearch(value); // Debounced API call
    };

    // Remove manual status change - now handled automatically by FShip sync
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
        const paymentStatus = order.payment_status?.toLowerCase();
        
        // Map payment status to display text (all statuses from Order model)
        const statusMap = {
            'pending': 'Pending',
            'paid': 'Paid',
            'failed': 'Failed',
            'refunded': 'Refunded',
            'cancelled': 'Cancelled',
            'refund_pending': 'Refund Pending'
        };
        
        return statusMap[paymentStatus] || 'Unknown';
    };

    const getPaymentStatusClass = (order) => {
        const paymentStatus = order.payment_status?.toLowerCase();
        
        // Map payment status to CSS class (all statuses from Order model)
        const classMap = {
            'pending': 'pending',
            'paid': 'paid',
            'failed': 'failed',
            'refunded': 'refunded',
            'cancelled': 'cancelled',
            'refund_pending': 'refund-pending'
        };
        
        return classMap[paymentStatus] || 'unknown';
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

    // Backend already handles pagination, filtering, and sorting, so we just add serial numbers based on current page
    const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
    const currentItemsWithSN = orders.map((item, idx) => ({
        ...item,
        serial_number: indexOfFirstItem + idx + 1
    }));

    useEffect(() => {
        setCurrentPage(1);
    }, [filterValue, paymentTypeFilter, paymentStatusFilter, statusFilter]);

    const columns = [
        { header: "S/N", accessor: "serial_number" },
        { header: "Order ID", accessor: "order_number" },
        { 
            header: "Customer", 
            cell: (row) => (
                <div className="customer-info">
                    <div className="customer-name">
                        {row.User?.username || 
                         (row.GuestUser ? `${row.GuestUser.firstName} ${row.GuestUser.lastName}` : 
                         row.ShippingAddress?.full_name || 'N/A')}
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
            cell: (row) => <span className={`status-badge status-${getStatusClassName(row.status)}`}>{getStatusDisplayText(row.status)}</span> 
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
            cell: (row) => {
                return (
                    <div className="action-buttons" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {/* View button - always visible */}
                        <button 
                            className="action-btn view" 
                            title="View Details" 
                            onClick={() => { setSelectedOrder(row); setIsViewModalOpen(true); }}
                            style={{
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </button>
                        
                        {/* Sync button - always visible but disabled for final states */}
                        <button 
                            className="action-btn sync" 
                            title={
                                (row.status === 'delivered' || row.status === 'cancelled') 
                                    ? `Order is ${row.status} - no sync needed`
                                    : (row.fship_order_id || row.fship_waybill ? "Re-sync with FShip" : "Sync with FShip")
                            }
                            onClick={() => syncSingleOrder(row.id, row.order_number)}
                            disabled={
                                syncingOrders.has(row.id) || 
                                syncingAll || 
                                row.status === 'delivered' || 
                                row.status === 'cancelled'
                            }
                            style={{
                                backgroundColor: (
                                    syncingOrders.has(row.id) || 
                                    syncingAll || 
                                    row.status === 'delivered' || 
                                    row.status === 'cancelled'
                                ) ? '#6c757d' : '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 8px',
                                cursor: (
                                    syncingOrders.has(row.id) || 
                                    syncingAll || 
                                    row.status === 'delivered' || 
                                    row.status === 'cancelled'
                                ) ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease',
                                opacity: (
                                    syncingOrders.has(row.id) || 
                                    syncingAll || 
                                    row.status === 'delivered' || 
                                    row.status === 'cancelled'
                                ) ? 0.6 : 1
                            }}
                            onMouseOver={(e) => {
                                if (!syncingOrders.has(row.id) && !syncingAll && row.status !== 'delivered' && row.status !== 'cancelled') {
                                    e.target.style.backgroundColor = '#218838';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (!syncingOrders.has(row.id) && !syncingAll && row.status !== 'delivered' && row.status !== 'cancelled') {
                                    e.target.style.backgroundColor = '#28a745';
                                }
                            }}
                        >
                            {(syncingOrders.has(row.id) || syncingAll) ? (
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="animate-spin">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            ) : (row.status === 'delivered' || row.status === 'cancelled') ? (
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            )}
                        </button>
                        
                        {/* Update button for synced orders */}
                        {(row.fship_waybill) && (
                            <button 
                                className="action-btn edit" 
                                title="Update from FShip" 
                                onClick={() => updateSingleOrder(row.id)}
                                style={{
                                    backgroundColor: '#17a2b8',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '6px 8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                </svg>
                            </button>
                        )}

                        {/* Manual AWB Update button */}
                        <button 
                            className="action-btn awb" 
                            title="Update AWB Number" 
                            onClick={() => handleAwbUpdate(row.id, row.fship_waybill, row.courier_name)}
                            style={{
                                backgroundColor: '#6f42c1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#5a32a3'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#6f42c1'}
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>

                        {/* Cancel button for pending/processing orders */}
                        {(row.status === 'pending' || row.status === 'processing') && (
                            <button 
                                className="action-btn cancel" 
                                title="Cancel Order & Sync with FShip" 
                                onClick={() => cancelOrder(row.id, row.order_number)}
                                style={{
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '6px 8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                            >
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                );
            }
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
                    
                    {/* Analytics Charts */}
                    <div className="orders-analytics" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '16px',
                        marginBottom: '24px'
                    }}>
                        <PaymentChart allOrdersStats={allOrdersStats} />
                        <PaymentStatusChart allOrdersStats={allOrdersStats} />
                        <ShippingChart orders={allOrdersData} allOrdersStats={allOrdersStats} />
                    </div>
                    
                    {/* Add responsive styles */}
                    <style jsx>{`
                        @media (max-width: 1400px) {
                            .orders-analytics {
                                grid-template-columns: repeat(3, 1fr) !important;
                                gap: 12px !important;
                            }
                        }
                        @media (max-width: 1200px) {
                            .orders-analytics {
                                grid-template-columns: repeat(2, 1fr) !important;
                            }
                        }
                        @media (max-width: 768px) {
                            .orders-analytics {
                                grid-template-columns: 1fr !important;
                            }
                        }
                    `}</style>
                    
                    {/* Export Section */}
                    <div className="export-section" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%)',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        border: '2px solid #180D3E',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto' }}>
                            <svg width="20" height="20" fill="none" stroke="#180D3E" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span style={{ fontWeight: '600', color: '#180D3E', fontSize: '14px' }}>Export Delivered Orders</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '13px', color: '#180D3E', fontWeight: '500' }}>From:</label>
                            <input 
                                type="date" 
                                value={exportStartDate}
                                onChange={(e) => setExportStartDate(e.target.value)}
                                style={{
                                    padding: '6px 10px',
                                    border: '2px solid #180D3E',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '13px', color: '#180D3E', fontWeight: '500' }}>To:</label>
                            <input 
                                type="date" 
                                value={exportEndDate}
                                onChange={(e) => setExportEndDate(e.target.value)}
                                style={{
                                    padding: '6px 10px',
                                    border: '2px solid #180D3E',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            />
                        </div>
                        <button 
                            onClick={handleExportDeliveredOrders}
                            disabled={isExporting || !exportStartDate || !exportEndDate}
                            style={{
                                padding: '8px 16px',
                                background: isExporting || !exportStartDate || !exportEndDate ? '#ccc' : 'linear-gradient(135deg, #180D3E 0%, #2a1a4d 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: isExporting || !exportStartDate || !exportEndDate ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.3s ease',
                                boxShadow: isExporting || !exportStartDate || !exportEndDate ? 'none' : '0 2px 8px rgba(24, 13, 62, 0.2)'
                            }}
                            onMouseOver={(e) => {
                                if (!isExporting && exportStartDate && exportEndDate) {
                                    e.target.style.background = 'linear-gradient(135deg, #CE1E36 0%, #b71c1c 100%)';
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 4px 12px rgba(206, 30, 54, 0.3)';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (!isExporting && exportStartDate && exportEndDate) {
                                    e.target.style.background = 'linear-gradient(135deg, #180D3E 0%, #2a1a4d 100%)';
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = '0 2px 8px rgba(24, 13, 62, 0.2)';
                                }
                            }}
                        >
                            {isExporting ? (
                                <>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="animate-spin">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export to Excel
                                </>
                            )}
                        </button>
                    </div>
                    
                    <div className="adding-button">
                        <button 
                            className="sync-button"
                            onClick={syncOrders}
                            title="Comprehensive FShip sync - Syncs new orders and updates statuses"
                            disabled={loading || syncingAll || syncingOrders.size > 0}
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {syncingAll ? 'Syncing All...' : loading ? 'Loading...' : 'FShip Sync'}
                        </button>
                        
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
                                    placeholder="Search orders, customers, phone, AWB..." 
                                    value={filterValue}
                                    onChange={handleSearchChange} 
                                />
                                {filterValue && (
                                    <button 
                                        type="button"
                                        className="clear-search-btn"
                                        onClick={() => {
                                            setFilterValue('');
                                            setCurrentPage(1);
                                        }}
                                        title="Clear search"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </form>
                        <select 
                            value={paymentTypeFilter} 
                            onChange={(e) => setPaymentTypeFilter(e.target.value)}
                            className="payment-filter-dropdown"
                        >
                            <option value="all">All Payment Types</option>
                            <option value="prepaid">Prepaid</option>
                            <option value="cod">Cash on Delivery</option>
                        </select>
                        <select 
                            value={paymentStatusFilter} 
                            onChange={(e) => setPaymentStatusFilter(e.target.value)}
                            className="payment-filter-dropdown"
                        >
                            <option value="all">All Payment Status</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                            <option value="refund_pending">Refund Pending</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="payment-filter-dropdown"
                        >
                            <option value="all">All Order Status</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="booked">Booked</option>
                            <option value="pickup initiated">Pickup Initiated</option>
                            <option value="manifested">Manifested</option>
                            <option value="in transit">In Transit</option>
                            <option value="shipped">Shipped</option>
                            <option value="out for delivery">Out for Delivery</option>
                            <option value="delivered">Delivered</option>
                            <option value="undelivered">Undelivered</option>
                            <option value="rto">RTO</option>
                            <option value="rto delivered">RTO Delivered</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="order cancelled">Order Cancelled</option>
                            <option value="exception">Exception</option>
                        </select>
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
                    {loading ? (
                        <div style={{ position: 'relative', minHeight: '400px' }}>
                            <Loader />
                        </div>
                    ) :
                        <>
                            {orders.length === 0 ? <div className="seo-empty-state">No orders found.</div> :
                                <>
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
                                    (selectedOrder.GuestUser ? `${selectedOrder.GuestUser.firstName} ${selectedOrder.GuestUser.lastName}` : 
                                    selectedOrder.ShippingAddress?.full_name || 'N/A')
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
                                <div><strong>Order Status:</strong> <span className={`status-badge status-${getStatusClassName(selectedOrder.status)}`}>{getStatusDisplayText(selectedOrder.status)}</span></div>
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
                                            {selectedOrder.fship_label_url && (
                                                <div style={{ marginTop: '8px' }}>
                                                    <strong>Shipping Label:</strong>{' '}
                                                    <a 
                                                        href={selectedOrder.fship_label_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        style={{ color: '#1976d2', textDecoration: 'underline' }}
                                                    >
                                                        Download Label PDF
                                                    </a>
                                                </div>
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
                                        
                                        // First try to get image from the specific variation (SKU-based)
                                        // Check if ProductVariation has VariationImages array
                                        if (item.ProductVariation?.VariationImages && Array.isArray(item.ProductVariation.VariationImages) && item.ProductVariation.VariationImages.length > 0) {
                                            // Use the primary image or first image from the variation
                                            imageToDisplay = item.ProductVariation.VariationImages.find(img => img.is_primary) || 
                                                           item.ProductVariation.VariationImages[0];
                                        } 
                                        // Check if ProductVariation has a single image property (legacy)
                                        else if (item.ProductVariation?.image) {
                                            imageToDisplay = { image_url: item.ProductVariation.image };
                                        }
                                        // Check if the variation has image_url directly (legacy)
                                        else if (item.ProductVariation?.image_url) {
                                            imageToDisplay = { image_url: item.ProductVariation.image_url };
                                        }
                                        // Fallback to primary product image
                                        else {
                                            imageToDisplay = item.Product?.ProductImages?.find(img => img.is_primary) || 
                                                           item.Product?.ProductImages?.[0];
                                        }
                                        
                                        const imageUrl = getProductImageSrc(imageToDisplay);
                                        
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

            {/* AWB Update Modal */}
            <Modal 
                isOpen={isAwbModalOpen} 
                onClose={() => {
                    setIsAwbModalOpen(false);
                    setAwbNumber('');
                    setCourierName('');
                    setAwbOrderId(null);
                }} 
                title="Update AWB Number"
            >
                <div style={{ padding: '20px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                            AWB Number <span style={{ color: 'red' }}>*</span>
                        </label>
                        <input
                            type="text"
                            value={awbNumber}
                            onChange={(e) => setAwbNumber(e.target.value)}
                            placeholder="Enter AWB/Tracking Number"
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                            Courier Name
                        </label>
                        <input
                            type="text"
                            value={courierName}
                            onChange={(e) => setCourierName(e.target.value)}
                            placeholder="Enter Courier Name (Optional)"
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => {
                                setIsAwbModalOpen(false);
                                setAwbNumber('');
                                setCourierName('');
                                setAwbOrderId(null);
                            }}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={submitAwbUpdate}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#6f42c1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Update AWB
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default Orders; 