import { useState } from 'react';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { trackOrderByAWB, trackOrderByOrderNumber } from '../services/publicindex';
import { formatAttributesForDisplay } from '../utils/productAttributeFormatter';
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#F59E0B';
            case 'processing': return '#180D3E';
            case 'shipped': return '#CE1E36';
            case 'delivered': return '#10B981';
            case 'cancelled': return '#EF4444';
            case 'returned': return '#6B7280';
            default: return '#6B7280';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'pending': return 'Order Pending';
            case 'processing': return 'Processing';
            case 'shipped': return 'Shipped';
            case 'delivered': return 'Delivered';
            case 'cancelled': return 'Cancelled';
            case 'returned': return 'Returned';
            default: return status;
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
                                    {getStatusText(orderData.order.status)}
                                </div>
                            </div>

                            <div className="order-info">
                                <div className="info-row">
                                    <span>Order Number:</span>
                                    <span>{orderData.order.order_number}</span>
                                </div>
                                <div className="info-row">
                                    <span>Order Date:</span>
                                    <span>{new Date(orderData.order.created_at).toLocaleDateString()}</span>
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
                                            ✅ Order information updated from Shiprocket
                                            {orderData.update_result.status_changed && (
                                                <span> - Status updated to {getStatusText(orderData.order.status)}</span>
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
                                                        <img src={item.product.image} alt={item.product.name} />
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
                                                    <h4>{getStatusText(history.status)}</h4>
                                                    {history.notes && <p>{history.notes}</p>}
                                                    <span className="timeline-date">
                                                        {new Date(history.created_at).toLocaleString()}
                                                    </span>
                                                    {history.created_by && (
                                                        <span className="timeline-source">
                                                            {history.created_by === 'shiprocket_sync' ? '(Auto-updated from Shiprocket)' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Enhanced Shiprocket Data Display */}
                            {orderData.shiprocket_data && (
                                <div className="shiprocket-info">
                                    <h3>Shipping Details</h3>
                                    <div className="shiprocket-details">
                                        <div className="info-row">
                                            <span>Shiprocket Status:</span>
                                            <span>{orderData.shiprocket_data.order_status}</span>
                                        </div>
                                        {orderData.shiprocket_data.shipments && Array.isArray(orderData.shiprocket_data.shipments) && orderData.shiprocket_data.shipments.length > 0 && (
                                            <div className="shipments-info">
                                                <h4>Shipment Details:</h4>
                                                {orderData.shiprocket_data.shipments.map((shipment, index) => (
                                                    <div key={index} className="shipment-item">
                                                        <div className="info-row">
                                                            <span>Shipment Status:</span>
                                                            <span>{shipment.status}</span>
                                                        </div>
                                                        {shipment.awb && (
                                                            <div className="info-row">
                                                                <span>AWB:</span>
                                                                <span>{shipment.awb}</span>
                                                            </div>
                                                        )}
                                                        {shipment.courier_name && (
                                                            <div className="info-row">
                                                                <span>Courier:</span>
                                                                <span>{shipment.courier_name}</span>
                                                            </div>
                                                        )}
                                                        {shipment.pickup_date && (
                                                            <div className="info-row">
                                                                <span>Pickup Date:</span>
                                                                <span>{new Date(shipment.pickup_date).toLocaleDateString()}</span>
                                                            </div>
                                                        )}
                                                        {shipment.delivered_date && (
                                                            <div className="info-row">
                                                                <span>Delivered Date:</span>
                                                                <span>{new Date(shipment.delivered_date).toLocaleDateString()}</span>
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
