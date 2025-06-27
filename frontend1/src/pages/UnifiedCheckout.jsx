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

export default function UnifiedCheckout() {
  const [step, setStep] = useState('cart'); // cart, shipping, payment
  const { user, isAuthenticated } = useAuth();
  const { cartItems, clearCart } = useCart();
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
    if (cartItems.length === 0 && !isProcessing && !orderPlaced) {
      router.push('/Products');
    }
  }, [cartItems, router, isProcessing, orderPlaced]);

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
        setStep('shipping');
    } else if (step === 'shipping') {
        if (!shippingAddress) {
            alert('Please select a shipping address.');
            return;
        }
        if (!shippingFee) {
            alert('Please select a delivery method.');
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
                    alert('Failed to load Razorpay SDK. Please try again.');
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
                alert(`Order or payment initiation failed: ${error.message || 'Unknown error'}`);
            } finally {
                setIsProcessing(false);
            }
        }
    }
  };
  
  const goToPrevStep = () => {
    if (step === 'payment') setStep('shipping');
    else if (step === 'shipping') setStep('cart');
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
            alert('Please enter UPI ID');
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
            router.push(`/ThankYou?order_number=${orderResult.order.order_number}`);
        } else {
            // Prepaid: Razorpay flow
            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded) {
                alert('Failed to load Razorpay SDK. Please try again.');
                setIsProcessing(false);
                return;
            }
            // Debug: Check if Razorpay is loaded
            if (!window.Razorpay) {
                alert('Razorpay SDK not loaded');
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
        alert(`Order placement failed: ${error.message || 'Unknown error'}`);
        setIsProcessing(false);
    }
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
    <SeoWrapper pageName="checkout">
      <Header />
      <div className="cart-main checkout-container">
        <div className="cart-section">
          {renderStep()}
        </div>
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
      </div>
      <Footer />
    </SeoWrapper>
  );
} 