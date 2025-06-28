import { useState, useEffect } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import SeoWrapper from '../console/SeoWrapper';
import { useCart } from "../context/CartContext";
import { useRouter } from "next/router";
import CartStep from '../components/checkout/CartStep';
import ShippingStep from '../components/checkout/ShippingStep';
import PaymentStep from '../components/checkout/PaymentStep';
import OrderSummary from '../components/checkout/OrderSummary';
import { useAuth } from "../context/AuthContext";
import { createOrder, createRazorpayOrder } from "../services/publicindex";
import { showOrderPlacedSuccessToast, showOrderPlacedErrorToast, showValidationErrorToast } from "../utils/toast";

export default function UnifiedCheckout() {
  const [step, setStep] = useState(() => {
    // Initialize step from sessionStorage or default to 'cart'
    if (typeof window !== 'undefined') {
      const savedStep = sessionStorage.getItem('checkoutStep') || 'cart';
      console.log('UnifiedCheckout: Initializing step from sessionStorage:', savedStep);
      return savedStep;
    }
    return 'cart';
  }); // cart, shipping, payment
  const { user, isAuthenticated } = useAuth();
  const { cartItems, clearCart, isCartLoading } = useCart();
  const router = useRouter();

  const [shippingAddress, setShippingAddress] = useState(null);
  const [shippingFee, setShippingFee] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({ method: 'upi', upiId: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
        router.push('/login?redirect=/UnifiedCheckout');
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
      // If user is on payment step but hasn't completed shipping requirements, go back to shipping
      else if (step === 'payment' && (!shippingAddress || !shippingFee)) {
        console.log('UnifiedCheckout: Validation - redirecting from payment to shipping (missing requirements)');
        setStep('shipping');
        sessionStorage.setItem('checkoutStep', 'shipping');
      }
    }
  }, [step, cartItems.length, shippingAddress, shippingFee, isCartLoading]);

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

  const goToNextStep = async () => {
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
        if (shippingFee.orderType === 'cod') {
            handlePlaceOrder();
        } else {
            // Prepaid: create order and redirect to Razorpay
            setIsProcessing(true);
            const orderData = {
                shipping_address_id: shippingAddress.id,
                items: cartItems.map(item => ({
                    product_id: item.productId,
                    variation_id: item.variation?.id || null,
                    quantity: item.quantity
                })),
                payment_type: paymentDetails.method,
                notes: ''
            };
            try {
                const orderResult = await createOrder(orderData);
                // Now create Razorpay order
                const amount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) + (shippingFee?.amount || 0);
                const razorpayOrder = await createRazorpayOrder({ amount, currency: 'INR' });
                const scriptLoaded = await loadRazorpayScript();
                if (!scriptLoaded || !window.Razorpay) {
                    showOrderPlacedErrorToast('Failed to load Razorpay SDK. Please try again.');
                    setIsProcessing(false);
                    return;
                }
                const options = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    amount: razorpayOrder.amount,
                    currency: razorpayOrder.currency,
                    name: 'Cross Coin',
                    description: 'Order Payment',
                    order_id: razorpayOrder.id,
                    prefill: {
                        name: user?.name || '',
                        email: user?.email || '',
                    },
                    theme: {
                        color: '#3399cc'
                    },
                    redirect: true,
                    callback_url: `https://api.crosscoin.in/api/razorpay/callback?order_number=${orderResult.order.order_number}`
                };
                const rzp = new window.Razorpay(options);
                rzp.open();
            } catch (error) {
                showOrderPlacedErrorToast(`Order or payment initiation failed: ${error.message || 'Unknown error'}`);
            } finally {
                setIsProcessing(false);
            }
        }
    }
  };
  
  const goToPrevStep = () => {
    if (step === 'payment') {
        const newStep = 'shipping';
        console.log('UnifiedCheckout: Moving from payment to shipping step');
        setStep(newStep);
        sessionStorage.setItem('checkoutStep', newStep);
    } else if (step === 'shipping') {
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
    // For prepaid, validate payment details. For COD, skip this.
    if (shippingFee?.orderType !== 'cod') {
        if (paymentDetails.method === 'upi' && !paymentDetails.upiId) {
            showValidationErrorToast('Please enter UPI ID');
            return;
        }
    }

    setIsProcessing(true);

    const orderData = {
        shipping_address_id: shippingAddress.id,
        items: cartItems.map(item => ({
            product_id: item.productId,
            variation_id: item.variation?.id || null,
            quantity: item.quantity
        })),
        payment_type: shippingFee?.orderType === 'cod' ? 'cod' : paymentDetails.method,
        notes: '' // You can add notes if you have a field for it
    };

    try {
        if (shippingFee?.orderType === 'cod') {
            // COD: Place order directly
            const orderResult = await createOrder(orderData);
            setOrderPlaced(true);
            clearCart();
            sessionStorage.removeItem('shippingAddress');
            sessionStorage.removeItem('appliedCoupon');
            sessionStorage.removeItem('checkoutStep'); // Clear checkout step
            showOrderPlacedSuccessToast(orderResult.order.order_number);
            router.push(`/ThankYou?order_number=${orderResult.order.order_number}`);
        } else {
            // Prepaid: Razorpay flow
            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded) {
                showOrderPlacedErrorToast('Failed to load Razorpay SDK. Please try again.');
                setIsProcessing(false);
                return;
            }
            // Debug: Check if Razorpay is loaded
            if (!window.Razorpay) {
                showOrderPlacedErrorToast('Razorpay SDK not loaded');
                setIsProcessing(false);
                return;
            }
            // Create Razorpay order from backend
            const amount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) + (shippingFee?.amount || 0);
            const razorpayOrder = await createRazorpayOrder({ amount, currency: 'INR' });
            // Debug: Log Razorpay order and key
            console.log('Razorpay Order:', razorpayOrder);
            console.log('Razorpay Key:', process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Set this in your .env file
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                name: 'Cross Coin',
                description: 'Order Payment',
                order_id: razorpayOrder.id,
                prefill: {
                    name: user?.name || '',
                    email: user?.email || '',
                },
                theme: {
                    color: '#3399cc'
                },
                redirect: true,
                callback_url: `https://api.crosscoin.in/api/razorpay/callback?order_number=${orderResult.order.order_number}`
            };
            // Debug: Log options before opening Razorpay
            console.log('Opening Razorpay with options:', options);
            const rzp = new window.Razorpay(options);
            rzp.open();
            setIsProcessing(false);
        }
    } catch (error) {
        console.error("Order placement failed in component:", error);
        showOrderPlacedErrorToast(`Order placement failed: ${error.message || 'Unknown error'}`);
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
    <SeoWrapper pageName="checkout">
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
              />
            </div>
          )}
        </div>
      )}
      <Footer />
    </SeoWrapper>
  );
} 