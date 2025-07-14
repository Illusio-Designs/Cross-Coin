import { useState, useEffect } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useCart } from "../context/CartContext";
import { useRouter } from "next/router";
import CartStep from '../components/checkout/CartStep';
import ShippingStep from '../components/checkout/ShippingStep';
import OrderSummary from '../components/checkout/OrderSummary';
import { useAuth } from "../context/AuthContext";
import { createOrder, createRazorpayOrder } from "../services/publicindex";
import { showOrderPlacedSuccessToast, showOrderPlacedErrorToast, showValidationErrorToast } from "../utils/toast";
import { fbqTrack } from '../components/common/Analytics';

export default function UnifiedCheckout() {
  const [step, setStep] = useState(() => {
    // Initialize step from sessionStorage or default to 'cart'
    if (typeof window !== 'undefined') {
      const savedStep = sessionStorage.getItem('checkoutStep') || 'cart';
      console.log('UnifiedCheckout: Initializing step from sessionStorage:', savedStep);
      return savedStep;
    }
    return 'cart';
  }); // cart, shipping
  const { user, isAuthenticated } = useAuth();
  const { cartItems, clearCart, isCartLoading } = useCart();
  const router = useRouter();

  const [shippingAddress, setShippingAddress] = useState(null);
  const [shippingFee, setShippingFee] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({ method: 'upi', upiId: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
        router.push('/login?redirect=/UnifiedCheckout');
    }
    const savedCoupon = sessionStorage.getItem('appliedCoupon');
    if (savedCoupon) {
      setAppliedCoupon(JSON.parse(savedCoupon));
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (cartItems.length === 0 && !isProcessing && !orderPlaced && !isCartLoading) {
      // Don't redirect, let the CartStep component show the empty cart message
      console.log('UnifiedCheckout: Cart is empty, showing empty cart message');
    }
  }, [cartItems, router, isProcessing, orderPlaced, isCartLoading]);

  // Validate step progression - ensure user can't skip steps
  useEffect(() => {
    if (!isCartLoading && cartItems.length > 0) {
      // If user is on shipping step but cart is empty, go back to cart
      if (step === 'shipping' && cartItems.length === 0) {
        console.log('UnifiedCheckout: Validation - redirecting from shipping to cart (empty cart)');
        setStep('cart');
        sessionStorage.setItem('checkoutStep', 'cart');
      }
    }
  }, [step, cartItems.length, isCartLoading]);

  useEffect(() => {
    const savedAddress = sessionStorage.getItem('shippingAddress');
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
        }
        fetchAddresses();
    }
  }, []);

  const handleSelectAddress = (address) => {
    setShippingAddress(address);
    sessionStorage.setItem('shippingAddress', JSON.stringify(address));
  };

  const handleSelectFee = (fee) => {
    setShippingFee(fee);
  }

  const goToNextStep = () => {
    if (step === 'cart') {
        const newStep = 'shipping';
        console.log('UnifiedCheckout: Moving from cart to shipping step');
        setStep(newStep);
        sessionStorage.setItem('checkoutStep', newStep);
    } else if (step === 'shipping') {
        if (!shippingAddress) {
            showValidationErrorToast('Please select a shipping address.');
            return;
        }
        if (!shippingFee) {
            showValidationErrorToast('Please select a delivery method.');
            return;
        }
        handlePlaceOrder();
    }
  };
  
  const goToPrevStep = () => {
    if (step === 'shipping') {
        const newStep = 'cart';
        console.log('UnifiedCheckout: Moving from shipping to cart step');
        setStep(newStep);
        sessionStorage.setItem('checkoutStep', newStep);
    }
  };

  // Helper to load Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.getElementById('razorpay-script')) return resolve(true);
      const script = document.createElement('script');
      script.id = 'razorpay-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
        showValidationErrorToast('Please login to place an order.');
        router.push('/login?redirect=/UnifiedCheckout');
        return;
    }
    
    if (!shippingAddress || !shippingFee) {
        showValidationErrorToast('Please select shipping address and delivery method.');
        return;
    }
    
    if (!cartItems || cartItems.length === 0) {
        showValidationErrorToast('Your cart is empty.');
        return;
    }
    
    setIsProcessing(true);

    console.log('Order placement debug:', {
        shippingAddress,
        shippingFee,
        cartItems,
        user: user?.id,
        isAuthenticated
    });

    const orderData = {
        shipping_address_id: shippingAddress.id,
        items: cartItems.map(item => ({
            product_id: item.productId || item.id,
            variation_id: item.variationId || (item.variation?.id) || null,
            quantity: item.quantity
        })),
        payment_type: shippingFee.orderType === 'cod' ? 'cod' : paymentDetails.method,
        notes: '',
        discount_amount: appliedCoupon?.discount || 0,
        coupon_id: appliedCoupon?.id || null
    };

    console.log('Order data being sent:', orderData);

    try {
        const orderResult = await createOrder(orderData);
        console.log('Order creation response:', orderResult);
        
        if (!orderResult?.order) {
            throw new Error('Order creation failed to return an order.');
        }

        // --- Facebook Pixel: Track Purchase Event ---
        const fbOrder = orderResult.order;
        fbqTrack('Purchase', {
          value: fbOrder.final_amount,
          currency: 'INR',
          contents: fbOrder.OrderItems?.map(item => ({
            id: item.product_id?.toString(),
            quantity: item.quantity
          })) || [],
        });
        // Optionally, send to backend for server-side sync (if not already done)
        fetch('/api/facebook-pixel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'Purchase',
            order: {
              ...fbOrder,
              ip_address: typeof window !== 'undefined' ? window.location.hostname : '',
              user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
            }
          })
        });

        if (shippingFee.orderType === 'cod') {
            // COD: Order placed, now redirect
            setOrderPlaced(true);
            clearCart();
            sessionStorage.removeItem('shippingAddress');
            sessionStorage.removeItem('appliedCoupon');
            sessionStorage.removeItem('checkoutStep');
            showOrderPlacedSuccessToast(orderResult.order.order_number);
            router.push(`/ThankYou?order_number=${orderResult.order.order_number}`);
        } else {
            // Prepaid: Continue to Razorpay
            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded || !window.Razorpay) {
                showOrderPlacedErrorToast('Failed to load Razorpay SDK. Please try again.');
                setIsProcessing(false);
                return;
            }
            // DETAILED LOGGING FOR DEBUGGING
            console.log('--- Razorpay Debug ---');
            console.log('orderResult:', orderResult);
            console.log('orderResult.order:', orderResult.order);
            console.log('orderResult.order.final_amount:', orderResult.order.final_amount);
            const amountInPaisa = Math.round(orderResult.order.final_amount * 100);
            console.log('Calculated amountInPaisa (should be sent to Razorpay):', amountInPaisa);
            // Create Razorpay order from backend, passing amount in the smallest currency unit (paisa)
            const razorpayOrder = await createRazorpayOrder({
                amount: amountInPaisa,
                currency: 'INR',
                receipt: orderResult.order.order_number,
                notes: {
                    order_id: orderResult.order.id // Pass internal order ID
                }
            });
            console.log('Razorpay order response:', razorpayOrder);
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: amountInPaisa, // Use the calculated amount in paise directly
                currency: razorpayOrder.currency,
                name: 'Cross Coin',
                description: `Order #${orderResult.order.order_number}`,
                order_id: razorpayOrder.id,
                prefill: {
                    name: user?.name || '',
                    email: user?.email || '',
                    contact: shippingAddress?.phone || ''
                },
                theme: {
                    color: '#3399cc'
                },
                redirect: true,
                callback_url: `https://api.crosscoin.in/api/payment/razorpay-callback?order_id=${orderResult.order.id}`
            };
            console.log('Razorpay options passed to window.Razorpay:', options);
            const rzp = new window.Razorpay(options);
            rzp.open();
        }
    } catch (error) {
        console.error('Order placement error:', error);
        showOrderPlacedErrorToast("Order placement failed: " + (error.message || 'Unknown error'));
        setIsProcessing(false);
    }
  };

  // Cleanup function to clear sessionStorage when component unmounts
  useEffect(() => {
    return () => {
      // Only clear if user is leaving the checkout page (not going to ThankYou)
      if (!orderPlaced) {
        sessionStorage.removeItem('checkoutStep');
      }
    };
  }, [orderPlaced]);

  // Function to reset checkout step (useful for debugging or manual reset)
  const resetCheckoutStep = () => {
    console.log('UnifiedCheckout: Resetting checkout step to cart');
    setStep('cart');
    sessionStorage.setItem('checkoutStep', 'cart');
  };

  // Listen for page visibility changes to handle when user returns to checkout
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !orderPlaced) {
        // When user returns to the page, validate the current step
        const savedStep = sessionStorage.getItem('checkoutStep');
        if (savedStep && savedStep !== step) {
          setStep(savedStep);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [step, orderPlaced]);

  const handleCouponApplied = (couponData) => {
    setAppliedCoupon(couponData.coupon);
  };

  const renderStep = () => {
    switch (step) {
      case 'cart':
        return <CartStep />;
      case 'shipping':
        return <ShippingStep 
                    onSelectAddress={handleSelectAddress} 
                    selectedAddress={shippingAddress}
                    onSelectFee={handleSelectFee}
                    selectedFee={shippingFee}
                />;
      default:
        return <CartStep />;
    }
  };

  return (
    <>
      <Header />
      {isCartLoading ? (
        <div className="cart-main checkout-container">
          <div className="cart-section">
            <div className="loading-container">
              <div className="loader"></div>
              <p>Loading your cart...</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="cart-main checkout-container">
          <div className="cart-section">
            {renderStep()}
          </div>
          {cartItems.length > 0 && (
            <div className="order-summary-section">
              <OrderSummary 
                step={step} 
                onNext={goToNextStep}
                onPlaceOrder={handlePlaceOrder}
                shippingAddress={shippingAddress}
                shippingFee={shippingFee}
                isProcessing={isProcessing}
                onCouponApplied={handleCouponApplied}
              />
            </div>
          )}
        </div>
      )}
      <Footer />
    </>
  );
} 