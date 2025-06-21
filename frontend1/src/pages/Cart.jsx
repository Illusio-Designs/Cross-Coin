import { useState, useEffect } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Image from "next/image";
import { FiTrash2 } from "react-icons/fi";
import { FaBoxOpen, FaTruck, FaLock, FaUndo } from "react-icons/fa";
import { useRouter } from "next/router";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import SeoWrapper from '../console/SeoWrapper';
import { validateCoupon, getPublicCoupons } from "../services/publicindex";

export default function Cart() {
  const router = useRouter();
  const { user } = useAuth();
  const { cartItems, removeFromCart, updateQuantity } = useCart();
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
    // Clear coupon when cart changes
    setDiscount(0);
    setAppliedCoupon(null);
    setCouponError("");
    setCouponSuccess("");
    setPromoCode("");
  }, [cartItems]);

  console.log('Cart.jsx: rendering with cartItems:', cartItems);

  // Calculate order summary
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal - discount;

  const handleApplyCoupon = async () => {
    if (!promoCode) {
      setCouponError("Please enter a promo code.");
      setCouponSuccess("");
      return;
    }

    if (!user) {
      setCouponError("Please log in to apply a coupon.");
      setCouponSuccess("");
      router.push('/auth/login');
      return;
    }

    try {
      const response = await validateCoupon(promoCode);
      setDiscount(parseFloat(response.discountAmount));
      setAppliedCoupon(response.coupon);
      setCouponError("");
      setCouponSuccess(response.message || "Coupon applied successfully!");
    } catch (error) {
      setCouponError(error.message || "An error occurred.");
      setDiscount(0);
      setAppliedCoupon(null);
      setCouponSuccess("");
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty');
      return;
    }
    router.push('/Checkout');
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

  return (
    <SeoWrapper pageName="cart">
      <Header />
      <div className="cart-main">
        <div className="cart-section">
          <div className={`cart-items-list${cartItems.length === 0 ? ' empty' : ''}`}>
            {cartItems.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-cart-icon">
                  <FaBoxOpen />
                </div>
                <div className="empty-cart-text">
                  YOUR CART IS CURRENTLY EMPTY.
                </div>
                <button className="checkout-btn" onClick={() => router.push('/Products')}>Shop Now</button>
              </div>
            ) : (
              cartItems.map((item) => (
                <div className="cart-item" key={item.id}>
                  <Image src={item.image || '/placeholder.png'} alt={item.name} width={100} height={100} className="cart-item-img" />
                  <div className="cart-item-details">
                    <div className="cart-item-title">{item.name}</div>
                    <div className="cart-item-meta">Size: {item.size || 'N/A'}</div>
                    <div className="cart-item-meta">Color: {item.color || 'N/A'}</div>
                    <div className="cart-item-price">₹{item.price}</div>
                  </div>
                  <div className="cart-item-qty">
                    <button
                      className={`qty-btn ${item.quantity === 1 ? 'qty-btn-disabled' : ''}`}
                      onClick={() => updateQuantity(item.id, -1)}
                      disabled={item.quantity === 1}
                    >-</button>
                    <span>{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.id, 1)}
                    >+</button>
                  </div>
                  <button className="cart-item-remove" onClick={() => removeFromCart(item.id)}><FiTrash2 /></button>
                </div>
              ))
            )}
          </div>
        </div>
        {cartItems.length > 0 && (
          <div className="order-summary-section">
            <div className="order-summary-box">
              
              <div className="order-summary-title">Order Summary</div>
              <div className="order-summary-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {appliedCoupon ? (
                <div className="order-summary-row">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span className="discount">-₹{discount.toFixed(2)}</span>
                </div>
              ) : (
                <div className="order-summary-row">
                  <span>Discount</span>
                  <span className="discount">-₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="order-summary-row">
                <span>Delivery Fee</span>
                <span>₹0.00</span>
              </div>
              <div className="order-summary-total">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
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
                            <p className="coupon-card-description">{generateCouponDescription(coupon)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button
                className="checkout-btn"
                onClick={handleCheckout}
                disabled={cartItems.length === 0}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>
      {cartItems.length > 0 && (
        <div className="cart-features">
          <div className="cart-feature">
            <FaBoxOpen className="feature-icon" />
            <div className="feature-title">Product Packing</div>
            <div className="feature-desc">Lorem ipsum dolor sit amet, consectetur adipiscing.</div>
          </div>
          <div className="cart-feature">
            <FaTruck className="feature-icon" />
            <div className="feature-title">Standard Delivery</div>
            <div className="feature-desc">Lorem ipsum dolor sit amet, consectetur adipiscing.</div>
          </div>
          <div className="cart-feature">
            <FaLock className="feature-icon" />
            <div className="feature-title">Secure Payment</div>
            <div className="feature-desc">Lorem ipsum dolor sit amet, consectetur adipiscing.</div>
          </div>
          <div className="cart-feature">
            <FaUndo className="feature-icon" />
            <div className="feature-title">Easy Return</div>
            <div className="feature-desc">Lorem ipsum dolor sit amet, consectetur adipiscing.</div>
          </div>
        </div>
      )}
      <Footer />
    </SeoWrapper>
  );
} 