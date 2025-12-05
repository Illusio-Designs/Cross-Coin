import Footer from "../components/Footer";
import Header from "../components/Header";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { getGuestOrder, getUserOrders } from "../services/publicindex";
import { useAuth } from "../context/AuthContext";
import { fbqTrack } from "../components/common/Analytics";
import "../styles/pages/ThankYou.css"; // Import new stylesheet

export default function ThankYou() {
  const router = useRouter();
  const { order_number, guest_email, is_guest } = router.query;
  const { isAuthenticated } = useAuth();
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

  // Track Facebook Purchase Event
  useEffect(() => {
    const trackPurchaseEvent = async () => {
      // Check if we've already tracked this order
      const trackingKey = `fb_purchase_tracked_${order_number}`;
      if (!order_number) {
        console.log('Purchase tracking: No order number provided');
        return;
      }
      
      if (sessionStorage.getItem(trackingKey)) {
        console.log('Purchase tracking: Already tracked for order', order_number);
        return;
      }

      // Wait for fbq to be available
      const waitForFbq = (maxAttempts = 10) => {
        return new Promise((resolve) => {
          let attempts = 0;
          const checkFbq = () => {
            if (typeof window !== 'undefined' && window.fbq) {
              resolve(true);
            } else if (attempts < maxAttempts) {
              attempts++;
              setTimeout(checkFbq, 200);
            } else {
              console.warn('Purchase tracking: fbq not available after waiting');
              resolve(false);
            }
          };
          checkFbq();
        });
      };

      try {
        // Wait for Facebook Pixel to be ready
        const fbqReady = await waitForFbq();
        if (!fbqReady) {
          console.error('Purchase tracking: Facebook Pixel not available');
          return;
        }

        let orderData = null;

        // Fetch order data based on user type
        if (is_guest === 'true' && guest_email) {
          // For guest users
          console.log('Purchase tracking: Fetching guest order data...');
          try {
            const result = await getGuestOrder(guest_email, order_number);
            if (result.success && result.data) {
              orderData = result.data;
              console.log('Purchase tracking: Guest order data fetched', orderData);
            } else {
              console.warn('Purchase tracking: Guest order fetch returned no data', result);
            }
          } catch (error) {
            console.error('Purchase tracking: Error fetching guest order:', error);
            return;
          }
        } else if (isAuthenticated) {
          // For authenticated users
          console.log('Purchase tracking: Fetching authenticated user order data...');
          try {
            const result = await getUserOrders({ limit: 100 }); // Get enough orders to find the one we need
            if (result.orders && Array.isArray(result.orders)) {
              const order = result.orders.find(
                (o) => o.order_number === order_number
              );
              if (order) {
                // Transform the order data to match the expected format
                orderData = {
                  order: {
                    final_amount: order.final_amount,
                    payment_type: order.payment_type,
                  },
                  items: order.OrderItems && Array.isArray(order.OrderItems)
                    ? order.OrderItems.map((item) => ({
                        product: {
                          id: item.Product ? item.Product.id : item.product_id,
                        },
                        quantity: item.quantity || 1,
                        price: item.price,
                      }))
                    : [],
                };
                console.log('Purchase tracking: Authenticated user order data fetched', orderData);
              } else {
                console.warn('Purchase tracking: Order not found in user orders list');
              }
            }
          } catch (error) {
            console.error('Purchase tracking: Error fetching user orders:', error);
            return;
          }
        } else {
          console.warn('Purchase tracking: User not authenticated and not a guest');
        }

        // Track purchase event if we have order data
        if (orderData && orderData.order && orderData.items && Array.isArray(orderData.items) && orderData.items.length > 0) {
          const purchaseData = {
            value: parseFloat(orderData.order.final_amount) || 0,
            currency: 'INR',
            contents: orderData.items
              .filter((item) => item.product?.id || item.product_id) // Filter out items without product ID
              .map((item) => ({
                id: (item.product?.id || item.product_id)?.toString(),
                quantity: item.quantity || 1,
              })),
          };

          // Only track if we have valid purchase data
          if (purchaseData.value > 0 && purchaseData.contents.length > 0) {
            console.log('Purchase tracking: Tracking purchase event with data:', purchaseData);
            
            // Track the purchase event
            fbqTrack('Purchase', purchaseData);
            
            // Mark as tracked to prevent duplicate tracking
            sessionStorage.setItem(trackingKey, 'true');
            console.log('Purchase tracking: Purchase event tracked successfully for order', order_number);
          } else {
            console.warn('Purchase tracking: Invalid purchase data, skipping tracking:', purchaseData);
          }
        } else {
          console.warn('Purchase tracking: No valid order data available', {
            hasOrderData: !!orderData,
            hasOrder: !!(orderData && orderData.order),
            hasItems: !!(orderData && orderData.items && Array.isArray(orderData.items) && orderData.items.length > 0)
          });
        }
      } catch (error) {
        console.error('Purchase tracking: Error in purchase event tracking:', error);
      }
    };

    // Only track when router is ready and we have order_number
    if (router.isReady && order_number) {
      // Add a small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        trackPurchaseEvent();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [router.isReady, order_number, is_guest, guest_email, isAuthenticated]);

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