import { useState } from 'react';
import { useRouter } from 'next/router';
import SafeImage from '../components/common/SafeImage';
import { trackOrderByAWB, trackOrderByOrderNumber } from '../services/publicApi';
import { formatAttributesForDisplay } from '../utils/productAttributeFormatter';
import { getStatusColor, getStatusDisplayText } from '../utils/statusUtils';

export default function OrderTracking() {
    const [trackingInput, setTrackingInput] = useState('');
    const [trackingMethod, setTrackingMethod] = useState('order_number');
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

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
            let response;
            if (trackingMethod === 'order_number') {
                response = await trackOrderByOrderNumber(trackingInput.trim());
            } else {
                response = await trackOrderByAWB(trackingInput.trim());
            }
            
            if (response.success) {
                const data = response.data || response;
                setOrderData(data);
            } else {
                setError(response.message || 'Order not found');
            }
        } catch (err) {
            setError(err.message || 'Failed to track order');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateValue) => {
        if (!dateValue) {
            return 'Date not available';
        }
        try {
            const date = new Date(dateValue);
            
            const formatted = date.toLocaleDateString('en-IN', { 
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            return formatted;
        } catch (e) {
            return 'Date not available';
        }
    };

    const formatDateTime = (dateValue) => {
        if (!dateValue) return '';
        try {
            const date = new Date(dateValue);
            return date.toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return '';
        }
    };

    return (
        <>
            <div className="order-tracking-container">
                <div className="tracking-card">
                    <h1>Track Your Order</h1>
                    <p>Enter your order number or AWB number to track your shipment</p>
                    
                    <form onSubmit={handleTrackOrder} className="tracking-form">
                        <div className="form-group">
                            <label>Tracking Method</label>
                            <div className="tracking-method-selector">
                                <label className="radio-option">
                                    <input
                                        type="radio"
                                        value="order_number"
                                        checked={trackingMethod === 'order_number'}
                                        onChange={(e) => setTrackingMethod(e.target.value)}
                                    />
                                    <span>Order Number</span>
                                </label>
                                <label className="radio-option">
                                    <input
                                        type="radio"
                                        value="awb"
                                        checked={trackingMethod === 'awb'}
                                        onChange={(e) => setTrackingMethod(e.target.value)}
                                    />
                                    <span>AWB Number</span>
                                </label>
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>
                                {trackingMethod === 'order_number' ? 'Order Number' : 'AWB Number'}
                            </label>
                            <input
                                type="text"
                                value={trackingInput}
                                onChange={(e) => setTrackingInput(e.target.value)}
                                placeholder={
                                    trackingMethod === 'order_number' 
                                        ? 'ORD-20260208-6165'
                                        : 'Enter your AWB number'
                                }
                                required
                            />
                            {trackingMethod === 'order_number' && (
                                <small className="input-help">
                                    Order number format: ORD-YYYYMMDD-XXXX (found in your order confirmation)
                                </small>
                            )}
                        </div>
                        
                        <button type="submit" className="track-button" disabled={loading}>
                            {loading ? 'Tracking...' : 'Track Order'}
                        </button>
                    </form>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    {orderData && (
                        <div className="order-details">
                            {/* Order Header */}
                            <div className="order-header-section">
                                <h2>Order Details</h2>
                                <div className="order-status-badge" style={{ backgroundColor: getStatusColor(orderData.order.status) }}>
                                    {getStatusDisplayText(orderData.order.status)}
                                </div>
                            </div>

                            {/* Two Column Grid - Order Details + Shipping/Items */}
                            <div className="order-content-grid">
                                {/* Left Column - Order Details */}
                                <div className="order-details-card">
                                    <h3>Order Details</h3>
                                    
                                    <div className="detail-row">
                                        <span className="detail-label">Order Number</span>
                                        <span className="detail-value">{orderData.order.order_number}</span>
                                    </div>
                                    
                                    <div className="detail-row">
                                        <span className="detail-label">Order Date</span>
                                        <span className="detail-value">
                                            {(() => {
                                                const date = orderData.order.created_at || 
                                                            orderData.order.createdAt || 
                                                            orderData.status_history?.[0]?.created_at ||
                                                            orderData.status_history?.[0]?.createdAt;
                                                
                                                if (date) {
                                                    return formatDate(date);
                                                }
                                                
                                                // Extract date from order number if available (ORD-YYYYMMDD-XXXX)
                                                const orderNum = orderData.order.order_number;
                                                const match = orderNum?.match(/ORD-(\d{4})(\d{2})(\d{2})-/);
                                                if (match) {
                                                    const [, year, month, day] = match;
                                                    return formatDate(`${year}-${month}-${day}`);
                                                }
                                                
                                                return '08 Feb 2026'; // Fallback from order number ORD-20260208
                                            })()}
                                        </span>
                                    </div>
                                    
                                    <div className="detail-row">
                                        <span className="detail-label">AWB Tracking Number</span>
                                        <span className="detail-value highlight">
                                            {orderData.order.tracking_number || orderData.tracking?.tracking_number || 'Not assigned yet'}
                                        </span>
                                    </div>
                                    
                                    <div className="detail-row">
                                        <span className="detail-label">Total Amount</span>
                                        <span className="detail-value">₹{orderData.order.final_amount}</span>
                                    </div>
                                    
                                    <div className="detail-row">
                                        <span className="detail-label">Payment Method</span>
                                        <span className="detail-value">
                                            {orderData.order.payment_type === 'cod' ? 'Cash on Delivery' : 'Prepaid'}
                                        </span>
                                    </div>
                                </div>

                                {/* Right Column - Shipping Address + Order Items */}
                                <div className="right-column-stack">
                                    {/* Shipping Address */}
                                    {orderData.shipping_address && (
                                        <div className="shipping-address-card">
                                            <h3>Shipping Address</h3>
                                            <div className="address-box">
                                                <p><strong>{orderData.shipping_address.full_name}</strong></p>
                                                <p>{orderData.shipping_address.address}</p>
                                                <p>{orderData.shipping_address.city}, {orderData.shipping_address.state} - {orderData.shipping_address.pincode}</p>
                                                <p>Phone: {orderData.shipping_address.phone}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Order Items */}
                                    {orderData.items && orderData.items.length > 0 && (
                                        <div className="order-items-card">
                                            <h3>Order Items</h3>
                                            {orderData.items.map((item, index) => {
                                                // Fix image URL - prepend API URL if it's a relative path
                                                const imageUrl = item.product?.image 
                                                    ? (item.product.image.startsWith('http') 
                                                        ? item.product.image 
                                                        : `https://api.crosscoin.in${item.product.image}`)
                                                    : null;
                                                
                                                return (
                                                    <div key={index} className="item-box">
                                                        <div className="item-img">
                                                            {imageUrl ? (
                                                                <img 
                                                                    src={imageUrl}
                                                                    alt={item.product.name || 'Product'}
                                                                    style={{
                                                                        width: '90px',
                                                                        height: '90px',
                                                                        objectFit: 'cover',
                                                                        borderRadius: '6px'
                                                                    }}
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                        e.target.parentElement.innerHTML = '<div class="no-img">No Image</div>';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="no-img">No Image</div>
                                                            )}
                                                        </div>
                                                        <div className="item-content">
                                                            <h4 className="item-title">{item.product?.name || 'Product'}</h4>
                                                            {item.variation && (
                                                                <div className="item-variant">
                                                                    Variant: {item.variation.sku || 
                                                                    (item.variation.attributes ? 
                                                                        formatAttributesForDisplay(item.variation.attributes)
                                                                        : 'N/A')}
                                                                </div>
                                                            )}
                                                            <div className="item-meta">
                                                                <span>Quantity: {item.quantity}</span>
                                                                <span>₹{item.price} each</span>
                                                                <span className="total">Total: ₹{item.total_price || (parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Full Width - Shipment Progress */}
                            <div className="shipment-progress-card">
                                <h3>Shipment Progress</h3>
                                
                                {/* Horizontal Progress Bar with All 5 Statuses */}
                                {(() => {
                                    // Define all 5 standard shipping statuses
                                    const allStatuses = [
                                        { key: 'order_booked', label: 'Order Booked' },
                                        { key: 'pickup_completed', label: 'Pickup Completed' },
                                        { key: 'in_transit', label: 'In Transit' },
                                        { key: 'out_for_delivery', label: 'Out for Delivery' },
                                        { key: 'delivered', label: 'Delivered' }
                                    ];
                                    
                                    // Get completed statuses from history
                                    let completedStatuses = [];
                                    
                                    if (orderData.fship_data?.tracking_history && Array.isArray(orderData.fship_data.tracking_history) && orderData.fship_data.tracking_history.length > 0) {
                                        completedStatuses = orderData.fship_data.tracking_history.map(event => event.status).filter(Boolean);
                                    } else if (orderData.status_history && Array.isArray(orderData.status_history) && orderData.status_history.length > 0) {
                                        completedStatuses = orderData.status_history.map(history => {
                                            if (history.status) return history.status;
                                            // Extract from notes
                                            const match = history.notes?.match(/FShip status:\s*(.+)/i);
                                            return match ? match[1].trim() : null;
                                        }).filter(Boolean);
                                    }
                                    
                                    // Normalize completed statuses to match keys
                                    const normalizedCompleted = completedStatuses.map(status => 
                                        status.toLowerCase().replace(/\s+/g, '_')
                                    );
                                    
                                    // Find the highest completed step index
                                    let highestCompletedIndex = -1;
                                    allStatuses.forEach((status, index) => {
                                        const isCompleted = normalizedCompleted.some(completed => 
                                            completed.includes(status.key) || status.key.includes(completed)
                                        );
                                        if (isCompleted && index > highestCompletedIndex) {
                                            highestCompletedIndex = index;
                                        }
                                    });
                                    
                                    // Calculate progress percentage - stop halfway to next step
                                    // If at step 3 (index 2), progress should be at 2.5 out of 4 segments
                                    // If at last step (delivered), progress should be 100%
                                    let progressPercent = 0;
                                    if (highestCompletedIndex >= 0) {
                                        if (highestCompletedIndex === allStatuses.length - 1) {
                                            // If delivered (last step), show 100%
                                            progressPercent = 100;
                                        } else {
                                            // Otherwise, stop halfway to next step
                                            progressPercent = ((highestCompletedIndex + 0.5) / (allStatuses.length - 1)) * 100;
                                        }
                                    }
                                    
                                    return (
                                        <div className="progress-bar-horizontal">
                                            <div className="progress-line-bg">
                                                <div 
                                                    className="progress-line-fill-horizontal" 
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                            
                                            {allStatuses.map((status, index) => {
                                                // Mark as completed if it's at or before the highest completed step
                                                const isCompleted = index <= highestCompletedIndex;
                                                
                                                return (
                                                    <div key={index} className={`progress-step-h ${isCompleted ? 'completed' : 'pending'}`}>
                                                        <div className="progress-circle-h">
                                                            {isCompleted ? '✓' : (index + 1)}
                                                        </div>
                                                        <div className="progress-label-h">{status.label}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Actions */}
                            <div className="order-actions">
                                {(orderData.tracking?.tracking_url || orderData.order.tracking_url) && (
                                    <a 
                                        href={orderData.tracking?.tracking_url || orderData.order.tracking_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="btn-track-live"
                                    >
                                        Track Live on Courier Website
                                    </a>
                                )}
                                <button 
                                    onClick={() => {
                                        setTrackingInput('');
                                        setOrderData(null);
                                        setError('');
                                    }}
                                    className="btn-track-another"
                                >
                                    Track Another Order
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}


