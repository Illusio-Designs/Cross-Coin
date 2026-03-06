/**
 * UnifiedCheckout Page
 * 
 * CHECKOUT FLOW:
 * 1. User adds items to cart
 * 2. User navigates to /checkout (this page)
 * 3. Page loads and fetches:
 *    - Shipping fees (with X-Brand-Name header)
 *    - User addresses (if authenticated)
 * 4. User fills in shipping address
 * 5. User selects delivery method (COD/Prepaid)
 * 6. User can either:
 *    a) Click "Place Order" button (standard checkout)
 *    b) Click "Pay with Magic Checkout" button (Razorpay Magic Checkout)
 * 
 * MAGIC CHECKOUT:
 * - Only triggers when user explicitly clicks "Pay with Magic Checkout" button
 * - Does NOT make API calls on page load or address changes
 * - Creates Razorpay order and opens payment modal when button is clicked
 * 
 * CONSOLE LOGGING:
 * - 🔄 = Loading/Processing
 * - ✅ = Success
 * - ❌ = Error
 * - 📦 = Shipping/Delivery related
 * - 👤 = User/Authentication related
 * - 💰 = Payment related
 * - 📍 = Address related
 * - 🛒 = Cart related
 * - 🎁 = Coupon/Promotion related
 */

import { useState, useEffect, useCallback } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useCart } from "../context/CartContext";
import { useRouter } from "next/router";
import CartStep from "../components/checkout/CartStep";
import OrderSummary from "../components/checkout/OrderSummary";
import { useAuth } from "../context/AuthContext";
import {
  createOrder,
  createRazorpayOrder,
  createGuestOrder,
  updateOrderPayment,
  getUserShippingAddresses,
  createShippingAddress,
  getShippingFees,
} from "../services/publicindex";
import {
  showOrderPlacedSuccessToast,
  showOrderPlacedErrorToast,
  showValidationErrorToast,
} from "../utils/toast";
import { fbqTrack } from "../components/common/Analytics";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
// Magic Checkout components removed - using traditional checkout only
// import MagicCheckoutIntegration from "../components/checkout/MagicCheckoutIntegration";
// import ExpressCheckout from "../components/checkout/ExpressCheckout";

// Load page-specific CSS
import "../styles/pages/UnifiedCheckout.css";
import "../styles/components/Header.css";
import "../styles/components/Footer.css";

export default function UnifiedCheckout() {
  const { user, isAuthenticated } = useAuth();
  const { cartItems, clearCart, isCartLoading, buyNowItem, buyNowTotal, clearBuyNow } = useCart();
  const router = useRouter();

  const [shippingAddress, setShippingAddress] = useState(null);
  const [shippingFee, setShippingFee] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('cod');

  // Sync payment mode with selected shipping fee
  useEffect(() => {
    if (shippingFee) {
      const paymentMode = shippingFee.orderType === 'prepaid' ? 'prepaid' : 'cod';
      setSelectedPaymentMode(paymentMode);
      
      // Check if applied coupon is compatible with new payment mode
      if (appliedCoupon && appliedCoupon.paymentMode && appliedCoupon.paymentMode !== paymentMode) {
        console.log('UnifiedCheckout: Removing incompatible coupon', {
          couponPaymentMode: appliedCoupon.paymentMode,
          newPaymentMode: paymentMode
        });
        // Remove coupon directly without calling handleCouponRemoved to avoid dependency issues
        setAppliedCoupon(null);
        sessionStorage.removeItem("appliedCoupon");
      }
    }
  }, [shippingFee, appliedCoupon]); // Removed handleCouponRemoved from dependencies

  // Address management state
  const [addresses, setAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    fullName: "",
    phoneNumber: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    isDefault: false,
  });
  const [shippingFees, setShippingFees] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);

  // Guest info state (for non-authenticated users) - simplified to just be part of address
  const [guestInfo, setGuestInfo] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
  });

  useEffect(() => {
    const savedCoupon = sessionStorage.getItem("appliedCoupon");
    if (savedCoupon) {
      try {
        setAppliedCoupon(JSON.parse(savedCoupon));
      } catch (e) {
        console.error("Failed to parse applied coupon from session storage", e);
        sessionStorage.removeItem("appliedCoupon");
      }
    }

    // Check for successful payment that might have been blocked from redirecting
    const paymentSuccess = sessionStorage.getItem("paymentSuccess");
    if (paymentSuccess && !orderPlaced) {
      try {
        const paymentData = JSON.parse(paymentSuccess);
        const timeDiff = Date.now() - paymentData.timestamp;
        
        // Only redirect if payment was recent (within 5 minutes)
        if (timeDiff < 5 * 60 * 1000) {
          console.log("Found recent successful payment, redirecting...", paymentData);
          
          const redirectUrl = paymentData.isGuest 
            ? `/ThankYou?order_number=${paymentData.orderNumber}&guest_email=${encodeURIComponent(paymentData.guestEmail)}&is_guest=true`
            : `/ThankYou?order_number=${paymentData.orderNumber}`;
          
          // Clear the payment success data
          sessionStorage.removeItem("paymentSuccess");
          
          // Redirect to thank you page
          router.push(redirectUrl);
        } else {
          // Clear old payment success data
          sessionStorage.removeItem("paymentSuccess");
        }
      } catch (e) {
        console.error("Failed to parse payment success data", e);
        sessionStorage.removeItem("paymentSuccess");
      }
    }
  }, [orderPlaced, router]);

  // Load addresses and shipping fees on mount
  useEffect(() => {
    const loadInitialData = async () => {
      console.log('🔄 UnifiedCheckout: Loading initial data...', {
        isAuthenticated,
        hasShippingFee: !!shippingFee,
        timestamp: new Date().toISOString()
      });
      
      try {
        // Load shipping fees
        console.log('📦 UnifiedCheckout: Fetching shipping fees from API...');
        console.log('📦 UnifiedCheckout: API URL:', process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in');
        console.log('📦 UnifiedCheckout: Has auth token:', !!localStorage.getItem("token"));
        
        const feeData = await getShippingFees();
        console.log('✅ UnifiedCheckout: Shipping fees API response:', {
          type: typeof feeData,
          isArray: Array.isArray(feeData),
          data: feeData
        });
        
        const fees = Array.isArray(feeData) ? feeData : feeData?.shippingFees || feeData?.fees || [];
        console.log('📦 UnifiedCheckout: Processed shipping fees:', {
          count: fees.length,
          fees: fees
        });
        
        setShippingFees(fees);
        if (!shippingFee && fees.length > 0) {
          const selectedFee = fees.find((f) => f.isDefault) || fees[0];
          console.log('📦 UnifiedCheckout: Auto-selecting shipping fee:', selectedFee);
          setShippingFee(selectedFee);
        }

        // Load addresses only for authenticated users
        if (isAuthenticated) {
          console.log('� UnifiedCheckoutr: User authenticated, loading addresses...');
          setAddressLoading(true);
          const addressData = await getUserShippingAddresses();
          console.log('✅ UnifiedCheckout: Addresses received:', {
            count: addressData?.length || 0,
            addresses: addressData
          });
          
          setAddresses(addressData);
          
          // Auto-select default address
          const defaultAddress = addressData.find((a) => a.isDefault);
          if (defaultAddress) {
            console.log('📍 UnifiedCheckout: Auto-selecting default address:', defaultAddress);
            setShippingAddress(defaultAddress);
          }
          setAddressLoading(false);
        } else {
          console.log('👤 UnifiedCheckout: Guest user, skipping address load');
        }
      } catch (error) {
        console.error('❌ UnifiedCheckout: Error loading initial data:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText,
          stack: error.stack,
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        });
        setShippingFees([]);
        setAddressLoading(false);
      }
    };

    loadInitialData();
  }, [isAuthenticated, shippingFee]);

  const handleSelectAddress = (address) => {
    setShippingAddress(address);
  };

  const handleSelectFee = (fee) => {
    setShippingFee(fee);
    
    // Remove coupon if COD is selected (coupons not valid for COD)
    if (fee.orderType === 'cod' && appliedCoupon) {
      handleCouponRemoved();
      showValidationErrorToast("Coupons are not applicable for Cash on Delivery orders");
    }
  };

  const handleAddressFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleGuestInfoChange = (e) => {
    const { name, value } = e.target;
    setGuestInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditAddress = (address) => {
    setEditingAddressId(address.id);
    setAddressForm({
      fullName: address.full_name || address.fullName || '',
      phoneNumber: address.phone_number || address.phoneNumber || '',
      address: address.address || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postal_code || address.postalCode || '',
      country: address.country || 'India',
      isDefault: address.isDefault || address.is_default || false,
    });
    setShowAddressForm(true);
  };

  const handleDeleteAddress = async (addressId) => {
    if (confirm('Are you sure you want to delete this address?')) {
      try {
        // Add delete address API call here if needed
        const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
        setAddresses(updatedAddresses);
        if (shippingAddress?.id === addressId) {
          setShippingAddress(null);
        }
      } catch (error) {
        console.error('Error deleting address:', error);
        showValidationErrorToast('Failed to delete address. Please try again.');
      }
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    
    // For guest users, extract first and last name from full name
    if (!isAuthenticated) {
      const fullNameParts = addressForm.fullName.split(' ');
      const firstName = fullNameParts[0] || '';
      const lastName = fullNameParts.slice(1).join(' ') || '';
      
      setGuestInfo(prev => ({
        ...prev,
        firstName: firstName,
        lastName: lastName,
        phone: addressForm.phoneNumber
      }));
    }
    
    try {
      let savedAddress;
      if (isAuthenticated) {
        if (editingAddressId) {
          // Update existing address logic would go here
          savedAddress = addressForm; // Simplified for now
        } else {
          savedAddress = await createShippingAddress(addressForm);
        }
        // Reload addresses
        const addressData = await getUserShippingAddresses();
        setAddresses(addressData);
      } else {
        // For guest users, create a temporary address object
        savedAddress = {
          id: Date.now(),
          full_name: addressForm.fullName,
          phone_number: addressForm.phoneNumber,
          address: addressForm.address,
          city: addressForm.city,
          state: addressForm.state,
          postal_code: addressForm.postalCode,
          country: addressForm.country,
        };
      }
      
      setShippingAddress(savedAddress);
      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm({
        fullName: "",
        phoneNumber: "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
        isDefault: false,
      });
    } catch (error) {
      console.error("Error saving address:", error);
      showValidationErrorToast("Failed to save address. Please try again.");
    }
  };

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

  const handlePlaceOrder = async () => {
    console.log('🛒 UnifiedCheckout: Place order initiated', {
      isAuthenticated,
      hasShippingAddress: !!shippingAddress,
      hasShippingFee: !!shippingFee,
      cartItemsCount: cartItems?.length || 0,
      hasBuyNowItem: !!buyNowItem,
      hasAppliedCoupon: !!appliedCoupon
    });
    
    // Validation
    if (!isAuthenticated) {
      console.log('👤 UnifiedCheckout: Guest checkout - validating guest info', guestInfo);
      if (!guestInfo.email || !guestInfo.firstName || !guestInfo.phone) {
        console.error('❌ UnifiedCheckout: Guest info incomplete');
        showValidationErrorToast("Please fill in all required information.");
        return;
      }
    }

    if (!shippingAddress || !shippingFee) {
      console.error('❌ UnifiedCheckout: Missing shipping details', {
        hasAddress: !!shippingAddress,
        hasFee: !!shippingFee
      });
      showValidationErrorToast("Please select shipping address and delivery method.");
      return;
    }

    if (!cartItems || cartItems.length === 0) {
      if (!buyNowItem) {
        console.error('❌ UnifiedCheckout: No items to order');
        showValidationErrorToast("Your cart is empty and no Buy Now item selected.");
        return;
      }
    }

    console.log('✅ UnifiedCheckout: Validation passed, processing order...');
    setIsProcessing(true);

    // Prepare order data
    let orderData;
    if (!isAuthenticated) {
      orderData = {
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
          // Include Buy Now item if exists
          ...(buyNowItem ? [{
            product_id: buyNowItem.productId || buyNowItem.id,
            variation_id: buyNowItem.variationId || buyNowItem.variation?.id || null,
            quantity: buyNowItem.quantity,
          }] : []),
          // Include cart items
          ...cartItems.map((item) => ({
            product_id: item.productId || item.id,
            variation_id: item.variationId || item.variation?.id || null,
            quantity: item.quantity,
          }))
        ],
        payment_type: shippingFee.orderType === "cod" ? "cod" : "upi",
        notes: "",
        discount_amount: appliedCoupon?.discount || 0,
        coupon_id: appliedCoupon?.id || null,
        session_id: typeof window !== "undefined" ? sessionStorage.getItem("sessionId") || "guest-" + Date.now() : "guest-" + Date.now(),
        ip_address: typeof window !== "undefined" ? window.location.hostname : "localhost",
        user_agent: typeof window !== "undefined" ? window.navigator.userAgent : "unknown",
      };
      console.log('📦 UnifiedCheckout: Guest order data prepared:', orderData);
    } else {
      orderData = {
        shipping_address_id: shippingAddress.id,
        items: [
          // Include Buy Now item if exists
          ...(buyNowItem ? [{
            product_id: buyNowItem.productId || buyNowItem.id,
            variation_id: buyNowItem.variationId || buyNowItem.variation?.id || null,
            quantity: buyNowItem.quantity,
          }] : []),
          // Include cart items
          ...cartItems.map((item) => ({
            product_id: item.productId || item.id,
            variation_id: item.variationId || item.variation?.id || null,
            quantity: item.quantity,
          }))
        ],
        payment_type: shippingFee.orderType === "cod" ? "cod" : "upi",
        notes: "",
        discount_amount: appliedCoupon?.discount || 0,
        coupon_id: appliedCoupon?.id || null,
      };
      console.log('📦 UnifiedCheckout: Authenticated order data prepared:', orderData);
    }

    try {
      if (shippingFee.orderType === "cod") {
        console.log('💵 UnifiedCheckout: COD order - creating order directly...');
        // COD: Create order immediately
        const orderResult = !isAuthenticated ? await createGuestOrder(orderData) : await createOrder(orderData);
        console.log('✅ UnifiedCheckout: COD order created:', orderResult);
        
        if (!orderResult?.order) {
          console.error('❌ UnifiedCheckout: Order creation failed - no order returned', orderResult);
          throw new Error("Order creation failed to return an order.");
        }

        // Track purchase
        try {
          const totalAmount = cartItems.reduce((sum, item) => {
            const price = parseFloat(item.price || 0);
            return sum + price * (item.quantity || 1);
          }, 0);
          const shippingFeeAmount = parseFloat(shippingFee.fee || 0);
          const discountAmount = appliedCoupon?.discount || 0;
          const finalAmount = totalAmount + shippingFeeAmount - discountAmount;

          const orderNumber = orderResult?.order?.order_number;
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
            sessionStorage.setItem(`fb_purchase_tracked_${orderNumber}`, "true");
          }
        } catch (e) {
          console.warn("Purchase tracking (COD): failed to send fbq Purchase", e);
        }

        // Clear cart and show success
        clearCart();
        clearBuyNow();
        sessionStorage.removeItem("shippingAddress");
        sessionStorage.removeItem("appliedCoupon");
        
        const orderNumber = orderResult.order.order_number;
        console.log('🎉 UnifiedCheckout: COD order successful, order number:', orderNumber);
        
        // Show success toast
        showOrderPlacedSuccessToast(orderNumber);
        
        // Prepare redirect URL
        const redirectUrl = !isAuthenticated 
          ? `/ThankYou?order_number=${orderNumber}&guest_email=${encodeURIComponent(guestInfo.email)}&is_guest=true`
          : `/ThankYou?order_number=${orderNumber}`;
        
        console.log('🔄 UnifiedCheckout: Redirecting to:', redirectUrl);
        
        // Redirect to thank you page
        setTimeout(() => {
          router.push(redirectUrl);
        }, 500); // Small delay to ensure toast is visible
      } else {
        // Prepaid: Handle Razorpay payment
        const totalAmount = cartItems.reduce((sum, item) => {
          const price = parseFloat(item.price || 0);
          return sum + (price * item.quantity);
        }, 0);
        
        const shippingFeeAmount = parseFloat(shippingFee.fee || 0);
        const discountAmount = appliedCoupon?.discount || 0;
        const finalAmount = totalAmount + shippingFeeAmount - discountAmount;
        const amountInPaisa = Math.round(finalAmount * 100);

        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded || !window.Razorpay) {
          showOrderPlacedErrorToast("Failed to load Razorpay SDK. Please try again.");
          setIsProcessing(false);
          return;
        }

        const razorpayOrder = await createRazorpayOrder({
          amount: amountInPaisa,
          currency: "INR",
          receipt: `rcpt_${Date.now()}`,
          isGuest: !isAuthenticated,
        });
        
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: amountInPaisa,
          currency: razorpayOrder.currency,
          name: "Cross Coin",
          description: `Payment for Cross Coin Order`,
          order_id: razorpayOrder.id,
          prefill: {
            name: !isAuthenticated ? `${guestInfo.firstName} ${guestInfo.lastName}` : user?.name || "",
            email: !isAuthenticated ? guestInfo.email : user?.email || "",
            contact: shippingAddress?.phone_number || shippingAddress?.phoneNumber || "",
          },
          theme: {
            color: "#3399cc",
          },
          handler: async function (response) {
            try {
              console.log('💳 UnifiedCheckout: Payment successful, creating order...');
              const orderResult = !isAuthenticated ? await createGuestOrder(orderData) : await createOrder(orderData);
              console.log('✅ UnifiedCheckout: Order created after payment:', orderResult);
              
              if (!orderResult?.order) {
                console.error('❌ UnifiedCheckout: Order creation failed - no order returned', orderResult);
                throw new Error("Order creation failed to return an order.");
              }
              
              console.log('🔄 UnifiedCheckout: Updating order with payment details...');
              await updateOrderPayment({
                orderId: orderResult.order.id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature
              });
              console.log('✅ UnifiedCheckout: Payment details updated');

              // Track purchase
              try {
                const orderNumber = orderResult?.order?.order_number;
                console.log('📊 UnifiedCheckout: Tracking purchase...', { orderNumber, finalAmount });
                const purchaseTracked = fbqTrack("Purchase", {
                  value: Number((finalAmount || 0).toFixed(2)),
                  currency: "INR",
                  content_type: "product",
                  contents: cartItems.filter((item) => item.productId || item.id).map((item) => ({
                    id: String(item.productId || item.id),
                    quantity: item.quantity || 1,
                  })),
                });

                if (purchaseTracked && orderNumber) {
                  sessionStorage.setItem(`fb_purchase_tracked_${orderNumber}`, "true");
                  console.log('✅ UnifiedCheckout: Purchase tracked successfully');
                }
              } catch (e) {
                console.warn("⚠️ UnifiedCheckout: Purchase tracking (prepaid) failed:", e);
              }
              
              console.log('🧹 UnifiedCheckout: Clearing cart and session data...');
              setOrderPlaced(true);
              
              try {
                clearCart();
                clearBuyNow();
              } catch (e) {
                console.warn("⚠️ UnifiedCheckout: Error clearing cart:", e);
              }
              
              sessionStorage.removeItem("shippingAddress");
              sessionStorage.removeItem("appliedCoupon");
              
              const orderNumber = orderResult.order.order_number;
              console.log('🎉 UnifiedCheckout: Prepaid order successful, order number:', orderNumber);
              
              // Show success toast
              showOrderPlacedSuccessToast(orderNumber);
              
              const redirectUrl = !isAuthenticated 
                ? `/ThankYou?order_number=${orderNumber}&guest_email=${encodeURIComponent(guestInfo.email)}&is_guest=true`
                : `/ThankYou?order_number=${orderNumber}`;
              
              console.log('🔄 UnifiedCheckout: Redirecting to thank you page:', redirectUrl);
              
              // Redirect with delay to show toast
              setTimeout(() => {
                router.push(redirectUrl);
              }, 500);
            } catch (error) {
              console.error("❌ UnifiedCheckout: Error creating order after payment:", {
                error: error.message,
                response: error.response?.data,
                status: error.response?.status,
                stack: error.stack
              });
              showOrderPlacedErrorToast("Payment successful but order creation failed. Please contact support.");
            }
          },
          modal: {
            ondismiss: function() {
              console.log("⚠️ UnifiedCheckout: Payment cancelled by user");
              showOrderPlacedErrorToast("Payment was cancelled. Your cart items are safe.");
              setIsProcessing(false);
            }
          }
        };
        
        const rzp = new window.Razorpay(options);
        
        rzp.on('payment.failed', function (response) {
          console.error("❌ UnifiedCheckout: Payment failed:", {
            code: response.error.code,
            description: response.error.description,
            source: response.error.source,
            step: response.error.step,
            reason: response.error.reason,
            metadata: response.error.metadata
          });
          showOrderPlacedErrorToast("Payment failed: " + (response.error.description || "Please try again"));
          setIsProcessing(false);
        });
        
        console.log('💳 UnifiedCheckout: Opening Razorpay payment modal...');
        rzp.open();
      }
    } catch (error) {
      console.error("❌ UnifiedCheckout: Order placement error:", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
        orderType: shippingFee?.orderType
      });
      
      // More specific error message
      let errorMessage = "Order placement failed. Please try again.";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showOrderPlacedErrorToast(errorMessage);
      setIsProcessing(false);
    }
  };

  const handleCouponApplied = (coupon) => {
    console.log('✅ UnifiedCheckout: Coupon applied:', coupon);
    setAppliedCoupon(coupon);
    // Save to sessionStorage to persist across page refreshes
    if (coupon) {
      sessionStorage.setItem("appliedCoupon", JSON.stringify(coupon));
    }
  };

  const handleCouponRemoved = useCallback(() => {
    console.log('🗑️ UnifiedCheckout: Coupon removed');
    setAppliedCoupon(null);
    sessionStorage.removeItem("appliedCoupon");
  }, []);

  // Render address section - simplified for all users
  const renderAddressSection = () => {
    return (
      <div className="address-section" style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '20px', marginTop: '20px' }}>Shipping Address</h3>
        
        {isAuthenticated ? (
          // Authenticated users: show existing addresses + add new button
          <>
            {addressLoading ? (
              <p>Loading addresses...</p>
            ) : (
              <>
                <div className="address-list">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`address-card ${shippingAddress?.id === address.id ? "selected" : ""}`}
                      onClick={() => handleSelectAddress(address)}
                      style={{
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '15px 90px 15px 15px',
                        marginBottom: '15px',
                        cursor: 'pointer',
                        backgroundColor: shippingAddress?.id === address.id ? '#f0f8ff' : 'white',
                        position: 'relative'
                      }}
                    >
                      <div className="address-card-body">
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
                          {address.address} {address.isDefault && "(Default)"}
                        </h4>
                        <p style={{ margin: '4px 0', color: '#666' }}>{address.city}, {address.state} {address.postal_code}</p>
                        <p style={{ margin: '4px 0', color: '#666' }}>{address.country}</p>
                        <p style={{ margin: '4px 0', color: '#666' }}>Phone: {address.phone_number}</p>
                      </div>
                      <div className="address-actions" style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '8px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditAddress(address);
                          }}
                          style={{
                            background: '#f0f0f0',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            padding: '6px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Edit Address"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAddress(address.id);
                          }}
                          style={{
                            background: '#ffe6e6',
                            border: '1px solid #ffcccc',
                            borderRadius: '4px',
                            padding: '6px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            color: '#cc0000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Delete Address"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {!showAddressForm && (
                  <button
                    className="add-address-btn"
                    onClick={() => {
                      setShowAddressForm(true);
                      setEditingAddressId(null);
                      setAddressForm({
                        fullName: "",
                        phoneNumber: "",
                        address: "",
                        city: "",
                        state: "",
                        postalCode: "",
                        country: "India",
                        isDefault: false,
                      });
                    }}
                    style={{
                      background: '#f8f9fa',
                      border: '2px dashed #ddd',
                      borderRadius: '8px',
                      padding: '15px',
                      width: '100%',
                      cursor: 'pointer',
                      fontSize: '16px',
                      color: '#666',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <FaPlus /> Add New Address
                  </button>
                )}
              </>
            )}
          </>
        ) : (
          // Guest users: show saved address or form
          <>
            {shippingAddress ? (
              // Show saved address with edit/delete options
              <div 
                className="saved-address-card"
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '15px',
                  backgroundColor: '#f0f8ff',
                  position: 'relative'
                }}
              >
                <div className="address-card-body">
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
                    {shippingAddress.full_name}
                  </h4>
                  <p style={{ margin: '4px 0', color: '#666' }}>{shippingAddress.address}</p>
                  <p style={{ margin: '4px 0', color: '#666' }}>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}</p>
                  <p style={{ margin: '4px 0', color: '#666' }}>{shippingAddress.country}</p>
                  <p style={{ margin: '4px 0', color: '#666' }}>Phone: {shippingAddress.phone_number}</p>
                </div>
                <div className="address-actions" style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setAddressForm({
                        fullName: shippingAddress.full_name,
                        phoneNumber: shippingAddress.phone_number,
                        address: shippingAddress.address,
                        city: shippingAddress.city,
                        state: shippingAddress.state,
                        postalCode: shippingAddress.postal_code,
                        country: shippingAddress.country,
                        isDefault: false
                      });
                      setGuestInfo(prev => ({
                        ...prev,
                        email: prev.email // Keep existing email
                      }));
                      setShippingAddress(null); // Hide the saved address box to show form
                    }}
                    style={{
                      background: '#f0f0f0',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      padding: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Edit Address"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => {
                      setShippingAddress(null);
                      setAddressForm({
                        fullName: "",
                        phoneNumber: "",
                        address: "",
                        city: "",
                        state: "",
                        postalCode: "",
                        country: "India",
                        isDefault: false,
                      });
                      setGuestInfo({
                        email: "",
                        firstName: "",
                        lastName: "",
                        phone: "",
                      });
                    }}
                    style={{
                      background: '#ffe6e6',
                      border: '1px solid #ffcccc',
                      borderRadius: '4px',
                      padding: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      color: '#cc0000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Delete Address"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ) : (
              // Show address form for guest users
              <div className="guest-address-form">
                <form onSubmit={handleSaveAddress}>
                  <div className="form-row-2col" style={{ marginBottom: '15px' }}>
                    <div className="form-group">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        name="fullName"
                        value={addressForm.fullName}
                        onChange={handleAddressFormChange}
                        required
                        style={{ marginBottom: '5px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone Number *</label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={addressForm.phoneNumber}
                        onChange={handleAddressFormChange}
                        required
                        style={{ marginBottom: '5px' }}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={guestInfo.email}
                      onChange={handleGuestInfoChange}
                      required
                      style={{ marginBottom: '5px' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Address *</label>
                    <input
                      type="text"
                      name="address"
                      value={addressForm.address}
                      onChange={handleAddressFormChange}
                      required
                      style={{ marginBottom: '5px' }}
                    />
                  </div>
                  <div className="form-row-2col" style={{ marginBottom: '15px' }}>
                    <div className="form-group">
                      <label>City *</label>
                      <input
                        type="text"
                        name="city"
                        value={addressForm.city}
                        onChange={handleAddressFormChange}
                        required
                        style={{ marginBottom: '5px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label>State *</label>
                      <input
                        type="text"
                        name="state"
                        value={addressForm.state}
                        onChange={handleAddressFormChange}
                        required
                        style={{ marginBottom: '5px' }}
                      />
                    </div>
                  </div>
                  <div className="form-row-2col" style={{ marginBottom: '20px' }}>
                    <div className="form-group">
                      <label>Postal Code *</label>
                      <input
                        type="text"
                        name="postalCode"
                        value={addressForm.postalCode}
                        onChange={handleAddressFormChange}
                        required
                        style={{ marginBottom: '5px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Country *</label>
                      <input
                        type="text"
                        name="country"
                        value={addressForm.country}
                        onChange={handleAddressFormChange}
                        required
                        style={{ marginBottom: '5px' }}
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className="save-address-btn"
                    style={{
                      background: '#180D3E',
                      color: 'white',
                      padding: '12px 24px',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '16px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      width: '100%',
                      transition: 'background-color 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#CE1E36'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#180D3E'}
                  >
                    Save Address
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Render address form for authenticated users
  const renderAddressForm = () => {
    if (!showAddressForm) return null;

    return (
      <div className="address-form-container" style={{ marginTop: '0px' }}>
        <h4 style={{margin: '20px 0'}}>{editingAddressId ? "Edit Address" : "Add New Address"}</h4>
        <form onSubmit={handleSaveAddress}>
          <div className="form-row-2col" style={{ marginBottom: '20px' }}>
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="fullName"
                value={addressForm.fullName}
                onChange={handleAddressFormChange}
                required
                style={{ marginBottom: '10px' }}
              />
            </div>
            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="tel"
                name="phoneNumber"
                value={addressForm.phoneNumber}
                onChange={handleAddressFormChange}
                required
                style={{ marginBottom: '10px' }}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label>Address *</label>
            <input
              type="text"
              name="address"
              value={addressForm.address}
              onChange={handleAddressFormChange}
              required
              style={{ marginBottom: '10px' }}
            />
          </div>
          <div className="form-row-2col" style={{ marginBottom: '20px' }}>
            <div className="form-group">
              <label>City *</label>
              <input
                type="text"
                name="city"
                value={addressForm.city}
                onChange={handleAddressFormChange}
                required
                style={{ marginBottom: '10px' }}
              />
            </div>
            <div className="form-group">
              <label>State *</label>
              <input
                type="text"
                name="state"
                value={addressForm.state}
                onChange={handleAddressFormChange}
                required
                style={{ marginBottom: '10px' }}
              />
            </div>
          </div>
          <div className="form-row-2col" style={{ marginBottom: '20px' }}>
            <div className="form-group">
              <label>Postal Code *</label>
              <input
                type="text"
                name="postalCode"
                value={addressForm.postalCode}
                onChange={handleAddressFormChange}
                required
                style={{ marginBottom: '10px' }}
              />
            </div>
            <div className="form-group">
              <label>Country *</label>
              <input
                type="text"
                name="country"
                value={addressForm.country}
                onChange={handleAddressFormChange}
                required
                style={{ marginBottom: '10px' }}
              />
            </div>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                name="isDefault"
                checked={addressForm.isDefault}
                onChange={handleAddressFormChange}
              />
              Set as default address
            </label>
          </div>
          <div className="form-actions" style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="submit" 
              className="save-address-btn"
              style={{
                marginTop: '1rem',
                background: '#180D3E',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                flex: '1',
                transform: 'none'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#CE1E36'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#180D3E'}
            >
              {editingAddressId ? "Update Address" : "Save Address"}
            </button>
            <button
              type="button"
              className="cancel-btn"
              onClick={() => setShowAddressForm(false)}
              style={{
                marginTop: '1rem',
                background: '#f5f5f5',
                color: '#333',
                padding: '12px 24px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                flex: '1',
                transition: 'background-color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e5e5'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#f5f5f5'}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  };

  // Render delivery methods
  const renderDeliveryMethods = () => (
    <div className="delivery-methods-section" style={{ marginBottom: '30px' }}>
      <h3 style={{ marginBottom: '20px' }}>Delivery Methods</h3>
      <div className="delivery-methods">
        {shippingFees.map((fee) => (
          <label
            key={fee.id}
            className={`delivery-card ${shippingFee?.id === fee.id ? "selected" : ""}`}
          >
            <input
              type="radio"
              name="delivery"
              checked={shippingFee?.id === fee.id}
              onChange={() => handleSelectFee(fee)}
            />
            <div>
              <div className="delivery-title">
                {fee.orderType === "cod" ? "Cash on Delivery" : fee.orderType === "prepaid" ? "Prepaid Delivery" : fee.orderType}
              </div>
              <div className="delivery-desc">
                {fee.orderType === "cod" ? "Pay when you receive your order" : fee.orderType === "prepaid" ? "Pay online before delivery" : "Standard delivery"}
              </div>
            </div>
            <div className={`delivery-fee ${parseFloat(fee.fee || 0) === 0 ? "free" : "paid"}`}>
              {parseFloat(fee.fee || 0) === 0 ? "Free" : `₹${parseFloat(fee.fee || 0).toFixed(2)}`}
            </div>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <Header />
      <div className="cart-main checkout-container">
        <div className="cart-section">
          {/* Products Section */}
          <CartStep 
            selectedPaymentMode={selectedPaymentMode}
            onPaymentModeChange={setSelectedPaymentMode}
            onCouponApplied={handleCouponApplied}
            appliedCoupon={appliedCoupon}
          />
          
          {/* Address Section */}
          {cartItems.length > 0 && (
            <>
              {renderAddressSection()}
              {isAuthenticated && renderAddressForm()}
              
              {/* Delivery Methods Section - COMMENTED OUT - Showing only in Order Summary */}
              {/* {renderDeliveryMethods()} */}
            </>
          )}
        </div>
        
        {/* Order Summary */}
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
        )}
      </div>
      <Footer />
    </>
  );
}
