import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";

/**
 * Magic Checkout SDK Integration Component
 * Handles Razorpay Magic Checkout SDK loading, initialization, and payment processing
 * 
 * IMPORTANT BEHAVIOR:
 * - SDK loads automatically on component mount (if NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED=true)
 * - API calls (shipping info, promotions) ONLY happen when user clicks "Pay with Magic Checkout" button
 * - Does NOT make API calls on page load or when props change
 * - This prevents premature 400 errors from Magic Checkout endpoints
 * 
 * FLOW:
 * 1. Component mounts → Load SDK from CDN
 * 2. User clicks "Pay with Magic Checkout" → processPayment() is called
 * 3. processPayment() creates Razorpay order
 * 4. processPayment() initializes Magic Checkout SDK with order_id
 * 5. processPayment() fetches promotions and shipping info (optional)
 * 6. processPayment() opens payment modal
 * 7. User completes payment → handlePaymentSuccess() is called
 * 
 * CONSOLE LOGGING:
 * - 🚀 = Process start
 * - 🔧 = SDK initialization
 * - 📦 = Order creation
 * - 💰 = Amount calculation
 * - 📍 = Shipping info
 * - 🎁 = Promotions
 * - 🎯 = Modal opening
 * - ✅ = Success
 * - ❌ = Error
 * - ⚠️ = Warning (non-critical)
 */
const MagicCheckoutIntegration = ({
  cartItems = [],
  user = null,
  onSuccess,
  onError,
  shippingAddress,
  shippingFee,
  appliedCoupon,
}) => {
  const [sdkLoaded, setSDKLoaded] = useState(false);
  const [sdkLoading, setSDKLoading] = useState(false);
  const [magicCheckoutInstance, setMagicCheckoutInstance] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [selectedPromotion, setSelectedPromotion] = useState(appliedCoupon);
  const [shippingInfo, setShippingInfo] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";
  const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const MAGIC_CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED === "true";

  // Log configuration on mount
  useEffect(() => {
    console.log("🔧 Magic Checkout: Component configuration:", {
      API_URL,
      RAZORPAY_KEY: RAZORPAY_KEY ? `${RAZORPAY_KEY.substring(0, 10)}...` : 'NOT SET',
      MAGIC_CHECKOUT_ENABLED,
      hasShippingAddress: !!shippingAddress,
      hasShippingFee: !!shippingFee,
      cartItemsCount: cartItems?.length || 0
    });
  }, []);

  /**
   * Load Magic Checkout SDK from CDN
   */
  const loadMagicCheckoutSDK = useCallback(() => {
    return new Promise((resolve, reject) => {
      console.log("📥 Magic Checkout: Starting SDK load...", {
        hasWindow: typeof window !== 'undefined',
        hasRazorpay: typeof window !== 'undefined' && !!window.Razorpay,
        scriptExists: typeof document !== 'undefined' && !!document.getElementById("razorpay-magic-checkout-script")
      });
      
      // Check if SDK is already loaded (standard Razorpay SDK)
      if (window.Razorpay) {
        console.log("✅ Magic Checkout: Razorpay SDK already loaded");
        setSDKLoaded(true);
        resolve(true);
        return;
      }

      // Check if script tag already exists
      if (document.getElementById("razorpay-magic-checkout-script")) {
        console.log("⏳ Magic Checkout: Script tag exists, waiting for load...");
        // Wait for it to load
        const checkInterval = setInterval(() => {
          if (window.Razorpay) {
            clearInterval(checkInterval);
            console.log("✅ Magic Checkout: Razorpay SDK loaded from existing script");
            setSDKLoaded(true);
            resolve(true);
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!window.Razorpay) {
            console.error("❌ Magic Checkout: SDK load timeout");
            reject(new Error("SDK load timeout"));
          }
        }, 10000);
        return;
      }

      console.log("📥 Magic Checkout: Creating script tag...");
      setSDKLoading(true);
      const script = document.createElement("script");
      script.id = "razorpay-magic-checkout-script";
      // Note: Magic Checkout uses the standard Razorpay checkout SDK
      // The "magic" features are enabled via API configuration, not a separate SDK
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;

      script.onload = () => {
        console.log("✅ Magic Checkout: Razorpay SDK script loaded successfully", {
          hasRazorpay: !!window.Razorpay
        });
        setSDKLoaded(true);
        setSDKLoading(false);
        resolve(true);
      };

      script.onerror = (error) => {
        console.error("❌ Magic Checkout: SDK script failed to load", {
          error,
          src: script.src
        });
        setSDKLoading(false);
        setError("Failed to load Razorpay SDK");
        reject(new Error("Failed to load Razorpay SDK"));
      };

      document.body.appendChild(script);
      console.log("📥 Magic Checkout: Script tag appended to body");
    });
  }, []);

  /**
   * Initialize Magic Checkout SDK with order_id
   */
  const initializeMagicCheckout = useCallback(async (orderId) => {
    console.log("🔧 Magic Checkout: Attempting to initialize SDK...", {
      sdkLoaded,
      hasWindow: typeof window !== 'undefined',
      hasRazorpay: typeof window !== 'undefined' && !!window.Razorpay,
      orderId,
      razorpayKey: RAZORPAY_KEY ? `${RAZORPAY_KEY.substring(0, 10)}...` : 'NOT SET'
    });
    
    if (!sdkLoaded || !window.Razorpay) {
      console.error("❌ Magic Checkout: Razorpay SDK not loaded", {
        sdkLoaded,
        windowRazorpay: typeof window !== 'undefined' ? !!window.Razorpay : 'no window'
      });
      return null;
    }

    if (!orderId) {
      console.error("❌ Magic Checkout: Order ID is required to initialize Magic Checkout");
      return null;
    }

    if (!RAZORPAY_KEY) {
      console.error("❌ Magic Checkout: RAZORPAY_KEY is not configured", {
        envVar: 'NEXT_PUBLIC_RAZORPAY_KEY_ID',
        value: RAZORPAY_KEY
      });
      setError("Razorpay Key is not configured. Please set NEXT_PUBLIC_RAZORPAY_KEY_ID in environment variables.");
      return null;
    }

    try {
      console.log("🔧 Magic Checkout: Creating Razorpay instance with config:", {
        key: RAZORPAY_KEY ? `${RAZORPAY_KEY.substring(0, 10)}...` : 'NOT SET',
        order_id: orderId,
        hasHandler: !!handlePaymentSuccess,
        hasModal: true,
        magic: true, // ✅ This enables Magic Checkout UI
        hasPrefill: !!(shippingAddress || user),
        prefillData: {
          name: shippingAddress?.full_name || shippingAddress?.fullName || user?.name || '',
          email: user?.email || '',
          contact: shippingAddress?.phone_number || shippingAddress?.phoneNumber || user?.phone || ''
        }
      });
      
      const razorpayOptions = {
        key: RAZORPAY_KEY,
        order_id: orderId,
        // ✅ Try both magic flags to ensure compatibility
        magic: true, // Standard flag
        "checkout.magic": true, // Alternative flag format
        handler: handlePaymentSuccess,
        modal: {
          ondismiss: handlePaymentDismiss,
        },
        // Prefill customer data for better Magic Checkout experience
        prefill: {
          name: shippingAddress?.full_name || shippingAddress?.fullName || user?.name || '',
          email: user?.email || '',
          contact: shippingAddress?.phone_number || shippingAddress?.phoneNumber || user?.phone || ''
        },
        // Theme customization
        theme: {
          color: '#180D3E' // Your brand color
        },
        // Additional Magic Checkout options
        config: {
          display: {
            language: 'en'
          }
        }
      };
      
      console.log("🔧 Magic Checkout: Final Razorpay options:", JSON.stringify(razorpayOptions, null, 2));
      
      // Use standard Razorpay SDK - Magic Checkout features are enabled with magic: true
      const instance = new window.Razorpay(razorpayOptions);

      console.log("✅ Magic Checkout: Razorpay instance created successfully", instance);
      setMagicCheckoutInstance(instance);
      return instance;
    } catch (err) {
      console.error("❌ Magic Checkout: Failed to initialize SDK:", {
        error: err.message,
        stack: err.stack,
        orderId,
        razorpayKey: RAZORPAY_KEY ? 'SET' : 'NOT SET'
      });
      setError(`Failed to initialize Magic Checkout: ${err.message}`);
      return null;
    }
  }, [sdkLoaded, RAZORPAY_KEY]);

  /**
   * Calculate total amount in paise
   */
  const calculateTotalAmount = () => {
    const cartTotal = cartItems.reduce((sum, item) => {
      return sum + parseFloat(item.price || 0) * (item.quantity || 1);
    }, 0);

    const shippingFeeAmount = parseFloat(shippingFee?.fee || 0);
    const discountAmount = selectedPromotion?.discount || 0;
    const finalAmount = cartTotal + shippingFeeAmount - discountAmount;

    return Math.round(finalAmount * 100) / 100; // Return in rupees
  };

  /**
   * Fetch available promotions
   */
  const fetchPromotions = useCallback(async (orderId) => {
    try {
      const cartTotal = cartItems.reduce((sum, item) => {
        return sum + parseFloat(item.price || 0) * (item.quantity || 1);
      }, 0);

      const response = await fetch(
        `${API_URL}/api/payments/magic-checkout/promotions?` +
          new URLSearchParams({
            order_id: orderId,
            customer_id: user?.id || "",
            cart_total: cartTotal,
          }),
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Brand-Name": "crosscoin",
            ...(user ? { Authorization: `Bearer ${localStorage.getItem("token")}` } : {}),
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch promotions");
      }

      const data = await response.json();
      setPromotions(data.promotions || []);
      return data.promotions || [];
    } catch (err) {
      console.error("Error fetching promotions:", err);
      setPromotions([]);
      return [];
    }
  }, [cartItems, user, API_URL]);

  /**
   * Apply promotion code
   */
  const applyPromotion = useCallback(async (promotionCode) => {
    try {
      setIsProcessing(true);

      const cartTotal = cartItems.reduce((sum, item) => {
        return sum + parseFloat(item.price || 0) * (item.quantity || 1);
      }, 0);

      const response = await fetch(
        `${API_URL}/api/payments/magic-checkout/apply-promotion`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brand-Name": "crosscoin",
            ...(user ? { Authorization: `Bearer ${localStorage.getItem("token")}` } : {}),
          },
          body: JSON.stringify({
            promotion_code: promotionCode,
            customer_id: user?.id || "",
            cart_total: cartTotal,
            cart_items: cartItems.map((item) => ({
              product_id: item.productId || item.id,
              quantity: item.quantity,
              price: parseFloat(item.price || 0),
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to apply promotion");
      }

      const data = await response.json();
      
      if (data.success) {
        setSelectedPromotion({
          code: data.promotion.code,
          description: data.promotion.description,
          discount: data.discount_amount / 100, // Convert from paise to rupees
        });
        return data;
      } else {
        throw new Error(data.message || "Failed to apply promotion");
      }
    } catch (err) {
      console.error("Error applying promotion:", err);
      setError(err.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [cartItems, user, API_URL]);

  /**
   * Fetch shipping info for addresses
   */
  const fetchShippingInfo = useCallback(async (addresses) => {
    try {
      console.log("📍 Magic Checkout: Fetching shipping info for addresses...", {
        addressCount: addresses?.length || 0,
        hasShippingFee: !!shippingFee
      });
      
      const cartTotal = cartItems.reduce((sum, item) => {
        return sum + parseFloat(item.price || 0) * (item.quantity || 1);
      }, 0);

      const requestBody = {
        addresses: addresses.map((addr) => ({
          id: addr.id,
          line1: addr.address || addr.line1,
          line2: addr.line2 || "",
          city: addr.city,
          state: addr.state,
          pincode: addr.postal_code || addr.postalCode || addr.pincode,
          phone: addr.phone_number || addr.phoneNumber || addr.phone,
        })),
        cart_total: cartTotal,
        payment_method: shippingFee?.orderType === "cod" ? "cod" : "prepaid",
      };
      
      console.log("📦 Magic Checkout: Shipping info request:", requestBody);

      const response = await fetch(
        `${API_URL}/api/payments/magic-checkout/shipping-info`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brand-Name": "crosscoin",
            ...(user ? { Authorization: `Bearer ${localStorage.getItem("token")}` } : {}),
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Magic Checkout: Shipping info fetch failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.message || "Failed to fetch shipping info");
      }

      const data = await response.json();
      console.log("✅ Magic Checkout: Shipping info received:", data);
      setShippingInfo(data.shipping_info || []);
      return data.shipping_info || [];
    } catch (err) {
      console.error("❌ Magic Checkout: Error fetching shipping info:", {
        message: err.message,
        stack: err.stack
      });
      setShippingInfo([]);
      return [];
    }
  }, [cartItems, shippingFee, API_URL, user]);

  /**
   * Handle payment success callback
   */
  const handlePaymentSuccess = async (response) => {
    try {
      console.log("Magic Checkout payment success:", response);
      
      // Call the parent success handler
      if (onSuccess) {
        await onSuccess({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
          magic_checkout_order_id: response.magic_checkout_order_id,
          magic_checkout_payment_id: response.magic_checkout_payment_id,
        });
      }
    } catch (err) {
      console.error("Error handling payment success:", err);
      if (onError) {
        onError(err);
      }
    }
  };

  /**
   * Handle payment dismissal
   */
  const handlePaymentDismiss = () => {
    console.log("Magic Checkout payment dismissed");
    setIsProcessing(false);
  };

  /**
   * Create Razorpay order and process payment through Magic Checkout
   */
  const processPayment = useCallback(async () => {
    try {
      console.log("🚀 Magic Checkout: Starting payment process...", {
        hasShippingAddress: !!shippingAddress,
        hasShippingFee: !!shippingFee,
        cartItemsCount: cartItems?.length || 0,
        hasUser: !!user,
        hasCoupon: !!appliedCoupon
      });
      
      setIsProcessing(true);
      setError(null);

      // Step 0: Validate shipping address serviceability BEFORE creating order
      if (shippingAddress) {
        console.log("📍 Magic Checkout: Checking address serviceability...");
        try {
          const serviceabilityCheck = await fetchShippingInfo([shippingAddress]);
          
          if (serviceabilityCheck && serviceabilityCheck.length > 0) {
            const addressInfo = serviceabilityCheck[0];
            
            if (!addressInfo.serviceable) {
              console.error("❌ Magic Checkout: Address not serviceable:", addressInfo.reason);
              setError(`Delivery not available: ${addressInfo.reason || 'Pincode not serviceable'}`);
              setIsProcessing(false);
              return false;
            }
            
            console.log("✅ Magic Checkout: Address is serviceable");
          }
        } catch (serviceError) {
          console.warn("⚠️ Magic Checkout: Serviceability check failed (non-critical):", serviceError);
          // Continue anyway - don't block checkout
        }
      }

      // Step 1: Calculate total amount
      const totalAmount = calculateTotalAmount() / 100; // Convert from paise to rupees
      console.log("💰 Magic Checkout: Total amount calculated:", totalAmount);

      // Step 2: Create Razorpay order
      console.log("📦 Magic Checkout: Creating Razorpay order...");
      const orderResponse = await fetch(
        `${API_URL}/api/payments/magic-checkout/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brand-Name": "crosscoin",
            ...(user ? { Authorization: `Bearer ${localStorage.getItem("token")}` } : {}),
          },
          body: JSON.stringify({
            amount: totalAmount,
            currency: "INR",
            customer_id: user?.id || null,
            cart_items: cartItems.map((item) => ({
              product_id: item.productId || item.id,
              variation_id: item.variationId || item.variation?.id || null,
              quantity: item.quantity,
              price: parseFloat(item.price || 0),
              name: item.name || item.title || 'Product', // ✅ Add product name for line_items
              description: item.description || '',
            })),
            shipping_address: {
              full_name: shippingAddress?.full_name || shippingAddress?.fullName,
              address: shippingAddress?.address,
              city: shippingAddress?.city,
              state: shippingAddress?.state,
              postal_code: shippingAddress?.postal_code || shippingAddress?.postalCode,
              phone_number: shippingAddress?.phone_number || shippingAddress?.phoneNumber,
            },
            notes: {
              shipping_fee: shippingFee?.fee || 0,
              coupon_code: appliedCoupon?.code || null,
              discount_amount: appliedCoupon?.discount || 0,
            },
          }),
        }
      );

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({}));
        console.error("❌ Magic Checkout: Order creation failed:", {
          status: orderResponse.status,
          statusText: orderResponse.statusText,
          error: errorData
        });
        throw new Error(errorData.message || "Failed to create order");
      }

      const orderData = await orderResponse.json();
      console.log("✅ Magic Checkout: Order created successfully:", orderData);

      // Step 3: Initialize Magic Checkout with order_id
      console.log("🔧 Magic Checkout: Initializing SDK...");
      const instance = await initializeMagicCheckout(orderData.order_id);
      
      if (!instance) {
        console.error("❌ Magic Checkout: SDK initialization failed");
        throw new Error("Failed to initialize Magic Checkout");
      }
      console.log("✅ Magic Checkout: SDK initialized successfully");

      // Step 4: Fetch promotions for the order (optional, non-blocking)
      console.log("🎁 Magic Checkout: Fetching promotions...");
      try {
        await fetchPromotions(orderData.order_id);
        console.log("✅ Magic Checkout: Promotions fetched");
      } catch (promoError) {
        console.warn("⚠️ Magic Checkout: Failed to fetch promotions (non-critical):", promoError);
      }

      // Step 5: Optionally fetch shipping info (non-blocking)
      if (shippingAddress) {
        console.log("📍 Magic Checkout: Fetching shipping info...");
        try {
          await fetchShippingInfo([shippingAddress]);
          console.log("✅ Magic Checkout: Shipping info fetched");
        } catch (shippingError) {
          console.warn("⚠️ Magic Checkout: Failed to fetch shipping info (non-critical):", shippingError);
        }
      }

      // Step 6: Open Magic Checkout payment modal
      console.log("🎯 Magic Checkout: Opening payment modal...");
      instance.open();
      return true;
    } catch (err) {
      console.error("❌ Magic Checkout: Payment process error:", {
        message: err.message,
        stack: err.stack
      });
      setError(err.message || "Failed to process payment");
      setIsProcessing(false);
      if (onError) {
        onError(err);
      }
      return false;
    }
  }, [
    cartItems,
    user,
    shippingAddress,
    shippingFee,
    appliedCoupon,
    API_URL,
    initializeMagicCheckout,
    fetchPromotions,
    fetchShippingInfo,
    onError,
  ]);

  /**
   * Fallback to standard checkout - Removed, open SDK directly
   */
  const fallbackToStandardCheckout = useCallback(() => {
    console.log("⚠️ Magic Checkout: SDK failed to load, using fallback");
    setError("Magic Checkout is not available. Using standard checkout instead.");
    
    // Don't show alert, just log and disable Magic Checkout
    console.warn("Magic Checkout SDK failed to load. Possible reasons:");
    console.warn("1. Network issue - check if https://checkout.razorpay.com is accessible");
    console.warn("2. Magic Checkout not enabled in Razorpay account");
    console.warn("3. Script blocked by browser/ad-blocker");
    console.warn("Environment check:", {
      MAGIC_CHECKOUT_ENABLED,
      RAZORPAY_KEY: RAZORPAY_KEY ? 'SET' : 'NOT SET'
    });
  }, [MAGIC_CHECKOUT_ENABLED, RAZORPAY_KEY]);

  /**
   * Load SDK on mount if enabled
   */
  useEffect(() => {
    if (MAGIC_CHECKOUT_ENABLED) {
      loadMagicCheckoutSDK().catch((err) => {
        console.error("Failed to load Magic Checkout SDK:", err);
        fallbackToStandardCheckout();
      });
    }
  }, [MAGIC_CHECKOUT_ENABLED, loadMagicCheckoutSDK, fallbackToStandardCheckout]);

  /**
   * Expose processPayment function to parent component and globally
   */
  useEffect(() => {
    // Make processPayment available globally for cart drawer
    if (typeof window !== 'undefined') {
      window.openMagicCheckout = processPayment;
      console.log("✅ Magic Checkout: Global function registered (window.openMagicCheckout)");
    }
    
    return () => {
      // Cleanup on unmount
      if (typeof window !== 'undefined') {
        delete window.openMagicCheckout;
      }
    };
  }, [processPayment]);

  /**
   * Fetch shipping info when address changes - DISABLED
   * This was causing premature API calls on page load
   * Shipping info should only be fetched when user clicks "Pay with Magic Checkout"
   */
  // useEffect(() => {
  //   if (shippingAddress && sdkLoaded) {
  //     fetchShippingInfo([shippingAddress]);
  //   }
  // }, [shippingAddress, sdkLoaded, fetchShippingInfo]);

  // Don't render anything if Magic Checkout is not enabled
  if (!MAGIC_CHECKOUT_ENABLED) {
    return (
      <div className="magic-checkout-container" style={{ 
        padding: '20px', 
        backgroundColor: '#fff3cd', 
        border: '1px solid #ffc107',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <p style={{ margin: 0, color: '#856404', fontWeight: '500' }}>
          ⚠️ Magic Checkout is not enabled. 
          <br />
          <small>Set NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED=true in .env.local to enable.</small>
        </p>
      </div>
    );
  }

  return (
    <div className="magic-checkout-container">
      {sdkLoading && (
        <div className="magic-checkout-loading" style={{ 
          padding: '20px', 
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <p style={{ margin: 0, color: '#666' }}>Loading Magic Checkout...</p>
        </div>
      )}

      {error && (
        <div className="magic-checkout-error" style={{ 
          padding: '15px', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <p style={{ margin: 0, color: '#c00' }}>{error}</p>
        </div>
      )}

      {sdkLoaded && !error && (
        <div className="magic-checkout-ready">
          <button
            onClick={processPayment}
            disabled={isProcessing || !shippingAddress}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: isProcessing || !shippingAddress ? '#ccc' : '#5469d4',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isProcessing || !shippingAddress ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s ease',
            }}
            onMouseEnter={(e) => {
              if (!isProcessing && shippingAddress) {
                e.target.style.backgroundColor = '#4355c9';
              }
            }}
            onMouseLeave={(e) => {
              if (!isProcessing && shippingAddress) {
                e.target.style.backgroundColor = '#5469d4';
              }
            }}
          >
            {isProcessing ? "Processing..." : "Pay with Magic Checkout"}
          </button>

          {!shippingAddress && (
            <p style={{ 
              marginTop: '10px', 
              fontSize: '14px', 
              color: '#666',
              textAlign: 'center'
            }}>
              Please add a shipping address to continue
            </p>
          )}

          {/* Promotions Section */}
          {promotions.length > 0 && (
            <div className="magic-checkout-promotions" style={{ marginTop: '20px' }}>
              <h4 style={{ marginBottom: '10px', fontSize: '16px' }}>Available Promotions</h4>
              <div className="promotions-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {promotions.map((promo) => (
                  <div
                    key={promo.code}
                    className={`promotion-card ${
                      selectedPromotion?.code === promo.code ? "selected" : ""
                    }`}
                    onClick={() => applyPromotion(promo.code)}
                    style={{
                      padding: '12px',
                      border: selectedPromotion?.code === promo.code ? '2px solid #5469d4' : '1px solid #ddd',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedPromotion?.code === promo.code ? '#f0f4ff' : 'white',
                    }}
                  >
                    <div className="promotion-code" style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {promo.code}
                    </div>
                    <div className="promotion-description" style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                      {promo.description}
                    </div>
                    <div className="promotion-value" style={{ fontSize: '14px', color: '#5469d4', fontWeight: '500' }}>
                      {promo.type === "percentage"
                        ? `${promo.value}% off`
                        : `₹${promo.value} off`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shipping Info Section */}
          {shippingInfo.length > 0 && (
            <div className="magic-checkout-shipping-info" style={{ marginTop: '20px' }}>
              <h4 style={{ marginBottom: '10px', fontSize: '16px' }}>Shipping Information</h4>
              {shippingInfo.map((info) => (
                <div key={info.address_id} className="shipping-info-card" style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: info.serviceable ? '#f0fff4' : '#fff5f5',
                }}>
                  <div className="shipping-serviceability" style={{ marginBottom: '8px' }}>
                    {info.serviceable ? (
                      <span className="serviceable" style={{ color: '#22c55e', fontWeight: '500' }}>
                        ✓ Delivery Available
                      </span>
                    ) : (
                      <span className="not-serviceable" style={{ color: '#ef4444', fontWeight: '500' }}>
                        ✗ Not Serviceable
                      </span>
                    )}
                  </div>
                  {info.serviceable && (
                    <>
                      <div className="shipping-cod" style={{ fontSize: '14px', marginBottom: '4px' }}>
                        COD: {info.cod_available ? "Available" : "Not Available"}
                      </div>
                      <div className="shipping-fees" style={{ fontSize: '14px', marginBottom: '4px' }}>
                        Shipping Fee: ₹{(info.shipping_fee / 100).toFixed(2)}
                      </div>
                      {info.cod_available && info.cod_fee > 0 && (
                        <div className="cod-fee" style={{ fontSize: '14px', marginBottom: '4px' }}>
                          COD Fee: ₹{(info.cod_fee / 100).toFixed(2)}
                        </div>
                      )}
                      <div className="address-quality" style={{ fontSize: '14px', color: '#666' }}>
                        Address Quality: {info.address_quality_score}/100
                      </div>
                    </>
                  )}
                  {!info.serviceable && info.reason && (
                    <div className="shipping-reason" style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                      Reason: {info.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

MagicCheckoutIntegration.propTypes = {
  cartItems: PropTypes.array,
  user: PropTypes.object,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
  shippingAddress: PropTypes.object,
  shippingFee: PropTypes.object,
  appliedCoupon: PropTypes.object,
};

export default MagicCheckoutIntegration;
