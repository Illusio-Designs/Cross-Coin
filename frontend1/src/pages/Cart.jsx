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
  // Dynamic cart items state
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      name: "Gradient Graphic T-shirt",
      image: product1,
      size: "Large",
      color: "White",
      price: 120,
      quantity: 1,
    },
    {
      id: 2,
      name: "Checkered Shirt",
      image: product2,
      size: "Medium",
      color: "Red",
      price: 130,
      quantity: 1,
    },
  ]);

  // Handle quantity change
  const handleQuantityChange = (itemId, change) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.max(1, item.quantity + change) }
          : item
      )
    );
  };

  // Handle item delete
  const handleDelete = (itemId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Calculate order summary
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = Math.round(subtotal * 0.2);
  const total = subtotal - discount;

  const handleCheckout = () => {
    router.push('/checkout');
  };

  return (
    <>
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
                <button className="checkout-btn" onClick={() => router.push('/')}>Shop Now</button>
              </div>
            ) : (
              cartItems.map((item) => (
                <div className="cart-item" key={item.id}>
                  <Image src={item.image} alt={item.name} className="cart-item-img" />
                  <div className="cart-item-details">
                    <div className="cart-item-title">{item.name}</div>
                    <div className="cart-item-meta">Size: {item.size}</div>
                    <div className="cart-item-meta">Color: {item.color}</div>
                    <div className="cart-item-price">${item.price}</div>
                  </div>
                  <div className="cart-item-qty">
                    <button
                      className={`qty-btn ${item.quantity === 1 ? 'qty-btn-disabled' : ''}`}
                      onClick={() => handleQuantityChange(item.id, -1)}
                      disabled={item.quantity === 1}
                    >-</button>
                    <span>{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => handleQuantityChange(item.id, 1)}
                    >+</button>
                  </div>
                  <button className="cart-item-remove" onClick={() => handleDelete(item.id)}><FiTrash2 /></button>
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
                <span>${subtotal}</span>
              </div>
              <div className="order-summary-row">
                <span>Discount (-20%)</span>
                <span className="discount">-${discount}</span>
              </div>
              <div className="order-summary-row">
                <span>Delivery Fee</span>
                <span>$0</span>
              </div>
              <div className="order-summary-total">
                <span>Total</span>
                <span>${total}</span>
              </div>
              <div className="promo-row">
                <input className="promo-input" placeholder="Add promo code" />
                <button className="promo-apply">Apply</button>
              </div>
              <button className="checkout-btn" onClick={handleCheckout} disabled={cartItems.length === 0}>Proceed to Checkout</button>
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
    </>
  );
} 