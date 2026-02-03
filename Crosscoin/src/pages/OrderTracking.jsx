import { useState } from 'react';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SafeImage from '../components/common/SafeImage';
import { trackOrderByAWB, trackOrderByOrderNumber } from '../services/publicindex';
import { formatAttributesForDisplay } from '../utils/productAttributeFormatter';
import { getStatusColor, getStatusDisplayText } from '../utils/statusUtils';
import styles from '../styles/pages/OrderTracking.css';

export default function OrderTracking() {
    const [trackingInput, setTrackingInput] = useState('');
    const [trackingMethod, setTrackingMethod] = useState('order_number'); // 'order_number' or 'awb'
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
                console.log('🔍 Tracking by order number:', trackingInput.trim());
                response = await trackOrderByOrderNumber(trackingInput.trim());
            } else {
                console.log('🔍 Tracking by AWB:', trackingInput.trim());
                response = await trackOrderByAWB(trackingInput.trim());
            }
            
            console.log('📦 Tracking response:', response);
            
            if (response.success) {
                setOrderData(response.data || response);
                console.log('✅ Order data set:', response.data || response);
            } else {
                setError(response.message || 'Order not found');
            }
        } catch (err) {
            console.error('❌ Tracking error:', err);
            setError(err.message || 'Failed to track order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Header />
            <div className="order-tracking-container">
                <div className="tracking-card">
                    <h1>Track Your Order</h1>
                    <p>Enter your order number or AWB number to track your order status</p>
                    
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
                                        ? 'Enter your order number (e.g., ORD-20251229-2449)'
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
                            <div className="order-header">
                                <h2>Order Details</h2>
                                <div className="order-status" style={{ color: getStatusColor(orderData.order.status) }}>
                                    {getStatusDisplayText(orderData.order.status)}
                                </div>
                            </div>

                            <div className="order-info">
                                <div className="info-row">
                                    <span>Order Number:</span>
                                    <span>{orderData.order.order_number}</span>
                                </div>
                                <div className="info-row">
                                    <span>Order Date:</span>
                                    <span>
                                        {orderData.order.created_at || orderData.order.createdAt 
                                            ? new Date(orderData.order.created_at || orderData.order.createdAt).toLocaleDateString('en-IN', { 
                                                year: 'numeric', 
                                                month: 'long', 
                                                day: 'numeric' 
                                            })
                                            : 'Date not available'
                                        }
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span>Total Amount:</span>
                                    <span>₹{orderData.order.final_amount}</span>
                                </div>
                                <div className="info-row">
                                    <span>Payment Method:</span>
                                    <span>{orderData.order.payment_type === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</span>
                                </div>
                                
                                {/* Enhanced Tracking Information */}
                                {orderData.tracking && (
                                    <>
                                        {orderData.tracking.tracking_number && (
                                            <div className="info-row">
                                                <span>AWB Number:</span>
                                                <span className="tracking-number">{orderData.tracking.tracking_number}</span>
                                            </div>
                                        )}
                                        {orderData.tracking.courier_name && (
                                            <div className="info-row">
                                                <span>Courier:</span>
                                                <span>{orderData.tracking.courier_name}</span>
                                            </div>
                                        )}
                                        {orderData.tracking.tracking_url && (
                                            <div className="info-row">
                                                <span>Live Tracking:</span>
                                                <a 
                                                    href={orderData.tracking.tracking_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="tracking-link-inline"
                                                >
                                                    Track on Courier Website
                                                </a>
                                            </div>
                                        )}
                                    </>
                                )}
                                
                                {/* Fallback for old data structure */}
                                {!orderData.tracking && orderData.order.tracking_number && (
                                    <div className="info-row">
                                        <span>AWB Number:</span>
                                        <span className="tracking-number">{orderData.order.tracking_number}</span>
                                    </div>
                                )}
                                {!orderData.tracking && orderData.order.courier_name && (
                                    <div className="info-row">
                                        <span>Courier:</span>
                                        <span>{orderData.order.courier_name}</span>
                                    </div>
                                )}
                                
                                <div className="info-row">
                                    <span>Customer Type:</span>
                                    <span>{orderData.customer.type === 'guest' ? 'Guest Customer' : 'Registered Customer'}</span>
                                </div>
                                
                                {/* Show update information if available */}
                                {orderData.update_result && orderData.update_result.updated && (
                                    <div className="update-info">
                                        <small className="update-notice">
                                            ✅ Order information updated from FShip
                                            {orderData.update_result.status_changed && (
                                                <span> - Status updated to {getStatusDisplayText(orderData.order.status)}</span>
                                            )}
                                        </small>
                                    </div>
                                )}
                            </div>

                            {orderData.shipping_address && (
                                <div className="shipping-address">
                                    <h3>Shipping Address</h3>
                                    <div className="address-details">
                                        <p><strong>{orderData.shipping_address.full_name}</strong></p>
                                        <p>{orderData.shipping_address.address}</p>
                                        <p>{orderData.shipping_address.city}, {orderData.shipping_address.state} - {orderData.shipping_address.pincode}</p>
                                        <p>Phone: {orderData.shipping_address.phone}</p>
                                    </div>
                                </div>
                            )}

                            {orderData.items && orderData.items.length > 0 && (
                                <div className="order-items">
                                    <h3>Order Items</h3>
                                    <div className="items-list">
                                        {orderData.items.map((item, index) => (
                                            <div key={index} className="item">
                                                <div className="item-image">
                                                    {item.product.image ? (
                                                        <SafeImage 
                                                            imageData={{ image_url: item.product.image }}
                                                            alt={item.product.name}
                                                            width="100px"
                                                            height="100px"
                                                            style={{ objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <div className="no-image">No Image</div>
                                                    )}
                                                </div>
                                                <div className="item-details">
                                                    <h4>{item.product.name}</h4>
                                                    {item.variation && (
                                                        <p className="variation">
                                                            Variant: {item.variation.sku || 
                                                            (item.variation.attributes ? 
                                                                formatAttributesForDisplay(item.variation.attributes)
                                                                : 'N/A')}
                                                        </p>
                                                    )}
                                                    <p>Quantity: {item.quantity}</p>
                                                    <p>Price: ₹{item.price} each</p>
                                                    <p className="total">Total: ₹{item.total_price}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {orderData.status_history && orderData.status_history.length > 0 && (
                                <div className="status-history">
                                    <h3>Order Status History</h3>
                                    <div className="timeline">
                                        {orderData.status_history.map((history, index) => (
                                            <div key={index} className="timeline-item">
                                                <div className="timeline-marker" style={{ backgroundColor: getStatusColor(history.status) }}></div>
                                                <div className="timeline-content">
                                                    <h4>{getStatusDisplayText(history.status)}</h4>
                                                    {history.notes && <p>{history.notes}</p>}
                                                    <span className="timeline-date">
                                                        {new Date(history.createdAt || history.created_at).toLocaleString('en-IN', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                    {history.created_by && (
                                                        <span className="timeline-source">
                                                            {history.created_by === 'fship_sync' || history.created_by === 'fship_webhook' || history.created_by === 'fship_tracking' ? '(Auto-updated from FShip)' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Enhanced FShip Data Display */}
                            {orderData.fship_data && (
                                <div className="fship-info">
                                    <h3>FShip Shipping Details</h3>
                                    <div className="fship-details">
                                        <div className="info-row">
                                            <span>FShip Status:</span>
                                            <span>{orderData.fship_data.order_status}</span>
                                        </div>
                                        {orderData.fship_data.tracking_history && Array.isArray(orderData.fship_data.tracking_history) && orderData.fship_data.tracking_history.length > 0 && (
                                            <div className="tracking-history-info">
                                                <h4>Tracking History:</h4>
                                                {orderData.fship_data.tracking_history.map((event, index) => (
                                                    <div key={index} className="tracking-event">
                                                        <div className="info-row">
                                                            <span>Status:</span>
                                                            <span>{event.status}</span>
                                                        </div>
                                                        {event.location && (
                                                            <div className="info-row">
                                                                <span>Location:</span>
                                                                <span>{event.location}</span>
                                                            </div>
                                                        )}
                                                        {event.timestamp && (
                                                            <div className="info-row">
                                                                <span>Date:</span>
                                                                <span>{new Date(event.timestamp).toLocaleString('en-IN', {
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tracking Actions */}
                            <div className="tracking-actions">
                                {orderData.tracking?.tracking_url && (
                                    <a 
                                        href={orderData.tracking.tracking_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="tracking-link"
                                    >
                                        🚚 Track on Courier Website
                                    </a>
                                )}
                                
                                {/* Fallback for old data structure */}
                                {!orderData.tracking?.tracking_url && orderData.order.tracking_url && (
                                    <a 
                                        href={orderData.order.tracking_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="tracking-link"
                                    >
                                        🚚 Track on Courier Website
                                    </a>
                                )}
                                
                                <button 
                                    onClick={() => {
                                        setTrackingInput('');
                                        setOrderData(null);
                                        setError('');
                                    }}
                                    className="track-another-button"
                                >
                                    Track Another Order
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
}
