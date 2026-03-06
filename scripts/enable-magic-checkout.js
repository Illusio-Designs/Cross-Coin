#!/usr/bin/env node

/**
 * Enable Magic Checkout Script
 * 
 * This script reverts all changes and enables Magic Checkout functionality
 * Run: node scripts/enable-magic-checkout.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Enabling Magic Checkout...\n');

const changes = [
  {
    file: 'Crosscoin/src/pages/UnifiedCheckout.jsx',
    changes: [
      {
        find: `// Magic Checkout components removed - using traditional checkout only
// import MagicCheckoutIntegration from "../components/checkout/MagicCheckoutIntegration";
// import ExpressCheckout from "../components/checkout/ExpressCheckout";`,
        replace: `import MagicCheckoutIntegration from "../components/checkout/MagicCheckoutIntegration";
// import ExpressCheckout from "../components/checkout/ExpressCheckout"; // COMMENTED OUT - Using normal checkout only`
      },
      {
        find: `  }, [shippingFee, appliedCoupon]); // Removed handleCouponRemoved from dependencies`,
        replace: `  }, [shippingFee, appliedCoupon]); // Removed handleCouponRemoved from dependencies

  // Magic Checkout - Always show
  const [useMagicCheckout, setUseMagicCheckout] = useState(true);`
      },
      {
        find: `  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.getElementById("razorpay-script")) return resolve(true);
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };`,
        replace: `  // Helper to load Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.getElementById("razorpay-script")) return resolve(true);
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  /**
   * Handle Magic Checkout success callback
   */
  const handleMagicCheckoutSuccess = async (paymentResponse) => {
    try {
      console.log("Magic Checkout payment success:", paymentResponse);
      
      // Prepare order data
      const orderData = !isAuthenticated ? {
        guest_info: guestInfo,
        shipping_address: {
          fullName: shippingAddress.full_name || shippingAddress.fullName,
          address: shippingAddress.address,
          city: shippingAddress.city,
          state: shippingAddress.state,
          pincode: shippingAddress.postal_code || shippingAddress.postalCode,
          phone: shippingAddress.phone_number || shippingAddress.phoneNumber,
        },
        items: [
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
        ],
        payment_type: "upi",
        notes: "Magic Checkout Payment",
        discount_amount: appliedCoupon?.discount || 0,
        coupon_id: appliedCoupon?.id || null,
        session_id: typeof window !== "undefined" ? sessionStorage.getItem("sessionId") || "guest-" + Date.now() : "guest-" + Date.now(),
        ip_address: typeof window !== "undefined" ? window.location.hostname : "localhost",
        user_agent: typeof window !== "undefined" ? window.navigator.userAgent : "unknown",
      } : {
        shipping_address_id: shippingAddress.id,
        items: [
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
        ],
        payment_type: "upi",
        notes: "Magic Checkout Payment",
        discount_amount: appliedCoupon?.discount || 0,
        coupon_id: appliedCoupon?.id || null,
      };

      // Create order
      const orderResult = !isAuthenticated ? await createGuestOrder(orderData) : await createOrder(orderData);
      
      // Update order with payment details
      await updateOrderPayment({
        orderId: orderResult.data.order.id,
        razorpayPaymentId: paymentResponse.razorpay_payment_id,
        razorpayOrderId: paymentResponse.razorpay_order_id,
        razorpaySignature: paymentResponse.razorpay_signature
      });

      // Track purchase
      try {
        const totalAmount = cartItems.reduce((sum, item) => {
          const price = parseFloat(item.price || 0);
          return sum + price * (item.quantity || 1);
        }, 0);
        const shippingFeeAmount = parseFloat(shippingFee?.fee || 0);
        const discountAmount = appliedCoupon?.discount || 0;
        const finalAmount = totalAmount + shippingFeeAmount - discountAmount;

        const orderNumber = orderResult?.data?.order?.order_number;
        const purchaseTracked = fbqTrack("Purchase", {
          value: Number(finalAmount.toFixed(2)),
          currency: "INR",
          content_type: "product",
          contents: cartItems.filter((item) => item.productId || item.id).map((item) => ({
            id: String(item.productId || item.id),
            quantity: item.quantity || 1,
          })),
        });

        if (purchaseTracked && orderNumber) {
          sessionStorage.setItem(\`fb_purchase_tracked_\${orderNumber}\`, "true");
        }
      } catch (e) {
        console.warn("Purchase tracking (Magic Checkout): failed to send fbq Purchase", e);
      }

      // Clear cart and redirect
      clearCart();
      clearBuyNow();
      sessionStorage.removeItem("shippingAddress");
      sessionStorage.removeItem("appliedCoupon");
      showOrderPlacedSuccessToast(orderResult.data.order.order_number);
      
      const redirectUrl = !isAuthenticated 
        ? \`/ThankYou?order_number=\${orderResult.data.order.order_number}&guest_email=\${encodeURIComponent(guestInfo.email)}&is_guest=true\`
        : \`/ThankYou?order_number=\${orderResult.data.order.order_number}\`;
      
      router.push(redirectUrl);
    } catch (error) {
      console.error("Error handling Magic Checkout success:", error);
      showOrderPlacedErrorToast("Payment successful but order creation failed. Please contact support.");
      setIsProcessing(false);
    }
  };

  /**
   * Handle Magic Checkout error callback
   */
  const handleMagicCheckoutError = (error) => {
    console.error("Magic Checkout error:", error);
    
    // Show error notification
    alert(\`Magic Checkout Error: \${error.message || 'Payment failed'}\\n\\nPlease try again or contact support.\`);
    
    setIsProcessing(false);
  };`
      },
      {
        find: `      <div className="cart-main checkout-container">
        <div className="cart-section">
          {/* Products Section */}
          <CartStep`,
        replace: `      <div className="cart-main checkout-container">
        <div className="cart-section">
          {/* Express Checkout - COMMENTED OUT - Using normal checkout only */}
          {/* {(cartItems.length > 0 || buyNowItem) && (
            <ExpressCheckout
              onSuccess={handleMagicCheckoutSuccess}
              onError={handleMagicCheckoutError}
            />
          )} */}

          {/* Products Section */}
          <CartStep`
      },
      {
        find: `        {/* Order Summary */}
        {(cartItems.length > 0 || buyNowItem) && (
          <div className="order-summary-section">
            <OrderSummary
              step="checkout"
              onNext={() => {}}
              onPlaceOrder={handlePlaceOrder}
              shippingAddress={shippingAddress}
              shippingFee={shippingFee}
              isProcessing={isProcessing}
              isCartLoading={isCartLoading}
              appliedCoupon={appliedCoupon}
              onCouponApplied={handleCouponApplied}
              onCouponRemoved={handleCouponRemoved}
              isGuestCheckout={!isAuthenticated}
              guestInfo={guestInfo}
              buyNowItem={buyNowItem}
              buyNowTotal={buyNowTotal}
              shippingFees={shippingFees}
              onSelectFee={handleSelectFee}
            />
          </div>
        )}`,
        replace: `        {/* Order Summary */}
        {(cartItems.length > 0 || buyNowItem) && (
          <div className="order-summary-section">
            <OrderSummary
              step="checkout"
              onNext={() => {}}
              onPlaceOrder={handlePlaceOrder}
              shippingAddress={shippingAddress}
              shippingFee={shippingFee}
              isProcessing={isProcessing}
              isCartLoading={isCartLoading}
              appliedCoupon={appliedCoupon}
              onCouponApplied={handleCouponApplied}
              onCouponRemoved={handleCouponRemoved}
              isGuestCheckout={!isAuthenticated}
              guestInfo={guestInfo}
              buyNowItem={buyNowItem}
              buyNowTotal={buyNowTotal}
              shippingFees={shippingFees}
              onSelectFee={handleSelectFee}
            />

            {/* Magic Checkout Integration */}
            {useMagicCheckout && shippingAddress && (
              <div className="magic-checkout-section" style={{ marginTop: '20px' }}>
                <div style={{ 
                  padding: '20px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <h3 style={{ marginBottom: '15px', fontSize: '18px', fontWeight: '600' }}>
                    Express Checkout
                  </h3>
                  <MagicCheckoutIntegration
                    cartItems={cartItems}
                    user={user}
                    onSuccess={handleMagicCheckoutSuccess}
                    onError={handleMagicCheckoutError}
                    shippingAddress={shippingAddress}
                    shippingFee={shippingFee}
                    appliedCoupon={appliedCoupon}
                  />
                </div>
              </div>
            )}
          </div>
        )}`
      }
    ]
  },
  {
    file: 'Crosscoin/src/pages/_app.jsx',
    changes: [
      {
        find: `import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Loader from "../components/Loader";
import CartDrawer from "../components/cart/CartDrawer";
// Critical CSS only - loaded immediately`,
        replace: `import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Loader from "../components/Loader";
import CartDrawer from "../components/cart/CartDrawer";
import MagicCheckoutIntegration from "../components/checkout/MagicCheckoutIntegration";
// Critical CSS only - loaded immediately`
      },
      {
        find: `function AppContent({ Component, pageProps, progressRef }) {
  const { isDrawerOpen, setIsDrawerOpen, lastAddedItem, cartItems } = useCart();
  const { user } = useAuth();

  return (`,
        replace: `function AppContent({ Component, pageProps, progressRef }) {
  const { isDrawerOpen, setIsDrawerOpen, lastAddedItem, cartItems } = useCart();
  const { user } = useAuth();
  const [shippingAddress, setShippingAddress] = useState(null);
  const [shippingFee, setShippingFee] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Load saved data from session storage
  useEffect(() => {
    const savedAddress = sessionStorage.getItem('shippingAddress');
    const savedCoupon = sessionStorage.getItem('appliedCoupon');
    
    if (savedAddress) {
      try {
        setShippingAddress(JSON.parse(savedAddress));
      } catch (e) {
        console.error('Failed to parse shipping address', e);
      }
    }
    
    if (savedCoupon) {
      try {
        setAppliedCoupon(JSON.parse(savedCoupon));
      } catch (e) {
        console.error('Failed to parse coupon', e);
      }
    }
  }, []);

  const handleMagicCheckoutSuccess = async (paymentResponse) => {
    console.log("✅ Global Magic Checkout: Payment successful", paymentResponse);
    // Redirect to thank you page or handle success
    window.location.href = '/ThankYou';
  };

  const handleMagicCheckoutError = (error) => {
    console.error("❌ Global Magic Checkout: Error", error);
    alert(\`Payment failed: \${error.message || 'Please try again'}\`);
  };

  return (`
      },
      {
        find: `      <CartDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)}
        lastAddedItem={lastAddedItem}
      />
      
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}`,
        replace: `      <CartDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)}
        lastAddedItem={lastAddedItem}
      />
      
      {/* Global Magic Checkout Integration - Hidden but always mounted */}
      <div style={{ display: 'none' }}>
        <MagicCheckoutIntegration
          cartItems={cartItems}
          user={user}
          onSuccess={handleMagicCheckoutSuccess}
          onError={handleMagicCheckoutError}
          shippingAddress={shippingAddress}
          shippingFee={shippingFee}
          appliedCoupon={appliedCoupon}
        />
      </div>
      
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}`
      }
    ]
  },
  {
    file: 'Crosscoin/src/components/cart/CartDrawer.jsx',
    changes: [
      {
        find: `  const finalTotal = Math.max(0, cartTotal - discountAmount);

  const handleCheckout = () => {
    onClose();
    router.push('/UnifiedCheckout');
  };

`,
        replace: `  const finalTotal = Math.max(0, cartTotal - discountAmount);

  const handleCheckout = () => {
    onClose();
    router.push('/UnifiedCheckout');
  };

  const handleFastCheckout = () => {
    console.log("🚀 Fast Checkout: Opening Magic Checkout...");
    // Close drawer
    onClose();
    // Trigger Magic Checkout modal
    if (typeof window !== 'undefined' && window.openMagicCheckout) {
      window.openMagicCheckout();
    } else {
      console.error("❌ Magic Checkout not available");
      // Fallback to regular checkout
      router.push('/UnifiedCheckout');
    }
  };

`
      },
      {
        find: `              <span className="total-amount">₹{finalTotal.toFixed(2)}</span>
            </div>
            
            <div className="cart-drawer-buttons">
              <button className="cart-drawer-btn primary" onClick={handleCheckout}>
                Proceed to Checkout
              </button>
            </div>`,
        replace: `              <span className="total-amount">₹{finalTotal.toFixed(2)}</span>
            </div>
            
            <div className="cart-drawer-buttons">
              <button className="cart-drawer-btn primary magic" onClick={handleFastCheckout}>
                ⚡ Fast Checkout (Magic)
              </button>
              
              <button className="cart-drawer-btn secondary" onClick={handleCheckout}>
                Regular Checkout
              </button>
            </div>`
      }
    ]
  },
  {
    file: 'Crosscoin/src/services/publicindex.js',
    changes: [
      {
        find: `    return response.data;
  } catch (error) {
    console.error("AWB TRACKING API ERROR:", error);
    throw error.response?.data || error.message;
  }
};`,
        replace: `    return response.data;
  } catch (error) {
    console.error("AWB TRACKING API ERROR:", error);
    throw error.response?.data || error.message;
  }
};

// Magic Checkout APIs
export const getMagicCheckoutPromotions = async ({ orderId, customerId, cartTotal }) => {
  try {
    const queryParams = new URLSearchParams({
      order_id: orderId,
      cart_total: cartTotal,
    });
    
    if (customerId) {
      queryParams.append("customer_id", customerId);
    }

    const response = await axios.get(
      \`\${API_URL}/api/payments/magic-checkout/promotions?\${queryParams.toString()}\`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching Magic Checkout promotions:", error);
    throw error.response?.data || error.message;
  }
};

export const applyMagicCheckoutPromotion = async ({ 
  orderId, 
  promotionCode, 
  customerId, 
  cartTotal, 
  cartItems 
}) => {
  try {
    const response = await axios.post(
      \`\${API_URL}/api/payments/magic-checkout/apply-promotion\`,
      {
        order_id: orderId,
        promotion_code: promotionCode,
        customer_id: customerId,
        cart_total: cartTotal,
        cart_items: cartItems,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error applying Magic Checkout promotion:", error);
    throw error.response?.data || error.message;
  }
};

export const getMagicCheckoutShippingInfo = async ({ 
  orderId, 
  addresses, 
  cartTotal, 
  paymentMethod 
}) => {
  try {
    const response = await axios.post(
      \`\${API_URL}/api/payments/magic-checkout/shipping-info\`,
      {
        order_id: orderId,
        addresses,
        cart_total: cartTotal,
        payment_method: paymentMethod,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching Magic Checkout shipping info:", error);
    throw error.response?.data || error.message;
  }
};

export const createMagicCheckoutOrder = async (orderData) => {
  try {
    const token = localStorage.getItem("token");
    const headers = {};
    
    if (token) {
      headers.Authorization = \`Bearer \${token}\`;
    }

    const response = await axios.post(
      \`\${API_URL}/api/payments/magic-checkout/create-order\`,
      orderData,
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error("Error creating Magic Checkout order:", error);
    throw error.response?.data || error.message;
  }
};

export const verifyMagicCheckoutPayment = async (paymentData) => {
  try {
    const token = localStorage.getItem("token");
    const headers = {};
    
    if (token) {
      headers.Authorization = \`Bearer \${token}\`;
    }

    const response = await axios.post(
      \`\${API_URL}/api/payments/magic-checkout/verify-payment\`,
      paymentData,
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error("Error verifying Magic Checkout payment:", error);
    throw error.response?.data || error.message;
  }
};`
      }
    ]
  },
  {
    file: 'Gripzus/src/services/publicindex.js',
    changes: [
      {
        find: `    );
    console.log("AWB TRACKING API RESPONSE:", response.data);
    return response.data;
  } catch (error) {
    console.error("AWB TRACKING API ERROR:", error);
    throw error.response?.data || error.message;
  }
};`,
        replace: `    );
    console.log("AWB TRACKING API RESPONSE:", response.data);
    return response.data;
  } catch (error) {
    console.error("AWB TRACKING API ERROR:", error);
    throw error.response?.data || error.message;
  }
};

// Magic Checkout APIs
export const getMagicCheckoutPromotions = async ({ orderId, customerId, cartTotal }) => {
  try {
    const queryParams = new URLSearchParams({
      order_id: orderId,
      cart_total: cartTotal,
    });
    
    if (customerId) {
      queryParams.append("customer_id", customerId);
    }

    const response = await axios.get(
      \`\${API_URL}/api/payments/magic-checkout/promotions?\${queryParams.toString()}\`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching Magic Checkout promotions:", error);
    throw error.response?.data || error.message;
  }
};

export const applyMagicCheckoutPromotion = async ({ 
  orderId, 
  promotionCode, 
  customerId, 
  cartTotal, 
  cartItems 
}) => {
  try {
    const response = await axios.post(
      \`\${API_URL}/api/payments/magic-checkout/apply-promotion\`,
      {
        order_id: orderId,
        promotion_code: promotionCode,
        customer_id: customerId,
        cart_total: cartTotal,
        cart_items: cartItems,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error applying Magic Checkout promotion:", error);
    throw error.response?.data || error.message;
  }
};

export const getMagicCheckoutShippingInfo = async ({ 
  orderId, 
  addresses, 
  cartTotal, 
  paymentMethod 
}) => {
  try {
    const response = await axios.post(
      \`\${API_URL}/api/payments/magic-checkout/shipping-info\`,
      {
        order_id: orderId,
        addresses,
        cart_total: cartTotal,
        payment_method: paymentMethod,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching Magic Checkout shipping info:", error);
    throw error.response?.data || error.message;
  }
};

export const createMagicCheckoutOrder = async (orderData) => {
  try {
    const token = localStorage.getItem("token");
    const headers = {};
    
    if (token) {
      headers.Authorization = \`Bearer \${token}\`;
    }

    const response = await axios.post(
      \`\${API_URL}/api/payments/magic-checkout/create-order\`,
      orderData,
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error("Error creating Magic Checkout order:", error);
    throw error.response?.data || error.message;
  }
};

export const verifyMagicCheckoutPayment = async (paymentData) => {
  try {
    const token = localStorage.getItem("token");
    const headers = {};
    
    if (token) {
      headers.Authorization = \`Bearer \${token}\`;
    }

    const response = await axios.post(
      \`\${API_URL}/api/payments/magic-checkout/verify-payment\`,
      paymentData,
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error("Error verifying Magic Checkout payment:", error);
    throw error.response?.data || error.message;
  }
};`
      }
    ]
  }
];

let successCount = 0;
let errorCount = 0;

changes.forEach(({ file, changes: fileChanges }) => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    errorCount++;
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  fileChanges.forEach(({ find, replace }) => {
    if (content.includes(find)) {
      content = content.replace(find, replace);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${file}`);
    successCount++;
  } else {
    console.log(`⚠️  No changes needed: ${file}`);
  }
});

console.log(`\n✨ Magic Checkout Enabled!`);
console.log(`   ✅ ${successCount} files updated`);
if (errorCount > 0) {
  console.log(`   ⚠️  ${errorCount} files had issues`);
}
console.log(`\n🎉 Magic Checkout is now active with Express Checkout button!\n`);
