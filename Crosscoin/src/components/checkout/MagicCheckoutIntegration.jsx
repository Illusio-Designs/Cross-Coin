import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";

/**
 * Razorpay Magic Checkout Integration
 *
 * How Magic Checkout works (per official Razorpay docs):
 * 1. Load magic-checkout.js SDK (NOT checkout.js)
 * 2. Create a Razorpay order on your server with line_items + line_items_total (in paise)
 *    - line_items_total is MANDATORY to trigger Magic Checkout UI instead of Standard Checkout
 * 3. Open the modal with one_click_checkout: true (NOT magic: true)
 * 4. Razorpay handles address collection, OTP login, saved addresses, COD/prepaid selection
 * 5. Razorpay calls YOUR server's promotions/shipping APIs directly (configured in dashboard)
 *    - You do NOT call those APIs from the frontend
 * 6. On payment success, verify signature on your server
 *
 * Dashboard setup required:
 * - Magic Checkout > Setup & Settings > Checkout Settings
 *   → URL for get promotions: https://api.crosscoin.in/api/payments/magic-checkout/promotions
 *   → URL for apply promotions: https://api.crosscoin.in/api/payments/magic-checkout/apply-promotion
 * - Magic Checkout > Shipping Setup
 *   → Shipping Service type: API
 *   → URL for shipping info: https://api.crosscoin.in/api/payments/magic-checkout/shipping-info
 */
const MagicCheckoutIntegration = ({
  cartItems = [],
  user = null,
  appliedCoupon = null,
  onSuccess,
  onError,
}) => {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkLoading, setSdkLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";
  const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const MAGIC_CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED === "true";

  // ── Load the Magic Checkout SDK (magic-checkout.js, not checkout.js) ──────
  const loadSDK = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) { setSdkLoaded(true); resolve(true); return; }

      const existing = document.getElementById("rzp-magic-sdk");
      if (existing) {
        const poll = setInterval(() => {
          if (window.Razorpay) { clearInterval(poll); setSdkLoaded(true); resolve(true); }
        }, 100);
        setTimeout(() => { clearInterval(poll); reject(new Error("SDK timeout")); }, 10000);
        return;
      }

      setSdkLoading(true);
      const s = document.createElement("script");
      s.id = "rzp-magic-sdk";
      // Official Magic Checkout SDK — different from standard checkout.js
      s.src = "https://checkout.razorpay.com/v1/magic-checkout.js";
      s.async = true;
      s.onload = () => { setSdkLoaded(true); setSdkLoading(false); resolve(true); };
      s.onerror = () => { setSdkLoading(false); reject(new Error("Failed to load SDK")); };
      document.body.appendChild(s);
    });
  }, []);

  useEffect(() => {
    if (MAGIC_CHECKOUT_ENABLED) {
      loadSDK().catch(() => setError("Failed to load Razorpay Magic Checkout SDK"));
    }
  }, [MAGIC_CHECKOUT_ENABLED, loadSDK]);

  // ── Calculate totals ──────────────────────────────────────────────────────
  const getCartTotal = useCallback(() => {
    return cartItems.reduce((sum, item) => {
      const price = item.variation?.price || item.price || 0;
      return sum + parseFloat(price) * (item.quantity || 1);
    }, 0);
  }, [cartItems]);

  // ── Build line_items for Razorpay order (amounts in paise) ───────────────
  const buildLineItems = useCallback(() => {
    return cartItems.map((item) => {
      const price = parseFloat(item.variation?.price || item.price || 0);
      const priceInPaise = Math.round(price * 100);
      return {
        type: "e-commerce",
        sku: `SKU_${item.productId || item.id}`,
        variant_id: item.variationId ? `VAR_${item.variationId}` : undefined,
        price: priceInPaise,
        offer_price: priceInPaise,
        tax_amount: 0,
        quantity: item.quantity || 1,
        name: item.name || "Product",
        description: item.description || "",
        // image_url: item.image?.image_url || item.image || undefined,
      };
    });
  }, [cartItems]);

  // ── Main: create order then open Magic Checkout modal ────────────────────
  const processPayment = useCallback(async () => {
    if (!RAZORPAY_KEY) {
      setError("Razorpay key not configured (NEXT_PUBLIC_RAZORPAY_KEY_ID)");
      return;
    }
    if (cartItems.length === 0) {
      setError("Cart is empty");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const cartTotalRupees = getCartTotal();
      const discountRupees = parseFloat(appliedCoupon?.discount || 0);
      const finalAmountRupees = Math.max(0, cartTotalRupees - discountRupees);
      const lineItems = buildLineItems();

      // line_items_total = sum of (offer_price * quantity) in paise
      // This is MANDATORY — without it Razorpay falls back to Standard Checkout
      const lineItemsTotal = lineItems.reduce(
        (sum, item) => sum + item.offer_price * item.quantity,
        0
      );

      // Step 1: Create Razorpay order on our server
      const orderRes = await fetch(`${API_URL}/api/payments/magic-checkout/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brand-Name": "crosscoin",
          ...(user ? { Authorization: `Bearer ${localStorage.getItem("token")}` } : {}),
        },
        body: JSON.stringify({
          amount: finalAmountRupees,          // in rupees — backend converts to paise
          currency: "INR",
          customer_id: user?.id || null,
          line_items: lineItems,              // passed through to Razorpay
          line_items_total: lineItemsTotal,   // in paise — MANDATORY for Magic Checkout
          notes: {
            coupon_code: appliedCoupon?.code || null,
            discount_amount: discountRupees,
          },
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create order");
      }

      const { order_id, amount } = await orderRes.json();

      // Step 2: Open Magic Checkout modal
      // one_click_checkout: true is MANDATORY (not magic: true)
      const options = {
        key: RAZORPAY_KEY,
        order_id,
        amount,                       // in paise, returned by server
        currency: "INR",
        name: "Cross Coin",
        one_click_checkout: true,     // ← triggers Magic Checkout UI
        show_coupons: true,           // Razorpay fetches coupons from your promotions API
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        // Pre-applied discount display (does NOT affect payment amount)
        ...(appliedCoupon ? {
          one_click_checkout_options: {
            pre_discounts: [{
              label: appliedCoupon.code,
              value: `₹${discountRupees}`,
            }],
          },
        } : {}),
        theme: { color: "#180D3E" },
        modal: {
          ondismiss: () => setIsProcessing(false),
        },
        handler: async (response) => {
          // Step 3: Verify signature + create DB order
          try {
            const verifyRes = await fetch(`${API_URL}/api/payments/magic-checkout/verify-payment`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Brand-Name": "crosscoin",
                ...(user ? { Authorization: `Bearer ${localStorage.getItem("token")}` } : {}),
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                customer_id: user?.id || null,
                // Pass cart items so backend can create order items in DB
                cart_items: cartItems.map((item) => ({
                  product_id: item.productId || item.id,
                  variation_id: item.variationId || item.variation?.id || null,
                  quantity: item.quantity || 1,
                })),
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              if (onSuccess) onSuccess({ ...response, order_number: verifyData.order_number, db_order_id: verifyData.order_id });
            } else {
              throw new Error(verifyData.message || "Payment verification failed");
            }
          } catch (err) {
            if (onError) onError(err);
          } finally {
            setIsProcessing(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);

      // Optional: analytics tracking
      rzp.on("mx-analytics", (data) => {
        if (data?.event) {
          console.log("[Magic Checkout Analytics]", data.event, data);
        }
      });

      rzp.on("payment.failed", (response) => {
        setIsProcessing(false);
        if (onError) onError(new Error(response.error?.description || "Payment failed"));
      });

      rzp.open();
    } catch (err) {
      setError(err.message || "Failed to process payment");
      setIsProcessing(false);
      if (onError) onError(err);
    }
  }, [
    cartItems, user, appliedCoupon,
    API_URL, RAZORPAY_KEY, MAGIC_CHECKOUT_ENABLED,
    getCartTotal, buildLineItems, onSuccess, onError,
  ]);

  // ── Not enabled ───────────────────────────────────────────────────────────
  if (!MAGIC_CHECKOUT_ENABLED) {
    return (
      <div style={{
        padding: 16, background: "#fff3cd", border: "1px solid #ffc107",
        borderRadius: 8, fontSize: 14, color: "#856404",
      }}>
        ⚠️ Magic Checkout disabled.
        <br />
        <small>Set <code>NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED=true</code> in .env.local</small>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {error && (
        <div style={{
          padding: 12, background: "#fff5f5", border: "1px solid #feb2b2",
          borderRadius: 8, marginBottom: 12, fontSize: 14, color: "#c53030",
        }}>
          {error}
        </div>
      )}

      <button
        onClick={processPayment}
        disabled={isProcessing || sdkLoading || !sdkLoaded || cartItems.length === 0}
        style={{
          width: "100%", padding: "14px 0",
          background: isProcessing || sdkLoading || !sdkLoaded ? "#a0aec0" : "#180D3E",
          color: "#fff", border: "none", borderRadius: 8,
          fontSize: 16, fontWeight: 600,
          cursor: isProcessing || sdkLoading || !sdkLoaded ? "not-allowed" : "pointer",
          transition: "background 0.2s",
        }}
      >
        {sdkLoading ? "Loading..." : isProcessing ? "Processing..." : "⚡ Pay with Magic Checkout"}
      </button>

      <p style={{ margin: "8px 0 0", fontSize: 12, color: "#888", textAlign: "center" }}>
        Powered by Razorpay Magic Checkout — saved addresses, UPI, cards & COD
      </p>
    </div>
  );
};

MagicCheckoutIntegration.propTypes = {
  cartItems: PropTypes.array,
  user: PropTypes.object,
  appliedCoupon: PropTypes.object,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default MagicCheckoutIntegration;
