import React, { useState, useEffect, useCallback, useRef } from 'react';
import { orderService, dashboardService, brandService } from '../../../services';
import { Table, Pagination, Modal, Button, Select, DateRangePicker } from "../../../components/ui";
import SafeImage from "../../../components/common/SafeImage";
import Loader from "../../../components/common/Loader";
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
    const [statsStartDate, setStatsStartDate] = useState('');
    const [statsEndDate, setStatsEndDate] = useState('');
    const [refreshingStatus, setRefreshingStatus] = useState(false);
    const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
    const [brandFilter, setBrandFilter] = useState('all');
    const [brands, setBrands] = useState([]);
    const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
    const [courierModalOrder, setCourierModalOrder] = useState(null);
    const [availableCouriers, setAvailableCouriers] = useState([]);
    const [loadingCouriers, setLoadingCouriers] = useState(false);
    const [selectedCourier, setSelectedCourier] = useState(null);
    const [syncingWithCourier, setSyncingWithCourier] = useState(false);
    const [generatingManifest, setGeneratingManifest] = useState(new Set());

    // Debounced search value — auto-cancels previous timer on every keystroke
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(filterValue.trim()), 400);
        return () => clearTimeout(t);
    }, [filterValue]);

    // Drop stale responses when user types fast / changes filters quickly
    const requestIdRef = useRef(0);

    const fetchOrders = useCallback(async (page = currentPage) => {
        const reqId = ++requestIdRef.current;
        setLoading(true);
        setError(null);
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
            const data = await orderService.getAllOrders(params);
            // Ignore if a newer request has been issued
            if (reqId !== requestIdRef.current) return;
            setOrders(data.orders || data.data || []);
            const totalOrdersCount = data.total || 0;
            setTotalPages(Math.ceil(totalOrdersCount / itemsPerPage));
            setTotalOrders(totalOrdersCount);
        } catch (err) {
            if (reqId !== requestIdRef.current) return;
            setError(err.message || 'Failed to fetch orders');
        } finally {
            if (reqId === requestIdRef.current) setLoading(false);
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

    const syncOrders = async () => {
        if (syncingAll || syncingOrders.size > 0) { showError('syncInProgress'); return; }
        setSyncingAll(true);
        try {
            const result = await orderService.syncOrdersWithFShip();
            const data = result.data || result.results || {};
            const providerLabel = result.provider === 'ithink' ? 'iThink' : (result.provider === 'fship' ? 'FShip' : 'Shipping');
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
            const result = await orderService.updateSingleOrderFromFShip(orderId);
            if (result.success) {
                let message = result.message;
                if (result.update_result?.updated) {
                    if (result.update_result.status_changed) message += ` Status: ${result.update_result.old_status} → ${result.update_result.new_status}`;
                    if (result.update_result.tracking_updated) message += ` Tracking updated.`;
                }
                showSuccess('orderSynced', message);
                fetchOrders(); fetchAllOrdersForStats();
            } else { showError('syncFailed', result.message || 'Failed to update order'); }
        } catch (error) { showError('syncFailed', error.message || error.error || 'Failed to update order from shipping provider'); }
    };

    const openCourierSelection = async (orderId, orderNumber) => {
        if (syncingOrders.has(orderId) || syncingAll) { showError('syncInProgress'); return; }
        setCourierModalOrder({ id: orderId, order_number: orderNumber });
        setIsCourierModalOpen(true);
        setLoadingCouriers(true);
        setSelectedCourier(null);
        try {
            const response = await orderService.getAvailableCouriers(orderId);
            if (response.success) {
                setAvailableCouriers(response.couriers || []);
                if (response.couriers?.length === 0) {
                    showError('noCouriers', 'No available couriers for this order');
                    setIsCourierModalOpen(false);
                }
            } else {
                showError('fetchCouriersFailed', response.message || 'Failed to fetch available couriers');
                setIsCourierModalOpen(false);
            }
        } catch (error) {
            showError('fetchCouriersFailed', error.message || 'Failed to fetch couriers');
            setIsCourierModalOpen(false);
        } finally {
            setLoadingCouriers(false);
        }
    };

    const syncWithSelectedCourier = async () => {
        if (!courierModalOrder || !selectedCourier) { showError('noSelection', 'Please select a courier'); return; }
        setSyncingWithCourier(true);
        try {
            // Use the pre-extracted logistics value
            let logisticsName = selectedCourier._logisticsValue || '';

            // Convert to lowercase for iThink API
            logisticsName = logisticsName.toLowerCase().trim();

            if (!logisticsName) {
                showError('noCourierName', 'Unable to extract courier name. Please try again.');
                return;
            }

            const result = await orderService.syncOrderWithCourier(courierModalOrder.id, {
                logistics: logisticsName,
                s_type: selectedCourier.service_type || selectedCourier.s_type || ''
            });
            if (result.success) {
                const providerLabel = result.data?.provider === 'ithink' ? 'iThink' : 'FShip';
                const awb = result.data?.order?.waybill || 'Generated';
                const displayName = selectedCourier._displayName || 'Selected Courier';
                const manifestUrl = result.data?.manifest?.pdfUrl;

                showSuccess('orderSynced', `Order ${courierModalOrder.order_number} synced with ${displayName}! AWB: ${awb}`);

                // Auto-download manifest PDF if available
                if (manifestUrl) {
                    setTimeout(() => {
                        try {
                            window.open(manifestUrl, '_blank');
                        } catch (e) {
                            console.log('Could not open manifest URL:', e.message);
                        }
                    }, 500);
                }

                setIsCourierModalOpen(false);
                setCourierModalOrder(null);
                setAvailableCouriers([]);
                setSelectedCourier(null);
                fetchOrders(); fetchAllOrdersForStats();
            } else {
                showError('syncFailed', result.message || 'Failed to sync order with courier');
            }
        } catch (error) {
            showError('syncFailed', error.message || 'Failed to sync order with courier');
        } finally {
            setSyncingWithCourier(false);
        }
    };

    const generateManifestForOrder = async (orderId) => {
        if (!orderId) return;
        if (generatingManifest.has(orderId)) return;
        try {
            setGeneratingManifest(prev => new Set(prev).add(orderId));
            const result = await orderService.generateManifest([orderId]);
            if (result.success) {
                showSuccess('manifestGenerated', `Manifest generated for order! Waybills: ${result.data.waybills.join(', ')}`);
                // You can store manifest info or download it if URL available
                if (result.data.pdfUrl) {
                    // window.open(result.data.pdfUrl, '_blank');
                }
            } else {
                showError('manifestFailed', result.message || 'Failed to generate manifest');
            }
        } catch (error) {
            showError('manifestFailed', error.message || 'Failed to generate manifest');
        } finally {
            setGeneratingManifest(prev => {
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
                const providerLabel = result.data?.provider === 'ithink' ? 'iThink' : (result.data?.provider === 'fship' ? 'FShip' : 'shipping');
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

    const confirmOrder = async (orderId, orderNumber) => {
        setConfirmPrompt({ orderId, orderNumber });
    };

    const handleConfirmOrder = async () => {
        const { orderId, orderNumber } = confirmPrompt;
        setConfirmPrompt(null);
        try {
            const result = await orderService.confirmOrder(orderId);
            if (result.success) {
                showSuccess('orderConfirmed', `Order ${orderNumber} confirmed`);

                // For iThink orders, automatically open courier selection
                // Check if order has been synced yet
                const orderData = orders.find(o => o.id === orderId);
                if (orderData && !orderData.Shipment?.waybill && !orderData.fship_waybill) {
                    // Order not synced yet — try to open courier selection for iThink
                    try {
                        openCourierSelection(orderId, orderNumber);
                    } catch (e) {
                        // If courier selection fails, just proceed
                        fetchOrders();
                    }
                } else {
                    fetchOrders();
                }
            }
            else { showError('saveFailed', result.message || 'Failed to confirm order'); }
        } catch (error) { showError('saveFailed', error.message || 'Failed to confirm order'); }
    };

    const handleCancelConfirm = async (reason) => {
        const { orderId, orderNumber } = cancelPrompt;
        setCancelPrompt(null);
        try {
            const result = await orderService.adminCancelOrder(orderId, reason);
            if (result.success) { showSuccess('orderCancelled', `Order ${orderNumber} cancelled successfully`); fetchOrders(); fetchAllOrdersForStats(); }
            else { showError('saveFailed', result.message || 'Failed to cancel order'); }
        } catch (error) { showError('saveFailed', error.message || error.error || 'Failed to cancel order'); }
    };

    const handleAwbUpdate = (orderId, currentAwb, currentCourier) => {
        setAwbOrderId(orderId); setAwbNumber(currentAwb || ''); setCourierName(currentCourier || ''); setIsAwbModalOpen(true);
    };

    const submitAwbUpdate = async () => {
        if (!awbNumber.trim()) { showError('fieldRequired', 'Please enter AWB number'); return; }
        try {
            await orderService.updateAwbNumber(awbOrderId, { awbNumber: awbNumber.trim(), courierName: courierName.trim() || 'Manual Entry' });
            showSuccess('awbUpdated', 'AWB number updated successfully!');
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

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        return <span className="date-time-cell"><span className="date-part">{date}</span><span className="time-part">{time}</span></span>;
    };
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
        if (['credit_card','debit_card','upi','wallet','razorpay'].includes(type)) return 'Pre-paid';
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
        { header: "Sr. No", accessor: "serial_number", width: "60px" },
        { header: "Order ID", accessor: "order_number", width: "130px" },
        {
            header: "Customer",
            cell: (row) => (
                <div className="customer-info">
                    <div className="customer-name">
                        {row.User?.username || row.ShippingAddress?.full_name || 'N/A'}
                    </div>
                    <div className="customer-email">
                        {row.User?.email || ''}
                    </div>
                    {row.rto_risk_level && (
                        <span className={`rto-badge rto-${row.rto_risk_level.toLowerCase()}`}>
                            <span className="rto-indicator">{row.rto_risk_level === 'HIGH' ? '🔴' : row.rto_risk_level === 'MEDIUM' ? '🟡' : '🟢'}</span>
                            <span className="rto-level">{row.rto_risk_level}</span>
                            {row.rto_risk_score != null && <span className="rto-score">{row.rto_risk_score}</span>}
                        </span>
                    )}
                </div>
            )
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
        { header: "Payment Type", cell: (row) => formatPaymentType(row.payment_type), width: "100px" },
        { header: "Payment Status", cell: (row) => <span className={`status-badge status-${getPaymentStatusClass(row)}`}>{getPaymentStatusDisplay(row)}</span>, width: "120px" },
        { header: "Total", cell: (row) => formatCurrency(getOrderTotal(row)), width: "90px" },
        { header: "Order Status", cell: (row) => <span className={`status-badge status-${getStatusClassName(row.status)}`}>{getStatusDisplayText(row.status)}</span>, width: "160px" },
        {
            header: "Shipping Sync",
            cell: (row) => {
                // Prefer the shipment row (new source of truth) and fall back to legacy fship_* columns
                const s = row.Shipment || {};
                const providerName = (s.provider || (row.fship_order_id || row.fship_waybill ? 'fship' : null));
                const providerLabel = providerName === 'ithink' ? 'iThink' : providerName === 'fship' ? 'FShip' : null;
                const waybill = s.waybill || row.fship_waybill;
                const courier = s.courier_name || row.courier_name;
                const syncError = s.sync_error || row.fship_sync_error;
                const isSynced = (s.sync_status === 'synced') || row.fship_order_id || row.fship_waybill;

                if (isSynced) {
                    return (
                        <span className="sync-tag sync-tag--synced">
                            <span className="sync-tag-dot" />
                            <span className="sync-tag-text">
                                Synced{providerLabel ? ` · ${providerLabel}` : ''}
                                {waybill && <small className="sync-tag-awb">AWB: {waybill}</small>}
                                {courier && <small className="sync-tag-courier">{courier}</small>}
                            </span>
                        </span>
                    );
                }
                if (syncError) {
                    return (
                        <span className="sync-tag sync-tag--error" title={syncError}>
                            <span className="sync-tag-dot" />
                            <span className="sync-tag-text">
                                Sync Failed{providerLabel ? ` · ${providerLabel}` : ''}
                                <small className="sync-tag-error">{syncError.length > 40 ? syncError.slice(0, 40) + '…' : syncError}</small>
                            </span>
                        </span>
                    );
                }
                return (
                    <span className="sync-tag sync-tag--unsynced">
                        <span className="sync-tag-dot" />
                        Not Synced
                    </span>
                );
            }
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
                            title={isFinal ? `Order is ${row.status}` : ((row.Shipment?.waybill || row.fship_order_id || row.fship_waybill) ? 'Re-sync shipping' : 'Sync shipping')}
                            onClick={() => openCourierSelection(row.id, row.order_number)}
                            disabled={isSyncing || isFinal}>
                            {isSyncing ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            ) : isFinal ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            )}
                        </button>
                        {(row.Shipment?.waybill || row.fship_waybill) && (
                            <button className="order-action-btn order-update-btn" title="Refresh tracking from shipping provider" onClick={() => updateSingleOrder(row.id)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
                            </button>
                        )}
                        <button className="order-action-btn order-awb-btn" title="Update AWB Number" onClick={() => handleAwbUpdate(row.id, row.Shipment?.waybill || row.fship_waybill, row.Shipment?.courier_name || row.courier_name)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        {(row.Shipment?.waybill || row.fship_waybill) && (
                            <button className={`order-action-btn order-manifest-btn${generatingManifest.has(row.id) ? ' disabled' : ''}`}
                                title="Generate Manifest" onClick={() => generateManifestForOrder(row.id)}
                                disabled={generatingManifest.has(row.id)}>
                                {generatingManifest.has(row.id) ? (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                                )}
                            </button>
                        )}
                        {(['awaiting_confirmation', 'pending'].includes(row.status)) && (
                            <button className="order-action-btn order-confirm-btn" title="Confirm Order" onClick={() => confirmOrder(row.id, row.order_number)}
                                style={{ background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' }}>
                                ✓
                            </button>
                        )}
                        {row.payment_type?.toLowerCase() === 'cod' && (row.status === 'pending' || row.status === 'awaiting_confirmation') && (
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
            <div className="dashboard-page">
                <div className="orders-header-container">
                    {/* ── Top Bar: Title + Search + Actions ── */}
                    <div className="ord-topbar">
                        <div className="ord-topbar-left">
                            <h1 className="ord-title">Orders</h1>
                            <span className="ord-subtitle">{totalOrders} order{totalOrders !== 1 ? 's' : ''} total</span>
                        </div>
                        <div className="ord-topbar-right">
                            <div className="sl-search-wrap">
                                <span className="sl-search-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                </span>
                                <input type="text" className="sl-search-input" placeholder="Search orders, customers, AWB..."
                                    value={filterValue} onChange={handleSearchChange} />
                            </div>
                            <button className={`order-sync-main-btn${syncingAll || loading ? ' syncing' : ''}`}
                                onClick={syncOrders} disabled={loading || syncingAll || syncingOrders.size > 0}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={syncingAll ? 'animate-spin' : ''}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                {syncingAll ? 'Syncing...' : 'Sync Orders'}
                            </button>
                            <button className={`order-sync-main-btn${refreshingStatus ? ' syncing' : ''}`}
                                onClick={refreshOrderStatuses} disabled={loading || refreshingStatus}
                                style={{ borderColor: '#2563eb', color: '#2563eb' }}
                                onMouseEnter={e => { if (!refreshingStatus) { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.color = '#fff'; } }}
                                onMouseLeave={e => { if (!refreshingStatus) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#2563eb'; } }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={refreshingStatus ? 'animate-spin' : ''}><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
                                {refreshingStatus ? 'Refreshing...' : 'Refresh Status'}
                            </button>
                            <button className="order-sync-main-btn"
                                onClick={() => setIsManualOrderOpen(true)}
                                style={{ borderColor: '#16a34a', color: '#16a34a' }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#16a34a'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#16a34a'; }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                Manual Order
                            </button>
                        </div>
                    </div>

                    {/* ── KPI Strip ── */}
                    <div className="ord-kpi-strip">
                        <div className="ord-kpi" style={{ borderLeftColor: '#180D3E' }}>
                            <span className="ord-kpi-label">Total</span>
                            <span className="ord-kpi-val">{allOrdersStats.total}</span>
                        </div>
                        <div className="ord-kpi" style={{ borderLeftColor: '#059669' }}>
                            <span className="ord-kpi-label">Revenue</span>
                            <span className="ord-kpi-val" style={{ color: '#059669' }}>₹{parseFloat(allOrdersStats.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
                        </div>
                        <div className="ord-kpi" style={{ borderLeftColor: '#10b981' }}>
                            <span className="ord-kpi-label">Prepaid</span>
                            <span className="ord-kpi-val">{allOrdersStats.prepaid}</span>
                        </div>
                        <div className="ord-kpi" style={{ borderLeftColor: '#f59e0b' }}>
                            <span className="ord-kpi-label">COD</span>
                            <span className="ord-kpi-val">{allOrdersStats.cod}</span>
                        </div>
                        <div className="ord-kpi" style={{ borderLeftColor: '#10b981' }}>
                            <span className="ord-kpi-label">Delivered</span>
                            <span className="ord-kpi-val">{allOrdersStats.deliveredOrders}</span>
                        </div>
                        <div className="ord-kpi" style={{ borderLeftColor: '#ef4444' }}>
                            <span className="ord-kpi-label">Cancelled</span>
                            <span className="ord-kpi-val">{allOrdersStats.cancelledOrders}</span>
                        </div>
                        <div className="ord-kpi" style={{ borderLeftColor: '#10b981' }}>
                            <span className="ord-kpi-label">Paid</span>
                            <span className="ord-kpi-val">{allOrdersStats.paymentStatusPaid}</span>
                        </div>
                        <div className="ord-kpi" style={{ borderLeftColor: '#7c3aed' }}>
                            <span className="ord-kpi-label">Avg Order</span>
                            <span className="ord-kpi-val">₹{parseFloat(allOrdersStats.averageOrderValue || 0).toFixed(0)}</span>
                        </div>
                    </div>

                    {/* ── Date Filter (filters both KPI stats AND the orders list below) ── */}
                    <DateRangePicker
                        label="Date Range"
                        startDate={statsStartDate}
                        endDate={statsEndDate}
                        onStartChange={setStatsStartDate}
                        onEndChange={setStatsEndDate}
                        onClear={() => { setStatsStartDate(''); setStatsEndDate(''); }}
                        inline
                    />

                    {/* ── Analytics Charts (2-col on desktop) ── */}
                    <div className="orders-analytics">
                        <PaymentChart allOrdersStats={allOrdersStats} />
                        <PaymentStatusChart allOrdersStats={allOrdersStats} />
                        <ShippingChart orders={allOrdersData} allOrdersStats={allOrdersStats} />
                    </div>

                    {/* ── Filters + Sort (compact bar) ── */}
                    <div className="orders-filters-section">
                        <div className="orders-filter-wrap">
                            <Select
                                value={statusFilter}
                                onChange={(v) => setStatusFilter(v || 'all')}
                                options={[
                                    { value: 'all', label: 'All Order Status' },
                                    { value: 'pending', label: 'Pending' },
                                    { value: 'processing', label: 'Processing' },
                                    { value: 'booked', label: 'Booked' },
                                    { value: 'pickup initiated', label: 'Pickup Initiated' },
                                    { value: 'manifested', label: 'Manifested' },
                                    { value: 'in transit', label: 'In Transit' },
                                    { value: 'shipped', label: 'Shipped' },
                                    { value: 'out for delivery', label: 'Out for Delivery' },
                                    { value: 'delivered', label: 'Delivered' },
                                    { value: 'undelivered', label: 'Undelivered' },
                                    { value: 'rto', label: 'RTO' },
                                    { value: 'rto delivered', label: 'RTO Delivered' },
                                    { value: 'cancelled', label: 'Cancelled' },
                                    { value: 'order cancelled', label: 'Order Cancelled' },
                                    { value: 'exception', label: 'Exception' },
                                ]}
                                placeholder="All Order Status"
                            />
                        </div>
                        <div className="orders-filter-wrap">
                            <Select
                                value={paymentTypeFilter}
                                onChange={(v) => setPaymentTypeFilter(v || 'all')}
                                options={[
                                    { value: 'all', label: 'All Payment Types' },
                                    { value: 'prepaid', label: 'Prepaid' },
                                    { value: 'cod', label: 'Cash on Delivery' },
                                ]}
                                placeholder="All Payment Types"
                            />
                        </div>
                        <div className="orders-filter-wrap">
                            <Select
                                value={paymentStatusFilter}
                                onChange={(v) => setPaymentStatusFilter(v || 'all')}
                                options={[
                                    { value: 'all', label: 'All Payment Status' },
                                    { value: 'pending', label: 'Pending' },
                                    { value: 'paid', label: 'Paid' },
                                    { value: 'failed', label: 'Failed' },
                                    { value: 'refunded', label: 'Refunded' },
                                    { value: 'refund_pending', label: 'Refund Pending' },
                                    { value: 'cancelled', label: 'Cancelled' },
                                ]}
                                placeholder="All Payment Status"
                            />
                        </div>
                        <div className="orders-filter-wrap">
                            <Select
                                value={brandFilter}
                                onChange={(v) => setBrandFilter(v || 'all')}
                                options={[
                                    { value: 'all', label: 'All Brands' },
                                    ...brands.map(b => ({ value: String(b.id), label: b.display_name || b.name }))
                                ]}
                                placeholder="All Brands"
                            />
                        </div>
                        <div className="orders-filter-divider" />
                        <div className="orders-filter-wrap">
                            <Select
                                value={sortBy}
                                onChange={(v) => setSortBy(v || 'createdAt')}
                                options={[
                                    { value: 'createdAt', label: 'Sort: Date' },
                                    { value: 'total', label: 'Sort: Total' },
                                    { value: 'status', label: 'Sort: Status' },
                                    { value: 'payment_status', label: 'Sort: Payment' },
                                ]}
                            />
                        </div>
                        <div className="orders-filter-wrap">
                            <Select
                                value={sortOrder}
                                onChange={(v) => setSortOrder(v || 'desc')}
                                options={[
                                    { value: 'desc', label: 'Newest First' },
                                    { value: 'asc', label: 'Oldest First' },
                                ]}
                            />
                        </div>
                        <div className="orders-filter-wrap">
                            <Select
                                value={String(itemsPerPage)}
                                onChange={(v) => { setItemsPerPage(Number(v || 10)); setCurrentPage(1); }}
                                options={[
                                    { value: '10', label: 'Show: 10' },
                                    { value: '25', label: 'Show: 25' },
                                    { value: '50', label: 'Show: 50' },
                                    { value: '100', label: 'Show: 100' },
                                ]}
                            />
                        </div>
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

                    {/* ── Export (compact) ── */}
                    <div className="orders-export-section">
                        <div className="orders-export-left">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Export Delivered</span>
                        </div>
                        <DateRangePicker
                            label=""
                            showIcon={false}
                            inline
                            startDate={exportStartDate}
                            endDate={exportEndDate}
                            onStartChange={setExportStartDate}
                            onEndChange={setExportEndDate}
                        />
                        <button onClick={handleExportDeliveredOrders}
                            disabled={isExporting || !exportStartDate || !exportEndDate}
                            className={`sl-add-btn${isExporting || !exportStartDate || !exportEndDate ? ' sl-add-btn--disabled' : ''}`}>
                            <span className="sl-add-btn-icon">
                                {isExporting
                                    ? <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="animate-spin"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    : <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                }
                            </span>
                            {isExporting ? 'Exporting...' : 'Export'}
                        </button>
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
                                            {selectedOrder.User?.username || (selectedOrder.GuestUser ? `${selectedOrder.GuestUser.firstName} ${selectedOrder.GuestUser.lastName}` : selectedOrder.ShippingAddress?.full_name || 'N/A')}
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
                                const providerKey = s.provider || (selectedOrder.fship_order_id || selectedOrder.fship_waybill ? 'fship' : null);
                                const providerLabel = providerKey === 'ithink' ? 'iThink Logistics' : providerKey === 'fship' ? 'FShip' : null;
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

                                        {syncErr && (
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
                                            onClick={() => generateManifestForOrder(selectedOrder.id)}
                                            disabled={generatingManifest}
                                            style={{ flex: 1, fontSize: '12px' }}
                                        >
                                            {generatingManifest ? 'Generating...' : '📄 Generate Manifest'}
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

            {/* Courier Selection Modal */}
            <Modal isOpen={isCourierModalOpen}
                onClose={() => { setIsCourierModalOpen(false); setCourierModalOrder(null); setAvailableCouriers([]); setSelectedCourier(null); }}
                title={`Select Courier for Order #${courierModalOrder?.order_number}`}>
                <div className="courier-modal-body" style={{ minWidth: '500px' }}>
                    {loadingCouriers ? (
                        <div className="courier-loading" style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <Loader />
                            <p style={{ marginTop: '12px', color: '#666' }}>Fetching available couriers...</p>
                        </div>
                    ) : availableCouriers.length > 0 ? (
                        <>
                            <div className="courier-list" style={{ marginBottom: '20px' }}>
                                {availableCouriers.map((courier, idx) => {
                                    // Extract courier name and logistics field from various possible fields
                                    let courierName = '';
                                    let logisticsValue = '';

                                    if (courier.logistics) {
                                        logisticsValue = courier.logistics;
                                        courierName = courier.logistics.charAt(0).toUpperCase() + courier.logistics.slice(1);
                                    } else if (courier.name) {
                                        logisticsValue = courier.name;
                                        courierName = courier.name;
                                    } else if (courier.courier_name) {
                                        logisticsValue = courier.courier_name;
                                        courierName = courier.courier_name;
                                    } else if (courier.logistic_name) {
                                        logisticsValue = courier.logistic_name;
                                        courierName = courier.logistic_name;
                                    } else if (courier.provider) {
                                        logisticsValue = courier.provider;
                                        courierName = courier.provider.charAt(0).toUpperCase() + courier.provider.slice(1);
                                    } else {
                                        logisticsValue = `courier_${idx}`;
                                        courierName = `Courier ${idx + 1}`;
                                    }

                                    // Extract rate
                                    let rate = 'N/A';
                                    if (courier.rate !== undefined && courier.rate !== null) rate = parseFloat(courier.rate);
                                    else if (courier.cost !== undefined && courier.cost !== null) rate = parseFloat(courier.cost);
                                    else if (courier.price !== undefined && courier.price !== null) rate = parseFloat(courier.price);
                                    else if (courier.charges !== undefined && courier.charges !== null) rate = parseFloat(courier.charges);

                                    // Extract ETA
                                    let eta = 'N/A';
                                    if (courier.eta !== undefined && courier.eta !== null) eta = courier.eta;
                                    else if (courier.days !== undefined && courier.days !== null) eta = courier.days;
                                    else if (courier.delivery_days !== undefined && courier.delivery_days !== null) eta = courier.delivery_days;
                                    else if (courier.service_type) eta = courier.service_type;
                                    else if (courier.tat) eta = courier.tat;

                                    // Check if selected - use index as unique identifier
                                    const isSelected = selectedCourier && selectedCourier._courierIndex === idx;

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedCourier({
                                                ...courier,
                                                _courierIndex: idx,
                                                _logisticsValue: logisticsValue,
                                                _displayName: courierName
                                            })}
                                            style={{
                                                padding: '16px',
                                                border: isSelected ? '2px solid #4CAF50' : '1px solid #e0e0e0',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                marginBottom: '12px',
                                                backgroundColor: isSelected ? '#f1f8f4' : '#fafafa',
                                                transition: 'all 0.2s ease',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '16px'
                                            }}
                                        >
                                            {/* Radio Button */}
                                            <div style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                border: isSelected ? '2px solid #4CAF50' : '2px solid #ccc',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                backgroundColor: isSelected ? '#4CAF50' : 'transparent'
                                            }}>
                                                {isSelected && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>✓</span>}
                                            </div>

                                            {/* Courier Details */}
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '600', color: '#222' }}>
                                                    {courierName}
                                                </h4>
                                                <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                                                    <div>
                                                        <span style={{ color: '#666' }}>Rate: </span>
                                                        <span style={{ fontWeight: '600', color: '#2196F3' }}>
                                                            ₹{typeof rate === 'number' ? rate.toFixed(2) : rate}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span style={{ color: '#666' }}>TAT: </span>
                                                        <span style={{ fontWeight: '600', color: '#FF9800' }}>
                                                            {typeof eta === 'number' ? `${eta} days` : eta}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p style={{ marginTop: '12px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
                                Select a courier to proceed
                            </p>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <p style={{ color: '#f44336', fontWeight: '500', fontSize: '14px' }}>
                                No couriers available for this order
                            </p>
                            <p style={{ color: '#999', fontSize: '12px', margin: '8px 0 0 0' }}>
                                Please verify the order details and try again
                            </p>
                        </div>
                    )}
                    <div className="modal-footer" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setIsCourierModalOpen(false);
                                setCourierModalOrder(null);
                                setAvailableCouriers([]);
                                setSelectedCourier(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            disabled={!selectedCourier || syncingWithCourier}
                            onClick={syncWithSelectedCourier}
                        >
                            {syncingWithCourier ? (
                                <>
                                    <span style={{ marginRight: '8px' }}>⏳</span>
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <span style={{ marginRight: '8px' }}>✓</span>
                                    Sync with {selectedCourier ? (selectedCourier.logistics || selectedCourier.name || 'Selected Courier') : 'Selected Courier'}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default Orders;
