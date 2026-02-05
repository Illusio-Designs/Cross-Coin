import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CartStep from '../components/checkout/CartStep';
import QuantityOfferBar from '../components/cart/QuantityOfferBar';
import { useCart } from '../context/CartContext';
import { useRouter } from 'next/router';
import { showSuccessToast } from '../utils/toast';
import '../styles/pages/Cart.css';

const Cart = () => {
  const { cartItems, cartTotal, isCartLoading } = useCart();
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('cod');
  const router = useRouter();

  const handleCheckout = () => {
    router.push('/UnifiedCheckout');
  };

  const handleContinueShopping = () => {
    router.push('/Products');
  };

  // Handle coupon application from offer bar
  const handleCouponApply = (couponData) => {
    setAppliedCoupon(couponData);
    showSuccessToast(`Coupon ${couponData.code} applied! You saved ₹${couponData.discountAmount}`);
  };

  // Handle payment mode change
  const handlePaymentModeChange = (mode) => {
    setSelectedPaymentMode(mode);
    console.log('Cart page: Payment mode changed to:', mode);
  };

  const finalTotal = appliedCoupon ? 
    Math.max(0, cartTotal - parseFloat(appliedCoupon.discountAmount)) : 
    cartTotal;

  return (
    <>
      <Header />
      <div className="cart-page">
        <div className="cart-container">
          <div className="cart-header">
            <h1>Shopping Cart</h1>
            {cartItems.length > 0 && (
              <span className="cart-count">({cartItems.length} items)</span>
            )}
          </div>

          {/* Simple Offer Bar */}
          {cartItems.length > 0 && (
            <div className="cart-offers-section">
              <QuantityOfferBar 
                onCouponApply={handleCouponApply} 
                selectedPaymentMode={selectedPaymentMode}
                appliedCoupon={appliedCoupon}
              />
            </div>
          )}

          {/* Cart Items Section */}
          <div className="cart-content">
            <div className="cart-items-section">
              <CartStep />
            </div>

            {/* Cart Summary Sidebar */}
            {cartItems.length > 0 && (
              <div className="cart-summary-section">
                <div className="cart-summary-card">
                  <h3>Order Summary</h3>
                  
                  {/* Payment Method Selector */}
                  <div className="payment-method-section">
                    <h4>Delivery Method</h4>
                    <div className="payment-method-options">
                      <label className={`payment-option ${selectedPaymentMode === 'cod' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="paymentMode"
                          value="cod"
                          checked={selectedPaymentMode === 'cod'}
                          onChange={(e) => handlePaymentModeChange(e.target.value)}
                        />
                        <span className="payment-option-content">
                          <strong>Cash on Delivery</strong>
                          <small>Pay when you receive</small>
                        </span>
                      </label>
                      <label className={`payment-option ${selectedPaymentMode === 'prepaid' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="paymentMode"
                          value="prepaid"
                          checked={selectedPaymentMode === 'prepaid'}
                          onChange={(e) => handlePaymentModeChange(e.target.value)}
                        />
                        <span className="payment-option-content">
                          <strong>Prepaid Payment</strong>
                          <small>Better discounts available</small>
                        </span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="summary-divider"></div>
                  
                  <div className="summary-row">
                    <span>Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                  </div>
                  
                  {appliedCoupon && (
                    <div className="summary-row discount-row">
                      <span>Discount ({appliedCoupon.code})</span>
                      <span>-₹{appliedCoupon.discountAmount}</span>
                    </div>
                  )}
                  
                  <div className="summary-row">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                  
                  <div className="summary-divider"></div>
                  
                  <div className="summary-row total">
                    <span>Total</span>
                    <span>₹{finalTotal.toFixed(2)}</span>
                  </div>

                  {/* Applied Coupon Display */}
                  {appliedCoupon && (
                    <div className="applied-coupon-info">
                      <div className="coupon-success">
                        ✅ <strong>{appliedCoupon.code}</strong> applied - You saved ₹{appliedCoupon.discountAmount}!
                      </div>
                    </div>
                  )}

                  <div className="cart-actions">
                    <button 
                      className="checkout-btn primary"
                      onClick={handleCheckout}
                    >
                      Proceed to Checkout
                    </button>
                    <button 
                      className="continue-shopping-btn secondary"
                      onClick={handleContinueShopping}
                    >
                      Continue Shopping
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Empty Cart State */}
          {cartItems.length === 0 && !isCartLoading && (
            <div className="empty-cart-section">
              <div className="empty-cart-content">
                <div className="empty-cart-icon">🛒</div>
                <h2>Your cart is empty</h2>
                <p>Looks like you haven't added anything to your cart yet.</p>
                <button 
                  className="shop-now-btn"
                  onClick={handleContinueShopping}
                >
                  Start Shopping
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Cart;