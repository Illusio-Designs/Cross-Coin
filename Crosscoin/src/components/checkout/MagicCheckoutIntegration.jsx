import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";

/**
 * Magic Checkout SDK Integration Component
 * Handles Razorpay Magic Checkout SDK loading, initialization, and payment processing
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
   * Initialize Magic Checkout SDK
   */
  const initializeMagicCheckout = useCallback(async () => {
    if (!sdkLoaded || !window.RazorpayMagicCheckout) {
      console.error("Magic Checkout SDK not loaded");
      return null;
    }

    try {
      const orderContext = {
        amount: calculateTotalAmount(),
        currency: "INR",
        customer: {
          id: user?.id || null,
          email: user?.email || "",
          phone: user?.phone || "",
          name: user?.name || "",
        },
        items: cartItems.map((item) => ({
          productId: item.productId || item.id,
          name: item.name || item.title,
          quantity: item.quantity,
          price: item.price,
        })),
      };

      const instance = new window.RazorpayMagicCheckout({
        key: RAZORPAY_KEY,
        order_context: orderContext,
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
  }, [sdkLoaded, user, cartItems, RAZORPAY_KEY]);

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
      const cartTotal = cartItems.reduce((sum, item) => {
        return sum + parseFloat(item.price || 0) * (item.quantity || 1);
      }, 0);

      const response = await fetch(
        `${API_URL}/api/payments/magic-checkout/shipping-info`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
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
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch shipping info");
      }

      const data = await response.json();
      setShippingInfo(data.shipping_info || []);
      return data.shipping_info || [];
    } catch (err) {
      console.error("Error fetching shipping info:", err);
      setShippingInfo([]);
      return [];
    }
  }, [cartItems, shippingFee, API_URL]);

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
   * Process payment through Magic Checkout
   */
  const processPayment = useCallback(async () => {
    if (!magicCheckoutInstance) {
      console.error("Magic Checkout not initialized");
      setError("Magic Checkout not initialized");
      return false;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Open Magic Checkout payment modal
      magicCheckoutInstance.open();
      return true;
    } catch (err) {
      console.error("Error processing payment:", err);
      setError("Failed to process payment");
      setIsProcessing(false);
      if (onError) {
        onError(err);
      }
      return false;
    }
  }, [magicCheckoutInstance, onError]);

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
   * Initialize SDK when loaded
   */
  useEffect(() => {
    if (sdkLoaded && !magicCheckoutInstance) {
      initializeMagicCheckout();
    }
  }, [sdkLoaded, magicCheckoutInstance, initializeMagicCheckout]);

  /**
   * Fetch shipping info when address changes
   */
  useEffect(() => {
    if (shippingAddress && sdkLoaded) {
      fetchShippingInfo([shippingAddress]);
    }
  }, [shippingAddress, sdkLoaded, fetchShippingInfo]);

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
        <div className="magic-checkout-loading">
          <p>Loading Magic Checkout...</p>
        </div>
      )}

      {error && (
        <div className="magic-checkout-error">
          <p>{error}</p>
        </div>
      )}

      {sdkLoaded && !error && (
        <div className="magic-checkout-ready">
          {/* Promotions Section */}
          {promotions.length > 0 && (
            <div className="magic-checkout-promotions">
              <h4>Available Promotions</h4>
              <div className="promotions-list">
                {promotions.map((promo) => (
                  <div
                    key={promo.code}
                    className={`promotion-card ${
                      selectedPromotion?.code === promo.code ? "selected" : ""
                    }`}
                    onClick={() => applyPromotion(promo.code)}
                  >
                    <div className="promotion-code">{promo.code}</div>
                    <div className="promotion-description">{promo.description}</div>
                    <div className="promotion-value">
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
            <div className="magic-checkout-shipping-info">
              {shippingInfo.map((info) => (
                <div key={info.address_id} className="shipping-info-card">
                  <div className="shipping-serviceability">
                    {info.serviceable ? (
                      <span className="serviceable">✓ Delivery Available</span>
                    ) : (
                      <span className="not-serviceable">✗ Not Serviceable</span>
                    )}
                  </div>
                  {info.serviceable && (
                    <>
                      <div className="shipping-cod">
                        COD: {info.cod_available ? "Available" : "Not Available"}
                      </div>
                      <div className="shipping-fees">
                        Shipping Fee: ₹{(info.shipping_fee / 100).toFixed(2)}
                      </div>
                      {info.cod_available && info.cod_fee > 0 && (
                        <div className="cod-fee">
                          COD Fee: ₹{(info.cod_fee / 100).toFixed(2)}
                        </div>
                      )}
                      <div className="address-quality">
                        Address Quality: {info.address_quality_score}/100
                      </div>
                    </>
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
