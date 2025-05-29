import Footer from "../components/Footer";
import Header from "../components/Header";
import { useRouter } from "next/router";
import { FaPlus } from "react-icons/fa";
import Image from "next/image";
import product1 from "../assets/card1-left.webp";
import product2 from "../assets/card2-left.webp";

export default function Checkout() {
  const router = useRouter();

  return (
    <>
      <Header />
      <div className="cart-main">
        <div className="cart-section">
          {/* Cart Products Display */}
          <div className="cart-items-list">
            <div className="cart-item">
              <Image src={product1} alt="Gradient Graphic T-shirt" className="cart-item-img" />
              <div className="cart-item-details">
                <div className="cart-item-title">Gradient Graphic T-shirt</div>
                <div className="cart-item-meta">Size: Large</div>
                <div className="cart-item-meta">Color: White</div>
                <div className="cart-item-price">$120</div>
              </div>
            </div>
            <div className="cart-item">
              <Image src={product2} alt="Checkered Shirt" className="cart-item-img" />
              <div className="cart-item-details">
                <div className="cart-item-title">Checkered Shirt</div>
                <div className="cart-item-meta">Size: Medium</div>
                <div className="cart-item-meta">Color: Red</div>
                <div className="cart-item-price">$130</div>
              </div>
            </div>
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
                <div className="address-card">
                  <h3>Home Address</h3>
                  <p>123 Main Street</p>
                  <p>Apt 4B</p>
                  <p>New York, NY 10001</p>
                  <p>United States</p>
                </div>
                <button 
                  className="add-address-btn"
                  onClick={() => router.push('/shipping')}
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
            <button className="checkout-btn">Place Order</button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
} 