import React, { useState } from "react";

const allPaymentMethods = [
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
  
const paymentMethods = allPaymentMethods.filter(method => method.value !== 'cod');

export default function PaymentStep({ paymentDetails, setPaymentDetails }) {

  const handleUpiChange = (e) => {
    setPaymentDetails(prev => ({...prev, upiId: e.target.value}));
  }

  const handleMethodChange = (method) => {
    setPaymentDetails(prev => ({...prev, method: method}));
  }

  return (
    <div className="payment-section">
      <h3>Payment Methods</h3>
      {paymentMethods.map((method) => (
        <div
          className={`payment-method ${paymentDetails.method === method.value ? "active" : ""}`}
          key={method.value}
          onClick={() => handleMethodChange(method.value)}
        >
          <input
            type="radio"
            checked={paymentDetails.method === method.value}
            onChange={() => handleMethodChange(method.value)}
            name="payment"
          />
          <div className="payment-method-content">
            <span className="label">{method.label}</span>
            <span className="icons">
              {method.icons.map((icon, idx) => (
                <img src={icon} alt="" key={idx} />
              ))}
            </span>
            {method.value === "upi" && paymentDetails.method === "upi" && (
              <div className="upi-input-row">
                <input
                  type="text"
                  placeholder="UPI Id"
                  value={paymentDetails.upiId}
                  onChange={handleUpiChange}
                  onClick={(e) => e.stopPropagation()}
                />
                <button onClick={(e) => e.stopPropagation()}>Check</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 