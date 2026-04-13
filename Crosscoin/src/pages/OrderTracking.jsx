import { useState } from 'react';
import { trackOrderByAWB, trackOrderByOrderNumber } from '../services/publicApi';
import { formatAttributesForDisplay } from '../utils/productAttributeFormatter';
import { getStatusColor, getStatusDisplayText } from '../utils/statusUtils';

const STEPS = [
    { key: 'placed', label: 'Order Placed' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'dispatched', label: 'Packed & Dispatched' },
    { key: 'out_for_delivery', label: 'Out for Delivery' },
    { key: 'delivered', label: 'Delivered' },
];

// Map order.status directly to stepper index
function getStepIndex(orderData) {
    const status = (orderData?.order?.status || '').toLowerCase();

    if (status === 'delivered') return 4;
    if (status === 'out_for_delivery' || status === 'out for delivery') return 3;
    if (status === 'shipped' || status === 'in_transit' || status === 'in transit' ||
        status === 'processing' || status === 'booked' || status === 'pickup_initiated' ||
        status === 'manifested') return 2;
    if (status === 'confirmed') return 1;
    // pending / cancelled / unknown
    return 0;
}

function formatDate(dateValue) {
    if (!dateValue) return 'N/A';
    try {
        return new Date(dateValue).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return 'N/A'; }
}

function formatDateTime(dateValue) {
    if (!dateValue) return '';
    try {
        return new Date(dateValue).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
        });
    } catch { return ''; }
}

function getOrderDate(orderData) {
    // Try order-level date fields first
    const date = orderData.order.created_at || orderData.order.createdAt;
    if (date) return formatDate(date);
    // Fall back to parsing from order number: ORD-YYYYMMDD-XXXX
    const match = orderData.order.order_number?.match(/ORD-(\d{4})(\d{2})(\d{2})-/);
    if (match) return formatDate(`${match[1]}-${match[2]}-${match[3]}`);
    return 'N/A';
}

function getTimeline(orderData) {
    // Use fship tracking history if available
    const fshipHistory = orderData?.fship_data?.tracking_history;
    if (fshipHistory && Array.isArray(fshipHistory) && fshipHistory.length > 0) {
        return [...fshipHistory].reverse().map(h => ({
            status: h.status,
            note: h.location || h.description || '',
            time: h.timestamp || h.created_at || ''
        }));
    }

    // Fall back to status_history — use real status field directly
    const statusHistory = orderData?.status_history;
    const finalStatus = (orderData?.order?.status || '').toLowerCase();

    if (statusHistory && Array.isArray(statusHistory) && statusHistory.length > 0) {
        // If order is not cancelled, filter out intermediate cancelled entries
        // (e.g. admin cancelled then reinstated) — only keep if final status is cancelled
        const filtered = finalStatus !== 'cancelled'
            ? statusHistory.filter(h => h.status !== 'cancelled')
            : statusHistory;

        return [...filtered].reverse().map(h => ({
            status: h.status,
            note: h.notes || '',
            time: h.created_at || h.createdAt || ''
        })).filter(item => item.status);
    }
    return [];
}

export default function OrderTracking() {
    const [trackingInput, setTrackingInput] = useState('');
    const [trackingMethod, setTrackingMethod] = useState('order_number');
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleTrackOrder = async (e) => {
        e.preventDefault();
        if (!trackingInput.trim()) {
            setError(`Please enter ${trackingMethod === 'order_number' ? 'order number' : 'AWB number'}`);
            return;
        }
        setLoading(true);
        setError('');
        setOrderData(null);
        try {
            const response = trackingMethod === 'order_number'
                ? await trackOrderByOrderNumber(trackingInput.trim())
                : await trackOrderByAWB(trackingInput.trim());
            if (response.success) {
                setOrderData(response.data || response);
            } else {
                setError(response.message || 'Order not found');
            }
        } catch (err) {
            setError(err.message || 'Failed to track order');
        } finally {
            setLoading(false);
        }
    };

    const activeStep = orderData ? getStepIndex(orderData) : -1;
    const timeline = orderData ? getTimeline(orderData) : [];

    return (
        <div className="ot-page">
            {/* Search Bar */}
            <div className="ot-search-bar">
                <div className="ot-search-inner">
                    <h1 className="ot-title">Track Your <span>Order</span></h1>
                    <form onSubmit={handleTrackOrder} className="ot-form">
                        <div className="ot-method-toggle">
                            <button
                                type="button"
                                className={`ot-toggle-btn ${trackingMethod === 'order_number' ? 'active' : ''}`}
                                onClick={() => setTrackingMethod('order_number')}
                            >
                                Order Number
                            </button>
                            <button
                                type="button"
                                className={`ot-toggle-btn ${trackingMethod === 'awb' ? 'active' : ''}`}
                                onClick={() => setTrackingMethod('awb')}
                            >
                                AWB Number
                            </button>
                        </div>
                        <div className="ot-input-row">
                            <input
                                type="text"
                                value={trackingInput}
                                onChange={(e) => setTrackingInput(e.target.value)}
                                placeholder={trackingMethod === 'order_number' ? 'e.g. CC-M5KXQR8-A3F1B2' : 'Enter AWB number'}
                                className="ot-input"
                            />
                            <button type="submit" className="ot-track-btn" disabled={loading}>
                                {loading ? 'Tracking...' : 'Track'}
                            </button>
                        </div>
                    </form>
                    {error && <div className="ot-error">{error}</div>}
                </div>
            </div>

            {orderData && (
                <div className="ot-content">
                    {/* Order Header Card */}
                    <div className="ot-card ot-header-card">
                        <div className="ot-header-info">
                            <div className="ot-header-row">
                                <span className="ot-order-id">#{orderData.order.order_number}</span>
                                <span
                                    className="ot-status-pill"
                                    style={{ backgroundColor: getStatusColor(orderData.order.status) }}
                                >
                                    {getStatusDisplayText(orderData.order.status)}
                                </span>
                            </div>
                            <div className="ot-header-meta">
                                <span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                    {getOrderDate(orderData)}
                                </span>
                                <span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                                    {orderData.items?.length || 0} item{orderData.items?.length !== 1 ? 's' : ''}
                                </span>
                                <span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                                    ₹{orderData.order.final_amount}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Stepper */}
                    <div className="ot-card ot-stepper-card">
                        <h2 className="ot-card-title">Shipment Progress</h2>
                        <div className="ot-stepper">
                            <div className="ot-stepper-line">
                                <div
                                    className="ot-stepper-fill"
                                    style={{ width: activeStep >= 0 ? `${(activeStep / (STEPS.length - 1)) * 100}%` : '0%' }}
                                />
                            </div>
                            {STEPS.map((step, i) => {
                                const isCompleted = i < activeStep;
                                const isActive = i === activeStep;
                                return (
                                    <div key={step.key} className={`ot-step ${isCompleted || isActive ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                                        <div className="ot-step-circle">
                                            {isCompleted || isActive
                                                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                                : <span className="ot-step-num">{i + 1}</span>
                                            }
                                        </div>
                                        <div className="ot-step-label">{step.label}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="ot-grid">
                        {/* Timeline */}
                        <div className="ot-card ot-timeline-card">
                            <h2 className="ot-card-title">Tracking Timeline</h2>
                            {timeline.length > 0 ? (
                                <div className="ot-timeline">
                                    {timeline.map((event, i) => (
                                        <div key={i} className={`ot-timeline-item ${i === 0 ? 'latest' : ''}`}>
                                            <div className="ot-timeline-dot" />
                                            <div className="ot-timeline-content">
                                                <div className="ot-timeline-status">{getStatusDisplayText(event.status)}</div>
                                                {event.note && <div className="ot-timeline-note">{event.note}</div>}
                                                {event.time && <div className="ot-timeline-time">{formatDateTime(event.time)}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="ot-no-data">No tracking events yet.</p>
                            )}
                        </div>

                        {/* Order Items */}
                        <div className="ot-card ot-items-card">
                            <h2 className="ot-card-title">Order Items</h2>
                            {orderData.items?.map((item, i) => {
                                const rawImage = item.product?.image;
                                const imageUrl = rawImage
                                    ? (rawImage.startsWith('http') ? rawImage : `https://api.crosscoin.in${rawImage}`)
                                    : null;
                                const attrsDisplay = item.variation?.attributes ? formatAttributesForDisplay(item.variation.attributes) : null;
                                const noImgPlaceholder = (
                                    <div className="ot-item-no-img">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                    </div>
                                );
                                return (
                                    <div key={i} className="ot-item">
                                        <div className="ot-item-img">
                                            {imageUrl
                                                ? <img src={imageUrl} alt={item.product?.name}
                                                    onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<div class="ot-item-no-img"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>'; }} />
                                                : noImgPlaceholder
                                            }
                                        </div>
                                        <div className="ot-item-info">
                                            <div className="ot-item-name">{item.product?.name || 'Product'}</div>
                                            <div className="ot-item-tags">
                                                {item.variation?.sku && (
                                                    <span className="ot-tag">SKU: {item.variation.sku}</span>
                                                )}
                                                {attrsDisplay && attrsDisplay !== 'N/A' && (
                                                    <span className="ot-tag">{attrsDisplay}</span>
                                                )}
                                                <span className="ot-tag">Qty: {item.quantity}</span>
                                            </div>
                                            <div className="ot-item-price">₹{item.total_price || (parseFloat(item.price) * item.quantity).toFixed(2)}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Delivery & Payment Info */}
                    <div className="ot-grid ot-grid-2">
                        <div className="ot-card">
                            <h2 className="ot-card-title">Delivery Address</h2>
                            {orderData.shipping_address ? (
                                <div className="ot-address">
                                    <div className="ot-address-name">{orderData.shipping_address.full_name}</div>
                                    <div className="ot-address-line">{orderData.shipping_address.address}</div>
                                    <div className="ot-address-line">{orderData.shipping_address.city}, {orderData.shipping_address.state} - {orderData.shipping_address.pincode}</div>
                                    <div className="ot-address-line">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                                        {orderData.shipping_address.phone}
                                    </div>
                                </div>
                            ) : <p className="ot-no-data">No address available.</p>}
                        </div>

                        <div className="ot-card">
                            <h2 className="ot-card-title">Payment Info</h2>
                            <div className="ot-detail-rows">
                                <div className="ot-detail-row">
                                    <span>Payment Method</span>
                                    <span>{orderData.order.payment_type === 'cod' ? 'Cash on Delivery' : 'Prepaid'}</span>
                                </div>
                                <div className="ot-detail-row">
                                    <span>AWB Number</span>
                                    <span className="ot-awb">{orderData.order.tracking_number || orderData.tracking?.tracking_number || 'Not assigned'}</span>
                                </div>
                                <div className="ot-detail-row ot-total-row">
                                    <span>Total Amount</span>
                                    <span>₹{orderData.order.final_amount}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="ot-card ot-actions">
                        {(orderData.tracking?.tracking_url || orderData.order.tracking_url) && (
                            <a
                                href={orderData.tracking?.tracking_url || orderData.order.tracking_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ot-btn ot-btn-outline"
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
                                Track Shipment
                            </a>
                        )}
                        <button
                            className="ot-btn ot-btn-ghost"
                            onClick={() => { setTrackingInput(''); setOrderData(null); setError(''); }}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            Track Another Order
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
