import { useState, useEffect } from "react";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { validateCoupon, getPublicCoupons } from "../../services/publicApi";
import { useRouter } from "next/router";

export default function OrderSummary({ 
  step, 
  onNext, 
  onPlaceOrder, 
  shippingAddress, 
  shippingFee, 
  isProcessing, 
  isCartLoading, 
  appliedCoupon, 
  onCouponApplied, 
  onCouponRemoved, 
  buyNowItem, 
  buyNowTotal,
  shippingFees,
  onSelectFee
}) {
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
  
  // Debug logging
  console.log('OrderSummary: appliedCoupon:', appliedCoupon);
  console.log('OrderSummary: discountAmount:', discountAmount);
  
  // Calculate total including Buy Now items
  const subtotal = (cartTotal || 0) + (buyNowTotal || 0);
  const total = subtotal !== undefined ? Math.max(0, subtotal - discountAmount + deliveryFee) : 0;

  const handleApplyCoupon = async () => {
    if (!promoCode) {
      setCouponError("Please enter a promo code.");
      return;
    }
    
    setCouponError("");
    setCouponSuccess("");
    
    try {
      // Determine payment mode from shippingFee
      const paymentMode = shippingFee?.orderType === 'cod' ? 'cod' : 'prepaid';
      
      // Prepare cart items for quantity-based coupons
      const cartItemsForValidation = cartItems.map(item => ({
        quantity: item.quantity
      }));
      
      // Add buy now item if present
      if (buyNowItem) {
        cartItemsForValidation.push({
          quantity: buyNowItem.quantity || 1
        });
      }
      
      const response = await validateCoupon(promoCode, subtotal, paymentMode, cartItemsForValidation);
      
      if (response && response.coupon && response.discountAmount) {
        const discount = parseFloat(response.discountAmount);
        
        const newCouponData = { 
          ...response.coupon, 
          discount: discount,
          discountAmount: discount
        };
        
        // Save to sessionStorage to persist across page refreshes
        sessionStorage.setItem("appliedCoupon", JSON.stringify(newCouponData));
        
        onCouponApplied(newCouponData);
        setCouponSuccess(`🎉 Yay! You saved ₹${discount.toFixed(2)}`);
      } else {
        throw new Error("Invalid coupon response format");
      }
    } catch (error) {
      console.error("Coupon validation error:", error);
      setCouponError(error.message || "Failed to apply coupon. Please try again.");
      onCouponRemoved();
    }
  };

  const handleNextClick = () => {
    // Always place order - no more "Next" steps
    onPlaceOrder();
  };

  const getButtonText = () => {
    if (isProcessing) return 'Processing...';
    if (shippingFee?.orderType === 'prepaid') return 'Pay Now';
    return 'Place Order';
  };

  const isButtonDisabled = () => {
    if (isProcessing) return true;
    if (cartItems.length === 0 && !buyNowItem) return true;
    if (!shippingAddress || !shippingFee) return true;
    return false;
  };
  
  const handleCouponClick = (code) => {
    setPromoCode(code);
  };

  const handleRemoveCoupon = () => {
    setPromoCode("");
    setCouponSuccess("");
    setCouponError("");
    onCouponRemoved();
  };

  const generateCouponDescription = (coupon) => {
    const value = parseFloat(coupon.value);
    const minPurchase = parseFloat(coupon.minPurchase);
    const maxDiscount = parseFloat(coupon.maxDiscount);

    let description = '';
    
    if (coupon.type === 'percentage') {
      description = `Get ${value}% off`;
      if (minPurchase > 0) {
        description += ` on a minimum purchase of ₹${minPurchase}`;
      }
      if (maxDiscount > 0) {
        description += `. Maximum discount: ₹${maxDiscount}`;
      }
    } else if (coupon.type === 'fixed') {
      description = `Get a flat ₹${value} discount`;
      if (minPurchase > 0) {
        description += ` on a minimum purchase of ₹${minPurchase}`;
      }
    } else if (coupon.type === 'tiered') {
      description = `Tiered discount based on cart value`;
    } else if (coupon.type === 'quantity_based') {
      description = `Discount based on quantity purchased`;
    } else {
      description = 'A special discount on your order';
    }
    
    // Add payment mode restriction info
    if (coupon.paymentModeRestriction === 'cod') {
      description += ' (COD only)';
    } else if (coupon.paymentModeRestriction === 'prepaid') {
      description += ' (Prepaid only)';
    }
    
    // Add first order restriction info
    if (coupon.firstOrderOnly) {
      description += ' (First order only)';
    }
    
    return description + '.';
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toFixed(2)}`;
  };

  if (isCartLoading || (cartTotal === undefined && buyNowTotal === undefined)) {
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
      
      {/* Delivery Methods Section - Moved to top of order summary */}
      {shippingFees && shippingFees.length > 0 && (
        <div className="delivery-methods-in-summary">
          <h4 style={{ marginBottom: '12px', fontSize: '1rem', fontWeight: '600' }}>Delivery Method</h4>
          <div className="delivery-methods-compact">
            {shippingFees.map((fee) => (
              <label
                key={fee.id}
                className={`delivery-option-compact ${shippingFee?.id === fee.id ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="delivery"
                  checked={shippingFee?.id === fee.id}
                  onChange={() => onSelectFee && onSelectFee(fee)}
                />
                <div className="delivery-content-compact">
                  <div className="delivery-title-compact">
                    {fee.orderType === "cod" ? "Cash on Delivery" : fee.orderType === "prepaid" ? "Prepaid Payment" : fee.orderType}
                  </div>
                  <div className="delivery-desc-compact">
                    {fee.orderType === "cod" ? "Pay when you receive" : fee.orderType === "prepaid" ? "Better discounts available" : "Standard delivery"}
                  </div>
                </div>
                <div className={`delivery-fee-compact ${parseFloat(fee.fee || 0) === 0 ? "free" : "paid"}`}>
                  {parseFloat(fee.fee || 0) === 0 ? "Free" : `₹${parseFloat(fee.fee || 0).toFixed(2)}`}
                </div>
              </label>
            ))}
          </div>
          <div style={{ height: '1px', background: '#e9ecef', margin: '16px 0' }}></div>
        </div>
      )}

      <div className="order-summary-row">
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
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
            disabled={!!appliedCoupon}
          />
          {appliedCoupon ? (
            <button className="promo-remove" onClick={handleRemoveCoupon}>Remove</button>
          ) : (
            <button className="promo-apply" onClick={handleApplyCoupon}>Apply</button>
          )}
        </div>
        {couponError && <div className="coupon-message coupon-error">{couponError}</div>}
        {couponSuccess && <div className="coupon-message coupon-success">{couponSuccess}</div>}
      </div>
      {availableCoupons.length > 0 && (
        <div className="available-coupons">
          <h3 className="available-coupons-title">Available Coupons</h3>
          <div className="coupons-list">
            {availableCoupons.map((coupon) => {
              // Check if coupon is applicable for current payment mode
              const currentPaymentMode = shippingFee?.orderType === 'cod' ? 'cod' : 'prepaid';
              const isApplicable = !coupon.paymentModeRestriction || 
                                 coupon.paymentModeRestriction === 'all' || 
                                 coupon.paymentModeRestriction === currentPaymentMode;
              
              return (
                <div
                  key={coupon.id}
                  className={`coupon-card ${promoCode === coupon.code ? 'selected' : ''} ${!isApplicable ? 'not-applicable' : ''}`}
                  onClick={() => isApplicable && handleCouponClick(coupon.code)}
                  style={{ 
                    opacity: isApplicable ? 1 : 0.6,
                    cursor: isApplicable ? 'pointer' : 'not-allowed'
                  }}
                >
                  <div className="coupon-card-header">
                      <span className="coupon-card-code">{coupon.code}</span>
                      {!isApplicable && (
                        <span style={{ 
                          fontSize: '10px', 
                          color: '#ff6b6b', 
                          fontWeight: 'bold' 
                        }}>
                          Not applicable
                        </span>
                      )}
                  </div>
                  <div className="coupon-card-body">
                      <p className="coupon-card-description">{coupon.description || generateCouponDescription(coupon)}</p>
                  </div>
                </div>
              );
            })}
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