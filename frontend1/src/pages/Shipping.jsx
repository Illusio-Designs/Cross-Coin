import Footer from "../components/Footer";
import Header from "../components/Header";
import { useRouter } from "next/router";

export default function Shipping() {
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    router.push('/checkout');
  };

  return (
    <>
      <Header />
      <div className="shipping-container">
        <div className="shipping-main">
          <div className="shipping-section">
            <div className="contact-info-section">
              <div className="contact-info-header">
                <h3>Contact Information</h3>
                <span className="login-link">Already have an account? <a href="#">Login</a></span>
              </div>
              <input className="contact-input" placeholder="Email Address/Mobile Number" />
            </div>
            <div className="shipping-form-container">
              <h3>Shipping Address</h3>
              <form onSubmit={handleSubmit} className="shipping-form">
                <div className="form-row-2col">
                  <div className="form-group">
                    <label>First Name</label>
                    <input type="text" required />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input type="text" required />
                  </div>
                </div>
                <div className="form-row-2col">
                  <div className="form-group">
                    <label>Building Name</label>
                    <input type="text" />
                  </div>
                  <div className="form-group">
                    <label>Society Name</label>
                    <input type="text" />
                  </div>
                </div>
                <div className="form-row-2col">
                  <div className="form-group">
                    <label>Street, Area</label>
                    <input type="text" required />
                  </div>
                  <div className="form-group">
                    <label>Landmark</label>
                    <input type="text" />
                  </div>
                </div>
                <div className="form-row-2col">
                  <div className="form-group">
                    <label>Town/City</label>
                    <input type="text" required />
                  </div>
                  <div className="form-group">
                    <label>Pincode</label>
                    <input type="text" required />
                  </div>
                </div>
                <button type="submit" className="save-address-btn">Save Address</button>
              </form>
            </div>
            <div className="delivery-methods-section">
              <h4>Delivery Methods</h4>
              <div className="delivery-methods">
                <label className="delivery-card selected">
                  <input type="radio" name="delivery" defaultChecked />
                  <div>
                    <div className="delivery-title">Standard Delivery</div>
                    <div className="delivery-desc">Delivery in 5-7 working days</div>
                  </div>
                  <div className="delivery-fee free">Free</div>
                </label>
                <label className="delivery-card">
                  <input type="radio" name="delivery" />
                  <div>
                    <div className="delivery-title">Fast Delivery</div>
                    <div className="delivery-desc">Delivery in 2-3 working days</div>
                  </div>
                  <div className="delivery-fee paid">$10</div>
                </label>
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
              <button className="checkout-btn">Proceed to Checkout</button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
} 