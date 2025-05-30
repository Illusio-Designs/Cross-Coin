import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../styles/pages/Profile.css";

const tabs = [
  { label: "My Orders" },
  { label: "Address" },
  { label: "Account Details" },
  { label: "Reset Password" },
  { label: "Logout" },
];

export default function Profile() {
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <>
      <Header />
      <div className="profile-layout">
        <aside className="profile-sidebar">
          <div className="profile-welcome">
            <span className="profile-avatar">👤</span>
            <div>
              <div className="profile-hello">Welcome back,</div>
              <div className="profile-name">John Deo</div>
            </div>
          </div>
          <nav className="profile-tabs">
            {tabs.map((tab, idx) => (
              <div
                key={tab.label}
                className={`profile-tab${selectedTab === idx ? " active" : ""}`}
                onClick={() => setSelectedTab(idx)}
              >
                {tab.label}
              </div>
            ))}
          </nav>
        </aside>
        <main className="profile-content">
          {selectedTab === 0 && (
            <div>
              <h2>My Orders</h2>
              <div className="orders-list">
                {/* Order Card 1 - Delivered */}
                <div className="order-card">
                  <div className="order-card-header">
                    <div>
                      <div className="order-meta">
                        <span>Order Placed<br /><b>10, June 2023</b></span>
                        <span>Total<br /><b>$320</b></span>
                        <span>Ship to<br /><b>Irish Watson</b></span>
                      </div>
                      <div className="order-status delivered">Delivered on 15, June, 2023</div>
                    </div>
                    <div className="order-actions">
                      <span className="order-id">Order #348461351</span>
                      <a href="#" className="order-link">View order details</a>
                      <a href="#" className="order-link">View Invoice</a>
                    </div>
                  </div>
                  <div className="order-card-body">
                    <img src="https://i.imgur.com/8Km9tLL.png" alt="Gradient Shocks" className="order-product-img" />
                    <div className="order-product-info">
                      <div className="order-product-title">Gradient Shocks</div>
                      <div className="order-product-desc">Return or replace items: Eligible through 20, June 2025</div>
                      <div className="order-card-buttons">
                        <button className="order-btn buy-again">Buy Again</button>
                        <button className="order-btn view-product">View your product</button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Order Card 3 - Cancelled */}
                <div className="order-card">
                  <div className="order-card-header">
                    <div>
                      <div className="order-meta">
                        <span>Order Placed<br /><b>10, June 2023</b></span>
                        <span>Total<br /><b>$320</b></span>
                        <span>Ship to<br /><b>Irish Watson</b></span>
                      </div>
                      <div className="order-status cancelled">Cancelled on 15, June, 2023</div>
                    </div>
                    <div className="order-actions">
                      <span className="order-id">Order #348461351</span>
                      <a href="#" className="order-link">View order details</a>
                      <a href="#" className="order-link">View Invoice</a>
                    </div>
                  </div>
                  <div className="order-card-body">
                    <img src="https://i.imgur.com/8Km9tLL.png" alt="Gradient Shocks" className="order-product-img" />
                    <div className="order-product-info">
                      <div className="order-product-title">Gradient Shocks</div>
                      <div className="order-product-desc">Return or replace items: Eligible through 20, June 2025</div>
                      <div className="order-card-buttons">
                        <button className="order-btn buy-again">Buy Again</button>
                        <button className="order-btn view-product">View your product</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {selectedTab === 1 && (
            <div>
              <h2>Address</h2>
              <div className="profile-placeholder">Address management goes here.</div>
            </div>
          )}
          {selectedTab === 2 && (
            <div>
              <h2>Account Details</h2>
              <div className="profile-placeholder">Account details form goes here.</div>
            </div>
          )}
          {selectedTab === 3 && (
            <div>
              <h2>Reset Password</h2>
              <div className="profile-placeholder">Password reset form goes here.</div>
            </div>
          )}
          {selectedTab === 4 && (
            <div>
              <h2>Logout</h2>
              <div className="profile-placeholder">Logout action goes here.</div>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
} 