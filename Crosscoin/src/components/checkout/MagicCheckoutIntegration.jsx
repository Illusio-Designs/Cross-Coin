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

  /**
   * Load Magic Checkout SDK from CDN
   */
  const loadMagicCheckoutSDK = useCallback(() => {
    return new Promise((resolve, reject) => {
      // Check if SDK is already loaded
      if (window.RazorpayMagicCheckout) {
        setSDKLoaded(true);
        resolve(true);
        return;
      }

      // Check if script tag already exists
      if (document.getElementById("razorpay-magic-checkout-script")) {
        // Wait for it to load
        const checkInterval = setInterval(() => {
          if (window.RazorpayMagicCheckout) {
            clearInterval(checkInterval);
            setSDKLoaded(true);
            resolve(true);
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!window.RazorpayMagicCheckout) {
            reject(new Error("SDK load timeout"));
          }
        }, 10000);
        return;
      }

      setSDKLoading(true);
      const script = document.createElement("script");
      script.id = "razorpay-magic-checkout-script";
      script.src = "https://checkout.razorpay.com/v1/magic-checkout.js";
      script.async = true;

      script.onload = () => {
        setSDKLoaded(true);
        setSDKLoading(false);
        resolve(true);
      };

      script.onerror = () => {
        setSDKLoading(false);
        setError("Failed to load Magic Checkout SDK");
        reject(new Error("Failed to load Magic Checkout SDK"));
      };

      document.body.appendChild(script);
    });
  }, []);

  /**
   * Initialize Magic Checkout SDK with order_id
   */
  const initializeMagicCheckout = useCallback(async (orderId) => {
    if (!sdkLoaded || !window.RazorpayMagicCheckout) {
      console.error("Magic Checkout SDK not loaded");
      return null;
    }

    if (!orderId) {
      console.error("Order ID is required to initialize Magic Checkout");
      return null;
    }

    try {
      const instance = new window.RazorpayMagicCheckout({
        key: RAZORPAY_KEY,
        order_id: orderId, // Use the created order ID
        handler: handlePaymentSuccess,
        modal: {
          ondismiss: handlePaymentDismiss,
        },
      });

      setMagicCheckoutInstance(instance);
      return instance;
    } catch (err) {
      console.error("Failed to initialize Magic Checkout:", err);
      setError("Failed to initialize Magic Checkout");
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

    return Math.round(finalAmount * 100); // Convert to paise
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
            cart_total: Math.round(cartTotal * 100),
          }),
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
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
          },
          body: JSON.stringify({
            promotion_code: promotionCode,
            customer_id: user?.id || "",
            cart_total: Math.round(cartTotal * 100),
            cart_items: cartItems.map((item) => ({
              product_id: item.productId || item.id,
              quantity: item.quantity,
              price: Math.round(parseFloat(item.price || 0) * 100),
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
        cart_total: Math.round(cartTotal * 100),
        payment_method: shippingFee?.orderType === "cod" ? "cod" : "prepaid",
      };
      
      console.log("📦 Magic Checkout: Shipping info request:", requestBody);

      const response = await fetch(
        `${API_URL}/api/payments/magic-checkout/shipping-info`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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
    console.log("Magic Checkout SDK failed to load");
    setError("Magic Checkout is not available. Please check your Razorpay configuration.");
    
    // Show notification to user
    if (typeof window !== 'undefined' && window.alert) {
      alert("Magic Checkout Error: SDK failed to load. Please check:\n1. NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED is set to 'true'\n2. NEXT_PUBLIC_RAZORPAY_KEY_ID is configured\n3. Magic Checkout is enabled in your Razorpay account");
    }
  }, []);

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
   * Expose processPayment function to parent component
   */
  useEffect(() => {
    // Make processPayment available to parent via ref or callback
    if (typeof window !== 'undefined') {
      window.magicCheckoutProcessPayment = processPayment;
    }
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
