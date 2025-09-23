import Footer from "../components/Footer";
import Header from "../components/Header";
import { useRouter } from "next/router";
import { useState } from "react";
import { getGuestOrder } from "../services/publicindex";
import "../styles/pages/ThankYou.css"; // Import new stylesheet

export default function ThankYou() {
  const router = useRouter();
  const { order_number, guest_email, is_guest } = router.query;
  const [showGuestTracking, setShowGuestTracking] = useState(false);
  const [guestEmail, setGuestEmail] = useState(guest_email || "");
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Calculate estimated delivery date (e.g., 5 days from now)
  const getDeliveryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 5);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleShopAgain = () => {
    router.push('/Products');
  };

  const handleTrackOrder = () => {
    if (is_guest === 'true') {
      // For guest users, show guest tracking form
      setShowGuestTracking(true);
    } else {
      // For authenticated users, redirect to profile page
      router.push('/profile');
    }
  };

  const handleGuestTrackOrder = async () => {
    if (!guestEmail || !order_number) {
      alert('Please enter your email address');
      return;
    }

    setTrackingLoading(true);
    try {
      const result = await getGuestOrder(guestEmail, order_number);
      setTrackingResult(result);
    } catch (error) {
      console.error('Guest tracking error:', error);
      setTrackingResult({ 
        success: false, 
        message: error.message || 'Failed to track order' 
      });
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="thankyou-container">
        <div className="thankyou-icon-container">
            <span className="thankyou-icon">✓</span>
        </div>
        <h1>Thank you for your order!</h1>
        {order_number && (
          <p className="order-confirmation">
            Your order <strong>#{order_number}</strong> has been placed.
          </p>
        )}
        <p className="thankyou-desc">
          {is_guest === 'true' 
            ? `An email confirmation has been sent to ${guest_email}.`
            : 'An email confirmation has been sent to your registered email address.'
          }
        </p>
        <div className="delivery-info">
            Estimated delivery by <strong>{getDeliveryDate()}</strong>
        </div>
        
        {/* Guest Tracking Form */}
        {showGuestTracking && (
          <div className="guest-tracking-form" style={{
            background: '#f8f9fa',
            padding: '20px',
            borderRadius: '8px',
            margin: '20px 0',
            border: '1px solid #dee2e6'
          }}>
            <h3 style={{ marginBottom: '15px', color: '#333' }}>Track Your Order</h3>
            <div style={{ marginBottom: '15px' }}>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="Enter your email address"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
              />
            </div>
            <button 
              onClick={handleGuestTrackOrder}
              disabled={trackingLoading}
              style={{
                background: '#180D3E',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: trackingLoading ? 'not-allowed' : 'pointer',
                marginRight: '10px'
              }}
            >
              {trackingLoading ? 'Tracking...' : 'Track Order'}
            </button>
            <button 
              onClick={() => setShowGuestTracking(false)}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            
            {/* Tracking Result */}
            {trackingResult && (
              <div style={{
                marginTop: '15px',
                padding: '10px',
                borderRadius: '4px',
                background: trackingResult.success ? '#d4edda' : '#f8d7da',
                color: trackingResult.success ? '#155724' : '#721c24',
                border: `1px solid ${trackingResult.success ? '#c3e6cb' : '#f5c6cb'}`
              }}>
                {trackingResult.success ? (
                  <div>
                    <p><strong>Order Status:</strong> {trackingResult.data?.status || 'Unknown'}</p>
                    <p><strong>Order Date:</strong> {trackingResult.data?.created_at ? new Date(trackingResult.data.created_at).toLocaleDateString() : 'Unknown'}</p>
                    {trackingResult.data?.tracking_info && (
                      <p><strong>Tracking Info:</strong> {trackingResult.data.tracking_info}</p>
                    )}
                  </div>
                ) : (
                  <p>{trackingResult.message}</p>
                )}
              </div>
            )}
          </div>
        )}
        
        <div className="thankyou-buttons">
          <button className="shop-again" onClick={handleShopAgain}>Continue Shopping</button>
          <button className="track-order" onClick={handleTrackOrder}>Track Your Order</button>
        </div>
      </div>
      <Footer />
    </>
  );
} 