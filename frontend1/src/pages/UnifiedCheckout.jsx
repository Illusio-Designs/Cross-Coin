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

export default function UnifiedCheckout() {
  const [step, setStep] = useState('cart'); // cart, shipping, payment
  const { user, isAuthenticated } = useAuth();
  const { cartItems, clearCart } = useCart();
  const router = useRouter();

  const [shippingAddress, setShippingAddress] = useState(null);
  const [shippingFee, setShippingFee] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({ method: 'upi', upiId: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
        router.push('/login?redirect=/UnifiedCheckout');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (cartItems.length === 0 && !isProcessing) {
      router.push('/Products');
    }
  }, [cartItems, router, isProcessing]);

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
        // If COD is selected, place order directly. Otherwise, proceed to payment.
        if (shippingFee.orderType === 'cod') {
            handlePlaceOrder();
        } else {
            setStep('payment');
        }
    }
  };
  
  const goToPrevStep = () => {
    if (step === 'payment') setStep('shipping');
    else if (step === 'shipping') setStep('cart');
  };

  const handlePlaceOrder = () => {
    // For prepaid, validate payment details. For COD, skip this.
    if (shippingFee?.orderType !== 'cod') {
        if (paymentDetails.method === 'upi' && !paymentDetails.upiId) {
            alert('Please enter UPI ID');
            return;
        }
    }

    console.log("Placing order with:", {
        shippingAddress,
        paymentDetails: shippingFee?.orderType === 'cod' ? { method: 'cod' } : paymentDetails,
        cartItems,
        shippingFee
    });

    setIsProcessing(true);
    setTimeout(() => {
      clearCart();
      sessionStorage.removeItem('shippingAddress');
      sessionStorage.removeItem('appliedCoupon');
      router.push('/ThankYou');
      setIsProcessing(false);
    }, 2000);
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
      case 'payment':
        return <PaymentStep paymentDetails={paymentDetails} setPaymentDetails={setPaymentDetails} />;
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