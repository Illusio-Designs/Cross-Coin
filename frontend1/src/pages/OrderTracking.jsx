import { useState } from 'react';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { trackOrderByAWB } from '../services/publicindex';
import styles from '../styles/pages/OrderTracking.css';

export default function OrderTracking() {
    const [awbNumber, setAwbNumber] = useState('');
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleTrackOrder = async (e) => {
        e.preventDefault();
        
        if (!awbNumber.trim()) {
            setError('Please enter AWB number');
            return;
        }

        setLoading(true);
        setError('');
        setOrderData(null);

        try {
            const response = await trackOrderByAWB(awbNumber.trim());
            if (response.success) {
                setOrderData(response.data);
            } else {
                setError(response.message || 'Order not found');
            }
        } catch (err) {
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
                    <p>Enter your AWB (Air Waybill) number to track your order status</p>
                    
                    <form onSubmit={handleTrackOrder} className="tracking-form">
                        <div className="form-group">
                            <label>AWB Number</label>
                            <input
                                type="text"
                                value={awbNumber}
                                onChange={(e) => setAwbNumber(e.target.value)}
                                placeholder="Enter your AWB number"
                                required
                            />
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
                                <div className="info-row">
                                    <span>AWB Number:</span>
                                    <span>{orderData.order.tracking_number}</span>
                                </div>
                                {orderData.order.courier_name && (
                                    <div className="info-row">
                                        <span>Courier:</span>
                                        <span>{orderData.order.courier_name}</span>
                                    </div>
                                )}
                                <div className="info-row">
                                    <span>Customer Type:</span>
                                    <span>{orderData.customer.type === 'guest' ? 'Guest Customer' : 'Registered Customer'}</span>
                                </div>
                            </div>

                            <div className="shipping-address">
                                <h3>Shipping Address</h3>
                                <div className="address-details">
                                    <p><strong>{orderData.shipping_address.full_name}</strong></p>
                                    <p>{orderData.shipping_address.address}</p>
                                    <p>{orderData.shipping_address.city}, {orderData.shipping_address.state} - {orderData.shipping_address.pincode}</p>
                                    <p>Phone: {orderData.shipping_address.phone}</p>
                                </div>
                            </div>

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
                                                    <p className="variation">Variant: {item.variation.name}</p>
                                                )}
                                                <p>Quantity: {item.quantity}</p>
                                                <p>Price: ₹{item.price} each</p>
                                                <p className="total">Total: ₹{item.total_price}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {orderData.status_history && orderData.status_history.length > 0 && (
                                <div className="status-history">
                                    <h3>Order Status History</h3>
                                    <div className="timeline">
                                        {orderData.status_history.map((history, index) => (
                                            <div key={index} className="timeline-item">
                                                <div className="timeline-marker" style={{ backgroundColor: getStatusColor(history.status) }}></div>
                                                <div className="timeline-content">
                                                    <h4>{getStatusText(history.status)}</h4>
                                                    <p>{history.notes}</p>
                                                    <span className="timeline-date">
                                                        {new Date(history.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {orderData.order.tracking_url && (
                                <div className="tracking-actions">
                                    <a 
                                        href={orderData.order.tracking_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="tracking-link"
                                    >
                                        Track on Courier Website
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
}
