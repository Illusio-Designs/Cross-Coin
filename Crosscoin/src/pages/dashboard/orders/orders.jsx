import React, { useState, useEffect, useCallback, useRef } from 'react';
import { orderService, dashboardService, brandService } from '../../../services';
import { Table, Pagination, Modal, Button, Select, DateRangePicker } from "../../../components/ui";
import Tooltip from "../../../components/ui/Tooltip";
import OrderStatusBadge from "../../../components/ui/OrderStatusBadge";
import ShipmentStatusBadge from "../../../components/ui/ShipmentStatusBadge";
import LabelStatusBadge from "../../../components/ui/LabelStatusBadge";
import SafeImage from "../../../components/common/SafeImage";
import { TableSkeleton } from "../../../components/common/SkeletonLoader";
import BrandTags from "../../../components/Dashboard/BrandTags";
import { showSuccess, showError } from '../../../utils/toastNotification';
import { PromptModal, ConfirmModal } from '../../../components/common/AlertModal';
import { getProductImageSrc } from '../../../utils/imageUtils';
import { getAttributeComponents } from '../../../utils/productAttributeFormatter';
import { getStatusClassName, getStatusDisplayText } from '../../../utils/statusUtils';
import PaymentChart from '../../../components/Dashboard/PaymentChart';
import ShippingChart from '../../../components/Dashboard/ShippingChart';
import PaymentStatusChart from '../../../components/Dashboard/PaymentStatusChart';
import ManualOrderModal from '../../../components/Dashboard/ManualOrderModal';
import { PageHeader, Panel, StatGrid, StatTile, FilterBar } from '../../../components/Dashboard/primitives';

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
    const [cancelPrompt, setCancelPrompt] = useState(null);
    const [confirmPrompt, setConfirmPrompt] = useState(null);
    const [deletePrompt, setDeletePrompt] = useState(null);
    const [allOrdersStats, setAllOrdersStats] = useState({
        total: 0, prepaid: 0, cod: 0, paid: 0, pending: 0,
        totalRevenue: 0, averageOrderValue: 0, deliveredOrders: 0, cancelledOrders: 0,
        paymentStatusPending: 0, paymentStatusPaid: 0, paymentStatusFailed: 0,
        paymentStatusRefunded: 0, paymentStatusCancelled: 0, paymentStatusRefundPending: 0
    });
    const [allOrdersData, setAllOrdersData] = useState([]);
    const [syncingOrders, setSyncingOrders] = useState(new Set());
    const [syncingAll, setSyncingAll] = useState(false);
    const [refreshingStatus, setRefreshingStatus] = useState(false);
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
    const [statsStartDate, setStatsStartDate] = useState('');
    const [statsEndDate, setStatsEndDate] = useState('');
    const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
    const [brandFilter, setBrandFilter] = useState('all');
    const [brands, setBrands] = useState([]);
    const [generatingLabel, setGeneratingLabel] = useState(new Set());
    const [highlightedRows, setHighlightedRows] = useState(new Set());
    const [labelPollTimer, setLabelPollTimer] = useState(null);
    // UI: analytics charts are collapsed by default so the orders table sits
    // near the top; live updates can be paused so the table never refreshes
    // under the admin while they work.
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [liveUpdates, setLiveUpdates] = useState(true);
    const [filterOpen, setFilterOpen] = useState(false);
    // Manual courier picker — opened directly or auto-opened when an
    // auto-sync comes back failed (no serviceable courier).

    // Debounced search value — auto-cancels previous timer on every keystroke
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(filterValue.trim()), 400);
        return () => clearTimeout(t);
    }, [filterValue]);

    // Drop stale responses when user types fast / changes filters quickly
    const requestIdRef = useRef(0);

    const fetchOrders = useCallback(async (page = currentPage, { silent = false } = {}) => {
        const reqId = ++requestIdRef.current;
        setError(null);
        // Foreground fetches (page change, filter change, manual refresh) show the
        // skeleton and clear the visible rows so the previous page's data doesn't
        // sit on screen during the fetch. A *silent* fetch (the 30s background
        // poll) keeps the current rows on screen and swaps in fresh data when it
        // arrives — otherwise the whole table blanks out to a skeleton every 30s
        // while the admin is working.
        if (!silent) {
            setLoading(true);
            setOrders([]);
        }
        try {
            const params = {
                page, limit: itemsPerPage,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                payment_type: paymentTypeFilter !== 'all' ? paymentTypeFilter : undefined,
                payment_status: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
                brand_id: brandFilter !== 'all' ? brandFilter : undefined,
                search: debouncedSearch || undefined,
                start_date: statsStartDate || undefined,
                end_date: statsEndDate || undefined,
                sort: sortBy, order: sortOrder
            };
            Object.keys(params).forEach(key => { if (params[key] === undefined) delete params[key]; });
            // forceRefresh=true bypasses the 3-min /api/orders cache so this
            // dashboard always shows live data after pagination, sync,
            // status refresh, cancel, etc.
            const data = await orderService.getAllOrders(params, null, true);
            // Ignore if a newer request has been issued
            if (reqId !== requestIdRef.current) return;
            const ordersList = data.orders || data.data || [];
            setOrders(ordersList);
            const totalOrdersCount = data.total || 0;
            setTotalPages(Math.ceil(totalOrdersCount / itemsPerPage));
            setTotalOrders(totalOrdersCount);
        } catch (err) {
            if (reqId !== requestIdRef.current) return;
            // A failed background poll must not wipe the table the admin is using.
            if (!silent) setError(err.message || 'Failed to fetch orders');
        } finally {
            if (reqId === requestIdRef.current && !silent) setLoading(false);
        }
    }, [currentPage, itemsPerPage, statusFilter, paymentTypeFilter, paymentStatusFilter, brandFilter, debouncedSearch, statsStartDate, statsEndDate, sortBy, sortOrder]);

    const fetchAllOrdersForStats = useCallback(async () => {
        try {
            const params = {};
            if (statsStartDate) params.start_date = statsStartDate;
            if (statsEndDate) params.end_date = statsEndDate;
            const response = await dashboardService.getDashboardStats(params);
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
    }, [statsStartDate, statsEndDate]);

    // Bulk "Sync New Orders" — books every pending order directly (the endpoint
    // loops and calls the provider synchronously; no background queue).
    const syncOrders = async () => {
        if (syncingAll || syncingOrders.size > 0) { showError('syncInProgress'); return; }
        setSyncingAll(true);
        try {
            const result = await orderService.syncOrdersWithFShip();
            const data = result.data || result.results || {};
            const providerLabel = 'iThink';
            let message = `${providerLabel} sync completed! `;
            if (data.total > 0) message += `Processed ${data.total} orders. `;
            else if (data.total_orders_processed > 0) message += `Processed ${data.total_orders_processed} orders. `;
            if (data.synced > 0) message += `${data.synced} new orders synced. `;
            else if (data.new_orders_synced > 0) message += `${data.new_orders_synced} new orders synced. `;
            if (data.updated > 0) message += `${data.updated} orders updated. `;
            else if (data.existing_orders_updated > 0) message += `${data.existing_orders_updated} existing orders updated. `;
            if (data.skipped > 0) message += `${data.skipped} orders skipped. `;
            else if (data.skipped_final_state > 0) message += `${data.skipped_final_state} orders skipped. `;
            if (data.errors > 0) message += `${data.errors} orders failed. `;
            else if (data.failed > 0) message += `${data.failed} orders failed. `;
            if ((data.total || data.total_orders_processed || 0) === 0) message += 'No orders pending sync.';
            showSuccess('orderSynced', message);
            fetchOrders(); fetchAllOrdersForStats();
        } catch (error) {
            showError('syncFailed', error.message || error.error || 'Failed to sync orders');
        } finally { setSyncingAll(false); }
    };

    const refreshOrderStatuses = async () => {
        if (refreshingStatus) return;
        setRefreshingStatus(true);
        try {
            const result = await orderService.bulkRefreshFShipStatus();
            const data = result.data || {};
            let message = 'Status refresh completed! ';
            if (data.updated > 0) message += `${data.updated} orders updated. `;
            if (data.unchanged > 0) message += `${data.unchanged} unchanged. `;
            if (data.errors > 0) message += `${data.errors} errors. `;
            if ((data.total || 0) === 0) message += 'No active orders to refresh.';
            showSuccess('orderSynced', message);
            fetchOrders(); fetchAllOrdersForStats();
        } catch (error) {
            showError('syncFailed', error.message || error.error || 'Failed to refresh order statuses');
        } finally { setRefreshingStatus(false); }
    };

    const updateSingleOrder = async (orderId) => {
        try {
            // Refresh tracking from the shipping provider (iThink)
            const result = await orderService.refreshOrderStatus(orderId);
            if (result.success) {
                let message = result.message;
                if (result.update_result?.updated) {
                    if (result.update_result.status_changed) message += ` Status: ${result.update_result.old_status} → ${result.update_result.new_status}`;
                    if (result.update_result.tracking_updated) message += ` Tracking updated.`;
                }
                showSuccess('orderSynced', message);
                fetchOrders(); fetchAllOrdersForStats();
            } else { showError('syncFailed', result.message || 'Failed to update order'); }
        } catch (error) { showError('syncFailed', error.message || error.error || 'Failed to refresh order tracking from shipping provider'); }
    };

    const generateLabelForOrder = async (orderId) => {
        if (!orderId) return;
        if (generatingLabel.has(orderId)) return;
        try {
            setGeneratingLabel(prev => new Set(prev).add(orderId));
            const result = await orderService.generateManifest([orderId]);
            if (result.success) {
                showSuccess('labelGenerated', `Label generated successfully! Download will start automatically.`);
                highlightRow(orderId);
                if (result.data.labelUrl) {
                    window.open(result.data.labelUrl, '_blank');
                } else if (result.data.pdfUrl) {
                    window.open(result.data.pdfUrl, '_blank');
                }
                fetchOrders();
            } else {
                showError('labelFailed', result.message || 'Failed to generate label');
            }
        } catch (error) {
            showError('labelFailed', error.message || 'Failed to generate label');
        } finally {
            setGeneratingLabel(prev => {
                const newSet = new Set(prev);
                newSet.delete(orderId);
                return newSet;
            });
        }
    };

    const syncSingleOrder = async (orderId, orderNumber) => {
        if (syncingOrders.has(orderId) || syncingAll) { showError('syncInProgress'); return; }
        try {
            setSyncingOrders(prev => new Set(prev).add(orderId));
            const result = await orderService.syncSingleOrderWithFShip(orderId);
            if (result.success) {
                const providerLabel = 'iThink';
                const awb = result.data?.order?.waybill || result.data?.fship_response?.waybill || result.data?.order?.fship_waybill || 'Generated';
                showSuccess('orderSynced', `Order ${orderNumber} synced via ${providerLabel}! AWB: ${awb}`);
                fetchOrders(); fetchAllOrdersForStats();
            } else { showError('syncFailed', result.message || 'Failed to sync order'); }
        } catch (error) { showError('syncFailed', error.message || error.error || 'Failed to sync order');
        } finally {
            setSyncingOrders(prev => { const s = new Set(prev); s.delete(orderId); return s; });
        }
    };

    const cancelOrder = (orderId, orderNumber) => {
        setCancelPrompt({ orderId, orderNumber });
    };

    const confirmOrder = (orderId, orderNumber) => {
        setConfirmPrompt({ orderId, orderNumber });
    };

    const handleConfirmOrder = async () => {
        const { orderId, orderNumber } = confirmPrompt;
        setConfirmPrompt(null);
        try {
            const result = await orderService.confirmOrder(orderId);
            if (result.success) {
                showSuccess('orderConfirmed', `Order ${orderNumber} confirmed successfully!`);
                highlightRow(orderId);
                // Refresh orders + stats to reflect the new status.
                await fetchOrders();
                await fetchAllOrdersForStats();
                // Courier assignment is handled by the dedicated "Sync" action on
                // each row (auto-selects the best available courier). We no longer
                // try to auto-open a courier picker here — that path referenced an
                // undefined handler and read a stale orders snapshot.
            }
            else { showError('saveFailed', result.message || 'Failed to confirm order'); }
        } catch (error) { showError('saveFailed', error.message || 'Failed to confirm order'); }
    };

    const handleCancelConfirm = async (reason) => {
        const { orderId, orderNumber } = cancelPrompt;
        setCancelPrompt(null);
        try {
            const result = await orderService.adminCancelOrder(orderId, reason);
            if (result.success) {
                showSuccess('orderCancelled', `Order ${orderNumber} cancelled successfully`);
                highlightRow(orderId);
                fetchOrders();
                fetchAllOrdersForStats();
            }
            else { showError('saveFailed', result.message || 'Failed to cancel order'); }
        } catch (error) { showError('saveFailed', error.message || error.error || 'Failed to cancel order'); }
    };

    const deleteOrder = (orderId, orderNumber) => {
        setDeletePrompt({ orderId, orderNumber });
    };

    const handleDeleteConfirm = async () => {
        const { orderId, orderNumber } = deletePrompt;
        setDeletePrompt(null);
        try {
            const result = await orderService.adminDeleteOrder(orderId);
            if (result?.success !== false) {
                showSuccess('orderDeleted', `Order ${orderNumber} deleted`);
                fetchOrders();
                fetchAllOrdersForStats();
            } else {
                showError('saveFailed', result.message || 'Failed to delete order');
            }
        } catch (error) {
            showError('saveFailed', error.message || error.error || 'Failed to delete order');
        }
    };

    const handleAwbUpdate = (orderId, currentAwb, currentCourier) => {
        setAwbOrderId(orderId); setAwbNumber(currentAwb || ''); setCourierName(currentCourier || ''); setIsAwbModalOpen(true);
    };

    const submitAwbUpdate = async () => {
        if (!awbNumber.trim()) { showError('fieldRequired', 'Please enter AWB number'); return; }
        try {
            await orderService.updateAwbNumber(awbOrderId, { awbNumber: awbNumber.trim(), courierName: courierName.trim() || 'Manual Entry' });
            showSuccess('awbUpdated', 'AWB number updated successfully!');
            highlightRow(awbOrderId);
            setIsAwbModalOpen(false); setAwbNumber(''); setCourierName(''); setAwbOrderId(null);
            fetchOrders(currentPage);
        } catch (error) { showError('updateFailed', error.message || 'Failed to update AWB number'); }
    };

    const handleExportDeliveredOrders = async () => {
        if (!exportStartDate || !exportEndDate) { showError('selectDates'); return; }
        if (new Date(exportStartDate) > new Date(exportEndDate)) { showError('dateError'); return; }
        setIsExporting(true);
        try {
            await orderService.exportDeliveredOrders(exportStartDate, exportEndDate);
            showSuccess('exported', 'Delivered orders exported successfully!');
        } catch (error) { showError('exportFailed', error.message || 'Failed to export delivered orders');
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
            showSuccess('exported', 'Label opened successfully!');
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
        if (selectedOrders.size === 0) { showError('fieldRequired', 'Please select orders to download labels'); return; }
        setIsDownloadingBulk(true);
        try {
            await orderService.bulkDownloadLabels(Array.from(selectedOrders));
            showSuccess('exported', `Downloaded ${selectedOrders.size} labels successfully!`);
            setSelectedOrders(new Set()); fetchOrders(currentPage); fetchLabelStats();
        } catch (error) { showError('exportFailed', error.message || 'Failed to download labels');
        } finally { setIsDownloadingBulk(false); }
    };

    // ── One-shot init: stats panel + label stats (orders fetched by effects below) ──
    useEffect(() => {
        fetchAllOrdersForStats();
        fetchLabelStats();
        brandService.getAllBrands(true).then(r => { if (r.success) setBrands(r.data || []); }).catch(() => {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Real-time polling for label status (every 60 seconds) — only while
    // "Live" is on. The refresh is silent (keeps the current rows visible
    // instead of blanking the table to a skeleton), and the admin can pause
    // it entirely with the Live toggle so nothing moves under them.
    useEffect(() => {
        if (!liveUpdates) return;
        const timer = setInterval(() => {
            fetchLabelStats();
            if (!loading) fetchOrders(currentPage, { silent: true });
        }, 60000);
        setLabelPollTimer(timer);
        return () => clearInterval(timer);
    }, [currentPage, loading, liveUpdates]); // eslint-disable-line react-hooks/exhaustive-deps

    // Stats panel re-fetches when its date range changes
    useEffect(() => { fetchAllOrdersForStats(); }, [statsStartDate, statsEndDate]); // eslint-disable-line react-hooks/exhaustive-deps

    // Reset to page 1 whenever any filter (other than the page itself) changes,
    // so users don't get stuck on an out-of-range page after narrowing results.
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, paymentTypeFilter, paymentStatusFilter, brandFilter, sortBy, sortOrder, itemsPerPage, debouncedSearch, statsStartDate, statsEndDate]);

    // Single source of truth for fetching the orders list.
    // fetchOrders depends on every filter, so this effect re-runs whenever any of them change.
    useEffect(() => { fetchOrders(currentPage); }, [fetchOrders, currentPage]);

    const handleSearchChange = (e) => setFilterValue(e.target.value);

    const highlightRow = (orderId) => {
        setHighlightedRows(prev => new Set(prev).add(orderId));
        setTimeout(() => {
            setHighlightedRows(prev => {
                const newSet = new Set(prev);
                newSet.delete(orderId);
                return newSet;
            });
        }, 2500);
    };

    const getRowBorderColor = (status) => {
        const borderColorMap = {
            confirmed: '#10b981',
            processing: '#2196f3',
            booked: '#10b981',
            'in transit': '#06b6d4',
            delivered: '#10b981',
            'pending sync': '#f59e0b',
            'failed sync': '#ef4444'
        };
        return borderColorMap[status?.toLowerCase()] || '#e5e7eb';
    };

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        return <span className="date-time-cell"><span className="date-part">{date}</span><span className="time-part">{time}</span></span>;
    };
    const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;
    // Default to empty array when an order has no OrderItems shipped from
    // the API — otherwise the .reduce throws and the view modal silently
    // unmounts (looks like the View button "isn't working").
    const calculateOrderSubtotal = (orderItems = []) =>
      (orderItems || []).reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
    const calculateOrderTotal = (subtotal, shippingFee, discountAmount) => Math.max(0, subtotal - parseFloat(discountAmount || 0) + parseFloat(shippingFee || 0));
    const getOrderTotal = (order) => {
        if (!order || !order.OrderItems || order.OrderItems.length === 0) return parseFloat(order.final_amount || 0);
        return calculateOrderTotal(calculateOrderSubtotal(order.OrderItems), order.shipping_fee || 0, order.discount_amount || 0);
    };
    const getPaymentStatusDisplay = (order) => ({ pending: 'Pending', paid: 'Paid', failed: 'Failed', refunded: 'Refunded', cancelled: 'Cancelled', refund_pending: 'Refund Pending' }[order.payment_status?.toLowerCase()] || 'Unknown');
    const getPaymentStatusClass = (order) => ({ pending: 'pending', paid: 'paid', failed: 'failed', refunded: 'refunded', cancelled: 'cancelled', refund_pending: 'refund-pending' }[order.payment_status?.toLowerCase()] || 'unknown');
    const formatPaymentType = (paymentType) => {
        const type = String(paymentType || '').toLowerCase();
        if (type === 'cod') return 'COD';
        // Empty happens on older prepaid orders whose type was saved as an invalid
        // enum ('prepaid') and stored as '' — a COD order is always saved as 'cod',
        // so anything non-COD (incl. empty) is a prepaid order.
        if (!type || ['credit_card','debit_card','upi','wallet','razorpay','prepaid'].includes(type)) return 'Pre-paid';
        return type.toUpperCase();
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
        { header: "Order ID", cell: (row) => <span style={{ fontFamily: 'var(--ds-font-mono)', fontWeight: 600, color: 'var(--ds-color-text)', whiteSpace: 'nowrap' }}>{row.order_number}</span>, width: "140px" },
        {
            header: "Customer",
            cell: (row) => {
                const rawName = row.User?.username || row.ShippingAddress?.full_name || 'N/A';
                // The name sometimes carries a trailing "(phone)" — strip it so the
                // cell shows only the name (no number, no email).
                const name = String(rawName).replace(/\s*\(\+?[\d\s-]{6,}\)\s*$/, '').trim() || 'N/A';
                return (
                    <div className="customer-info">
                        <div className="customer-name" style={{ whiteSpace: 'nowrap' }}>{name}</div>
                        {row.rto_risk_level && (
                            <span className={`rto-badge rto-${row.rto_risk_level.toLowerCase()}`}>
                                <span className="rto-dot" />
                                <span className="rto-level">{row.rto_risk_level}</span>
                                {row.rto_risk_score != null && <span className="rto-score">{row.rto_risk_score}</span>}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            header: "Brand",
            cell: (row) => {
                if (row.Brand) {
                    return <BrandTags brands={[row.Brand]} />;
                }
                return <span className="sl-na">—</span>;
            }
        },
        { header: "Date", cell: (row) => formatDate(row.createdAt), width: "130px" },
        { header: "Payment", cell: (row) => {
            const label = formatPaymentType(row.payment_type);
            return (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>
                    <span className={`pay-chip ${label === 'COD' ? 'pay-cod' : 'pay-prepaid'}`}>{label}</span>
                    <span className={`status-badge status-${getPaymentStatusClass(row)}`}>{getPaymentStatusDisplay(row)}</span>
                </div>
            );
        }, width: "180px" },
        { header: "Total", cell: (row) => formatCurrency(getOrderTotal(row)), width: "90px" },
        { header: "Order Status", cell: (row) => <OrderStatusBadge status={row.status} />, width: "160px" },
        {
            // Consolidated shipment column — status + AWB/courier + label, so the
            // table reads clean like the prototype. All shipment ACTIONS (sync,
            // refresh, edit AWB, generate/download label) still live in the
            // Actions column, so nothing is lost by merging these display cells.
            header: "Shipment",
            cell: (row) => {
                const s = row.Shipment || {};
                const waybill = s.waybill || row.fship_waybill;
                const courier = s.courier_name || row.courier_name;
                const orderStatus = (row.status || '').toLowerCase();
                // Cancelled orders never ship — don't show a "Pending Sync" chip.
                if ((orderStatus === 'cancelled' || orderStatus === 'order cancelled') && !waybill) {
                    return <span style={{ color: 'var(--ds-color-text-faint)', fontSize: '12px' }}>—</span>;
                }
                const status = s.sync_status || row.fship_sync_status || (row.fship_order_id || waybill ? 'synced' : 'pending');
                const syncError = s.sync_error || row.fship_sync_error;
                return (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', whiteSpace: 'nowrap' }}>
                        <ShipmentStatusBadge status={status} syncError={syncError} />
                        {waybill && (
                            <span style={{ fontSize: '11px', color: 'var(--ds-color-text-muted)' }}>
                                {waybill}{courier ? ` · ${courier}` : ''}
                            </span>
                        )}
                    </div>
                );
            },
            width: "190px"
        },
        {
            header: "Actions",
            cell: (row) => {
                const isFinal = row.status === 'delivered' || row.status === 'cancelled';
                const isSyncing = syncingOrders.has(row.id) || syncingAll;
                // Once an order has a waybill it's already booked with a courier —
                // hide the Sync button (the Refresh-tracking button takes over).
                const isSynced = !!(row.Shipment?.waybill || row.fship_waybill);
                const canConfirm = ['awaiting_confirmation', 'pending'].includes(row.status);
                // Admin can cancel any non-dispatched order (COD or prepaid),
                // including confirmed / processing / synced-&-booked ones — the
                // backend restores stock, refunds prepaid, and cancels the
                // courier booking (iThink) so both sides stay in sync. Matches
                // the server's admin-cancellable statuses; dispatched/final
                // orders (shipped, delivered, cancelled…) never show it.
                const canCancel = ['awaiting_confirmation', 'pending', 'confirmed', 'processing', 'booked'].includes((row.status || '').toLowerCase());
                const divider = <span aria-hidden="true" style={{ width: 1, height: 18, background: '#e5e7eb', margin: '0 3px', flexShrink: 0 }} />;
                return (
                    <div className="sl-actions">
                        <Tooltip text="View order details and customer information" position="top">
                            <button className="sl-btn-edit"
                                onClick={() => { setSelectedOrder(row); setIsViewModalOpen(true); }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </button>
                        </Tooltip>
                        {!isSynced && divider}
                        {!isSynced && (
                        <Tooltip text={isFinal ? `Order is ${row.status}` : 'Sync now — book this order with the best available courier'} position="top">
                            <button className={`order-action-btn order-sync-btn${isFinal || isSyncing ? ' disabled' : ''}`}
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
                        </Tooltip>
                        )}
                        {isSynced && (
                            <Tooltip text="Refresh tracking information from courier" position="top">
                                <button className="order-action-btn order-update-btn" onClick={() => updateSingleOrder(row.id)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
                                </button>
                            </Tooltip>
                        )}
                        <Tooltip text="Update or correct the Air Waybill number" position="top">
                            <button className="order-action-btn order-awb-btn" onClick={() => handleAwbUpdate(row.id, row.Shipment?.waybill || row.fship_waybill, row.Shipment?.courier_name || row.courier_name)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                        </Tooltip>
                        {(row.Shipment?.waybill || row.fship_waybill) && (
                            <Tooltip text="Generate shipping label for this order" position="top">
                                <button className={`order-action-btn order-label-btn${generatingLabel.has(row.id) ? ' disabled' : ''}`}
                                    onClick={() => generateLabelForOrder(row.id)}
                                    disabled={generatingLabel.has(row.id)}>
                                    {generatingLabel.has(row.id) ? (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                                    )}
                                </button>
                            </Tooltip>
                        )}
                        {(canConfirm || canCancel) && divider}
                        {canConfirm && (
                            <Tooltip text="Confirm order and proceed to shipping" position="top">
                                <button className="order-action-btn order-confirm-btn" onClick={() => confirmOrder(row.id, row.order_number)}>
                                    ✓
                                </button>
                            </Tooltip>
                        )}
                        {canCancel && (
                            <Tooltip text="Cancel this order permanently" position="top">
                                <button className="sl-btn-delete" onClick={() => cancelOrder(row.id, row.order_number)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </Tooltip>
                        )}
                        <Tooltip text="Delete this order permanently (removes all its data)" position="top">
                            <button className="sl-btn-delete order-delete-btn" onClick={() => deleteOrder(row.id, row.order_number)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            </button>
                        </Tooltip>
                    </div>
                );
            }
        }
    ];

    const showNotification = (message, type = 'info') => {
        if (type === 'error') showError(null, message);
        else showSuccess(null, message);
    };

    return (
        <>
            <ManualOrderModal
                isOpen={isManualOrderOpen}
                onClose={() => setIsManualOrderOpen(false)}
                onOrderCreated={() => { fetchOrders(1); fetchAllOrdersForStats(); }}
            />
            <PromptModal
                message={cancelPrompt ? `Enter cancellation reason for order ${cancelPrompt.orderNumber}:` : null}
                placeholder="Cancellation reason..."
                onConfirm={handleCancelConfirm}
                onCancel={() => setCancelPrompt(null)}
            />
            <ConfirmModal
                message={confirmPrompt ? `Are you sure you want to confirm order ${confirmPrompt.orderNumber}? This will trigger shipping provider sync.` : null}
                onConfirm={handleConfirmOrder}
                onCancel={() => setConfirmPrompt(null)}
            />
            <ConfirmModal
                message={deletePrompt ? `Permanently DELETE order ${deletePrompt.orderNumber}? This removes the order and all its data and cannot be undone.` : null}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeletePrompt(null)}
            />
            <div className="dashboard-page">
                {error && (
                    <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '6px', padding: '12px 16px', margin: '16px', color: '#991B1B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{error}</span>
                        <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
                    </div>
                )}
                <div className="orders-header-container">
                    {/* ── Page Header: Title + actions (search + sync buttons) ── */}
                    <PageHeader
                        title="Orders"
                        subtitle={`${totalOrders} order${totalOrders !== 1 ? 's' : ''} total`}
                        actions={
                            <>
                                <div className="sl-search-wrap">
                                    <span className="sl-search-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                    </span>
                                    <input type="text" className="sl-search-input" placeholder="Search orders, customers, AWB…"
                                        value={filterValue} onChange={handleSearchChange} />
                                </div>
                                <button className={`order-sync-main-btn${refreshingStatus ? ' syncing' : ''}`}
                                    title="Update the tracking status of already-shipped, active orders"
                                    onClick={refreshOrderStatuses} disabled={loading || refreshingStatus}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={refreshingStatus ? 'animate-spin' : ''}><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
                                    {refreshingStatus ? 'Refreshing…' : 'Refresh Tracking'}
                                </button>
                                <DateRangePicker
                                    label=""
                                    startDate={statsStartDate}
                                    endDate={statsEndDate}
                                    onStartChange={setStatsStartDate}
                                    onEndChange={setStatsEndDate}
                                    onClear={() => { setStatsStartDate(''); setStatsEndDate(''); }}
                                    inline
                                />
                            </>
                        }
                    />

                    {/* ── KPI Strip — one clean row (prototype style) ── */}
                    <StatGrid className="orders-kpi-grid" style={{ marginBottom: 'var(--ds-space-4)' }}>
                        <StatTile label="Total"     value={allOrdersStats.total} />
                        <StatTile label="Revenue"   value={parseFloat(allOrdersStats.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })} prefix="₹" />
                        <StatTile label="Prepaid"   value={allOrdersStats.prepaid} />
                        <StatTile label="COD"       value={allOrdersStats.cod} />
                        <StatTile label="Delivered" value={allOrdersStats.deliveredOrders} />
                        <StatTile label="Cancelled" value={allOrdersStats.cancelledOrders} />
                        <StatTile label="Paid"      value={allOrdersStats.paymentStatusPaid} />
                        <StatTile label="Avg Order" value={parseFloat(allOrdersStats.averageOrderValue || 0).toFixed(0)} prefix="₹" />
                    </StatGrid>

                    {/* ── Status tabs (left) + Filter drawer trigger (right), one line ── */}
                    <div className="ord-toolbar">
                        <div className="ord-tabs" role="tablist" aria-label="Filter by order status">
                            {[
                                { v: 'all',       l: 'All' },
                                { v: 'pending',   l: 'Pending' },
                                { v: 'processing', l: 'Processing' },
                                { v: 'shipped',   l: 'Shipped' },
                                { v: 'delivered', l: 'Delivered' },
                                { v: 'cancelled', l: 'Cancelled' },
                                { v: 'rto',       l: 'RTO' },
                            ].map((t) => (
                                <button key={t.v} type="button" role="tab"
                                    aria-selected={statusFilter === t.v}
                                    className={`ord-tab${statusFilter === t.v ? ' on' : ''}`}
                                    onClick={() => setStatusFilter(t.v)}>
                                    {t.l}
                                </button>
                            ))}
                        </div>
                        <div className="ord-toolbar-right">
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
                            <button type="button" className="order-sync-main-btn order-sync-main-btn--ghost" onClick={() => setFilterOpen(true)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                                Filter
                            </button>
                        </div>
                    </div>

                </div>{/* end orders-header-container */}

                {/* ── Filters drawer (right aside panel) ── */}
                <Modal isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filters" size="sm"
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => {
                                setPaymentTypeFilter('all'); setPaymentStatusFilter('all'); setBrandFilter('all');
                                setSortBy('createdAt'); setSortOrder('desc');
                            }}>Reset</Button>
                            <Button variant="primary" onClick={() => setFilterOpen(false)}>Done</Button>
                        </>
                    }>
                    <div className="ord-filter-drawer">
                        <label className="ord-filter-label">Payment type</label>
                        <Select value={paymentTypeFilter} onChange={(v) => setPaymentTypeFilter(v || 'all')}
                            options={[{ value: 'all', label: 'All Payment Types' }, { value: 'prepaid', label: 'Prepaid' }, { value: 'cod', label: 'Cash on Delivery' }]}
                            placeholder="All Payment Types" />

                        <label className="ord-filter-label">Payment status</label>
                        <Select value={paymentStatusFilter} onChange={(v) => setPaymentStatusFilter(v || 'all')}
                            options={[{ value: 'all', label: 'All Payment Status' }, { value: 'pending', label: 'Pending' }, { value: 'paid', label: 'Paid' }, { value: 'failed', label: 'Failed' }, { value: 'refunded', label: 'Refunded' }, { value: 'refund_pending', label: 'Refund Pending' }, { value: 'cancelled', label: 'Cancelled' }]}
                            placeholder="All Payment Status" />

                        <label className="ord-filter-label">Brand</label>
                        <Select value={brandFilter} onChange={(v) => setBrandFilter(v || 'all')}
                            options={[{ value: 'all', label: 'All Brands' }, ...brands.map(b => ({ value: String(b.id), label: b.display_name || b.name }))]}
                            placeholder="All Brands" />

                        <label className="ord-filter-label">Sort by</label>
                        <Select value={sortBy} onChange={(v) => setSortBy(v || 'createdAt')}
                            options={[{ value: 'createdAt', label: 'Sort: Date' }, { value: 'total', label: 'Sort: Total' }, { value: 'status', label: 'Sort: Status' }, { value: 'payment_status', label: 'Sort: Payment' }]} />

                        <label className="ord-filter-label">Order</label>
                        <Select value={sortOrder} onChange={(v) => setSortOrder(v || 'desc')}
                            options={[{ value: 'desc', label: 'Newest First' }, { value: 'asc', label: 'Oldest First' }]} />

                        <label className="ord-filter-label">Rows per page</label>
                        <Select value={String(itemsPerPage)} onChange={(v) => { setItemsPerPage(Number(v || 10)); setCurrentPage(1); }}
                            options={[{ value: '10', label: 'Show: 10' }, { value: '25', label: 'Show: 25' }, { value: '50', label: 'Show: 50' }, { value: '100', label: 'Show: 100' }]} />
                    </div>
                </Modal>

                {/* Table Section */}
                <section className="sl-table-wrap" aria-label="Orders table">
                    {loading ? (
                        <div style={{ padding: '20px' }} role="status" aria-label="Loading orders">
                            <TableSkeleton rows={itemsPerPage} columns={8} />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="sl-empty" role="status" aria-label="No orders">
                            <div className="sl-empty-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
                            </div>
                            <p>No orders found.</p>
                        </div>
                    ) : (
                        <>
                            <div
                                role="region"
                                aria-label="Orders data table"
                                aria-live="polite"
                                aria-busy={loading}
                            >
                                <Table
                                    columns={columns}
                                    data={currentItemsWithSN}
                                    striped={false}
                                    hoverable={true}
                                    getRowStyle={(row) => {
                                        // Clean rows like the prototype — no per-row colour stripe
                                        // (status is already shown by the pill). Keep only the
                                        // transient "just updated" highlight.
                                        const isHighlighted = highlightedRows.has(row.id);
                                        return {
                                            backgroundColor: isHighlighted ? 'var(--ds-color-info-bg)' : 'transparent',
                                            transition: 'background-color 0.3s ease'
                                        };
                                    }}
                                />
                            </div>
                            {totalOrders > itemsPerPage && (
                                <nav className="sl-pagination" aria-label="Orders table pagination">
                                    <Pagination currentPage={currentPage} totalPages={totalPages}
                                        onPageChange={(page) => setCurrentPage(page)} />
                                </nav>
                            )}
                        </>
                    )}
                </section>
            </div>

            {/* Order Details Modal */}
            <Modal
              isOpen={isViewModalOpen}
              onClose={() => setIsViewModalOpen(false)}
              title={`Order Details: #${selectedOrder?.order_number}`}
              size="lg"
              role="dialog"
              aria-modal="true"
              aria-label={`Order details for order ${selectedOrder?.order_number}`}
            >
                {selectedOrder && (
                    <div className="odm-body">

                        {/* ── Row 1: Customer + Shipping ── */}
                        <div className="odm-row-2">
                            {/* Customer Information */}
                            <div className="odm-card">
                                <div className="odm-card-title">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                    Customer Information
                                </div>
                                <div className="odm-fields">
                                    <div className="odm-field">
                                        <span className="odm-label">Name</span>
                                        <span className="odm-value">
                                            {String(selectedOrder.User?.username || (selectedOrder.GuestUser ? `${selectedOrder.GuestUser.firstName} ${selectedOrder.GuestUser.lastName}` : selectedOrder.ShippingAddress?.full_name || 'N/A')).replace(/\s*\(\+?[\d\s-]{6,}\)\s*$/, '').trim() || 'N/A'}
                                            {selectedOrder.GuestUser && <span className="odm-guest-tag">Guest</span>}
                                        </span>
                                    </div>
                                    <div className="odm-field">
                                        <span className="odm-label">Email</span>
                                        <span className="odm-value">{selectedOrder.User?.email || selectedOrder.GuestUser?.email || 'N/A'}</span>
                                    </div>
                                    <div className="odm-field">
                                        <span className="odm-label">Phone</span>
                                        <span className="odm-value">{selectedOrder.ShippingAddress?.phone || selectedOrder.GuestUser?.phone || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Shipping Address */}
                            {selectedOrder.ShippingAddress && (
                                <div className="odm-card">
                                    <div className="odm-card-title">
                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                        Shipping Address
                                    </div>
                                    <div className="odm-fields">
                                        <div className="odm-field">
                                            <span className="odm-label">Name</span>
                                            <span className="odm-value odm-bold">{selectedOrder.ShippingAddress.full_name}</span>
                                        </div>
                                        <div className="odm-field">
                                            <span className="odm-label">Address</span>
                                            <span className="odm-value">{selectedOrder.ShippingAddress.address}</span>
                                        </div>
                                        <div className="odm-field">
                                            <span className="odm-label">City / State</span>
                                            <span className="odm-value">{selectedOrder.ShippingAddress.city}, {selectedOrder.ShippingAddress.state} — {selectedOrder.ShippingAddress.pincode}</span>
                                        </div>
                                        <div className="odm-field">
                                            <span className="odm-label">Country</span>
                                            <span className="odm-value">{selectedOrder.ShippingAddress.country || 'India'}</span>
                                        </div>
                                        <div className="odm-field">
                                            <span className="odm-label">Phone</span>
                                            <span className="odm-value">{selectedOrder.ShippingAddress.phone}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Row 2: Order Info ── */}
                        <div className="odm-card">
                            <div className="odm-card-title">
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                                Order Information
                            </div>
                            <div className="odm-info-grid">
                                <div className="odm-field">
                                    <span className="odm-label">Order Date</span>
                                    <span className="odm-value">{formatDate(selectedOrder.createdAt)}</span>
                                </div>
                                <div className="odm-field">
                                    <span className="odm-label">Payment Type</span>
                                    <span className={`odm-pay-badge${selectedOrder.payment_type?.toLowerCase() === 'cod' ? ' cod' : ' prepaid'}`}>
                                        {formatPaymentType(selectedOrder.payment_type)}
                                    </span>
                                </div>
                                <div className="odm-field">
                                    <span className="odm-label">Payment Status</span>
                                    <span className={`status-badge status-${getPaymentStatusClass(selectedOrder)}`}>{getPaymentStatusDisplay(selectedOrder)}</span>
                                </div>
                                <div className="odm-field">
                                    <span className="odm-label">Order Status</span>
                                    <span className={`status-badge status-${getStatusClassName(selectedOrder.status)}`}>{getStatusDisplayText(selectedOrder.status)}</span>
                                </div>
                                {selectedOrder.coupon_code && (
                                    <div className="odm-field">
                                        <span className="odm-label">Coupon</span>
                                        <span className="odm-value odm-mono">{selectedOrder.coupon_code}</span>
                                    </div>
                                )}
                                {selectedOrder.notes && (
                                    <div className="odm-field odm-field-full">
                                        <span className="odm-label">Order Notes</span>
                                        <span className="odm-value">{selectedOrder.notes}</span>
                                    </div>
                                )}
                            </div>

                            {/* Shipping tracking block — provider-aware */}
                            {(() => {
                                const s = selectedOrder.Shipment || {};
                                const providerKey = s.provider || (selectedOrder.fship_order_id || selectedOrder.fship_waybill ? 'ithink' : null);
                                const providerLabel = providerKey ? 'iThink Logistics' : null;
                                const providerOrderId = s.provider_order_id || selectedOrder.fship_order_id;
                                const waybill = s.waybill || selectedOrder.fship_waybill;
                                const routeCode = s.route_code || selectedOrder.fship_route_code;
                                const trackingNo = s.tracking_number || selectedOrder.tracking_number;
                                const courier = s.courier_name || selectedOrder.courier_name;
                                const labelUrl = s.label_url || selectedOrder.fship_label_url;
                                const syncErr = s.sync_error || selectedOrder.fship_sync_error;
                                const showBlock = providerOrderId || waybill || trackingNo;
                                return (
                                    <>
                                        {showBlock && (
                                            <div className="odm-fship">
                                                <div className="odm-fship-title">
                                                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 4v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                                                    {providerLabel ? `${providerLabel} Tracking` : 'Shipping Tracking'}
                                                </div>
                                                <div className="odm-info-grid">
                                                    {providerLabel && <div className="odm-field"><span className="odm-label">Provider</span><span className="odm-value">{providerLabel}</span></div>}
                                                    {providerOrderId && <div className="odm-field"><span className="odm-label">Provider Order ID</span><span className="odm-value odm-mono">{providerOrderId}</span></div>}
                                                    {waybill && <div className="odm-field"><span className="odm-label">AWB Number</span><span className="odm-value odm-mono">{waybill}</span></div>}
                                                    {routeCode && <div className="odm-field"><span className="odm-label">Route Code</span><span className="odm-value odm-mono">{routeCode}</span></div>}
                                                    {trackingNo && trackingNo !== waybill && <div className="odm-field"><span className="odm-label">Tracking No.</span><span className="odm-value odm-mono">{trackingNo}</span></div>}
                                                    {courier && <div className="odm-field"><span className="odm-label">Courier</span><span className="odm-value">{courier}</span></div>}
                                                    {labelUrl && (
                                                        <div className="odm-field">
                                                            <span className="odm-label">Shipping Label</span>
                                                            <a href={labelUrl} target="_blank" rel="noopener noreferrer" className="odm-label-link">
                                                                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                                Download PDF
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {syncErr && typeof syncErr === 'string' && (
                                            <div className="odm-sync-error">
                                                <div className="odm-sync-error-title">
                                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01M10.29 3.86l-8.6 14.86A1 1 0 002.56 20h18.88a1 1 0 00.87-1.28l-8.6-14.86a1 1 0 00-1.72 0z"/></svg>
                                                    {providerLabel ? `${providerLabel} Sync Issues` : 'Sync Issues'}
                                                </div>
                                                <ul className="odm-sync-error-list">
                                                    {syncErr.split('; ').map((issue, i) => (
                                                        <li key={i}>{issue}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        {/* ── Products Ordered — card rows, no scroll ── */}
                        <div className="odm-card">
                            <div className="odm-card-title">
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                                Products Ordered
                                <span className="odm-count">{selectedOrder.OrderItems?.length}</span>
                            </div>
                            <div className="odm-items">
                                {(selectedOrder.OrderItems || []).length === 0 && (
                                    <div style={{ padding: 16, color: '#6b7280', fontSize: 13, textAlign: 'center' }}>
                                        No items recorded for this order.
                                    </div>
                                )}
                                {(selectedOrder.OrderItems || []).map(item => {
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
                                    const attrs = item.ProductVariation?.attributes ? getAttributeComponents(item.ProductVariation.attributes) : [];
                                    return (
                                        <div key={item.id} className="odm-item">
                                            <div className="odm-item-img">
                                                <SafeImage imageData={{ image_url: imageUrl }} alt={item.Product?.name || 'Product'} />
                                            </div>
                                            <div className="odm-item-info">
                                                <div className="odm-item-name">{item.Product?.name || 'N/A'}</div>
                                                {attrs.length > 0 && (
                                                    <div className="odm-item-attrs">
                                                        {attrs.map(({ key, value }) => (
                                                            <span key={key} className="odm-attr-chip">{key}: {value}</span>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="odm-item-sku">SKU: {sku}</div>
                                            </div>
                                            <div className="odm-item-meta">
                                                <div className="odm-item-qty">×{item.quantity}</div>
                                                <div className="odm-item-price">{formatCurrency(item.price)}</div>
                                                <div className="odm-item-subtotal">{formatCurrency(item.subtotal)}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Order Summary ── */}
                        <div className="odm-summary">
                            <div className="odm-summary-row">
                                <span>Subtotal</span>
                                <span>{formatCurrency(calculateOrderSubtotal(selectedOrder.OrderItems))}</span>
                            </div>
                            <div className="odm-summary-row">
                                <span>Shipping Fee</span>
                                <span>{formatCurrency(selectedOrder.shipping_fee || 0)}</span>
                            </div>
                            {selectedOrder.discount_amount > 0 && (
                                <div className="odm-summary-row odm-discount">
                                    <span>Discount</span>
                                    <span>− {formatCurrency(selectedOrder.discount_amount)}</span>
                                </div>
                            )}
                            <div className="odm-summary-row odm-total">
                                <span>Total Amount</span>
                                <span>{formatCurrency(getOrderTotal(selectedOrder))}</span>
                            </div>
                        </div>

                        {/* Manifest Section */}
                        {(selectedOrder.Shipment?.waybill || selectedOrder.fship_waybill) && (
                            <div className="odm-card" style={{ backgroundColor: '#fafafa', borderLeft: '4px solid #FF9800' }}>
                                <div className="odm-card-title" style={{ color: '#FF9800' }}>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                        <polyline points="14 2 14 8 20 8"/>
                                    </svg>
                                    Manifest & Download
                                </div>
                                <div style={{ padding: '12px 0' }}>
                                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#666' }}>
                                        Download shipping manifest or label for this order.
                                    </p>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <Button
                                            variant="primary"
                                            onClick={() => generateLabelForOrder(selectedOrder.id)}
                                            disabled={generatingLabel.has(selectedOrder.id)}
                                            style={{ flex: 1, fontSize: '12px' }}
                                        >
                                            {generatingLabel.has(selectedOrder.id) ? 'Downloading...' : '📥 Download Label'}
                                        </Button>
                                        {selectedOrder.fship_label_url && (
                                            <a
                                                href={selectedOrder.fship_label_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    padding: '8px 16px',
                                                    backgroundColor: '#2196F3',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    textDecoration: 'none',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    flex: 1,
                                                    textAlign: 'center'
                                                }}
                                            >
                                                🏷️ Download Label
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

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
