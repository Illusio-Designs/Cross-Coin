import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { orderService, brandService, trafficReportService } from '../../../services';
import { Table, Pagination, Modal, Button, Select, DateRangePicker } from "../../../components/ui";
import PickupScheduleModal from "../../../components/orders/PickupScheduleModal";
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
import OrderStory from '../../../components/orders/OrderStory';
import Returns from '../returns/returns';
import FailedDeliveries from '../ndr/ndr';
import { PageHeader, StatGrid, StatTile, ResponsiveTable } from '../../../components/Dashboard/primitives';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    ViewIcon, Tick02Icon, RefreshIcon, Location01Icon, File01Icon,
    Cancel01Icon, Delete02Icon, Search01Icon, FilterIcon, Download04Icon, Calendar03Icon,
    Package01Icon, UserIcon, PencilEdit02Icon, Calendar01Icon,
    DeliveryTruck01Icon, Alert02Icon, LinkSquare02Icon, WhatsappIcon
} from '@hugeicons/core-free-icons';

// Compact row overflow menu ("⋯ more"). Rendered through a portal so it isn't
// clipped by the table's horizontal-scroll container. Keeps the actions column
// narrow: only View + the one relevant action stay inline; the rest live here.
// Order Desk tabs = the backend pipeline's work queues (GET /api/orders?stage=).
// 'problems' and 'returns' render the Failed Deliveries / Returns views inline.
const DESK_TABS = [
    { v: 'to_confirm',    l: 'To confirm',        count: 'to_confirm' },
    { v: 'to_ship',       l: 'To ship',           count: 'to_ship' },
    { v: 'in_transit',    l: 'In transit',        count: 'in_transit' },
    { v: 'problems',      l: 'Delivery problems', count: 'ndr_open' },
    { v: 'returns',       l: 'Returns',           count: 'returns_open' },
    { v: 'refund_due',    l: 'Refunds due',       count: 'refund_due' },
    { v: 'delivered',     l: 'Delivered' },
    { v: 'cancelled_rto', l: 'Cancelled & RTO' },
    { v: 'all',           l: 'All' },
];
const DESK_STAGE_VALUES = new Set(['to_confirm', 'to_ship', 'in_transit', 'problems', 'returns', 'delivered', 'cancelled_rto', 'refund_due']);
// Old home-inbox deep links used status buckets — map them onto the tabs.
const LEGACY_TAB = { pending: 'to_confirm', processing: 'to_ship', shipped: 'in_transit', rto: 'cancelled_rto', cancelled: 'cancelled_rto' };

function OverflowMenu({ items }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState(null);
    const btnRef = useRef(null);
    const menuRef = useRef(null);
    useEffect(() => {
        if (!open) return;
        // The menu is rendered in a PORTAL (document.body), so a click on a menu
        // item is NOT inside btnRef. Treat clicks inside the menu itself as
        // "inside" too — otherwise mousedown closed/unmounted the menu before the
        // item's click could fire, so every action silently did nothing.
        const onDoc = (e) => {
            const inBtn = btnRef.current && btnRef.current.contains(e.target);
            const inMenu = menuRef.current && menuRef.current.contains(e.target);
            if (!inBtn && !inMenu) setOpen(false);
        };
        const onLeave = () => setOpen(false);
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        window.addEventListener('scroll', onLeave, true);
        window.addEventListener('resize', onLeave);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            window.removeEventListener('scroll', onLeave, true);
            window.removeEventListener('resize', onLeave);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);
    if (!items.length) return null;
    const toggle = () => {
        if (!open && btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setPos({ top: r.bottom + 4, left: Math.max(8, r.right - 200) });
        }
        setOpen(o => !o);
    };
    return (
        <>
            <button ref={btnRef} type="button" className="order-action-btn" title="More actions"
                aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" />
                </svg>
            </button>
            {open && pos && createPortal(
                <div className="ord-menu" role="menu" ref={menuRef} style={{ top: pos.top, left: pos.left }}>
                    {items.map((it, i) => (
                        <button key={i} type="button" role="menuitem"
                            className={`ord-menu-item${it.tone === 'danger' ? ' danger' : ''}`}
                            onClick={() => { setOpen(false); it.onClick(); }}>
                            <span className="ord-menu-ic">{it.icon}</span>{it.label}
                        </button>
                    ))}
                </div>, document.body)}
        </>
    );
}

const Orders = ({ initialTab } = {}) => {
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
    const [statusFilter, setStatusFilter] = useState(initialTab || "to_confirm");
    const [deskCounts, setDeskCounts] = useState({});
    const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
    const [refundDueFilter, setRefundDueFilter] = useState(false);
    const [sortBy, setSortBy] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState("desc");
    const [cancelPrompt, setCancelPrompt] = useState(null);
    const [confirmPrompt, setConfirmPrompt] = useState(null);
    const [deletePrompt, setDeletePrompt] = useState(null);
    const [refundPrompt, setRefundPrompt] = useState(null);
    // Summary tiles — same numbers as Reports › Overview for the picked range
    // (last 30 days when no range is picked).
    const [allOrdersStats, setAllOrdersStats] = useState(null);
    const [syncingOrders, setSyncingOrders] = useState(new Set());
    const [pickupOpen, setPickupOpen] = useState(false);
    const [isAwbModalOpen, setIsAwbModalOpen] = useState(false);
    const [awbOrderId, setAwbOrderId] = useState(null);
    const [awbNumber, setAwbNumber] = useState('');
    const [courierName, setCourierName] = useState('');
    const [selectedOrders, setSelectedOrders] = useState(new Set());
    const [isDownloadingBulk, setIsDownloadingBulk] = useState(false);
    const [labelStats, setLabelStats] = useState({ totalLabels: 0, downloadedLabels: 0, pendingLabels: 0, downloadRate: 0 });
    const [statsStartDate, setStatsStartDate] = useState('');
    const [statsEndDate, setStatsEndDate] = useState('');
    const [brandFilter, setBrandFilter] = useState('all');
    const [brands, setBrands] = useState([]);
    const [generatingLabel, setGeneratingLabel] = useState(new Set());
    const [highlightedRows, setHighlightedRows] = useState(new Set());
    const [labelPollTimer, setLabelPollTimer] = useState(null);
    // UI: analytics charts are collapsed by default so the orders table sits
    // near the top; live updates can be paused so the table never refreshes
    // under the admin while they work.
    const [liveUpdates, setLiveUpdates] = useState(() => {
        // Remember the admin's choice so pausing stays paused across visits.
        try { return localStorage.getItem('obz-orders-live') !== 'off'; } catch { return true; }
    });
    useEffect(() => {
        try { localStorage.setItem('obz-orders-live', liveUpdates ? 'on' : 'off'); } catch {}
    }, [liveUpdates]);
    const [filterOpen, setFilterOpen] = useState(false);
    // Shipping-address editor (fix wrong pincode/phone that blocks courier booking)
    const [editingAddress, setEditingAddress] = useState(false);
    const [savingAddress, setSavingAddress] = useState(false);
    const [addressForm, setAddressForm] = useState({});
    // Manual courier picker — opened directly or auto-opened when an
    // auto-sync comes back failed (no serviceable courier).

    // Deep-link from the home "Needs attention" inbox: it stashes a status in
    // sessionStorage before navigating here so the table lands pre-filtered.
    useEffect(() => {
        let hint;
        try { hint = sessionStorage.getItem('obz-orders-status'); } catch {}
        if (hint) {
            try { sessionStorage.removeItem('obz-orders-status'); } catch {}
            setStatusFilter(LEGACY_TAB[hint] || hint);
        }
        // Search typed on the home page: open All with it filled in.
        let q = null;
        try { q = sessionStorage.getItem('obz-orders-search'); sessionStorage.removeItem('obz-orders-search'); } catch {}
        if (q) { setStatusFilter('all'); setFilterValue(q); }
    }, []);

    // Debounced search value — auto-cancels previous timer on every keystroke
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(filterValue.trim()), 400);
        return () => clearTimeout(t);
    }, [filterValue]);

    // Drop stale responses when user types fast / changes filters quickly
    const requestIdRef = useRef(0);

    const fetchOrders = useCallback(async (page = currentPage, { silent = false, _attempt = 0 } = {}) => {
        const reqId = ++requestIdRef.current;
        let willRetry = false;
        // Foreground fetches (page change, filter change, manual refresh) show the
        // skeleton. We DON'T clear the visible rows anymore — a transient network
        // blip on a cold backend would otherwise blank the whole table. The rows
        // are swapped only on a successful response; on failure the last-good rows
        // stay put behind the (dismissible) error. A *silent* fetch (the 30s
        // background poll) never touches the skeleton.
        if (!silent) { setError(null); setLoading(true); }
        try {
            const params = {
                page, limit: itemsPerPage,
                stage: DESK_STAGE_VALUES.has(statusFilter) ? statusFilter : undefined,
                status: !DESK_STAGE_VALUES.has(statusFilter) && statusFilter !== 'all' ? statusFilter : undefined,
                payment_type: paymentTypeFilter !== 'all' ? paymentTypeFilter : undefined,
                payment_status: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
                refund_due: refundDueFilter ? 1 : undefined,
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
            setError(null);
        } catch (err) {
            if (reqId !== requestIdRef.current) return;
            // Transient network blips (cold backend boot, worker saturation) show
            // up as "Network Error" / timeout with no response. Silently auto-retry
            // once before surfacing anything, so a one-off hiccup self-heals.
            const isTransient = err?.message === 'Network Error' || err?.code === 'ECONNABORTED' || !err?.response;
            if (isTransient && _attempt < 1) {
                willRetry = true;
                setTimeout(() => fetchOrders(page, { silent, _attempt: _attempt + 1 }), 1500);
                return;
            }
            // A failed background poll must not wipe the table the admin is using.
            if (!silent) {
                const friendly = err?.message === 'Network Error'
                    ? "Couldn't reach the server — check your connection and try again. Your orders are safe."
                    : err?.code === 'ECONNABORTED'
                        ? 'The server took too long to respond. Please try again.'
                        : (err?.message || 'Failed to fetch orders');
                setError(friendly);
            }
        } finally {
            if (reqId === requestIdRef.current && !silent && !willRetry) setLoading(false);
        }
    }, [currentPage, itemsPerPage, statusFilter, paymentTypeFilter, paymentStatusFilter, refundDueFilter, brandFilter, debouncedSearch, statsStartDate, statsEndDate, sortBy, sortOrder]);

    // Live tab counts (refreshed with every list load).
    const fetchDeskCounts = useCallback(async () => {
        try {
            const r = await orderService.getDeskCounts(brandFilter);
            const c = r?.counts || {};
            setDeskCounts({ ...c, returns_open: (c.returns_to_review || 0) + (c.returns_in_pickup || 0) + (c.returns_to_refund || 0) });
        } catch { /* counts are optional */ }
    }, [brandFilter]);
    useEffect(() => { fetchDeskCounts(); }, [fetchDeskCounts, orders]);

    const fetchAllOrdersForStats = useCallback(async () => {
        try {
            const r = await trafficReportService.getSalesSummary(
                statsStartDate || undefined, statsEndDate || undefined, brandFilter !== 'all' ? brandFilter : undefined);
            setAllOrdersStats(r?.summary || null);
        } catch { setAllOrdersStats(null); }
    }, [statsStartDate, statsEndDate, brandFilter]);

    const downloadInvoice = async (orderId, orderNumber) => {
        try {
            await orderService.downloadInvoice(orderId, orderNumber);
        } catch (error) {
            showError('invoiceFailed', error.message || error.error || 'Failed to download invoice');
        }
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
                fetchOrders(currentPage, { silent: true });
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
        if (syncingOrders.has(orderId)) { showError('syncInProgress'); return; }
        try {
            setSyncingOrders(prev => new Set(prev).add(orderId));
            const result = await orderService.syncSingleOrderWithShipping(orderId);
            if (result.success) {
                // Booking runs in the background queue now — the response is
                // instant. The row shows "Pending sync" and flips to booked (AWB)
                // as the live poll refreshes, so no more long spinner / hang.
                showSuccess('orderSynced', result.message || `Booking started for ${orderNumber} — the AWB will appear shortly.`);
                fetchOrders(currentPage, { silent: true }); fetchAllOrdersForStats();
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
                showSuccess('orderConfirmed', `Order ${orderNumber} confirmed — booking courier…`);
                highlightRow(orderId);
                // Refresh orders + stats to reflect the new status — silent so the
                // table doesn't blank to a skeleton while confirming.
                await fetchOrders(currentPage, { silent: true });
                await fetchAllOrdersForStats();
                // Confirm now also BOOKS the courier (best available) in one step —
                // the old standalone "Sync" button is gone. syncSingleOrder runs its
                // own refresh + toasts and is non-fatal: if booking fails (e.g. no
                // serviceable courier) the order stays confirmed and a "Pending Sync"
                // retry button appears on the row.
                await syncSingleOrder(orderId, orderNumber);
            }
            else { showError('saveFailed', result.message || 'Failed to confirm order'); }
        } catch (error) { showError('saveFailed', error.message || 'Failed to confirm order'); }
    };

    const handleCancelConfirm = async (reason) => {
        // The backend rejects reasons shorter than 5 characters — catch it here
        // and keep the prompt open so the admin can fix it.
        if (String(reason || '').trim().length < 5) {
            showError('cancelReasonShort', 'Please enter a cancellation reason of at least 5 characters.');
            return;
        }
        const { orderId, orderNumber } = cancelPrompt;
        setCancelPrompt(null);
        try {
            const result = await orderService.adminCancelOrder(orderId, reason);
            if (result.success) {
                showSuccess('orderCancelled', `Order ${orderNumber} cancelled successfully`);
                highlightRow(orderId);
                fetchOrders(currentPage, { silent: true });
                fetchAllOrdersForStats();
            }
            else { showError('saveFailed', result.message || 'Failed to cancel order'); }
        } catch (error) { showError('saveFailed', error.message || error.error || 'Failed to cancel order'); }
    };

    const refundOrder = (orderId, orderNumber, amount) => {
        setRefundPrompt({ orderId, orderNumber, amount });
    };

    const handleRefundConfirm = async () => {
        const { orderId, orderNumber } = refundPrompt;
        setRefundPrompt(null);
        try {
            const result = await orderService.refundOrder(orderId);
            if (result.success) {
                showSuccess('orderRefunded', `Refund processed for order ${orderNumber}`);
                highlightRow(orderId);
                fetchOrders(currentPage, { silent: true });
                fetchAllOrdersForStats();
            }
            else { showError('saveFailed', result.message || 'Failed to process refund'); }
        } catch (error) { showError('saveFailed', error.message || error.error || 'Failed to process refund'); }
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
                fetchOrders(currentPage, { silent: true });
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
            await orderService.updateAwbNumber(awbOrderId, { awb_number: awbNumber.trim(), courier_name: courierName.trim() || 'Manual Entry' });
            showSuccess('awbUpdated', 'AWB number updated successfully!');
            highlightRow(awbOrderId);
            setIsAwbModalOpen(false); setAwbNumber(''); setCourierName(''); setAwbOrderId(null);
            fetchOrders(currentPage);
        } catch (error) { showError('updateFailed', error.message || 'Failed to update AWB number'); }
    };

    // ── Shipping-address edit (fix pincode/phone/etc. that blocks shipping) ──
    const buildAddressForm = (order) => {
        const a = order?.ShippingAddress || {};
        return {
            full_name: a.full_name || '', phone: a.phone || '', address: a.address || '',
            landmark: a.landmark || '', city: a.city || '', state: a.state || '',
            pincode: a.pincode || '', country: a.country || 'India',
        };
    };
    const startEditAddress = () => {
        setAddressForm(buildAddressForm(selectedOrder));
        setEditingAddress(true);
    };
    // Open the order panel straight into the address editor (row action).
    const openAddressEditor = (row) => {
        if (!row.ShippingAddress) { showError('updateFailed', 'This order has no shipping address to edit'); return; }
        setSelectedOrder(row);
        setAddressForm(buildAddressForm(row));
        setEditingAddress(true);
        setIsViewModalOpen(true);
    };

    const saveAddress = async () => {
        if (!/^\d{6}$/.test(String(addressForm.pincode || '').trim())) {
            showError('fieldRequired', 'Pincode must be 6 digits'); return;
        }
        setSavingAddress(true);
        try {
            const res = await orderService.updateOrderAddress(selectedOrder.id, addressForm);
            const updated = res?.address || { ...selectedOrder.ShippingAddress, ...addressForm };
            // Reflect the change in the open detail panel immediately.
            setSelectedOrder(prev => prev ? { ...prev, ShippingAddress: { ...prev.ShippingAddress, ...updated } } : prev);
            setEditingAddress(false);
            showSuccess('addressUpdated', res?.message || 'Shipping address updated. Re-sync to re-check serviceability.');
            highlightRow(selectedOrder.id);
            fetchOrders(currentPage);
        } catch (error) {
            showError('updateFailed', error.message || 'Failed to update address');
        } finally {
            setSavingAddress(false);
        }
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
        if (orders.length && orders.every((o) => selectedOrders.has(o.id))) setSelectedOrders(new Set());
        else setSelectedOrders(new Set(orders.map((o) => o.id)));
    };

    // Bulk actions apply to the selected orders they make sense for.
    const selectedRows = orders.filter((o) => selectedOrders.has(o.id));
    const selectedWithLabel = selectedRows.filter((o) => o.shipping_label_url);
    const selectedToConfirm = selectedRows.filter((o) => ['awaiting_confirmation', 'pending'].includes((o.status || '').toLowerCase()));
    const [bulkConfirming, setBulkConfirming] = useState(false);
    const handleBulkConfirm = async () => {
        if (!selectedToConfirm.length) return;
        setBulkConfirming(true);
        let ok = 0; const failed = [];
        for (const o of selectedToConfirm) {
            try {
                const r = await orderService.confirmOrder(o.id);
                if (r?.success === false) failed.push(o.order_number); else ok++;
            } catch { failed.push(o.order_number); }
        }
        setBulkConfirming(false);
        if (ok) showSuccess('orderConfirmed', `Confirmed ${ok} order${ok === 1 ? '' : 's'} — courier booking started.`);
        if (failed.length) showError('confirmFailed', `Couldn't confirm ${failed.join(', ')}`);
        setSelectedOrders(new Set()); fetchOrders(currentPage, { silent: true }); fetchDeskCounts(); fetchAllOrdersForStats();
    };

    const handleBulkDownload = async () => {
        if (selectedWithLabel.length === 0) { showError('fieldRequired', 'None of the selected orders has a label yet'); return; }
        setIsDownloadingBulk(true);
        try {
            await orderService.bulkDownloadLabels(selectedWithLabel.map((o) => o.id));
            showSuccess('exported', `Downloaded ${selectedWithLabel.length} labels.`);
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
    useEffect(() => { fetchAllOrdersForStats(); }, [fetchAllOrdersForStats]);

    // Reset to page 1 whenever any filter (other than the page itself) changes,
    // so users don't get stuck on an out-of-range page after narrowing results.
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, paymentTypeFilter, paymentStatusFilter, refundDueFilter, brandFilter, sortBy, sortOrder, itemsPerPage, debouncedSearch, statsStartDate, statsEndDate]);

    // A selection only makes sense on the page/tab it was made on.
    useEffect(() => { setSelectedOrders(new Set()); }, [statusFilter, currentPage, debouncedSearch]);

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
    const getPaymentStatusDisplay = (order) => ({ pending: 'Pending', paid: 'Paid', failed: 'Failed', refunded: 'Refunded', partial_refund: 'Part refunded', cancelled: 'Cancelled', refund_pending: 'Refund Pending' }[order.payment_status?.toLowerCase()] || 'Unknown');
    const getPaymentStatusClass = (order) => ({ pending: 'pending', paid: 'paid', failed: 'failed', refunded: 'refunded', partial_refund: 'refunded', cancelled: 'cancelled', refund_pending: 'refund-pending' }[order.payment_status?.toLowerCase()] || 'unknown');
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

    // ── Order Desk table ────────────────────────────────────────────────────
    // One row = the whole order: who, money, pipeline stage, shipment + label,
    // the last WhatsApp message with this customer, the one thing that needs
    // doing, and a single contextual primary action (the rest sit in ⋯).
    const TONE = {
        ok: ['var(--ds-color-success-bg)', 'var(--ds-color-success)'],
        info: ['var(--ds-color-info-bg)', 'var(--ds-color-info)'],
        warn: ['var(--ds-color-warn-bg)', 'var(--ds-color-warn)'],
        bad: ['var(--ds-color-danger-bg)', 'var(--ds-color-danger)'],
        violet: ['var(--ds-color-accent2-bg)', 'var(--ds-color-accent2)'],
    };
    const Pill = ({ tone = 'info', children, title }) => (
        <span title={title} style={{ display: 'inline-block', background: TONE[tone][0], color: TONE[tone][1], padding: '2px 8px', borderRadius: 999, fontSize: '.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{children}</span>
    );
    const muted = { color: 'var(--ds-color-text-muted)', fontSize: '.76rem', lineHeight: 1.35 };
    const ageHours = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
    const shortWhen = (d) => {
        if (!d) return '';
        const t = new Date(d);
        const sameDay = t.toDateString() === new Date().toDateString();
        return sameDay
            ? t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            : t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' + t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };
    const openChat = (conversationId) => {
        try { sessionStorage.setItem('obz-wa-open', String(conversationId)); } catch { /* storage blocked */ }
        window.history.pushState({}, '', '/dashboard/whatsapp-chat');
        window.dispatchEvent(new PopStateEvent('popstate'));
    };
    const customerName = (row) => String(row.ShippingAddress?.full_name || row.User?.username
        || [row.GuestUser?.firstName, row.GuestUser?.lastName].filter(Boolean).join(' ') || 'Guest')
        .replace(/\s*\(\+?[\d\s-]{6,}\)\s*$/, '').trim();

    // Everything the row needs to decide its pill, issue and primary action.
    const rowState = (row) => {
        const st = (row.status || '').toLowerCase();
        const pmt = (row.payment_status || '').toLowerCase();
        const isPrepaid = (row.payment_type || '').toLowerCase() !== 'cod';
        const waybill = row.Shipment?.waybill || row.shipping_waybill;
        const syncError = row.Shipment?.sync_error || row.shipping_sync_error;
        const canConfirm = ['awaiting_confirmation', 'pending'].includes(st);
        const isFinal = ['delivered', 'cancelled', 'order cancelled'].includes(st);
        const pendingSync = !waybill && !isFinal && !canConfirm && !['rto', 'rto delivered', 'returned_rto', 'return_initiated'].includes(st);
        const canCancel = ['awaiting_confirmation', 'pending', 'confirmed', 'processing', 'booked'].includes(st);
        const refundableStatus = ['cancelled', 'order cancelled', 'returned_rto', 'rto delivered'].includes(st);
        const canRefund = isPrepaid && refundableStatus && ['paid', 'refund_pending'].includes(pmt);
        const ndr = row.ndr_case;
        const ret = row.open_return;
        const wa = row.last_whatsapp;

        let issue = null;
        if (syncError && pendingSync) issue = { tone: 'bad', tag: 'Booking', text: `Booking failed: ${syncError}` };
        else if (ndr) {
            const a = ndr.customer_action;
            issue = a === 'reattempt' ? { tone: 'info', tag: 'NDR', text: `Customer chose deliver again${ndr.reattempt_date ? ` (${ndr.reattempt_date})` : ''}` }
                : a === 'new_address' ? { tone: 'bad', tag: 'NDR', text: `New address sent: ${ndr.new_address || '—'}` }
                : a === 'cancel' ? { tone: 'bad', tag: 'NDR', text: 'Customer wants to cancel — RTO it' }
                : { tone: 'bad', tag: 'NDR', text: `Delivery failed${ndr.reason ? `: ${ndr.reason}` : ''} — waiting for the customer` };
        } else if (ret) {
            issue = { tone: 'violet', tag: 'Return', text: ret.status === 'received'
                ? `${ret.return_number} received — enter the refund amount`
                : `${ret.return_number}: ${String(ret.status).replace(/_/g, ' ')}${ret.is_cod ? ' · COD (UPI refund)' : ''}` };
        } else if (canRefund) {
            issue = { tone: 'bad', tag: 'Refund', text: pmt === 'refund_pending' ? 'Refund pending — retry it' : 'Refund owed to the customer' };
        } else if (canConfirm && ageHours(row.createdAt) >= 24) {
            issue = { tone: 'warn', tag: 'Call', text: `Waiting ${ageHours(row.createdAt)} h — call the customer, then confirm or cancel` };
        } else if (['rto', 'rto delivered', 'returned_rto'].includes(st)) {
            issue = { tone: 'warn', tag: 'RTO', text: st === 'rto' ? 'Coming back to us — stock restores on receipt' : 'Returned to us' };
        } else if (wa && wa.direction === 'inbound' && wa.unread > 0) {
            issue = { tone: 'info', tag: 'Reply', text: 'Unread WhatsApp reply' };
        }

        // The one button that moves this order forward.
        let primary = { label: 'View', onClick: () => { setSelectedOrder(row); setIsViewModalOpen(true); } };
        if (canConfirm) primary = { label: 'Confirm', onClick: () => confirmOrder(row.id, row.order_number) };
        else if (pendingSync) primary = { label: syncingOrders.has(row.id) ? 'Booking…' : 'Book now', disabled: syncingOrders.has(row.id), onClick: () => syncSingleOrder(row.id, row.order_number) };
        else if (ndr) primary = { label: 'Resolve NDR', onClick: () => { setStatusFilter('problems'); setCurrentPage(1); } };
        else if (ret) primary = { label: ret.status === 'received' ? 'Refund' : 'Open return', onClick: () => { setStatusFilter('returns'); setCurrentPage(1); } };
        else if (canRefund) primary = { label: pmt === 'refund_pending' ? 'Retry refund' : 'Refund', onClick: () => refundOrder(row.id, row.order_number) };
        else if (waybill && !row.shipping_label_url && !isFinal) primary = { label: generatingLabel.has(row.id) ? 'Getting…' : 'Get label', disabled: generatingLabel.has(row.id), onClick: () => generateLabelForOrder(row.id) };
        else if (st === 'delivered') primary = { label: 'Invoice', onClick: () => downloadInvoice(row.id, row.order_number) };

        return { st, pmt, isPrepaid, waybill, syncError, canConfirm, pendingSync, canCancel, canRefund, issue, primary, wa };
    };

    const allOnPageSelected = orders.length > 0 && orders.every((o) => selectedOrders.has(o.id));

    const columns = [
        {
            header: (
                <input type="checkbox" className="bulk-select-checkbox" checked={allOnPageSelected}
                    onChange={selectAllOrdersWithLabels} aria-label="Select every order on this page" />
            ),
            cell: (row) => (
                <input type="checkbox" className="order-select-checkbox" checked={selectedOrders.has(row.id)}
                    onChange={() => toggleOrderSelection(row.id)} aria-label={`Select ${row.order_number}`}
                    onClick={(e) => e.stopPropagation()} />
            ),
            width: '34px',
        },
        {
            header: 'Order',
            cell: (row) => {
                const s = rowState(row);
                const h = ageHours(row.createdAt);
                return (
                    <div style={{ display: 'grid', gap: 2 }}>
                        <span style={{ fontFamily: 'var(--ds-font-mono)', fontWeight: 700, whiteSpace: 'nowrap' }}>{row.order_number}</span>
                        <span style={muted}>
                            {row.Brand?.display_name || row.Brand?.name || '—'} · {shortWhen(row.createdAt)}
                            {s.canConfirm && h >= 1 && <b style={{ color: h >= 24 ? 'var(--ds-color-danger)' : 'var(--ds-color-warn)' }}> · {h} h</b>}
                        </span>
                    </div>
                );
            },
            width: '150px',
        },
        {
            header: 'Customer',
            cell: (row) => (
                <div style={{ display: 'grid', gap: 2, alignItems: 'start' }}>
                    <button type="button" title="Open customer profile"
                        onClick={(e) => {
                            e.stopPropagation();
                            const phone = row.ShippingAddress?.phone || row.GuestUser?.phone;
                            const sel = row.user_id ? { kind: 'user', id: row.user_id }
                                : row.guest_user_id ? { kind: 'guest', id: row.guest_user_id }
                                : phone ? { kind: 'phone', phone } : null;
                            if (!sel) return;
                            try { sessionStorage.setItem('obz-customer', JSON.stringify(sel)); } catch { /* storage blocked */ }
                            window.history.pushState({}, '', '/dashboard/customer');
                            window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
                        style={{ lineHeight: 1.25, wordBreak: 'break-word', background: 'none', border: 0, padding: 0, font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--ds-color-border)', textUnderlineOffset: 3 }}>
                        {customerName(row)}
                    </button>
                    <span style={muted}>{[row.ShippingAddress?.phone || row.GuestUser?.phone, row.ShippingAddress?.city].filter(Boolean).join(' · ') || '—'}</span>
                    {row.rto_risk_level && (
                        <span className={`rto-badge rto-${row.rto_risk_level.toLowerCase()}`} style={{ justifySelf: 'start' }}>
                            <span className="rto-dot" />
                            <span className="rto-level">{row.rto_risk_level}</span>
                            {row.rto_risk_score != null && <span className="rto-score">{row.rto_risk_score}</span>}
                        </span>
                    )}
                </div>
            ),
            width: '160px',
        },
        {
            header: 'Payment',
            cell: (row) => {
                const label = formatPaymentType(row.payment_type);
                return (
                    <div style={{ display: 'grid', gap: 3, justifyItems: 'start' }}>
                        <b style={{ whiteSpace: 'nowrap' }}>{formatCurrency(getOrderTotal(row))}</b>
                        <span style={muted}>{label} · {getPaymentStatusDisplay(row)}</span>
                        {label === 'COD' && row.cod_address_confirmed && (
                            <span title="Customer confirmed their address on WhatsApp"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: 'var(--ds-color-success)', background: 'var(--ds-color-success-bg)', padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                                <HugeiconsIcon icon={WhatsappIcon} size={11} strokeWidth={2} /> address ok
                            </span>
                        )}
                    </div>
                );
            },
            width: '110px',
        },
        {
            header: 'Stage',
            cell: (row) => (
                <div style={{ display: 'grid', gap: 3, justifyItems: 'start' }}>
                    <OrderStatusBadge status={row.status} />
                    <span style={{ ...muted, fontFamily: 'var(--ds-font-mono)', fontSize: '.7rem' }}>{row.status}</span>
                </div>
            ),
            width: '130px',
        },
        {
            header: 'Shipment & label',
            cell: (row) => {
                const s = rowState(row);
                const courier = row.Shipment?.courier_name || row.courier_name;
                if (!s.waybill && !s.pendingSync && !s.canConfirm) return <span style={muted}>—</span>;
                if (s.canConfirm) return <span style={muted}>Books when confirmed</span>;
                if (!s.waybill) {
                    return s.syncError
                        ? <div style={{ display: 'grid', gap: 3, justifyItems: 'start' }}><Pill tone="bad">Booking failed</Pill><span style={{ ...muted, maxWidth: 180 }}>{s.syncError}</span></div>
                        : <div style={{ display: 'grid', gap: 3, justifyItems: 'start' }}><ShipmentStatusBadge status={row.Shipment?.sync_status || row.shipping_sync_status || 'pending'} syncError={s.syncError} /><span style={muted}>Not booked yet</span></div>;
                }
                return (
                    <div style={{ display: 'grid', gap: 2, justifyItems: 'start' }}>
                        <span style={{ fontFamily: 'var(--ds-font-mono)', fontSize: '.76rem', whiteSpace: 'nowrap' }}>{s.waybill}</span>
                        {courier && <span style={muted}>{courier}</span>}
                        {row.shipping_label_url ? (
                            <button type="button" className="order-sync-main-btn order-sync-main-btn--ghost" style={{ padding: '3px 8px', fontSize: '.74rem', marginTop: 3 }}
                                onClick={(e) => { e.stopPropagation(); handleLabelDownload(row.id, row.shipping_label_url); }}
                                title={row.label_downloaded ? 'Label already downloaded — download again' : 'Download the shipping label'}>
                                <HugeiconsIcon icon={Download04Icon} size={13} strokeWidth={2} /> Label{row.label_downloaded ? ' ✓' : ''}
                            </button>
                        ) : !['delivered', 'cancelled', 'order cancelled'].includes(s.st) && (
                            <button type="button" className="order-sync-main-btn order-sync-main-btn--ghost" style={{ padding: '3px 8px', fontSize: '.74rem', marginTop: 3 }}
                                disabled={generatingLabel.has(row.id)}
                                onClick={(e) => { e.stopPropagation(); generateLabelForOrder(row.id); }}>
                                {generatingLabel.has(row.id) ? 'Getting…' : 'Get label'}
                            </button>
                        )}
                    </div>
                );
            },
            width: '150px',
        },
        {
            header: 'Last WhatsApp',
            cell: (row) => {
                const wa = row.last_whatsapp;
                if (!wa) return <span style={muted}>No chat yet</span>;
                const inbound = wa.direction === 'inbound';
                return (
                    <button type="button" onClick={(e) => { e.stopPropagation(); openChat(wa.conversation_id); }}
                        title="Open this chat" style={{ all: 'unset', cursor: 'pointer', display: 'grid', gap: 2, maxWidth: 220 }}>
                        <span style={{
                            fontSize: '.76rem', padding: '4px 8px', borderRadius: 9, lineHeight: 1.35,
                            background: inbound ? 'var(--ds-color-success-bg)' : 'var(--ds-color-surface-soft)',
                            border: `1px solid ${inbound ? 'transparent' : 'var(--ds-color-border)'}`, color: 'var(--ds-color-text)',
                            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        }}>
                            {inbound ? '↩ ' : ''}{wa.text || `[${wa.type || 'message'}]`}
                        </span>
                        <span style={{ ...muted, fontSize: '.7rem', display: 'flex', gap: 5, alignItems: 'center' }}>
                            {wa.unread > 0 && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ds-color-success)' }} />}
                            {inbound ? 'Customer' : 'Sent'} · {shortWhen(wa.at)}
                        </span>
                    </button>
                );
            },
            width: '200px',
        },
        {
            header: 'Needs attention',
            cell: (row) => {
                const { issue } = rowState(row);
                if (!issue) return <span style={muted}>—</span>;
                return (
                    <div style={{ display: 'grid', gap: 3, justifyItems: 'start', maxWidth: 210 }}>
                        <Pill tone={issue.tone}>{issue.tag}</Pill>
                        <span style={{ fontSize: '.78rem', lineHeight: 1.35 }}>{issue.text}</span>
                    </div>
                );
            },
            width: '190px',
        },
        {
            header: 'Actions',
            cell: (row) => {
                const s = rowState(row);
                const menu = [
                    { icon: <HugeiconsIcon icon={ViewIcon} size={16} strokeWidth={2} />, label: 'View full order', onClick: () => { setSelectedOrder(row); setIsViewModalOpen(true); } },
                    { icon: <HugeiconsIcon icon={Location01Icon} size={16} strokeWidth={2} />, label: 'Edit address', onClick: () => openAddressEditor(row) },
                    ...(s.pendingSync ? [{ icon: <HugeiconsIcon icon={LinkSquare02Icon} size={16} strokeWidth={2} />, label: 'Enter AWB manually', onClick: () => handleAwbUpdate(row.id, s.waybill, row.Shipment?.courier_name || row.courier_name) }] : []),
                    ...(s.waybill ? [{ icon: <HugeiconsIcon icon={File01Icon} size={16} strokeWidth={2} />, label: 'Regenerate label', onClick: () => generateLabelForOrder(row.id) }] : []),
                    ...(s.wa ? [{ icon: <HugeiconsIcon icon={WhatsappIcon} size={16} strokeWidth={2} />, label: 'Open WhatsApp chat', onClick: () => openChat(s.wa.conversation_id) }] : []),
                    ...(s.canRefund && s.primary.label !== 'Refund' && s.primary.label !== 'Retry refund' ? [{ icon: <HugeiconsIcon icon={RefreshIcon} size={16} strokeWidth={2} />, label: s.pmt === 'refund_pending' ? 'Retry refund' : 'Refund customer', onClick: () => refundOrder(row.id, row.order_number) }] : []),
                    { icon: <HugeiconsIcon icon={File01Icon} size={16} strokeWidth={2} />, label: 'Download invoice', onClick: () => downloadInvoice(row.id, row.order_number) },
                    ...(s.canCancel ? [{ icon: <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />, label: 'Cancel order', tone: 'danger', onClick: () => cancelOrder(row.id, row.order_number) }] : []),
                    { icon: <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} />, label: 'Delete order', tone: 'danger', onClick: () => deleteOrder(row.id, row.order_number) },
                ];
                return (
                    <div className="sl-actions" style={{ flexWrap: 'nowrap' }}>
                        <button type="button" className={`order-sync-main-btn${s.primary.label === 'View' ? '' : ' order-sync-main-btn--primary'}`} style={{ height: 'auto', padding: '6px 10px', fontSize: '.78rem' }}
                            disabled={s.primary.disabled} onClick={(e) => { e.stopPropagation(); s.primary.onClick(); }}>
                            {s.primary.label}
                        </button>
                        <OverflowMenu items={menu} />
                    </div>
                );
            },
            width: '140px',
        },
    ];

    return (
        <>
            <PromptModal
                message={cancelPrompt ? `Enter a cancellation reason for order ${cancelPrompt.orderNumber} (at least 5 characters):` : null}
                placeholder="Cancellation reason (min. 5 characters)..."
                onConfirm={handleCancelConfirm}
                onCancel={() => setCancelPrompt(null)}
            />
            <ConfirmModal
                message={confirmPrompt ? `Are you sure you want to confirm order ${confirmPrompt.orderNumber}? This will trigger shipping provider sync.` : null}
                title="Confirm order"
                confirmLabel="Confirm order"
                tone="primary"
                onConfirm={handleConfirmOrder}
                onCancel={() => setConfirmPrompt(null)}
            />
            <ConfirmModal
                message={deletePrompt ? `Permanently DELETE order ${deletePrompt.orderNumber}? This removes the order and all its data and cannot be undone.` : null}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeletePrompt(null)}
            />
            <ConfirmModal
                message={refundPrompt ? `Refund the full paid amount for order ${refundPrompt.orderNumber} to the customer via Razorpay? This cannot be undone.` : null}
                title="Refund order"
                confirmLabel="Refund customer"
                tone="primary"
                onConfirm={handleRefundConfirm}
                onCancel={() => setRefundPrompt(null)}
            />
            <div className="dashboard-page">
                {error && (
                    <div role="alert" style={{
                        background: 'var(--ds-color-danger-bg)', border: '1px solid var(--ds-color-danger)',
                        borderRadius: 'var(--ds-radius-md, 10px)', padding: '11px 14px', marginBottom: 12,
                        color: 'var(--ds-color-danger)', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', gap: 12, fontSize: 13.5
                    }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                            <HugeiconsIcon icon={Alert02Icon} size={17} strokeWidth={2} style={{ flexShrink: 0 }} />
                            <span>{error}</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <button onClick={() => fetchOrders(currentPage)} style={{ background: 'none', border: '1px solid currentColor', borderRadius: 8, cursor: 'pointer', color: 'inherit', fontSize: 12, fontWeight: 600, padding: '4px 10px' }}>Retry</button>
                            <button onClick={() => setError(null)} aria-label="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
                        </span>
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
                                        <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />
                                    </span>
                                    <input type="text" className="sl-search-input" placeholder="Search orders, customers, AWB…"
                                        value={filterValue} onChange={handleSearchChange} />
                                </div>
                                <button className="order-sync-main-btn" type="button"
                                    title="Set no-pickup days and blocked date ranges (shared across all stores)"
                                    onClick={() => setPickupOpen(true)}>
                                    <HugeiconsIcon icon={Calendar03Icon} size={16} strokeWidth={2} />
                                    Pickup Schedule
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

                    <PickupScheduleModal open={pickupOpen} onClose={() => setPickupOpen(false)} />

                    {/* ── KPI Strip — one clean row (prototype style) ── */}
                    <StatGrid className="orders-kpi-grid" style={{ marginBottom: 'var(--ds-space-4)' }}>
                        <StatTile label={statsStartDate && statsEndDate ? 'Placed' : 'Placed · 30 days'} value={(allOrdersStats?.placed ?? 0).toLocaleString('en-IN')} />
                        <StatTile label="Booked value" value={Math.round((allOrdersStats?.placedValue || 0) - (allOrdersStats?.cancelledValue || 0)).toLocaleString('en-IN')} prefix="₹" />
                        <StatTile label="Prepaid"   value={allOrdersStats?.prepaid?.orders ?? 0} />
                        <StatTile label="COD"       value={allOrdersStats?.cod?.orders ?? 0} />
                        <StatTile label="Delivered" value={allOrdersStats?.delivered ?? 0} />
                        <StatTile label="Cancelled" value={allOrdersStats?.cancelled ?? 0} />
                        <StatTile label="Net sales" value={Math.round(allOrdersStats?.netSales || 0).toLocaleString('en-IN')} prefix="₹" />
                        <StatTile label="Avg order" value={Math.round(allOrdersStats?.aov || 0).toLocaleString('en-IN')} prefix="₹" />
                    </StatGrid>

                    {/* ── Status tabs (left) + Filter drawer trigger (right), one line ── */}
                    <div className="ord-toolbar">
                        <div className="ord-tabs" role="tablist" aria-label="Order pipeline stages">
                            {DESK_TABS.map((t) => (
                                <button key={t.v} type="button" role="tab"
                                    aria-selected={statusFilter === t.v}
                                    className={`ord-tab${statusFilter === t.v ? ' on' : ''}`}
                                    onClick={() => { setStatusFilter(t.v); setCurrentPage(1); }}>
                                    {t.l}
                                    {t.count && deskCounts[t.count] > 0 && (
                                        <span className="ord-tab-count" style={{ marginLeft: 6, padding: '0 7px', borderRadius: 999, fontSize: '.72rem', fontWeight: 700, background: statusFilter === t.v ? 'var(--ds-color-surface)' : 'var(--ds-color-surface-soft)', color: 'var(--ds-color-text)' }}>
                                            {deskCounts[t.count]}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="ord-toolbar-right">
                            <button type="button" className="order-sync-main-btn order-sync-main-btn--ghost"
                                onClick={() => setLiveUpdates((v) => !v)}
                                title={liveUpdates ? 'Live updates on — the table auto-refreshes' : 'Live updates paused — the table won’t move under you'}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: liveUpdates ? 'var(--ds-color-success)' : 'var(--ds-color-text-faint)' }} />
                                {liveUpdates ? 'Live' : 'Paused'}
                            </button>
                            {selectedOrders.size > 0 && (
                                <>
                                    <span style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--ds-color-text-muted)' }}>{selectedOrders.size} selected</span>
                                    <button type="button" className="order-sync-main-btn" onClick={handleBulkDownload}
                                        disabled={isDownloadingBulk || !selectedWithLabel.length}
                                        title={selectedWithLabel.length ? 'One PDF with every selected label' : 'None of the selected orders has a label yet'}>
                                        <HugeiconsIcon icon={Download04Icon} size={16} strokeWidth={2} />
                                        {isDownloadingBulk ? 'Downloading…' : `Labels (${selectedWithLabel.length})`}
                                    </button>
                                    {selectedToConfirm.length > 0 && (
                                        <button type="button" className="order-sync-main-btn order-sync-main-btn--primary" onClick={handleBulkConfirm} disabled={bulkConfirming}>
                                            {bulkConfirming ? 'Confirming…' : `Confirm ${selectedToConfirm.length}`}
                                        </button>
                                    )}
                                    <button type="button" className="order-sync-main-btn order-sync-main-btn--ghost" onClick={() => setSelectedOrders(new Set())}>Clear</button>
                                </>
                            )}
                            <button type="button" className="order-sync-main-btn order-sync-main-btn--ghost" onClick={() => setFilterOpen(true)}>
                                <HugeiconsIcon icon={FilterIcon} size={16} strokeWidth={2} />
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
                                setRefundDueFilter(false);
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

                        <label className="ord-filter-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: '4px 0 2px', fontSize: 13 }}>
                            <input type="checkbox" checked={refundDueFilter} onChange={(e) => { setRefundDueFilter(e.target.checked); setCurrentPage(1); }} style={{ width: 16, height: 16 }} />
                            Refund due — cancelled/returned prepaid, not yet refunded
                        </label>

                        <label className="ord-filter-label">Brand</label>
                        <Select value={brandFilter} onChange={(v) => setBrandFilter(v || 'all')}
                            options={[{ value: 'all', label: 'All Brands' }, ...brands.map(b => ({ value: String(b.id), label: b.display_name || b.name }))]}
                            placeholder="All Brands" />

                        <label className="ord-filter-label">Sort by</label>
                        <Select value={sortBy} onChange={(v) => setSortBy(v || 'createdAt')}
                            options={[{ value: 'createdAt', label: 'Sort: Date' }, { value: 'final_amount', label: 'Sort: Total' }, { value: 'status', label: 'Sort: Status' }, { value: 'payment_status', label: 'Sort: Payment' }]} />

                        <label className="ord-filter-label">Order</label>
                        <Select value={sortOrder} onChange={(v) => setSortOrder(v || 'desc')}
                            options={sortBy === 'createdAt'
                                ? [{ value: 'desc', label: 'Newest First' }, { value: 'asc', label: 'Oldest First' }]
                                : [{ value: 'desc', label: 'Descending' }, { value: 'asc', label: 'Ascending' }]} />

                        <label className="ord-filter-label">Rows per page</label>
                        <Select value={String(itemsPerPage)} onChange={(v) => { setItemsPerPage(Number(v || 10)); setCurrentPage(1); }}
                            options={[{ value: '10', label: 'Show: 10' }, { value: '25', label: 'Show: 25' }, { value: '50', label: 'Show: 50' }, { value: '100', label: 'Show: 100' }]} />
                    </div>
                </Modal>

                {statusFilter === 'to_confirm' && deskCounts.to_confirm_overdue > 0 && (
                    <div style={{ margin: '0 0 12px', padding: '10px 14px', borderRadius: 10, background: 'var(--ds-color-warn-bg)', color: 'var(--ds-color-warn)', fontSize: '.86rem', fontWeight: 600 }}>
                        {deskCounts.to_confirm_overdue} COD order{deskCounts.to_confirm_overdue === 1 ? '' : 's'} waiting more than 24 hours — call the customer, then Confirm or Cancel.
                    </div>
                )}
                {statusFilter === 'problems' ? <FailedDeliveries embedded /> : statusFilter === 'returns' ? <Returns embedded /> : (
                /* Table Section */
                <section className="sl-table-wrap" aria-label="Orders table">
                    {loading ? (
                        <div style={{ padding: '20px' }} role="status" aria-label="Loading orders">
                            <TableSkeleton rows={itemsPerPage} columns={9} />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="sl-empty" role="status" aria-label="No orders">
                            <div className="sl-empty-icon" aria-hidden="true">
                                <HugeiconsIcon icon={Package01Icon} size={40} strokeWidth={1.5} />
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
                                    cardOnMobile
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
                )}
            </div>

            {/* Order Details Modal */}
            <Modal
              isOpen={isViewModalOpen}
              onClose={() => { setIsViewModalOpen(false); setEditingAddress(false); }}
              title={`Order Details: #${selectedOrder?.order_number}`}
              size="lg"
              role="dialog"
              aria-modal="true"
              aria-label={`Order details for order ${selectedOrder?.order_number}`}
              footer={<Button variant="secondary" onClick={() => { setIsViewModalOpen(false); setEditingAddress(false); }}>Close</Button>}
            >
                {selectedOrder && (
                    <div className="odm-body">

                        {/* ── Row 1: Customer + Shipping ── */}
                        <div className={`odm-row-2${editingAddress ? ' odm-row-2--stack' : ''}`}>
                            {/* Customer Information */}
                            <div className="odm-card">
                                <div className="odm-card-title">
                                    <HugeiconsIcon icon={UserIcon} size={14} strokeWidth={2} />
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
                                <div className={`odm-card${editingAddress ? ' odm-card--editing' : ''}`}>
                                    <div className="odm-card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                            <HugeiconsIcon icon={Location01Icon} size={14} strokeWidth={2} />
                                            Shipping Address
                                        </span>
                                        {!editingAddress && (
                                            <button type="button" className="oa-edit-btn" onClick={startEditAddress} title="Edit address (fix wrong pincode, phone, etc.)">
                                                <HugeiconsIcon icon={PencilEdit02Icon} size={13} strokeWidth={2} />
                                                Edit
                                            </button>
                                        )}
                                    </div>

                                    {!editingAddress ? (
                                        <div className="odm-fields">
                                            <div className="odm-field">
                                                <span className="odm-label">Name</span>
                                                <span className="odm-value odm-bold">{selectedOrder.ShippingAddress.full_name}</span>
                                            </div>
                                            <div className="odm-field">
                                                <span className="odm-label">Address</span>
                                                <span className="odm-value">{selectedOrder.ShippingAddress.address}{selectedOrder.ShippingAddress.landmark ? `, ${selectedOrder.ShippingAddress.landmark}` : ''}</span>
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
                                    ) : (
                                        <div className="oa-form">
                                            <div className="oa-row">
                                                <label>Name<input value={addressForm.full_name} onChange={e => setAddressForm(f => ({ ...f, full_name: e.target.value }))} /></label>
                                                <label>Phone<input value={addressForm.phone} onChange={e => setAddressForm(f => ({ ...f, phone: e.target.value }))} /></label>
                                            </div>
                                            <label>Address<textarea rows={2} value={addressForm.address} onChange={e => setAddressForm(f => ({ ...f, address: e.target.value }))} /></label>
                                            <label>Landmark<input value={addressForm.landmark} onChange={e => setAddressForm(f => ({ ...f, landmark: e.target.value }))} /></label>
                                            <div className="oa-row">
                                                <label>City<input value={addressForm.city} onChange={e => setAddressForm(f => ({ ...f, city: e.target.value }))} /></label>
                                                <label>State<input value={addressForm.state} onChange={e => setAddressForm(f => ({ ...f, state: e.target.value }))} /></label>
                                            </div>
                                            <div className="oa-row">
                                                <label>Pincode<input inputMode="numeric" maxLength={6} value={addressForm.pincode} onChange={e => setAddressForm(f => ({ ...f, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))} /></label>
                                                <label>Country<input value={addressForm.country} onChange={e => setAddressForm(f => ({ ...f, country: e.target.value }))} /></label>
                                            </div>
                                            <div className="oa-actions">
                                                <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingAddress(false)} disabled={savingAddress}>Cancel</button>
                                                <button type="button" className="btn btn-primary btn-sm" onClick={saveAddress} disabled={savingAddress}>{savingAddress ? 'Saving…' : 'Save address'}</button>
                                            </div>
                                            <p className="oa-hint">After saving, click <b>Sync</b> on the order row to re-check courier serviceability for the new pincode.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Row 2: Order Info ── */}
                        <div className="odm-card">
                            <div className="odm-card-title">
                                <HugeiconsIcon icon={Calendar01Icon} size={14} strokeWidth={2} />
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
                                {selectedOrder.payment_type?.toLowerCase() === 'cod' && (
                                    <div className="odm-field">
                                        <span className="odm-label">Address (WhatsApp)</span>
                                        {selectedOrder.cod_address_confirmed ? (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--ds-color-success)' }}>
                                                <HugeiconsIcon icon={WhatsappIcon} size={13} strokeWidth={2} /> Confirmed by customer
                                                {selectedOrder.cod_address_confirmed_at && (
                                                    <span style={{ fontWeight: 500, color: 'var(--ds-color-text-muted)' }}>
                                                        · {new Date(selectedOrder.cod_address_confirmed_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>Awaiting customer confirmation</span>
                                        )}
                                    </div>
                                )}
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
                                const providerKey = s.provider || (selectedOrder.shipping_order_id || selectedOrder.shipping_waybill ? 'ithink' : null);
                                const providerLabel = providerKey ? 'iThink Logistics' : null;
                                const providerOrderId = s.provider_order_id || selectedOrder.shipping_order_id;
                                const waybill = s.waybill || selectedOrder.shipping_waybill;
                                const routeCode = s.route_code || selectedOrder.shipping_route_code;
                                const trackingNo = s.tracking_number || selectedOrder.tracking_number;
                                const courier = s.courier_name || selectedOrder.courier_name;
                                const labelUrl = s.label_url || selectedOrder.shipping_label_url;
                                const syncErr = s.sync_error || selectedOrder.shipping_sync_error;
                                const showBlock = providerOrderId || waybill || trackingNo;
                                return (
                                    <>
                                        {showBlock && (
                                            <div className="odm-fship">
                                                <div className="odm-fship-title">
                                                    <HugeiconsIcon icon={DeliveryTruck01Icon} size={13} strokeWidth={2} />
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
                                                                <HugeiconsIcon icon={Download04Icon} size={12} strokeWidth={2} />
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
                                                    <HugeiconsIcon icon={Alert02Icon} size={14} strokeWidth={2} />
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
                                <HugeiconsIcon icon={Package01Icon} size={14} strokeWidth={2} />
                                Products Ordered
                                <span className="odm-count">{selectedOrder.OrderItems?.length}</span>
                            </div>
                            <div className="odm-items">
                                {(selectedOrder.OrderItems || []).length === 0 && (
                                    <div style={{ padding: 16, color: 'var(--ds-color-text-muted)', fontSize: 13, textAlign: 'center' }}>
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

                        {/* Timeline, payments & refunds, return, failed delivery */}
                        <OrderStory orderId={selectedOrder.id} />

                        {/* Manifest Section */}
                        {(selectedOrder.Shipment?.waybill || selectedOrder.shipping_waybill) && (
                            <div className="odm-card">
                                <div className="odm-card-title">
                                    <HugeiconsIcon icon={File01Icon} size={14} strokeWidth={2} />
                                    Shipping Label
                                </div>
                                <div style={{ padding: '14px' }}>
                                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--ds-color-text-muted)' }}>
                                        Download the shipping label for this order.
                                    </p>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-md"
                                            onClick={() => generateLabelForOrder(selectedOrder.id)}
                                            disabled={generatingLabel.has(selectedOrder.id)}
                                            style={{ flex: 1 }}
                                        >
                                            <HugeiconsIcon icon={Download04Icon} size={15} strokeWidth={2} />
                                            {generatingLabel.has(selectedOrder.id) ? 'Preparing…' : 'Download Label'}
                                        </button>
                                        {selectedOrder.shipping_label_url && (
                                            <a
                                                href={selectedOrder.shipping_label_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-outline btn-md"
                                                style={{ flex: 1, justifyContent: 'center' }}
                                            >
                                                <HugeiconsIcon icon={LinkSquare02Icon} size={15} strokeWidth={2} />
                                                Open Label
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
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
