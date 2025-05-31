import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Image from "next/image";
import card1 from "../assets/card1-right.webp";
import card2 from "../assets/card2-left.webp";
import card3 from "../assets/card3-right.webp";
import "../styles/pages/Profile.css";
import { useRouter } from "next/router";

const tabs = [
  { label: "My Orders" },
  { label: "Address" },
  { label: "Account Details" },
  { label: "Reset Password" },
  { label: "Logout" },
];

export default function Profile() {
  const [selectedTab, setSelectedTab] = useState(0);
  const router = useRouter();
  const [firstName, setFirstName] = useState("John");
  const [lastName, setLastName] = useState("Deo");
  const [email, setEmail] = useState("Johndeo@gmail.com");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // SVGs for eye and eye-off (stroke only, correct color)
  const EyeIcon = (
    <svg width="20" height="20" fill="none" stroke="#180D3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
  const EyeOffIcon = (
    <svg width="20" height="20" fill="none" stroke="#180D3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.06 10.06 0 0 1 12 20c-5.52 0-10-8-10-8a17.7 17.7 0 0 1 3.07-4.11"/>
      <path d="M1 1l22 22"/>
      <path d="M9.53 9.53A3 3 0 0 0 12 15a3 3 0 0 0 2.47-5.47"/>
      <path d="M12 4a10.06 10.06 0 0 1 5.94 1.94"/>
      <path d="M22 12s-4.48 8-10 8a10.06 10.06 0 0 1-5.94-1.94"/>
    </svg>
  );

  // Handle Logout tab click
  const handleTabClick = (idx) => {
    if (tabs[idx].label === "Logout") {
      router.push("/");
      return;
    }
    setSelectedTab(idx);
  };

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
                onClick={() => handleTabClick(idx)}
              >
                {tab.label}
              </div>
            ))}
          </nav>
        </aside>
        <main className="profile-content">
          {selectedTab === 0 && (
            <div>
              <div className="orders-list">
                {/* Order Card 1 - Delivered */}
                <div className="order-card">
                  <div className="order-card-header">
                    <div>
                      <div className="order-meta">
                        <span>Order Placed<br /><b style={{color: "#000000"}}>10, June 2023</b></span>
                        <span>Total<br /><b style={{color: "#000000"}}>$320</b></span>
                        <span>Ship to<br /><b style={{color: "#000000"}}>Irish Watson</b></span>
                      </div>
                      
                    </div>
                    <div className="order-actions"> 
                      <span className="order-id">Order #348461351</span>
                      <div className="order-actions-buttons">
                        <a href="#" className="order-link">View order details</a>
                        <span className="part">|</span>
                        <a href="#" className="order-link">View Invoice</a>
                      </div>
                    </div>
                  </div>
                  <div className="order-status">Delivered on 15, June, 2023</div>
                  <div className="order-card-body">

                    <Image src={card1} alt="Gradient Shocks" className="order-product-img" />
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
                {/* Order Card 2 - Processing */}
                <div className="order-card">
                  <div className="order-card-header">
                    <div>
                      <div className="order-meta">
                        <span>Order Placed<br /><b style={{color: "#000000"}}>10, June 2023</b></span>
                        <span>Total<br /><b style={{color: "#000000"}}>$320</b></span>
                        <span>Ship to<br /><b style={{color: "#000000"}}>Irish Watson</b></span>
                      </div>
                     
                    </div>
                    <div className="order-actions">
                      <span className="order-id">Order #348461351</span>
                      <div className="order-actions-buttons">
                        <a href="#" className="order-link">View order details</a>
                        <a href="#" className="order-link">View Invoice</a>
                      </div>
                    </div>
                  </div>
                  <div className="order-status">Out for delivery on Today</div>
                  <div className="order-card-body">
                    <Image src={card2} alt="Gradient Shocks" className="order-product-img" />
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
                        <span>Order Placed<br /><b style={{color: "#000000"}}>10, June 2023</b></span>
                        <span>Total<br /><b style={{color: "#000000"}}>$320</b></span>
                        <span>Ship to<br /><b style={{color: "#000000"}}>Irish Watson</b></span>
                      </div> 
                    </div>
                    <div className="order-actions">
                      <span className="order-id">Order #348461351</span>
                      <div className="order-actions-buttons">
                        <a href="#" className="order-link">View order details</a>
                        <a href="#" className="order-link">View Invoice</a>
                      </div>
                    </div>
                  </div>
                  <div className="order-status">Cancelled on 15, June, 2023</div>
                  <div className="order-card-body">
                    <Image src={card3} alt="Gradient Shocks" className="order-product-img" />
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
              <div className="address-list">
                {/* Address Card 1 */}
                <div className="address-card">
                  <div className="address-info">
                    <div className="address-name">Irish Watson</div>
                    <div className="address-details">P.O. Box 283 8562 Fusce Rd.<br />Frederick Nebraska 20620<br />(372) 587-2335</div>
                  </div>
                  <div className="address-menu">&#8942;</div>
                </div>
                {/* Address Card 2 */}
                <div className="address-card">
                  <div className="address-info">
                    <div className="address-name">Forrest Ray</div>
                    <div className="address-details">7292 Dictum Av.<br />San Antonio MI 47096<br />(492) 709-6392</div>
                  </div>
                  <div className="address-menu">&#8942;</div>
                </div>
                {/* Address Card 3 */}
                <div className="address-card">
                  <div className="address-info">
                    <div className="address-name">Clara Thornton</div>
                    <div className="address-details">3141 Ultricies Rd.<br />Phoenix Arizona 85001<br />(123) 456-7890</div>
                  </div>
                  <div className="address-menu">&#8942;</div>
                </div>
              </div>
            </div>
          )}
          {selectedTab === 2 && (
            <div className="account-details-form">
              <form onSubmit={e => e.preventDefault()}>
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <button className="update-profile-btn" type="submit">Update Profile</button>
              </form>
            </div>
          )}
          {selectedTab === 3 && (
            <div className="reset-password-form">
              <form onSubmit={e => e.preventDefault()}>
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="currentPassword"
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-eye"
                      onClick={() => setShowCurrent(v => !v)}
                      tabIndex={0}
                      aria-label={showCurrent ? "Hide password" : "Show password"}
                    >
                      {showCurrent ? EyeOffIcon : EyeIcon}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="newPassword"
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-eye"
                      onClick={() => setShowNew(v => !v)}
                      tabIndex={0}
                      aria-label={showNew ? "Hide password" : "Show password"}
                    >
                      {showNew ? EyeOffIcon : EyeIcon}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-eye"
                      onClick={() => setShowConfirm(v => !v)}
                      tabIndex={0}
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? EyeOffIcon : EyeIcon}
                    </button>
                  </div>
                </div>
                <button className="update-profile-btn" type="submit">Update Password</button>
              </form>
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