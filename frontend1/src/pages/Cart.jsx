import Footer from "../components/Footer";
import Header from "../components/Header";
import Image from "next/image";
import { FiTrash2 } from "react-icons/fi";
import { FaBoxOpen, FaTruck, FaLock, FaUndo } from "react-icons/fa";
import product1 from "../assets/card1-left.webp";
import product2 from "../assets/card2-left.webp";
import { useState } from "react";
import { useRouter } from "next/router";

export default function Cart() {
  const router = useRouter();
  const [quantities, setQuantities] = useState({
    item1: 1,
    item2: 1
  });

  const handleQuantityChange = (itemId, change) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(1, prev[itemId] + change)
    }));
  };

  const handleCheckout = () => {
    router.push('/checkout');
  };

  return (
    <>
      <Header />
      <div className="cart-main">
        <div className="cart-section">
          <div className="cart-items-list">
            {/* Cart Item 1 */}
            <div className="cart-item">
              <Image src={product1} alt="Gradient Graphic T-shirt" className="cart-item-img" />
              <div className="cart-item-details">
                <div className="cart-item-title">Gradient Graphic T-shirt</div>
                <div className="cart-item-meta">Size: Large</div>
                <div className="cart-item-meta">Color: White</div>
                <div className="cart-item-price">$120</div>
              </div>
              <div className="cart-item-qty">
                <button 
                  className={`qty-btn ${quantities.item1 === 1 ? 'qty-btn-disabled' : ''}`}
                  onClick={() => handleQuantityChange('item1', -1)}
                >-</button>
                <span>{quantities.item1}</span>
                <button 
                  className="qty-btn"
                  onClick={() => handleQuantityChange('item1', 1)}
                >+</button>
              </div>
              <button className="cart-item-remove"><FiTrash2 /></button>
            </div>
            {/* Cart Item 2 */}
            <div className="cart-item">
              <Image src={product2} alt="Checkered Shirt" className="cart-item-img" />
              <div className="cart-item-details">
                <div className="cart-item-title">Checkered Shirt</div>
                <div className="cart-item-meta">Size: Medium</div>
                <div className="cart-item-meta">Color: Red</div>
                <div className="cart-item-price">$130</div>
              </div>
              <div className="cart-item-qty">
                <button 
                  className={`qty-btn ${quantities.item2 === 1 ? 'qty-btn-disabled' : ''}`}
                  onClick={() => handleQuantityChange('item2', -1)}
                >-</button>
                <span>{quantities.item2}</span>
                <button 
                  className="qty-btn"
                  onClick={() => handleQuantityChange('item2', 1)}
                >+</button>
              </div>
              <button className="cart-item-remove"><FiTrash2 /></button>
            </div>
          </div>
        </div>
        <div className="order-summary-section">
          <div className="order-summary-box">
            <div className="order-summary-title">Order Summary</div>
            <div className="order-summary-row">
              <span>Subtotal</span>
              <span>$250</span>
            </div>
            <div className="order-summary-row">
              <span>Discount (-20%)</span>
              <span className="discount">-$113</span>
            </div>
            <div className="order-summary-row">
              <span>Delivery Fee</span>
              <span>$0</span>
            </div>
            <div className="order-summary-total">
              <span>Total</span>
              <span>$250</span>
            </div>
            <div className="promo-row">
              <input className="promo-input" placeholder="Add promo code" />
              <button className="promo-apply">Apply</button>
            </div>
            <button className="checkout-btn" onClick={handleCheckout}>Proceed to Checkout</button>
          </div>
        </div>
      </div>
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
      <Footer />
    </>
  );
} 