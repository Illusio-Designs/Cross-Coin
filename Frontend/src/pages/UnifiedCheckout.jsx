import { useState, useEffect } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useCart } from "../context/CartContext";
import { useRouter } from "next/router";
import CartStep from "../components/checkout/CartStep";
import ShippingStep from "../components/checkout/ShippingStep";
import OrderSummary from "../components/checkout/OrderSummary";
import { useAuth } from "../context/AuthContext";
import {
  createOrder,
  createRazorpayOrder,
  createGuestOrder,
  updateOrderPayment,
} from "../services/publicindex";
import {
  showOrderPlacedSuccessToast,
  showOrderPlacedErrorToast,
  showValidationErrorToast,
} from "../utils/toast";
import { fbqTrack } from "../components/common/Analytics";

export default function UnifiedCheckout() {
  const [step, setStep] = useState(() => {
    // Initialize step from sessionStorage or default to 'cart'
    if (typeof window !== "undefined") {
      const savedStep = sessionStorage.getItem("checkoutStep") || "cart";
      console.log(
        "UnifiedCheckout: Initializing step from sessionStorage:",
        savedStep
      );
      return savedStep;
    }
    return "cart";
  }); // cart, shipping
  const { user, isAuthenticated } = useAuth();
  const { cartItems, clearCart, isCartLoading } = useCart();
  const router = useRouter();

  const [shippingAddress, setShippingAddress] = useState(null);
  const [shippingFee, setShippingFee] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({
    method: "upi",
    upiId: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Guest checkout state
  const [isGuestCheckout, setIsGuestCheckout] = useState(false);
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
  }, []);

  useEffect(() => {
    // Check if user wants to proceed as guest
    if (!isAuthenticated) {
      const guestCheckout = sessionStorage.getItem("guestCheckout");
      console.log(
        "UnifiedCheckout: User not authenticated, guestCheckout flag:",
        guestCheckout
      );
      // Always show guest form for non-authenticated users initially
      console.log(
        "UnifiedCheckout: User not authenticated, showing guest checkout option"
      );
      setIsGuestCheckout(false); // This ensures guest form is shown
    } else {
      console.log(
        "UnifiedCheckout: User is authenticated, clearing guest flags"
      );
      // Clear any guest checkout flag for authenticated users
      sessionStorage.removeItem("guestCheckout");
      setIsGuestCheckout(false);
    }
  }, [isAuthenticated]);

  // Separate useEffect to ensure authenticated users see cart step
  useEffect(() => {
    if (isAuthenticated && !isCartLoading) {
      console.log(
        "UnifiedCheckout: Ensuring authenticated user sees cart step, current step:",
        step
      );
      if (step !== "cart") {
        console.log(
          "UnifiedCheckout: Setting step to cart for authenticated user"
        );
        setStep("cart");
        sessionStorage.setItem("checkoutStep", "cart");
      }
    }
  }, [isAuthenticated, isCartLoading, step]);

  useEffect(() => {
    console.log("UnifiedCheckout: Cart state changed:", {
      cartItemsLength: cartItems.length,
      isProcessing,
      orderPlaced,
      isCartLoading,
      cartItems: cartItems,
    });

    if (
      cartItems.length === 0 &&
      !isProcessing &&
      !orderPlaced &&
      !isCartLoading
    ) {
      // Don't redirect, let the CartStep component show the empty cart message
      console.log("UnifiedCheckout: Cart is empty, showing empty cart message");
    }
  }, [cartItems, router, isProcessing, orderPlaced, isCartLoading]);

  // Validate step progression - ensure user can't skip steps
  useEffect(() => {
    if (!isCartLoading && cartItems.length > 0) {
      // If user is on shipping step but cart is empty, go back to cart
      if (step === "shipping" && cartItems.length === 0) {
        console.log(
          "UnifiedCheckout: Validation - redirecting from shipping to cart (empty cart)"
        );
        setStep("cart");
        sessionStorage.setItem("checkoutStep", "cart");
      }
    }
  }, [step, cartItems.length, isCartLoading]);

  useEffect(() => {
    const savedAddress = sessionStorage.getItem("shippingAddress");
    if (savedAddress) {
      setShippingAddress(JSON.parse(savedAddress));
    } else {
      // Pre-select default address if available
      const fetchAddresses = async () => {
        try {
          // Assuming getUserShippingAddresses is available and works
          // const addresses = await getUserShippingAddresses();
          // const defaultAddress = addresses.find(a => a.isDefault);
          // if(defaultAddress) setShippingAddress(defaultAddress);
        } catch (error) {
          console.error("Could not fetch default address");
        }
      };
      fetchAddresses();
    }
  }, []);

  const handleSelectAddress = (address) => {
    setShippingAddress(address);
    sessionStorage.setItem("shippingAddress", JSON.stringify(address));
  };

  const handleSelectFee = (fee) => {
    setShippingFee(fee);
  };

  const goToNextStep = () => {
    if (step === "cart") {
      const newStep = "shipping";
      console.log("UnifiedCheckout: Moving from cart to shipping step");
      setStep(newStep);
      sessionStorage.setItem("checkoutStep", newStep);
    } else if (step === "shipping") {
      if (!shippingAddress) {
        showValidationErrorToast("Please select a shipping address.");
        return;
      }
      if (!shippingFee) {
        showValidationErrorToast("Please select a delivery method.");
        return;
      }
      handlePlaceOrder();
    }
  };

  const goToPrevStep = () => {
    if (step === "shipping") {
      const newStep = "cart";
      console.log("UnifiedCheckout: Moving from shipping to cart step");
      setStep(newStep);
      sessionStorage.setItem("checkoutStep", newStep);
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
    // Check authentication or guest checkout
    if (!isAuthenticated && !isGuestCheckout) {
      showValidationErrorToast(
        "Please login or proceed as guest to place an order."
      );
      return;
    }

    if (!shippingAddress || !shippingFee) {
      showValidationErrorToast(
        "Please select shipping address and delivery method."
      );
      return;
    }

    if (!cartItems || cartItems.length === 0) {
      showValidationErrorToast("Your cart is empty.");
      return;
    }

    // Validate guest info if guest checkout
    if (isGuestCheckout) {
      if (
        !guestInfo.email ||
        !guestInfo.firstName ||
        !guestInfo.lastName ||
        !guestInfo.phone
      ) {
        showValidationErrorToast(
          "Please fill in all required guest information including phone number."
        );
        return;
      }
    }

    setIsProcessing(true);

    console.log("Order placement debug:", {
      shippingAddress,
      shippingFee,
      cartItems,
      user: user?.id,
      isAuthenticated,
      isGuestCheckout,
      guestInfo,
    });

    // Prepare order data based on checkout type
    let orderData;
    if (isGuestCheckout) {
      orderData = {
        guest_info: {
          email: guestInfo.email,
          firstName: guestInfo.firstName,
          lastName: guestInfo.lastName,
          phone: guestInfo.phone || "",
        },
        shipping_address: {
          fullName: shippingAddress.full_name || shippingAddress.fullName,
          address: shippingAddress.address,
          city: shippingAddress.city,
          state: shippingAddress.state,
          pincode: shippingAddress.pincode || shippingAddress.postal_code,
          phone: shippingAddress.phone || shippingAddress.phone_number,
        },
        items: cartItems.map((item) => ({
          product_id: item.productId || item.id,
          variation_id: item.variationId || item.variation?.id || null,
          quantity: item.quantity,
        })),
        payment_type:
          shippingFee.orderType === "cod" ? "cod" : paymentDetails.method,
        notes: "",
        discount_amount: appliedCoupon?.discount || 0,
        coupon_id: appliedCoupon?.id || null,
        session_id:
          typeof window !== "undefined"
            ? sessionStorage.getItem("sessionId") || "guest-" + Date.now()
            : "guest-" + Date.now(),
        ip_address:
          typeof window !== "undefined"
            ? window.location.hostname
            : "localhost",
        user_agent:
          typeof window !== "undefined"
            ? window.navigator.userAgent
            : "unknown",
      };
    } else {
      orderData = {
        shipping_address_id: shippingAddress.id,
        items: cartItems.map((item) => ({
          product_id: item.productId || item.id,
          variation_id: item.variationId || item.variation?.id || null,
          quantity: item.quantity,
        })),
        payment_type:
          shippingFee.orderType === "cod" ? "cod" : paymentDetails.method,
        notes: "",
        discount_amount: appliedCoupon?.discount || 0,
        coupon_id: appliedCoupon?.id || null,
      };
    }

    console.log("Order data being sent:", orderData);

    try {
      if (shippingFee.orderType === "cod") {
        // COD: Create order immediately since payment is on delivery
        const orderResult = isGuestCheckout
          ? await createGuestOrder(orderData)
          : await createOrder(orderData);
        console.log("COD Order creation response:", orderResult);

        if (!orderResult?.data?.order) {
          throw new Error("Order creation failed to return an order.");
        }

        // COD: Order placed, now redirect
        console.log("COD Order placed successfully, redirecting to ThankYou page...");
        setOrderPlaced(true);
        clearCart();
        sessionStorage.removeItem("shippingAddress");
        sessionStorage.removeItem("appliedCoupon");
        sessionStorage.removeItem("checkoutStep");
        showOrderPlacedSuccessToast(orderResult.data.order.order_number);
        
        // For guest orders, pass additional info for tracking
        const redirectUrl = isGuestCheckout 
          ? `/ThankYou?order_number=${orderResult.data.order.order_number}&guest_email=${encodeURIComponent(guestInfo.email)}&is_guest=true`
          : `/ThankYou?order_number=${orderResult.data.order.order_number}`;
        
        console.log("Redirecting to:", redirectUrl);
        router.push(redirectUrl);
      } else {
        // Prepaid: Store order data and proceed to payment first
        console.log("Prepaid order: Storing order data and proceeding to payment...");
        
        // Store order data in sessionStorage for later use
        sessionStorage.setItem("pendingOrderData", JSON.stringify(orderData));
        sessionStorage.setItem("isGuestCheckout", JSON.stringify(isGuestCheckout));
        if (isGuestCheckout) {
          sessionStorage.setItem("guestInfo", JSON.stringify(guestInfo));
        }

        // Calculate amount for Razorpay
        const totalAmount = cartItems.reduce((sum, item) => {
          const price = parseFloat(item.price || 0);
          return sum + (price * item.quantity);
        }, 0);
        
        const shippingFeeAmount = parseFloat(shippingFee.fee || 0);
        const discountAmount = appliedCoupon?.discount || 0;
        const finalAmount = totalAmount + shippingFeeAmount - discountAmount;
        const amountInPaisa = Math.round(finalAmount * 100);
        
        console.log("Prepaid order amounts:", {
          totalAmount,
          shippingFeeAmount,
          discountAmount,
          finalAmount,
          amountInPaisa
        });

        // Load Razorpay script
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded || !window.Razorpay) {
          showOrderPlacedErrorToast(
            "Failed to load Razorpay SDK. Please try again."
          );
          setIsProcessing(false);
          return;
        }

        // Create Razorpay order (without creating backend order yet)
        const razorpayOrder = await createRazorpayOrder({
          amount: amountInPaisa,
          currency: "INR",
          receipt: `rcpt_${Date.now()}`, // Temporary receipt until order is created
          isGuest: isGuestCheckout,
        });
        
        console.log("Razorpay order response:", razorpayOrder);
        
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: amountInPaisa,
          currency: razorpayOrder.currency,
          name: "Cross Coin",
          description: `Payment for Cross Coin Order`,
          order_id: razorpayOrder.id,
          prefill: {
            name: isGuestCheckout ? `${guestInfo.firstName} ${guestInfo.lastName}` : user?.name || "",
            email: isGuestCheckout ? guestInfo.email : user?.email || "",
            contact: shippingAddress?.phone || "",
          },
          theme: {
            color: "#3399cc",
          },
          handler: async function (response) {
            console.log("Payment successful:", response);
            
            // Now create the order after successful payment
            try {
              const orderResult = isGuestCheckout
                ? await createGuestOrder(orderData)
                : await createOrder(orderData);
              
              console.log("Order created after payment:", orderResult);
              
              // Update the order with payment details
              await updateOrderPayment({
                orderId: orderResult.data.order.id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature
              });
              
              // Clear session storage
              sessionStorage.removeItem("pendingOrderData");
              sessionStorage.removeItem("isGuestCheckout");
              sessionStorage.removeItem("guestInfo");
              
              // Redirect to success page
              setOrderPlaced(true);
              clearCart();
              sessionStorage.removeItem("shippingAddress");
              sessionStorage.removeItem("appliedCoupon");
              sessionStorage.removeItem("checkoutStep");
              
              const redirectUrl = isGuestCheckout 
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
        
        console.log("Razorpay options:", options);
        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (error) {
      console.error("Order placement error:", error);
      showOrderPlacedErrorToast(
        "Order placement failed: " + (error.message || "Unknown error")
      );
      setIsProcessing(false);
    }
  };

  // Cleanup function to clear sessionStorage when component unmounts
  useEffect(() => {
    return () => {
      // Only clear if user is leaving the checkout page (not going to ThankYou)
      if (!orderPlaced) {
        sessionStorage.removeItem("checkoutStep");
      }
    };
  }, [orderPlaced]);

  // Function to reset checkout step (useful for debugging or manual reset)
  const resetCheckoutStep = () => {
    console.log("UnifiedCheckout: Resetting checkout step to cart");
    setStep("cart");
    sessionStorage.setItem("checkoutStep", "cart");
  };

  // Listen for page visibility changes to handle when user returns to checkout
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !orderPlaced) {
        // When user returns to the page, validate the current step
        const savedStep = sessionStorage.getItem("checkoutStep");
        if (savedStep && savedStep !== step) {
          setStep(savedStep);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [step, orderPlaced]);

  const handleCouponApplied = (coupon) => {
    setAppliedCoupon(coupon);
  };

  const handleCouponRemoved = () => {
    setAppliedCoupon(null);
    sessionStorage.removeItem("appliedCoupon");
  };

  const renderStep = () => {
    console.log(
      "UnifiedCheckout: renderStep called with step:",
      step,
      "isAuthenticated:",
      isAuthenticated
    );
    switch (step) {
      case "cart":
        console.log("UnifiedCheckout: Rendering CartStep");
        return <CartStep />;
      case "shipping":
        console.log("UnifiedCheckout: Rendering ShippingStep");
        return (
          <ShippingStep
            onSelectAddress={handleSelectAddress}
            selectedAddress={shippingAddress}
            onSelectFee={handleSelectFee}
            selectedFee={shippingFee}
            isGuestCheckout={isGuestCheckout}
            guestInfo={guestInfo}
          />
        );
      default:
        console.log("UnifiedCheckout: Rendering CartStep (default)");
        return <CartStep />;
    }
  };

  // Guest checkout option component
  const renderGuestCheckoutOption = () => (
    <div
      className="guest-checkout-option"
      style={{ background: "#fff", padding: "2rem" }}
    >
      <div
        className="guest-checkout-card"
        style={{
          background: "#fff",
          border: "1px solid #0000001A",
          padding: "2rem",
          maxWidth: "500px",
          width: "100%",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          borderRadius: "0",
        }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            color: "#222",
            marginBottom: "0.5rem",
            textAlign: "center",
          }}
        >
          Continue as Guest
        </h2>
        <p
          style={{
            color: "#888",
            textAlign: "center",
            marginBottom: "2rem",
            fontSize: "0.95rem",
          }}
        >
          {sessionStorage.getItem("guestCheckout") === "true"
            ? "Please provide your details to complete your purchase"
            : "Complete your purchase without creating an account"}
        </p>
        <div
          className="guest-info-form"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          <div
            className="form-group"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.3rem",
            }}
          >
            <label
              style={{
                fontWeight: "500",
                color: "#222",
                fontSize: "0.98rem",
              }}
            >
              Email Address *
            </label>
            <input
              type="email"
              value={guestInfo.email}
              onChange={(e) =>
                setGuestInfo({ ...guestInfo, email: e.target.value })
              }
              placeholder="Enter your email"
              required
              style={{
                padding: "0.7rem 0.9rem",
                border: "1px solid #e0e0e0",
                fontSize: "1rem",
                background: "#fafbfc",
                transition: "border-color 0.2s ease-in-out",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#180D3E";
                e.target.style.background = "#fff";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e0e0e0";
                e.target.style.background = "#fafbfc";
              }}
            />
          </div>
          <div
            className="form-row"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.2rem",
            }}
          >
            <div
              className="form-group"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
              }}
            >
              <label
                style={{
                  fontWeight: "500",
                  color: "#222",
                  fontSize: "0.98rem",
                }}
              >
                First Name *
              </label>
              <input
                type="text"
                value={guestInfo.firstName}
                onChange={(e) =>
                  setGuestInfo({ ...guestInfo, firstName: e.target.value })
                }
                placeholder="First name"
                required
                style={{
                  padding: "0.7rem 0.9rem",
                  border: "1px solid #e0e0e0",
                  fontSize: "1rem",
                  background: "#fafbfc",
                  transition: "border-color 0.2s ease-in-out",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#180D3E";
                  e.target.style.background = "#fff";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e0e0e0";
                  e.target.style.background = "#fafbfc";
                }}
              />
            </div>
            <div
              className="form-group"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
              }}
            >
              <label
                style={{
                  fontWeight: "500",
                  color: "#222",
                  fontSize: "0.98rem",
                }}
              >
                Last Name *
              </label>
              <input
                type="text"
                value={guestInfo.lastName}
                onChange={(e) =>
                  setGuestInfo({ ...guestInfo, lastName: e.target.value })
                }
                placeholder="Last name"
                required
                style={{
                  padding: "0.7rem 0.9rem",
                  border: "1px solid #e0e0e0",
                  fontSize: "1rem",
                  background: "#fafbfc",
                  transition: "border-color 0.2s ease-in-out",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#180D3E";
                  e.target.style.background = "#fff";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e0e0e0";
                  e.target.style.background = "#fafbfc";
                }}
              />
            </div>
          </div>
          <div
            className="form-group"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.3rem",
            }}
          >
            <label
              style={{
                fontWeight: "500",
                color: "#222",
                fontSize: "0.98rem",
              }}
            >
              Phone Number *
            </label>
            <input
              type="tel"
              value={guestInfo.phone}
              onChange={(e) =>
                setGuestInfo({ ...guestInfo, phone: e.target.value })
              }
              placeholder="Phone number"
              required
              style={{
                padding: "0.7rem 0.9rem",
                border: "1px solid #e0e0e0",
                fontSize: "1rem",
                background: "#fafbfc",
                transition: "border-color 0.2s ease-in-out",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#180D3E";
                e.target.style.background = "#fff";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e0e0e0";
                e.target.style.background = "#fafbfc";
              }}
            />
          </div>
          <div
            className="guest-checkout-actions"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              marginTop: "1.2rem",
            }}
          >
            <button
              className="btn btn-primary"
              style={{
                background: "#180D3E",
                backgroundColor: "#180D3E",
                color: "#fff",
                border: "none",
                padding: "0.9rem 0",
                fontWeight: "600",
                fontSize: "1.08rem",
                cursor: "pointer",
                transition: "all 0.2s",
                textAlign: "center",
                width: "100%",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#CE1E36";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#180D3E";
              }}
              onClick={() => {
                if (
                  guestInfo.email &&
                  guestInfo.firstName &&
                  guestInfo.lastName &&
                  guestInfo.phone
                ) {
                  setIsGuestCheckout(true);
                  sessionStorage.setItem("guestCheckout", "true");
                  setStep("cart");
                  sessionStorage.setItem("checkoutStep", "cart");
                } else {
                  showValidationErrorToast(
                    "Please fill in all required fields including phone number."
                  );
                }
              }}
            >
              Continue as Guest
            </button>
            <button
              className="btn btn-secondary"
              style={{
                background: "#e0e0e0",
                backgroundColor: "#e0e0e0",
                color: "#222",
                border: "1px solid #e0e0e0",
                padding: "0.9rem 0",
                fontWeight: "600",
                fontSize: "1.08rem",
                cursor: "pointer",
                transition: "all 0.2s",
                textAlign: "center",
                width: "100%",
                marginTop: "0.5rem",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#d0d0d0";
                e.target.style.borderColor = "#c0c0c0";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#e0e0e0";
                e.target.style.borderColor = "#e0e0e0";
              }}
              onClick={() => router.push("/login?redirect=/UnifiedCheckout")}
            >
              Login Instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Debug logging for rendering decision
  console.log("UnifiedCheckout: Rendering decision:", {
    isCartLoading,
    isAuthenticated,
    step,
    cartItemsLength: cartItems.length,
    isGuestCheckout,
    willShowGuestForm: !isAuthenticated && !isGuestCheckout,
    willShowCheckout: isAuthenticated || isGuestCheckout,
  });

  return (
    <>
      <Header />
      {isCartLoading && isAuthenticated ? (
        <div className="cart-main checkout-container">
          <div className="cart-section">
            <div className="loading-container">
              <div className="loader"></div>
              <p>Loading your cart...</p>
            </div>
          </div>
        </div>
      ) : !isAuthenticated && !isGuestCheckout ? (
        <div className="cart-main checkout-container">
          <div className="cart-section">{renderGuestCheckoutOption()}</div>
        </div>
      ) : (
        <div className="cart-main checkout-container">
          <div className="cart-section">{renderStep()}</div>
          {cartItems.length > 0 && (
            <div className="order-summary-section">
              <OrderSummary
                step={step}
                onNext={goToNextStep}
                onPlaceOrder={handlePlaceOrder}
                shippingAddress={shippingAddress}
                shippingFee={shippingFee}
                isProcessing={isProcessing}
                isCartLoading={isCartLoading}
                appliedCoupon={appliedCoupon}
                onCouponApplied={handleCouponApplied}
                onCouponRemoved={handleCouponRemoved}
                isGuestCheckout={isGuestCheckout}
                guestInfo={guestInfo}
              />
            </div>
          )}
        </div>
      )}
      <Footer />
    </>
  );
}
