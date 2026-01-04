import { useState, useEffect } from "react";
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

export default function UnifiedCheckout() {
  const { user, isAuthenticated } = useAuth();
  const { cartItems, clearCart, isCartLoading } = useCart();
  const router = useRouter();

  const [shippingAddress, setShippingAddress] = useState(null);
  const [shippingFee, setShippingFee] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

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
  }, []);

  // Load addresses and shipping fees on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load shipping fees
        const feeData = await getShippingFees();
        const fees = Array.isArray(feeData) ? feeData : feeData?.shippingFees || feeData?.fees || [];
        setShippingFees(fees);
        if (!shippingFee && fees.length > 0) {
          setShippingFee(fees.find((f) => f.isDefault) || fees[0]);
        }

        // Load addresses only for authenticated users
        if (isAuthenticated) {
          setAddressLoading(true);
          const addressData = await getUserShippingAddresses();
          setAddresses(addressData);
          
          // Auto-select default address
          const defaultAddress = addressData.find((a) => a.isDefault);
          if (defaultAddress) {
            setShippingAddress(defaultAddress);
          }
          setAddressLoading(false);
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        setShippingFees([]);
        setAddressLoading(false);
      }
    };

    loadInitialData();
  }, [isAuthenticated]);

  const handleSelectAddress = (address) => {
    setShippingAddress(address);
  };

  const handleSelectFee = (fee) => {
    setShippingFee(fee);
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

  // Helper to load Razorpay script
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
    // Validation
    if (!isAuthenticated) {
      if (!guestInfo.email || !guestInfo.firstName || !guestInfo.phone) {
        showValidationErrorToast("Please fill in all required information.");
        return;
      }
    }

    if (!shippingAddress || !shippingFee) {
      showValidationErrorToast("Please select shipping address and delivery method.");
      return;
    }

    if (!cartItems || cartItems.length === 0) {
      showValidationErrorToast("Your cart is empty.");
      return;
    }

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
        items: cartItems.map((item) => ({
          product_id: item.productId || item.id,
          variation_id: item.variationId || item.variation?.id || null,
          quantity: item.quantity,
        })),
        payment_type: shippingFee.orderType === "cod" ? "cod" : "upi",
        notes: "",
        discount_amount: appliedCoupon?.discount || 0,
        coupon_id: appliedCoupon?.id || null,
        session_id: typeof window !== "undefined" ? sessionStorage.getItem("sessionId") || "guest-" + Date.now() : "guest-" + Date.now(),
        ip_address: typeof window !== "undefined" ? window.location.hostname : "localhost",
        user_agent: typeof window !== "undefined" ? window.navigator.userAgent : "unknown",
      };
    } else {
      orderData = {
        shipping_address_id: shippingAddress.id,
        items: cartItems.map((item) => ({
          product_id: item.productId || item.id,
          variation_id: item.variationId || item.variation?.id || null,
          quantity: item.quantity,
        })),
        payment_type: shippingFee.orderType === "cod" ? "cod" : "upi",
        notes: "",
        discount_amount: appliedCoupon?.discount || 0,
        coupon_id: appliedCoupon?.id || null,
      };
    }

    try {
      if (shippingFee.orderType === "cod") {
        // COD: Create order immediately
        const orderResult = !isAuthenticated ? await createGuestOrder(orderData) : await createOrder(orderData);
        
        if (!orderResult?.data?.order) {
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
            sessionStorage.setItem(`fb_purchase_tracked_${orderNumber}`, "true");
          }
        } catch (e) {
          console.warn("Purchase tracking (COD): failed to send fbq Purchase", e);
        }

        clearCart();
        sessionStorage.removeItem("shippingAddress");
        sessionStorage.removeItem("appliedCoupon");
        showOrderPlacedSuccessToast(orderResult.data.order.order_number);
        
        const redirectUrl = !isAuthenticated 
          ? `/ThankYou?order_number=${orderResult.data.order.order_number}&guest_email=${encodeURIComponent(guestInfo.email)}&is_guest=true`
          : `/ThankYou?order_number=${orderResult.data.order.order_number}`;
        
        router.push(redirectUrl);
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
              const orderResult = !isAuthenticated ? await createGuestOrder(orderData) : await createOrder(orderData);
              
              await updateOrderPayment({
                orderId: orderResult.data.order.id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature
              });

              // Track purchase
              try {
                const orderNumber = orderResult?.data?.order?.order_number;
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
                }
              } catch (e) {
                console.warn("Purchase tracking (prepaid): failed to send fbq Purchase", e);
              }
              
              setOrderPlaced(true);
              clearCart();
              sessionStorage.removeItem("shippingAddress");
              sessionStorage.removeItem("appliedCoupon");
              
              const redirectUrl = !isAuthenticated 
                ? `/ThankYou?order_number=${orderResult.data.order.order_number}&guest_email=${encodeURIComponent(guestInfo.email)}&is_guest=true`
                : `/ThankYou?order_number=${orderResult.data.order.order_number}`;
              
              router.push(redirectUrl);
            } catch (error) {
              console.error("Error creating order after payment:", error);
              showOrderPlacedErrorToast("Payment successful but order creation failed. Please contact support.");
            }
          },
          modal: {
            ondismiss: function() {
              console.log("Payment cancelled");
              setIsProcessing(false);
            }
          }
        };
        
        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (error) {
      console.error("Order placement error:", error);
      showOrderPlacedErrorToast("Order placement failed: " + (error.message || "Unknown error"));
      setIsProcessing(false);
    }
  };

  const handleCouponApplied = (coupon) => {
    setAppliedCoupon(coupon);
  };

  const handleCouponRemoved = () => {
    setAppliedCoupon(null);
    sessionStorage.removeItem("appliedCoupon");
  };

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
          <CartStep />
          
          {/* Address Section */}
          {cartItems.length > 0 && (
            <>
              {renderAddressSection()}
              {isAuthenticated && renderAddressForm()}
              
              {/* Delivery Methods Section */}
              {renderDeliveryMethods()}
            </>
          )}
        </div>
        
        {/* Order Summary */}
        {cartItems.length > 0 && (
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
            />
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
