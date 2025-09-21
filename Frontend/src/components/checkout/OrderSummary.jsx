import { useState, useEffect } from "react";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { validateCoupon, getPublicCoupons } from "../../services/publicindex";
import { useRouter } from "next/router";

export default function OrderSummary({ step, onNext, onPlaceOrder, shippingAddress, shippingFee, isProcessing, isCartLoading, appliedCoupon, onCouponApplied, onCouponRemoved }) {
  const router = useRouter();
  const { user } = useAuth();
  const { cartItems, cartTotal } = useCart();
  const [promoCode, setPromoCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([]);

  useEffect(() => {
    const fetchCoupons = async () => {
        try {
            const data = await getPublicCoupons();
            if (data && data.coupons) {
              setAvailableCoupons(data.coupons);
            }
        } catch (error) {
            console.error("Failed to fetch available coupons:", error);
        }
    };
    fetchCoupons();
  }, []);

  useEffect(() => {
    if (appliedCoupon) {
      setPromoCode(appliedCoupon.code);
      setCouponSuccess("Coupon applied!");
    } else {
      setPromoCode("");
      setCouponSuccess("");
    }
  }, [appliedCoupon]);

  const deliveryFee = shippingFee ? parseFloat(shippingFee.fee || 0) : 0;
  const discountAmount = appliedCoupon ? parseFloat(appliedCoupon.discount || 0) : 0;
  
  const total = cartTotal !== undefined ? Math.max(0, cartTotal - discountAmount + deliveryFee) : 0;

  const handleApplyCoupon = async () => {
    if (!promoCode) {
      setCouponError("Please enter a promo code.");
      return;
    }
    if (!user) {
      setCouponError("Please log in to apply a coupon.");
      router.push('/auth/login');
      return;
    }
    try {
      const response = await validateCoupon(promoCode);
      const discount = parseFloat(response.discountAmount);
      
      const newCouponData = { ...response.coupon, discount };
      onCouponApplied(newCouponData);
      
      setCouponError("");
    } catch (error) {
      setCouponError(error.message || "An error occurred.");
      onCouponRemoved();
    }
  };

  const handleNextClick = () => {
    if (step === 'payment') {
      onPlaceOrder();
    } else {
      onNext();
    }
  };

  const getButtonText = () => {
    if (step === 'cart') return 'Proceed to Shipping';
    if (step === 'shipping') {
        return shippingFee?.orderType === 'cod' ? 'Place Order' : 'Proceed to Payment';
    }
    if (step === 'payment') return isProcessing ? 'Processing...' : 'Place Order';
    return 'Next';
  };

  const isButtonDisabled = () => {
    if (isProcessing) return true;
    if (cartItems.length === 0) return true;
    if (step === 'shipping' && !shippingAddress) return true;
    return false;
  };
  
  const handleCouponClick = (code) => {
    setPromoCode(code);
  };

  const generateCouponDescription = (coupon) => {
    const value = parseFloat(coupon.value);
    const minPurchase = parseFloat(coupon.minPurchase);
    const maxDiscount = parseFloat(coupon.maxDiscount);

    if (coupon.type === 'percentage') {
      let description = `Get ${value}% off`;
      if (minPurchase > 0) {
        description += ` on a minimum purchase of ₹${minPurchase}`;
      }
      if (maxDiscount > 0) {
        description += `. Maximum discount: ₹${maxDiscount}`;
      }
      return description + '.';
    }

    if (coupon.type === 'fixed') {
      let description = `Get a flat ₹${value} discount`;
      if (minPurchase > 0) {
        description += ` on a minimum purchase of ₹${minPurchase}`;
      }
      return description + '.';
    }
    
    return 'A special discount on your order.';
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toFixed(2)}`;
  };

  if (isCartLoading || cartTotal === undefined) {
    return (
      <div className="order-summary-box">
        <div className="order-summary-title">Order Summary</div>
        <div className="order-summary-row">
          <span>Subtotal</span>
          <span>Loading...</span>
        </div>
        <div className="order-summary-row">
          <span>Discount</span>
          <span>-₹0.00</span>
        </div>
        <div className="order-summary-row">
          <span>Delivery Fee</span>
          <span>Loading...</span>
        </div>
        <div className="order-summary-total">
          <span>Total</span>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="order-summary-box">
      <div className="order-summary-title">Order Summary</div>
      <div className="order-summary-row">
        <span>Subtotal</span>
        <span>{formatCurrency(cartTotal)}</span>
      </div>
      <div className="order-summary-row">
        <span>Discount</span>
        <span className="discount">-{formatCurrency(discountAmount)}</span>
      </div>
      <div className="order-summary-row">
        <span>Delivery Fee</span>
        <span>{shippingFee ? formatCurrency(deliveryFee) : 'Free'}</span>
      </div>
      <div className="order-summary-total">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>
      <div className="promo-section">
        <div className="promo-row">
          <input
            className="promo-input"
            placeholder="Enter promo code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
          />
          <button className="promo-apply" onClick={handleApplyCoupon}>Apply</button>
        </div>
        {couponError && <div className="coupon-message coupon-error">{couponError}</div>}
        {couponSuccess && <div className="coupon-message coupon-success">{couponSuccess}</div>}
      </div>
      {availableCoupons.length > 0 && (
        <div className="available-coupons">
          <h3 className="available-coupons-title">Available Coupons</h3>
          <div className="coupons-list">
            {availableCoupons.map((coupon) => (
              <div
                key={coupon.id}
                className={`coupon-card ${promoCode === coupon.code ? 'selected' : ''}`}
                onClick={() => handleCouponClick(coupon.code)}
              >
                <div className="coupon-card-header">
                    <span className="coupon-card-code">{coupon.code}</span>
                </div>
                <div className="coupon-card-body">
                    <p className="coupon-card-description">{coupon.description || generateCouponDescription(coupon)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        className="checkout-btn"
        onClick={handleNextClick}
        disabled={isButtonDisabled()}
      >
        {getButtonText()}
      </button>
    </div>
  );
} 