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
    console.log("=== LOADING RAZORPAY SDK ===");
    console.log("MAGIC_CHECKOUT_ENABLED:", MAGIC_CHECKOUT_ENABLED);
    console.log("RAZORPAY_KEY:", RAZORPAY_KEY);
    
    return new Promise((resolve, reject) => {
      // Check if SDK is already loaded
      if (window.Razorpay) {
        console.log("✓ Razorpay SDK already loaded");
        setSDKLoaded(true);
        resolve(true);
        return;
      }

      // Check if script tag already exists
      if (document.getElementById("razorpay-checkout-script")) {
        console.log("Script tag exists, waiting for SDK to load...");
        const checkInterval = setInterval(() => {
          if (window.Razorpay) {
            clearInterval(checkInterval);
            console.log("✓ Razorpay SDK loaded from existing script");
            setSDKLoaded(true);
            resolve(true);
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!window.Razorpay) {
            console.error("✗ SDK load timeout");
            reject(new Error("SDK load timeout"));
          }
        }, 10000);
        return;
      }

      console.log("Creating new script tag for Razorpay SDK...");
      setSDKLoading(true);
      const script = document.createElement("script");
      script.id = "razorpay-checkout-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;

      script.onload = () => {
        console.log("✓ Razorpay SDK loaded successfully");
        setSDKLoaded(true);
        setSDKLoading(false);
        resolve(true);
      };

      script.onerror = () => {
        console.error("✗ Failed to load Razorpay SDK");
        setSDKLoading(false);
        setError("Failed to load payment gateway");
        reject(new Error("Failed to load Razorpay SDK"));
      };

      document.body.appendChild(script);
      console.log("Script tag appended to body");
    });
  }, [RAZORPAY_KEY, MAGIC_CHECKOUT_ENABLED]);

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
    // Force logs to appear - use multiple methods
    const debugInfo = {
      timestamp: new Date().toISOString(),
      sdkLoaded: sdkLoaded,
      windowRazorpay: typeof window !== 'undefined' ? !!window.Razorpay : false,
      razorpayKey: RAZORPAY_KEY,
      magicCheckoutEnabled: MAGIC_CHECKOUT_ENABLED,
      isAuthenticated: isAuthenticated,
      userId: user?.id || 'guest',
      userName: user?.name || 'not set',
      userEmail: user?.email || 'not set',
      userPhone: user?.phone || 'not set',
      cartItemsCount: cartItems.length,
      totalAmount: calculateTotalAmount(),
      envVars: {
        apiUrl: process.env.NEXT_PUBLIC_API_URL,
        razorpayKey: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        magicCheckoutEnabled: process.env.NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED
      }
    };
    
    // Log to console
    console.log("=== EXPRESS CHECKOUT DEBUG START ===");
    console.table(debugInfo);
    console.log("Full debug info:", JSON.stringify(debugInfo, null, 2));
    console.log("=== EXPRESS CHECKOUT DEBUG END ===");
    
    // Also show in alert for visibility
    const alertMessage = `
EXPRESS CHECKOUT DEBUG:
- SDK Loaded: ${debugInfo.sdkLoaded}
- Razorpay Key: ${debugInfo.razorpayKey ? 'SET' : 'NOT SET'}
- Magic Checkout: ${debugInfo.magicCheckoutEnabled}
- User: ${debugInfo.userName} (${debugInfo.userEmail})
- Cart Items: ${debugInfo.cartItemsCount}
- Total: ₹${debugInfo.totalAmount}

Check console for full details!
    `.trim();
    
    alert(alertMessage);
    
    // TEMPORARY: Stop here to prevent gateway opening
    console.warn("Gateway opening is currently disabled for debugging");
    return false;
    
    // Original code below (commented out temporarily)
    /*
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

      // Step 4: Open Razorpay Checkout with Magic Checkout enabled
      const options = {
        key: RAZORPAY_KEY,
        amount: Math.round(totalAmount * 100), // Convert to paise
        currency: "INR",
        name: "Cross Coin",
        description: "Express Checkout",
        order_id: orderData.order_id,
        
        // CRITICAL: Enable Magic Checkout with customer_details
        customer_details: {
          contact: user?.phone || "",
          email: user?.email || "",
          name: user?.name || "",
        },
        
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
          },
          // Enable Magic Checkout modal
          confirm_close: true,
        },
        
        // CRITICAL: Enable 1-Click Checkout (Magic Checkout)
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
        },
        
        // Enable Magic Checkout features
        remember_customer: true,
        send_sms_hash: true,
        allow_rotation: true,
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
    */
  }, [sdkLoaded, cartItems, buyNowItem, user, RAZORPAY_KEY, MAGIC_CHECKOUT_ENABLED, isAuthenticated, calculateTotalAmount]);

  /**
   * Load SDK on mount
   */
  useEffect(() => {
    console.log("=== EXPRESS CHECKOUT COMPONENT MOUNTED ===");
    console.log("Environment variables:");
    console.log("- NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED:", process.env.NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED);
    console.log("- NEXT_PUBLIC_RAZORPAY_KEY_ID:", process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
    console.log("- NEXT_PUBLIC_API_URL:", process.env.NEXT_PUBLIC_API_URL);
    console.log("Component state:");
    console.log("- MAGIC_CHECKOUT_ENABLED:", MAGIC_CHECKOUT_ENABLED);
    console.log("- Cart items:", cartItems.length);
    console.log("- Buy now item:", !!buyNowItem);
    
    if (MAGIC_CHECKOUT_ENABLED) {
      console.log("Magic Checkout is enabled, loading SDK...");
      loadMagicCheckoutSDK().catch((err) => {
        console.error("Failed to load Razorpay SDK:", err);
        setError("Failed to load payment gateway");
      });
    } else {
      console.warn("Magic Checkout is NOT enabled in environment variables");
    }
  }, [MAGIC_CHECKOUT_ENABLED, loadMagicCheckoutSDK, cartItems.length, buyNowItem]);

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
