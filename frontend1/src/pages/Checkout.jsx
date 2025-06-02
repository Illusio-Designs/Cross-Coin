import Footer from "../components/Footer";
import Header from "../components/Header";
import { useRouter } from "next/router";
import { FaPlus } from "react-icons/fa";
import Image from "next/image";
import { useCart } from "../context/CartContext";
import { useEffect, useState } from "react";

export default function Checkout() {
  const router = useRouter();
  const { cartItems } = useCart();
  const [shippingAddress, setShippingAddress] = useState(null);

  useEffect(() => {
    // Get shipping address from session storage if it exists
    const savedAddress = sessionStorage.getItem('shippingAddress');
    if (savedAddress) {
      setShippingAddress(JSON.parse(savedAddress));
    }
  }, []);

  const handleAddAddress = () => {
    router.push('/Shipping');
  };

  const handlePlaceOrder = () => {
    if (!shippingAddress) {
      alert('Please add a shipping address first');
      return;
    }
    router.push('/CheckoutUPI');
  };

  // Calculate order summary
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = Math.round(subtotal * 0.2);
  const total = subtotal - discount;

  return (
    <>
      <Header />
      <div className="cart-main checkout-container">
        <div className="cart-section">
          {/* Cart Products Display */}
          <div className="cart-items-list">
            {cartItems.map((item) => (
              <div className="cart-item" key={item.id}>
                <Image src={item.image} alt={item.name} className="cart-item-img" />
                <div className="cart-item-details">
                  <div className="cart-item-title">{item.name}</div>
                  <div className="cart-item-meta">Size: {item.size}</div>
                  <div className="cart-item-meta">Color: {item.color}</div>
                  <div className="cart-item-price">${item.price}</div>
                </div>
              </div>
            ))}
          </div>
          {/* End Cart Products Display */}
          <div className="checkout-info">
            <div className="contact-info">
              <h2>Contact Information</h2>
              <div className="contact-details">
                <p>Email: user@example.com</p>
                <p>Phone: +1 234 567 890</p>
              </div>
            </div>
            
            <div className="shipping-addresses">
              <h2>Shipping Addresses</h2>
              <div className="address-list">
                {shippingAddress ? (
                  <div className="address-card">
                    <h3>{shippingAddress.addressType}</h3>
                    <p>{shippingAddress.street}</p>
                    <p>{shippingAddress.building}</p>
                    <p>{shippingAddress.city}, {shippingAddress.pincode}</p>
                    <p>{shippingAddress.country}</p>
                  </div>
                ) : (
                  <div className="no-address">No shipping address added</div>
                )}
                <button 
                  className="add-address-btn"
                  onClick={handleAddAddress}
                >
                  <FaPlus /> Add New Address
                </button>
              </div>
            </div>
          </div>
        </div>

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
            <button 
              className="checkout-btn"
              onClick={handlePlaceOrder}
              disabled={!shippingAddress}
            >
              Place Order
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
} 