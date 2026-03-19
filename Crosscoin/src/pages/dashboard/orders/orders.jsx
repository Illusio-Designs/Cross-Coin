import React, { useState, useEffect, useCallback } from 'react';
import { orderService, dashboardService } from '../../../services';
import { debounce } from 'lodash';
import { Table, Pagination, Modal, Button } from "../../../components/ui";
import SafeImage from "../../../components/common/SafeImage";
import Loader from "../../../components/common/Loader";
import BrandTags from "../../../components/Dashboard/BrandTags";
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
        total: 0, prepaid: 0, cod: 0, paid: 0, pending: 0,
        totalRevenue: 0, averageOrderValue: 0, deliveredOrders: 0, cancelledOrders: 0,
        paymentStatusPending: 0, paymentStatusPaid: 0, paymentStatusFailed: 0,
        paymentStatusRefunded: 0, paymentStatusCancelled: 0, paymentStatusRefundPending: 0
    });
    const [allOrdersData, setAllOrdersData] = useState([]);
    const [syncingOrders, setSyncingOrders] = useState(new Set());
    const [syncingAll, setSyncingAll] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [isAwbModalOpen, setIsAwbModalOpen] = useState(false);
    const [awbOrderId, setAwbOrderId] = useState(null);
    const [awbNumber, setAwbNumber] = useState('');
    const [courierName, setCourierName] = useState('');
    const [selectedOrders, setSelectedOrders] = useState(new Set());
    const [isDownloadingBulk, setIsDownloadingBulk] = useState(false);
    const [labelStats, setLabelStats] = useState({ totalLabels: 0, downloadedLabels: 0, pendingLabels: 0, downloadRate: 0 });

    const fetchOrders = useCallback(async (page = currentPage) => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page, limit: itemsPerPage,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                payment_type: paymentTypeFilter !== 'all' ? paymentTypeFilter : undefined,
                payment_status: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
                search: filterValue || undefined,
                sort: sortBy, order: sortOrder
            };
            Object.keys(params).forEach(key => { if (params[key] === undefined) delete params[key]; });
            const data = await orderService.getAllOrders(params);
            setOrders(data.orders || data.data || []);
            const totalOrdersCount = data.total || 0;
            setTotalPages(Math.ceil(totalOrdersCount / itemsPerPage));
            setTotalOrders(totalOrdersCount);
        } catch (err) {
            setError(err.message || 'Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, statusFilter, paymentTypeFilter, paymentStatusFilter, filterValue, sortBy, sortOrder]);

    const fetchAllOrdersForStats = useCallback(async () => {
        try {
            const response = await dashboardService.getDashboardStats();
            if (response.success && response.stats) {
                const dashStats = response.stats;
                const stats = {
                    total: dashStats.orders?.total || 0, prepaid: 0, cod: 0,
                    paid: dashStats.paymentStatusDistribution?.counts?.paid || 0,
                    pending: dashStats.paymentStatusDistribution?.counts?.pending || 0,
                    totalRevenue: dashStats.revenue?.total || 0,
                    averageOrderValue: dashStats.revenue?.average || 0,
                    deliveredOrders: dashStats.orders?.completed || 0,
                    cancelledOrders: dashStats.orders?.cancelled || 0,
                    paymentStatusPending: dashStats.paymentStatusDistribution?.counts?.pending || 0,
                    paymentStatusPaid: dashStats.paymentStatusDistribution?.counts?.paid || 0,
                    paymentStatusFailed: dashStats.paymentStatusDistribution?.counts?.failed || 0,
                    paymentStatusRefunded: dashStats.paymentStatusDistribution?.counts?.refunded || 0,
                    paymentStatusCancelled: dashStats.paymentStatusDistribution?.counts?.cancelled || 0,
                    paymentStatusRefundPending: dashStats.paymentStatusDistribution?.counts?.refund_pending || 0
                };
                if (dashStats.paymentDistribution) {
                    stats.cod = dashStats.paymentDistribution.cod?.count || 0;
                    stats.prepaid = dashStats.paymentDistribution.prepaid?.count || 0;
                }
                setAllOrdersStats(stats);
                if (dashStats.recentOrders) setAllOrdersData(dashStats.recentOrders);
            }
        } catch (err) {
            setAllOrdersStats({ total: 0, prepaid: 0, cod: 0, paid: 0, pending: 0, totalRevenue: 0, averageOrderValue: 0, deliveredOrders: 0, cancelledOrders: 0, paymentStatusPending: 0, paymentStatusPaid: 0, paymentStatusFailed: 0, paymentStatusRefunded: 0, paymentStatusCancelled: 0, paymentStatusRefundPending: 0 });
        }
    }, []);

    const syncOrders = async () => {
        if (syncingAll || syncingOrders.size > 0) { toast.error('Sync already in progress. Please wait...'); return; }
        setSyncingAll(true);
        try {
            const result = await orderService.syncOrdersWithFShip();
            const { results } = result;
            let message = `FShip sync completed! `;
            if (results.total_orders_processed > 0) message += `Processed ${results.total_orders_processed} orders. `;
            if (results.new_orders_synced > 0) message += `${results.new_orders_synced} new orders synced. `;
            if (results.existing_orders_updated > 0) message += `${results.existing_orders_updated} existing orders updated. `;
            if (results.status_updates > 0) message += `${results.status_updates} status updates. `;
            if (results.tracking_updates > 0) message += `${results.tracking_updates} tracking updates. `;
            if (results.skipped_final_state > 0) message += `${results.skipped_final_state} orders skipped. `;
            if (results.failed > 0) message += `${results.failed} orders failed. `;
            toast.success(message);
            fetchOrders(); fetchAllOrdersForStats();
        } catch (error) {
            toast.error(error.message || error.error || 'Failed to sync orders with FShip');
        } finally { setSyncingAll(false); }
    };

    const updateSingleOrder = async (orderId) => {
        try {
            const result = await orderService.updateSingleOrderFromFShip(orderId);
            if (result.success) {
                let message = result.message;
                if (result.update_result?.updated) {
                    if (result.update_result.status_changed) message += ` Status: ${result.update_result.old_status} → ${result.update_result.new_status}`;
                    if (result.update_result.tracking_updated) message += ` Tracking updated.`;
                }
                toast.success(message);
                fetchOrders(); fetchAllOrdersForStats();
            } else { toast.error(result.message || 'Failed to update order'); }
        } catch (error) { toast.error(error.message || error.error || 'Failed to update order from FShip'); }
    };

    const syncSingleOrder = async (orderId, orderNumber) => {
        if (syncingOrders.has(orderId) || syncingAll) { toast.error('Order sync already in progress...'); return; }
        try {
            setSyncingOrders(prev => new Set(prev).add(orderId));
            const result = await orderService.syncSingleOrderWithFShip(orderId);
            if (result.success) {
                toast.success(`Order ${orderNumber} synced! AWB: ${result.data?.fship_response?.waybill || result.data?.order?.fship_waybill || 'Generated'}`);
                fetchOrders(); fetchAllOrdersForStats();
            } else { toast.error(result.message || 'Failed to sync order with FShip'); }
        } catch (error) { toast.error(error.message || error.error || 'Failed to sync order with FShip');
        } finally {
            setSyncingOrders(prev => { const s = new Set(prev); s.delete(orderId); return s; });
        }
    };

    const cancelOrder = async (orderId, orderNumber) => {
        const reason = prompt(`Enter cancellation reason for order ${orderNumber}:`);
        if (!reason) return;
        try {
            const result = await orderService.adminCancelOrder(orderId, reason);
            if (result.success) { toast.success(`Order ${orderNumber} cancelled successfully`); fetchOrders(); fetchAllOrdersForStats(); }
            else { toast.error(result.message || 'Failed to cancel order'); }
        } catch (error) { toast.error(error.message || error.error || 'Failed to cancel order'); }
    };

    const handleAwbUpdate = (orderId, currentAwb, currentCourier) => {
        setAwbOrderId(orderId); setAwbNumber(currentAwb || ''); setCourierName(currentCourier || ''); setIsAwbModalOpen(true);
    };

    const submitAwbUpdate = async () => {
        if (!awbNumber.trim()) { toast.error('Please enter AWB number'); return; }
        try {
            await orderService.updateAwbNumber(awbOrderId, { awbNumber: awbNumber.trim(), courierName: courierName.trim() || 'Manual Entry' });
            toast.success('AWB number updated successfully!');
            setIsAwbModalOpen(false); setAwbNumber(''); setCourierName(''); setAwbOrderId(null);
            fetchOrders(currentPage);
        } catch (error) { toast.error(error.message || 'Failed to update AWB number'); }
    };

    const handleExportDeliveredOrders = async () => {
        if (!exportStartDate || !exportEndDate) { toast.error('Please select both start and end dates'); return; }
        if (new Date(exportStartDate) > new Date(exportEndDate)) { toast.error('Start date must be before end date'); return; }
        setIsExporting(true);
        try {
            await orderService.exportDeliveredOrders(exportStartDate, exportEndDate);
            toast.success('Delivered orders exported successfully!');
        } catch (error) { toast.error(error.message || 'Failed to export delivered orders');
        } finally { setIsExporting(false); }
    };

    const fetchLabelStats = async () => {
        try {
            const stats = await orderService.getLabelDownloadStats();
            setLabelStats(stats.stats || { totalLabels: 0, downloadedLabels: 0, pendingLabels: 0, downloadRate: 0 });
        } catch (error) {}
    };

    const handleLabelDownload = async (orderId, labelUrl) => {
        try {
            window.open(labelUrl, '_blank');
            await orderService.markLabelDownloaded(orderId);
            fetchOrders(currentPage); fetchLabelStats();
            toast.success('Label opened successfully!');
        } catch (error) {}
    };

    const toggleOrderSelection = (orderId) => {
        setSelectedOrders(prev => { const s = new Set(prev); s.has(orderId) ? s.delete(orderId) : s.add(orderId); return s; });
    };

    const selectAllOrdersWithLabels = () => {
        const ordersWithLabels = orders.filter(order => order.fship_label_url);
        if (selectedOrders.size === ordersWithLabels.length) setSelectedOrders(new Set());
        else setSelectedOrders(new Set(ordersWithLabels.map(order => order.id)));
    };

    const handleBulkDownload = async () => {
        if (selectedOrders.size === 0) { toast.error('Please select orders to download labels'); return; }
        setIsDownloadingBulk(true);
        try {
            await orderService.bulkDownloadLabels(Array.from(selectedOrders));
            toast.success(`Downloaded ${selectedOrders.size} labels successfully!`);
            setSelectedOrders(new Set()); fetchOrders(currentPage); fetchLabelStats();
        } catch (error) { toast.error(error.message || 'Failed to download labels');
        } finally { setIsDownloadingBulk(false); }
    };

    useEffect(() => { fetchOrders(1); fetchAllOrdersForStats(); fetchLabelStats(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setCurrentPage(1); fetchOrders(1); fetchAllOrdersForStats();
    }, [filterValue, paymentTypeFilter, paymentStatusFilter, statusFilter, sortBy, sortOrder, itemsPerPage]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { if (currentPage > 1) fetchOrders(currentPage); }, [currentPage, fetchOrders]);

    useEffect(() => { setCurrentPage(1); }, [filterValue, paymentTypeFilter, paymentStatusFilter, statusFilter]);

    const debouncedFetchOrders = useCallback(debounce(() => { setCurrentPage(1); fetchOrders(1); }, 500), [fetchOrders]);

    const handleSearchChange = (e) => { setFilterValue(e.target.value); debouncedFetchOrders(); };

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;
    const calculateOrderSubtotal = (orderItems) => orderItems.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
    const calculateOrderTotal = (subtotal, shippingFee, discountAmount) => Math.max(0, subtotal - parseFloat(discountAmount || 0) + parseFloat(shippingFee || 0));
    const getOrderTotal = (order) => {
        if (!order || !order.OrderItems || order.OrderItems.length === 0) return parseFloat(order.final_amount || 0);
        return calculateOrderTotal(calculateOrderSubtotal(order.OrderItems), order.shipping_fee || 0, order.discount_amount || 0);
    };
    const getPaymentStatusDisplay = (order) => ({ pending: 'Pending', paid: 'Paid', failed: 'Failed', refunded: 'Refunded', cancelled: 'Cancelled', refund_pending: 'Refund Pending' }[order.payment_status?.toLowerCase()] || 'Unknown');
    const getPaymentStatusClass = (order) => ({ pending: 'pending', paid: 'paid', failed: 'failed', refunded: 'refunded', cancelled: 'cancelled', refund_pending: 'refund-pending' }[order.payment_status?.toLowerCase()] || 'unknown');
    const formatPaymentType = (paymentType) => {
        if (!paymentType) return 'N/A';
        const type = paymentType.toLowerCase();
        if (type === 'cod') return 'COD';
        if (['credit_card','debit_card','upi','wallet'].includes(type)) return 'Pre-paid';
        return paymentType.toUpperCase();
    };

    const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
    const currentItemsWithSN = orders.map((item, idx) => ({ ...item, serial_number: indexOfFirstItem + idx + 1 }));

    const columns = [
        {
            header: (
                <input type="checkbox" className="bulk-select-checkbox"
                    checked={selectedOrders.size > 0 && selectedOrders.size === orders.filter(o => o.fship_label_url).length}
                    onChange={selectAllOrdersWithLabels} title="Select all orders with labels" />
            ),
            cell: (row) => row.fship_label_url ? (
                <input type="checkbox" className="order-select-checkbox"
                    checked={selectedOrders.has(row.id)} onChange={() => toggleOrderSelection(row.id)} />
            ) : null
        },
        { header: "Sr. No", accessor: "serial_number" },
        { header: "Order ID", accessor: "order_number" },
        {
            header: "Customer",
            cell: (row) => (
                <div className="customer-info">
                    <div className="customer-name">
                        {row.User?.username || (row.GuestUser ? `${row.GuestUser.firstName} ${row.GuestUser.lastName}` : row.ShippingAddress?.full_name || 'N/A')}
                    </div>
                    <div className="customer-email">
                        {row.User?.email || row.GuestUser?.email || ''}
                        {row.GuestUser && <span className="guest-badge">(Guest)</span>}
                    </div>
                </div>
            )
        },
        {
            header: "Brands",
            cell: (row) => {
                const brands = []; const brandIds = new Set();
                if (row.OrderItems?.length > 0) {
                    row.OrderItems.forEach(item => {
                        const productBrands = item.Product?.Brands || item.Product?.brands || [];
                        productBrands.forEach(brand => { if (!brandIds.has(brand.id)) { brandIds.add(brand.id); brands.push(brand); } });
                    });
                }
                return <BrandTags brands={brands} />;
            }
        },
        { header: "Date", cell: (row) => formatDate(row.createdAt) },
        { header: "Payment Type", cell: (row) => formatPaymentType(row.payment_type) },
        { header: "Payment Status", cell: (row) => <span className={`status-badge status-${getPaymentStatusClass(row)}`}>{getPaymentStatusDisplay(row)}</span> },
        { header: "Total", cell: (row) => formatCurrency(getOrderTotal(row)) },
        { header: "Order Status", cell: (row) => <span className={`status-badge status-${getStatusClassName(row.status)}`}>{getStatusDisplayText(row.status)}</span> },
        {
            header: "FShip Sync",
            cell: (row) => row.fship_order_id || row.fship_waybill
                ? <span className="status-badge status-synced">Synced<br /><small>AWB: {row.fship_waybill || 'Pending'}</small></span>
                : <span className="status-badge status-unsynced">Not Synced</span>
        },
        {
            header: "Label",
            cell: (row) => {
                if (row.fship_label_url) {
                    const isDownloaded = row.fship_label_downloaded;
                    return (
                        <div className="label-cell">
                            <button onClick={() => handleLabelDownload(row.id, row.fship_label_url)}
                                className={`download-label-link${isDownloaded ? ' downloaded' : ''}`} title="Download Shipping Label">
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {isDownloaded ? 'Downloaded' : 'Download'}
                            </button>
                            {isDownloaded && row.fship_label_downloaded_at && (
                                <span className="label-date">{new Date(row.fship_label_downloaded_at).toLocaleDateString()}</span>
                            )}
                        </div>
                    );
                }
                return <span className="label-none">No Label</span>;
            }
        },
        {
            header: "Actions",
            cell: (row) => {
                const isFinal = row.status === 'delivered' || row.status === 'cancelled';
                const isSyncing = syncingOrders.has(row.id) || syncingAll;
                return (
                    <div className="sl-actions">
                        <button className="sl-btn-edit" title="View Details"
                            onClick={() => { setSelectedOrder(row); setIsViewModalOpen(true); }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </button>
                        <button className={`order-action-btn order-sync-btn${isFinal || isSyncing ? ' disabled' : ''}`}
                            title={isFinal ? `Order is ${row.status}` : (row.fship_order_id || row.fship_waybill ? 'Re-sync with FShip' : 'Sync with FShip')}
                            onClick={() => syncSingleOrder(row.id, row.order_number)}
                            disabled={isSyncing || isFinal}>
                            {isSyncing ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            ) : isFinal ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            )}
                        </button>
                        {row.fship_waybill && (
                            <button className="order-action-btn order-update-btn" title="Update from FShip" onClick={() => updateSingleOrder(row.id)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
                            </button>
                        )}
                        <button className="order-action-btn order-awb-btn" title="Update AWB Number" onClick={() => handleAwbUpdate(row.id, row.fship_waybill, row.courier_name)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        {(row.status === 'pending' || row.status === 'processing') && (
                            <button className="sl-btn-delete" title="Cancel Order" onClick={() => cancelOrder(row.id, row.order_number)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>
                );
            }
        }
    ];

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    return (
        <>
            <div className="dashboard-page">
                {notification && (
                    <div className={`notification notification-${notification.type}`}>
                        <div className="notification-content">
                            <span className="notification-message">{notification.message}</span>
                            <button className="notification-close" onClick={() => setNotification(null)}>×</button>
                        </div>
                    </div>
                )}

                <div className="orders-header-container">
                    {/* Page Header */}
                    <div className="sl-page-header">
                        <div className="sl-header-left">
                            <div className="sl-header-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="sl-page-title">Orders</h1>
                                <p className="sl-page-sub">{totalOrders} order{totalOrders !== 1 ? 's' : ''} total</p>
                            </div>
                        </div>
                        <div className="sl-header-right">
                            <div className="sl-search-wrap">
                                <span className="sl-search-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                </span>
                                <input type="text" className="sl-search-input" placeholder="Search orders, customers, AWB..."
                                    value={filterValue} onChange={handleSearchChange} />
                            </div>
                            <button className={`sl-add-btn${syncingAll || loading ? ' sl-add-btn--syncing' : ''}`}
                                onClick={syncOrders} disabled={loading || syncingAll || syncingOrders.size > 0}>
                                <span className="sl-add-btn-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                </span>
                                {syncingAll ? 'Syncing...' : 'FShip Sync'}
                            </button>
                        </div>
                    </div>

                    {/* Analytics Charts */}
                    <div className="orders-analytics">
                        <PaymentChart allOrdersStats={allOrdersStats} />
                        <PaymentStatusChart allOrdersStats={allOrdersStats} />
                        <ShippingChart orders={allOrdersData} allOrdersStats={allOrdersStats} />
                    </div>

                    {/* Export Section */}
                    <div className="orders-export-section">
                        <div className="orders-export-left">
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Export Delivered Orders</span>
                        </div>
                        <div className="orders-export-dates">
                            <label>From:</label>
                            <input type="date" value={exportStartDate} onChange={(e) => setExportStartDate(e.target.value)} className="orders-date-input" />
                            <label>To:</label>
                            <input type="date" value={exportEndDate} onChange={(e) => setExportEndDate(e.target.value)} className="orders-date-input" />
                        </div>
                        <button onClick={handleExportDeliveredOrders}
                            disabled={isExporting || !exportStartDate || !exportEndDate}
                            className={`sl-add-btn${isExporting || !exportStartDate || !exportEndDate ? ' sl-add-btn--disabled' : ''}`}>
                            <span className="sl-add-btn-icon">
                                {isExporting
                                    ? <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="animate-spin"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    : <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                }
                            </span>
                            {isExporting ? 'Exporting...' : 'Export Excel'}
                        </button>
                    </div>

                    {/* Filters + Sort Section */}
                    <div className="orders-filters-section">
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="pay-filter-select">
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
                        <select value={paymentTypeFilter} onChange={(e) => setPaymentTypeFilter(e.target.value)} className="pay-filter-select">
                            <option value="all">All Payment Types</option>
                            <option value="prepaid">Prepaid</option>
                            <option value="cod">Cash on Delivery</option>
                        </select>
                        <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)} className="pay-filter-select">
                            <option value="all">All Payment Status</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                            <option value="refund_pending">Refund Pending</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <div className="orders-filter-divider" />
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="pay-filter-select">
                            <option value="createdAt">Sort: Date</option>
                            <option value="total">Sort: Total</option>
                            <option value="status">Sort: Status</option>
                            <option value="payment_status">Sort: Payment</option>
                        </select>
                        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="pay-filter-select">
                            <option value="desc">Newest First</option>
                            <option value="asc">Oldest First</option>
                        </select>
                        <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="pay-filter-select">
                            <option value={10}>Show: 10</option>
                            <option value={25}>Show: 25</option>
                            <option value={50}>Show: 50</option>
                            <option value={100}>Show: 100</option>
                        </select>
                        {selectedOrders.size > 0 && (
                            <button className={`sl-add-btn${isDownloadingBulk ? ' sl-add-btn--disabled' : ''}`}
                                onClick={handleBulkDownload} disabled={isDownloadingBulk}>
                                <span className="sl-add-btn-icon">
                                    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </span>
                                {isDownloadingBulk ? 'Downloading...' : `Download ${selectedOrders.size} Labels`}
                            </button>
                        )}
                    </div>

                </div>{/* end orders-header-container */}

                {/* Table Section */}
                <div className="sl-table-wrap">
                    {loading ? (
                        <div className="orders-loader-wrap"><Loader /></div>
                    ) : orders.length === 0 ? (
                        <div className="sl-empty">
                            <div className="sl-empty-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
                            </div>
                            <p>No orders found.</p>
                        </div>
                    ) : (
                        <>
                            <Table columns={columns} data={currentItemsWithSN} striped={true} hoverable={true} />
                            {totalOrders > itemsPerPage && (
                                <div className="sl-pagination">
                                    <Pagination currentPage={currentPage} totalPages={totalPages}
                                        onPageChange={(page) => { setCurrentPage(page); fetchOrders(page); }} />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Order Details Modal */}
            <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={`Order Details: #${selectedOrder?.order_number}`}>
                {selectedOrder && (
                    <div className="order-details-modal">
                        {/* Customer Information */}
                        <div className="order-section">
                            <h4>Customer Information</h4>
                            <div className="order-section-content">
                                <div className="order-info-grid">
                                    <div>
                                        <strong>Name:</strong>{' '}
                                        {selectedOrder.User?.username || (selectedOrder.GuestUser ? `${selectedOrder.GuestUser.firstName} ${selectedOrder.GuestUser.lastName}` : selectedOrder.ShippingAddress?.full_name || 'N/A')}
                                        {selectedOrder.GuestUser && <span className="guest-badge">(Guest)</span>}
                                    </div>
                                    <div><strong>Email:</strong> {selectedOrder.User?.email || selectedOrder.GuestUser?.email || 'N/A'}</div>
                                    <div><strong>Phone:</strong> {selectedOrder.ShippingAddress?.phone || selectedOrder.GuestUser?.phone || 'N/A'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Shipping Address */}
                        {selectedOrder.ShippingAddress && (
                            <div className="order-section">
                                <h4>Shipping Address</h4>
                                <div className="order-section-content">
                                    <div className="order-address-block">
                                        <div className="order-address-name">{selectedOrder.ShippingAddress.full_name}</div>
                                        <div>{selectedOrder.ShippingAddress.address}</div>
                                        <div>{selectedOrder.ShippingAddress.city}, {selectedOrder.ShippingAddress.state} - {selectedOrder.ShippingAddress.pincode}</div>
                                        <div>{selectedOrder.ShippingAddress.country || 'India'}</div>
                                        <div><strong>Phone:</strong> {selectedOrder.ShippingAddress.phone}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Order Information */}
                        <div className="order-section">
                            <h4>Order Information</h4>
                            <div className="order-section-content">
                                <div className="order-info-grid">
                                    <div><strong>Order Date:</strong> {formatDate(selectedOrder.createdAt)}</div>
                                    <div>
                                        <strong>Payment Type:</strong>{' '}
                                        <span className={`order-payment-type-badge${selectedOrder.payment_type?.toLowerCase() === 'cod' ? ' cod' : ' prepaid'}`}>
                                            {formatPaymentType(selectedOrder.payment_type)}
                                        </span>
                                    </div>
                                    <div><strong>Payment Status:</strong> <span className={`status-badge status-${getPaymentStatusClass(selectedOrder)}`}>{getPaymentStatusDisplay(selectedOrder)}</span></div>
                                    <div><strong>Order Status:</strong> <span className={`status-badge status-${getStatusClassName(selectedOrder.status)}`}>{getStatusDisplayText(selectedOrder.status)}</span></div>
                                    {selectedOrder.notes && <div className="order-info-full"><strong>Order Notes:</strong> {selectedOrder.notes}</div>}
                                </div>
                                {(selectedOrder.fship_order_id || selectedOrder.fship_waybill || selectedOrder.tracking_number) && (
                                    <div className="order-fship-info">
                                        <h5 className="order-fship-title">FShip Tracking Information</h5>
                                        {selectedOrder.fship_order_id && <div><strong>FShip Order ID:</strong> {selectedOrder.fship_order_id}</div>}
                                        {selectedOrder.fship_waybill && <div><strong>AWB Number:</strong> {selectedOrder.fship_waybill}</div>}
                                        {selectedOrder.fship_route_code && <div><strong>Route Code:</strong> {selectedOrder.fship_route_code}</div>}
                                        {selectedOrder.tracking_number && <div><strong>Tracking Number:</strong> {selectedOrder.tracking_number}</div>}
                                        {selectedOrder.courier_name && <div><strong>Courier:</strong> {selectedOrder.courier_name}</div>}
                                        {selectedOrder.fship_label_url && (
                                            <div>
                                                <strong>Shipping Label:</strong>{' '}
                                                <a href={selectedOrder.fship_label_url} target="_blank" rel="noopener noreferrer" className="order-label-link">
                                                    Download Label PDF
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Products Ordered */}
                        <div className="order-section">
                            <h4>Products Ordered</h4>
                            <div className="order-section-content">
                                <div className="order-table-scroll">
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
                                                let imageToDisplay = null;
                                                if (item.ProductVariation?.VariationImages?.length > 0) {
                                                    imageToDisplay = item.ProductVariation.VariationImages.find(img => img.is_primary) || item.ProductVariation.VariationImages[0];
                                                } else if (item.ProductVariation?.image) {
                                                    imageToDisplay = { image_url: item.ProductVariation.image };
                                                } else if (item.ProductVariation?.image_url) {
                                                    imageToDisplay = { image_url: item.ProductVariation.image_url };
                                                } else {
                                                    imageToDisplay = item.Product?.ProductImages?.find(img => img.is_primary) || item.Product?.ProductImages?.[0];
                                                }
                                                const imageUrl = getProductImageSrc(imageToDisplay);
                                                const sku = item.ProductVariation?.sku || 'N/A';
                                                return (
                                                    <tr key={item.id}>
                                                        <td>
                                                            <div className="product-image-container">
                                                                <SafeImage imageData={{ image_url: imageUrl }} alt={item.Product?.name || 'Product'}
                                                                    className="product-image" width="80px" height="80px" />
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="product-details-cell">
                                                                <div className="product-name">{item.Product?.name || 'N/A'}</div>
                                                                {item.Product?.brand && <div className="product-brand">{item.Product.brand}</div>}
                                                                {item.ProductVariation?.attributes && (
                                                                    <div className="product-attributes">
                                                                        {getAttributeComponents(item.ProductVariation.attributes).map(({ key, value }) => (
                                                                            <span key={key} className="attribute-item">{key}: {value}</span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                <div className="product-sku-display">SKU: {sku}</div>
                                                            </div>
                                                        </td>
                                                        <td><div className="product-sku">{sku}</div></td>
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
                        </div>

                        {/* Order Summary */}
                        <div className="order-section">
                            <h4>Order Summary</h4>
                            <div className="order-section-content">
                                <div className="order-summary-rows">
                                    <div className="order-summary-row">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(calculateOrderSubtotal(selectedOrder.OrderItems))}</span>
                                    </div>
                                    <div className="order-summary-row">
                                        <span>Shipping Fee</span>
                                        <span>{formatCurrency(selectedOrder.shipping_fee || 0)}</span>
                                    </div>
                                    {selectedOrder.discount_amount > 0 && (
                                        <div className="order-summary-row discount">
                                            <span>Discount</span>
                                            <span>- {formatCurrency(selectedOrder.discount_amount || 0)}</span>
                                        </div>
                                    )}
                                    <div className="order-summary-row total">
                                        <span>Total Amount</span>
                                        <span>{formatCurrency(getOrderTotal(selectedOrder))}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>Close</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* AWB Update Modal */}
            <Modal isOpen={isAwbModalOpen}
                onClose={() => { setIsAwbModalOpen(false); setAwbNumber(''); setCourierName(''); setAwbOrderId(null); }}
                title="Update AWB Number">
                <div className="awb-modal-body">
                    <div className="awb-field">
                        <label className="awb-label">AWB Number <span className="sl-required">*</span></label>
                        <input type="text" value={awbNumber} onChange={(e) => setAwbNumber(e.target.value)}
                            placeholder="Enter AWB/Tracking Number" className="awb-input" />
                    </div>
                    <div className="awb-field">
                        <label className="awb-label">Courier Name</label>
                        <input type="text" value={courierName} onChange={(e) => setCourierName(e.target.value)}
                            placeholder="Enter Courier Name (Optional)" className="awb-input" />
                    </div>
                    <div className="modal-footer">
                        <Button variant="secondary" onClick={() => { setIsAwbModalOpen(false); setAwbNumber(''); setCourierName(''); setAwbOrderId(null); }}>Cancel</Button>
                        <Button variant="primary" onClick={submitAwbUpdate}>Update AWB</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default Orders;
