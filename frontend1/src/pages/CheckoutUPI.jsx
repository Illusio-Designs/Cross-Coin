import React, { useState } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";

const paymentMethods = [
  {
    label: "UPI",
    value: "upi",
    icons: [
      "https://upload.wikimedia.org/wikipedia/commons/2/2a/UPI-Logo-vector.svg",
      "https://cdn.worldvectorlogo.com/logos/stripe-4.svg",
      "https://upload.wikimedia.org/wikipedia/commons/4/41/Google_Pay_Logo.svg",
    ],
  },
  {
    label: "Credit Cards/ Debit Cards",
    value: "card",
    icons: [
      "https://upload.wikimedia.org/wikipedia/commons/0/04/Mastercard-logo.png",
      "https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png",
      "https://upload.wikimedia.org/wikipedia/commons/2/2a/Maestro_logo.png",
    ],
  },
  {
    label: "Cash on Delivery",
    value: "cod",
    icons: [
      "https://cdn-icons-png.flaticon.com/512/1041/1041916.png",
    ],
  },
];

export default function CheckoutUPI() {
  const [selected, setSelected] = useState("upi");
  const [upiId, setUpiId] = useState("");

  return (
    <>
      <Header />
      <div className="cart-main upi-container">
        <div className="cart-section">
          <div className="payment-section">
            <h3>Payment Methods</h3>
            {paymentMethods.map((method) => (
              <div
                className={`payment-method ${selected === method.value ? "active" : ""}`}
                key={method.value}
                onClick={() => setSelected(method.value)}
              >
                
                <input
                  type="radio"
                  checked={selected === method.value}
                  onChange={() => setSelected(method.value)}
                  name="payment"
                />
                <div className="payment-method-content">
                <span className="label">{method.label}</span>
               
                <span className="icons">
                  {method.icons.map((icon, idx) => (
                    <img src={icon} alt="" key={idx} />
                  ))}
                </span>
                {method.value === "upi" && selected === "upi" && (
                  <div className="upi-input-row">
                    <input
                      type="text"
                      placeholder="UPI Id"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                    />
                    <button>Check</button>
                  </div>
                )} 
                </div>
              </div>
            ))}
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
      <Footer />
    </>
  );
}
