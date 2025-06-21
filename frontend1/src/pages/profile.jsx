import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Image from "next/image";
import card1 from "../assets/card1-right.webp";
import card2 from "../assets/card2-left.webp";
import card3 from "../assets/card3-right.webp";
import "../styles/pages/Profile.css";
import { useRouter } from "next/router";
import SeoWrapper from '../console/SeoWrapper';
import { resetPassword, getCurrentUser, updateUserProfile, createShippingAddress, getUserShippingAddresses, updateShippingAddress, deleteShippingAddress, setDefaultShippingAddress } from '../services/publicindex';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const tabs = [
  { label: "My Orders" },
  { label: "Shipping Addresses" },
  { label: "Account Details" },
  { label: "Reset Password" },
  { label: "Logout" },
];

export default function Profile() {
  const [selectedTab, setSelectedTab] = useState(0);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [addressForm, setAddressForm] = useState({
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phoneNumber: '',
    isDefault: false
  });
  const [editingId, setEditingId] = useState(null);
  const [addressError, setAddressError] = useState("");
  const [showAddressModal, setShowAddressModal] = useState(false);

  // Check authentication on component mount
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [router, isAuthenticated]);

  // Set user details from context
  useEffect(() => {
    if (user) {
      setProfileImageUrl(user.profileImageUrl || "");
    }
  }, [user]);

  useEffect(() => {
    const fetchAddresses = async () => {
      setLoadingAddresses(true);
      try {
        const data = await getUserShippingAddresses();
        setAddresses(data);
      } catch (err) {
        setAddressError(err.message || "Failed to load addresses");
      }
      setLoadingAddresses(false);
    };
    fetchAddresses();
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/users/logout`);
    sessionStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
      localStorage.removeItem('token');
    router.push('/login');
    } catch (err) {
      alert('Logout failed. Please try again.');
    }
  };

  // Handle tab click
  const handleTabClick = (idx) => {
    if (tabs[idx].label === "Logout") {
      handleLogout();
      return;
    }
    setSelectedTab(idx);
  };

  const handleAddressInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setAddressError("");
    try {
      if (editingId) {
        await updateShippingAddress(editingId, addressForm);
      } else {
        await createShippingAddress(addressForm);
      }
      setAddressForm({ address: '', city: '', state: '', postalCode: '', country: '', phoneNumber: '', isDefault: false });
      setEditingId(null);
      const data = await getUserShippingAddresses();
      setAddresses(data);
    } catch (err) {
      setAddressError(err.message || "Failed to save address");
    }
  };

  const handleEditAddress = (address) => {
    setEditingId(address.id);
    setAddressForm({
      address: address.address,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phoneNumber: address.phoneNumber,
      isDefault: address.isDefault
    });
  };

  const handleDeleteAddress = async (id) => {
    try {
      await deleteShippingAddress(id);
      const data = await getUserShippingAddresses();
      setAddresses(data);
    } catch (err) {
      setAddressError(err.message || "Failed to delete address");
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      await setDefaultShippingAddress(id);
      const data = await getUserShippingAddresses();
      setAddresses(data);
    } catch (err) {
      setAddressError(err.message || "Failed to set default address");
    }
  };

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

  return (
    <SeoWrapper pageName="profile">
      <Header />
      <div className="profile-layout">
        <aside className="profile-sidebar">
          <div className="profile-welcome">
            <span className="profile-avatar">👤</span>
            <div>
              <div className="profile-hello">Welcome back,</div>
              <div className="profile-name">{user?.username}</div>
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
            <div className="shipping-addresses-section">
              <h3>Shipping Addresses</h3>
              <button onClick={() => { setEditingId(null); setAddressForm({ address: '', city: '', state: '', postalCode: '', country: '', phoneNumber: '', isDefault: false }); setShowAddressModal(true); }}>
                Add Address
              </button>
              <div className="shipping-address-list">
                {loadingAddresses ? (
                  <div>Loading addresses...</div>
                ) : (
                  addresses.length === 0 ? (
                    <div>No addresses found.</div>
                  ) : (
                    addresses.map(address => (
                      <div key={address.id} className={`shipping-address-item${address.is_default ? ' default' : ''}`}>
                        <div><b>Address:</b> {address.address}</div>
                        <div><b>City:</b> {address.city}</div>
                        <div><b>State:</b> {address.state}</div>
                        <div><b>Postal Code:</b> {address.postal_code}</div>
                        <div><b>Country:</b> {address.country}</div>
                        <div><b>Phone Number:</b> {address.phone_number}</div>
                        <div className="address-actions">
                          {address.is_default ? <span style={{color: 'green', fontWeight: 'bold'}}>Default</span> : <button onClick={() => handleSetDefaultAddress(address.id)}>Set Default</button>}
                          <button onClick={() => { handleEditAddress({
                            ...address,
                            postalCode: address.postal_code,
                            phoneNumber: address.phone_number,
                            isDefault: address.is_default
                          }); setShowAddressModal(true); }}>Edit</button>
                          <button onClick={() => handleDeleteAddress(address.id)}>Delete</button>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
              {showAddressModal && (
                <div className="modal-overlay" onClick={() => setShowAddressModal(false)}>
                  <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <h4>{editingId ? 'Edit Address' : 'Add Address'}</h4>
                    <form onSubmit={async e => {
                      await handleAddressSubmit(e);
                      setShowAddressModal(false);
                    }} className="shipping-address-form">
                      <div className="form-group">
                        <label>Address</label>
                        <input type="text" name="address" value={addressForm.address} onChange={handleAddressInputChange} required />
                      </div>
                      <div className="form-group">
                        <label>City</label>
                        <input type="text" name="city" value={addressForm.city} onChange={handleAddressInputChange} required />
                      </div>
                      <div className="form-group">
                        <label>State</label>
                        <input type="text" name="state" value={addressForm.state} onChange={handleAddressInputChange} required />
                      </div>
                      <div className="form-group">
                        <label>Postal Code</label>
                        <input type="text" name="postalCode" value={addressForm.postalCode} onChange={handleAddressInputChange} required />
                  </div>
                      <div className="form-group">
                        <label>Country</label>
                        <input type="text" name="country" value={addressForm.country} onChange={handleAddressInputChange} required />
                </div>
                      <div className="form-group">
                        <label>Phone Number</label>
                        <input type="text" name="phoneNumber" value={addressForm.phoneNumber} onChange={handleAddressInputChange} required />
                  </div>
                      <div className="form-group">
                        <label>
                          <input type="checkbox" name="isDefault" checked={addressForm.isDefault} onChange={handleAddressInputChange} />
                          Set as default
                        </label>
                </div>
                      <button type="submit">{editingId ? "Update Address" : "Add Address"}</button>
                      {addressError && <div className="profile-error-message">{addressError}</div>}
                    </form>
                    <button onClick={() => setShowAddressModal(false)} style={{marginTop: 10}}>Close</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {selectedTab === 2 && (
            <div className="account-details-form">
              <form onSubmit={async e => {
                e.preventDefault();
                setProfileMessage("");
                setProfileError("");
                try {
                  const formData = new FormData();
                  formData.append("username", user?.username || "");
                  formData.append("email", user?.email || "");
                  if (profileImage) {
                    formData.append("profileImage", profileImage);
                  }
                  await updateUserProfile(formData);
                  setProfileMessage("Profile updated successfully.");
                  // Optionally refresh image
                  if (profileImage) {
                    setProfileImageUrl(URL.createObjectURL(profileImage));
                  }
                } catch (err) {
                  setProfileError(err.message || "Failed to update profile.");
                }
              }}>
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    type="text"
                    value={user?.username || ""}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="profileImage">Profile Image</label>
                  <input
                    id="profileImage"
                    type="file"
                    accept="image/*"
                    onChange={e => setProfileImage(e.target.files[0])}
                  />
                  {profileImageUrl && (
                    <div style={{ marginTop: 8 }}>
                      <img src={profileImageUrl} alt="Profile" style={{ width: 80, height: 80, borderRadius: '50%' }} />
                    </div>
                  )}
                </div>
                {profileMessage && <div className="profile-success-message">{profileMessage}</div>}
                {profileError && <div className="profile-error-message">{profileError}</div>}
                <button className="update-profile-btn" type="submit">Update Profile</button>
              </form>
            </div>
          )}
          {selectedTab === 3 && (
            <div className="reset-password-form">
              <form onSubmit={async e => {
                e.preventDefault();
                setResetMessage("");
                setResetError("");
                if (!currentPassword || !newPassword || !confirmPassword) {
                  setResetError("All fields are required.");
                  return;
                }
                if (newPassword !== confirmPassword) {
                  setResetError("New passwords do not match.");
                  return;
                }
                try {
                  const token = localStorage.getItem('token');
                  const response = await resetPassword({
                    resetToken: token,
                    password: newPassword,
                    confirmPassword: confirmPassword
                  });
                  setResetMessage(response.message || "Password updated successfully.");
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                } catch (err) {
                  setResetError(err.message || "Failed to update password.");
                }
              }}>
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
                {resetMessage && <div className="profile-success-message">{resetMessage}</div>}
                {resetError && <div className="profile-error-message">{resetError}</div>}
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
    </SeoWrapper>
  );
} 