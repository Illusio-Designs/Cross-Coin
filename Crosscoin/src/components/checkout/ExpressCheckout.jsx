import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { createMagicCheckoutOrder, verifyMagicCheckoutPayment, createOrder, createGuestOrder, updateOrderPayment } from "../../services/publicindex";
import { showOrderPlacedSuccessToast, showOrderPlacedErrorToast } from "../../utils/toast";
import { fbqTrack } from "../common/Analytics";
import { useRouter } from "next/router";

/**
 * Express Checkout Component - 1-Click Checkout like GoKwik
 * Opens Razorpay Magic Checkout directly from cart with minimal friction
 */
const ExpressCheckout = ({ onSuccess, onError }) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { cartItems, clearCart, buyNowItem, clearBuyNow } = useCart();
  const [sdkLoaded, setSDKLoaded] = useState(false);
  const [sdkLoading, setSDKLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";
  const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const MAGIC_CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED === "true";

  /**
   * Load Razorpay Magic Checkout SDK
   */
  const loadMagicCheckoutSDK = useCallback(() => {
    return new Promise((resolve, reject) => {
      // Check if SDK is already loaded
      if (window.Razorpay) {
        setSDKLoaded(true);
        resolve(true);
        return;
      }

      // Check if script tag already exists
      if (document.getElementById("razorpay-checkout-script")) {
        const checkInterval = setInterval(() => {
          if (window.Razorpay) {
            clearInterval(checkInterval);
            setSDKLoaded(true);
            resolve(true);
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!window.Razorpay) {
            reject(new Error("SDK load timeout"));
          }
        }, 10000);
        return;
      }

      setSDKLoading(true);
      const script = document.createElement("script");
      script.id = "razorpay-checkout-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;

      script.onload = () => {
        setSDKLoaded(true);
        setSDKLoading(false);
        resolve(true);
      };

      script.onerror = () => {
        setSDKLoading(false);
        setError("Failed to load payment gateway");
        reject(new Error("Failed to load Razorpay SDK"));
      };

      document.body.appendChild(script);
    });
  }, []);

  /**
   * Calculate total amount in rupees
   */
  const calculateTotalAmount = useCallback(() => {
    const cartTotal = cartItems.reduce((sum, item) => {
      return sum + parseFloat(item.price || 0) * (item.quantity || 1);
    }, 0);

    const buyNowTotal = buyNowItem ? parseFloat(buyNowItem.price || 0) * (buyNowItem.quantity || 1) : 0;

    return cartTotal + buyNowTotal;
  }, [cartItems, buyNowItem]);

  /**
   * Handle payment success callback
   */
  const handlePaymentSuccess = useCallback(async (response) => {
    try {
      console.log("Express Checkout payment success:", response);
      
      // Prepare order data
      const allItems = [
        ...(buyNowItem ? [{
          product_id: buyNowItem.productId || buyNowItem.id,
          variation_id: buyNowItem.variationId || buyNowItem.variation?.id || null,
          quantity: buyNowItem.quantity,
        }] : []),
        ...cartItems.map((item) => ({
          product_id: item.productId || item.id,
          variation_id: item.variationId || item.variation?.id || null,
          quantity: item.quantity,
        }))
      ];

      // Extract shipping address from Razorpay response
      const shippingAddress = response.shipping_address || {};
      
      const orderData = !isAuthenticated ? {
        guest_info: {
          email: response.email || response.contact_email || "",
          firstName: response.name?.split(' ')[0] || "",
          lastName: response.name?.split(' ').slice(1).join(' ') || "",
          phone: response.contact || response.phone || "",
        },
        shipping_address: {
          fullName: shippingAddress.name || response.name || "",
          address: shippingAddress.line1 || shippingAddress.address || "",
          city: shippingAddress.city || "",
          state: shippingAddress.state || "",
          pincode: shippingAddress.zipcode || shippingAddress.postal_code || "",
          phone: shippingAddress.phone || response.contact || "",
        },
        items: allItems,
        payment_type: "upi",
        notes: "Express Checkout Payment",
        discount_amount: 0,
        coupon_id: null,
        session_id: typeof window !== "undefined" ? sessionStorage.getItem("sessionId") || "guest-" + Date.now() : "guest-" + Date.now(),
        ip_address: typeof window !== "undefined" ? window.location.hostname : "localhost",
        user_agent: typeof window !== "undefined" ? window.navigator.userAgent : "unknown",
      } : {
        shipping_address: {
          fullName: shippingAddress.name || response.name || "",
          address: shippingAddress.line1 || shippingAddress.address || "",
          city: shippingAddress.city || "",
          state: shippingAddress.state || "",
          pincode: shippingAddress.zipcode || shippingAddress.postal_code || "",
          phone: shippingAddress.phone || response.contact || "",
        },
        items: allItems,
        payment_type: "upi",
        notes: "Express Checkout Payment",
        discount_amount: 0,
        coupon_id: null,
      };

      // Create order
      const orderResult = !isAuthenticated ? await createGuestOrder(orderData) : await createOrder(orderData);
      
      // Update order with payment details
      await updateOrderPayment({
        orderId: orderResult.data.order.id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpayOrderId: response.razorpay_order_id,
        razorpaySignature: response.razorpay_signature
      });

      // Track purchase
      try {
        const totalAmount = calculateTotalAmount();
        const orderNumber = orderResult?.data?.order?.order_number;
        const purchaseTracked = fbqTrack("Purchase", {
          value: Number(totalAmount.toFixed(2)),
          currency: "INR",
          content_type: "product",
          contents: cartItems.filter((item) => item.productId || item.id).map((item) => ({
            id: String(item.productId || item.id),
            quantity: item.quantity || 1,
          })),
        });

        if (purchaseTracked && orderNumber) {
          sessionStorage.setItem(`fb_purchase_tracked_${orderNumber}`, "true");
        }
      } catch (e) {
        console.warn("Purchase tracking (Express Checkout): failed to send fbq Purchase", e);
      }

      // Clear cart and redirect
      clearCart();
      clearBuyNow();
      sessionStorage.removeItem("shippingAddress");
      sessionStorage.removeItem("appliedCoupon");
      showOrderPlacedSuccessToast(orderResult.data.order.order_number);
      
      const redirectUrl = !isAuthenticated 
        ? `/ThankYou?order_number=${orderResult.data.order.order_number}&guest_email=${encodeURIComponent(orderData.guest_info.email)}&is_guest=true`
        : `/ThankYou?order_number=${orderResult.data.order.order_number}`;
      
      router.push(redirectUrl);

      if (onSuccess) {
        onSuccess(orderResult);
      }
    } catch (error) {
      console.error("Error handling Express Checkout success:", error);
      showOrderPlacedErrorToast("Payment successful but order creation failed. Please contact support.");
      setIsProcessing(false);
      
      if (onError) {
        onError(error);
      }
    }
  }, [isAuthenticated, cartItems, buyNowItem, clearCart, clearBuyNow, router, calculateTotalAmount, onSuccess, onError]);

  /**
   * Process Express Checkout
   */
  const processExpressCheckout = useCallback(async () => {
    if (!sdkLoaded || !window.Razorpay) {
      console.error("Razorpay SDK not loaded");
      setError("Payment gateway not loaded. Please refresh the page.");
      return false;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Step 1: Calculate total amount
      const totalAmount = calculateTotalAmount();

      if (totalAmount <= 0) {
        throw new Error("Cart is empty");
      }

      // Step 2: Prepare cart items
      const allItems = [
        ...(buyNowItem ? [{
          product_id: buyNowItem.productId || buyNowItem.id,
          variation_id: buyNowItem.variationId || buyNowItem.variation?.id || null,
          quantity: buyNowItem.quantity,
          price: parseFloat(buyNowItem.price || 0),
        }] : []),
        ...cartItems.map((item) => ({
          product_id: item.productId || item.id,
          variation_id: item.variationId || item.variation?.id || null,
          quantity: item.quantity,
          price: parseFloat(item.price || 0),
        }))
      ];

      // Step 3: Create Razorpay order
      console.log("Creating Razorpay order for Express Checkout...");
      const orderData = await createMagicCheckoutOrder({
        amount: totalAmount,
        currency: "INR",
        customer_id: user?.id || null,
        cart_items: allItems,
        notes: {
          checkout_type: "express",
          items_count: allItems.length,
        },
      });

      console.log("Order created successfully:", orderData);

      // Step 4: Open Razorpay Checkout
      const options = {
        key: RAZORPAY_KEY,
        amount: Math.round(totalAmount * 100), // Convert to paise
        currency: "INR",
        name: "Cross Coin",
        description: "Express Checkout",
        order_id: orderData.order_id,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: {
          color: "#180D3E",
        },
        handler: handlePaymentSuccess,
        modal: {
          ondismiss: function() {
            console.log("Express Checkout dismissed by user");
            setIsProcessing(false);
          }
        },
        config: {
          display: {
            blocks: {
              banks: {
                name: "All payment methods",
                instruments: [
                  {
                    method: "upi"
                  },
                  {
                    method: "card"
                  },
                  {
                    method: "netbanking"
                  },
                  {
                    method: "wallet"
                  }
                ]
              }
            },
            sequence: ["block.banks"],
            preferences: {
              show_default_blocks: true
            }
          }
        }
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response) {
        console.error("Payment failed:", response.error);
        showOrderPlacedErrorToast("Payment failed: " + (response.error.description || "Please try again"));
        setIsProcessing(false);
      });

      rzp.open();
      return true;
    } catch (err) {
      console.error("Error processing Express Checkout:", err);
      setError(err.message || "Failed to process checkout");
      setIsProcessing(false);
      
      if (onError) {
        onError(err);
      }
      return false;
    }
  }, [sdkLoaded, cartItems, buyNowItem, user, RAZORPAY_KEY, calculateTotalAmount, handlePaymentSuccess, onError]);

  /**
   * Load SDK on mount
   */
  useEffect(() => {
    if (MAGIC_CHECKOUT_ENABLED) {
      loadMagicCheckoutSDK().catch((err) => {
        console.error("Failed to load Razorpay SDK:", err);
        setError("Failed to load payment gateway");
      });
    }
  }, [MAGIC_CHECKOUT_ENABLED, loadMagicCheckoutSDK]);

  // Don't render if Magic Checkout is not enabled
  if (!MAGIC_CHECKOUT_ENABLED) {
    return null;
  }

  // Don't render if cart is empty
  if (cartItems.length === 0 && !buyNowItem) {
    return null;
  }

  return (
    <div className="express-checkout-container" style={{
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      marginBottom: '20px',
      border: '2px solid #e0e0e0'
    }}>
      <div style={{ marginBottom: '15px' }}>
        <h3 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '18px', 
          fontWeight: '600',
          color: '#180D3E'
        }}>
          ⚡ Express Checkout
        </h3>
        <p style={{ 
          margin: 0, 
          fontSize: '14px', 
          color: '#666',
          lineHeight: '1.5'
        }}>
          Skip the forms! Complete your purchase in seconds with saved details.
        </p>
      </div>

      {sdkLoading && (
        <div style={{ 
          padding: '15px', 
          textAlign: 'center',
          backgroundColor: '#fff',
          borderRadius: '8px',
          marginBottom: '15px'
        }}>
          <p style={{ margin: 0, color: '#666' }}>Loading payment gateway...</p>
        </div>
      )}

      {error && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: '8px',
          marginBottom: '15px'
        }}>
          <p style={{ margin: 0, color: '#c00', fontSize: '14px' }}>{error}</p>
        </div>
      )}

      {sdkLoaded && !error && (
        <button
          onClick={processExpressCheckout}
          disabled={isProcessing || cartItems.length === 0}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: isProcessing ? '#ccc' : '#CE1E36',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: isProcessing ? 'none' : '0 4px 12px rgba(206, 30, 54, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) {
              e.target.style.backgroundColor = '#b01828';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(206, 30, 54, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isProcessing) {
              e.target.style.backgroundColor = '#CE1E36';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(206, 30, 54, 0.3)';
            }
          }}
        >
          {isProcessing ? (
            <>
              <span className="spinner" style={{
                width: '16px',
                height: '16px',
                border: '2px solid #fff',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite'
              }}></span>
              Processing...
            </>
          ) : (
            <>
              <span style={{ fontSize: '20px' }}>⚡</span>
              Express Checkout - ₹{calculateTotalAmount().toFixed(2)}
            </>
          )}
        </button>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

ExpressCheckout.propTypes = {
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
};

export default ExpressCheckout;
