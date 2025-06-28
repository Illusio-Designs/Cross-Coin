import { useState, useEffect } from "react";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { validateCoupon, getPublicCoupons } from "../../services/publicindex";
import { useRouter } from "next/router";

export default function OrderSummary({ step, onNext, onPlaceOrder, shippingAddress, shippingFee, isProcessing }) {
  const router = useRouter();
  const { user } = useAuth();
  const { cartItems } = useCart();
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
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
    const savedCoupon = sessionStorage.getItem('appliedCoupon');
    if (savedCoupon) {
      const { coupon, discountAmount } = JSON.parse(savedCoupon);
      setAppliedCoupon(coupon);
      setDiscount(discountAmount);
      setPromoCode(coupon.code);
      setCouponSuccess("Coupon applied!");
    }
  }, []);

  const subtotal = cartItems.reduce((sum, item) => {
    const itemPrice = parseFloat(item.price) || 0;
    const itemQuantity = parseInt(item.quantity) || 0;
    return sum + (itemPrice * itemQuantity);
  }, 0);
  
  const deliveryFee = shippingFee ? parseFloat(shippingFee.fee || 0) : 0;
  const discountAmount = parseFloat(discount) || 0;
  
  // Ensure discount doesn't exceed subtotal and handle edge cases
  const finalDiscount = Math.min(discountAmount, subtotal);
  const total = Math.max(0, subtotal - finalDiscount + deliveryFee);

  // Reset discount if subtotal becomes 0
  useEffect(() => {
    if (subtotal === 0 && discount > 0) {
      setDiscount(0);
      setAppliedCoupon(null);
      setCouponSuccess("");
      sessionStorage.removeItem('appliedCoupon');
    }
  }, [subtotal, discount]);

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
      const discountAmount = parseFloat(response.discountAmount);
      
      // Validate that discount doesn't exceed subtotal
      if (discountAmount > subtotal) {
        setCouponError("Discount cannot exceed subtotal amount.");
        return;
      }
      
      setDiscount(discountAmount);
      setAppliedCoupon(response.coupon);
      setCouponError("");
      setCouponSuccess(response.message || "Coupon applied successfully!");
      sessionStorage.setItem('appliedCoupon', JSON.stringify({ coupon: response.coupon, discountAmount }));
    } catch (error) {
      setCouponError(error.message || "An error occurred.");
      setDiscount(0);
      setAppliedCoupon(null);
      setCouponSuccess("");
      sessionStorage.removeItem('appliedCoupon');
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

  // Helper function to format currency
  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Helper function to calculate order total
  const calculateOrderTotal = (subtotal, discount, deliveryFee) => {
    const finalDiscount = Math.min(parseFloat(discount) || 0, subtotal);
    return Math.max(0, subtotal - finalDiscount + parseFloat(deliveryFee) || 0);
  };

  return (
    <div className="order-summary-box">
      <div className="order-summary-title">Order Summary</div>
      <div className="order-summary-row">
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      {appliedCoupon ? (
        <div className="order-summary-row">
          <span>Discount ({appliedCoupon.code})</span>
          <span className="discount">-{formatCurrency(finalDiscount)}</span>
        </div>
      ) : (
        <div className="order-summary-row">
          <span>Discount</span>
          <span className="discount">-{formatCurrency(finalDiscount)}</span>
        </div>
      )}
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