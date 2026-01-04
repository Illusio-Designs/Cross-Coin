import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Image from "next/image";
import "../styles/pages/Profile.css";
import { useRouter } from "next/router";
import SeoWrapper from "../console/SeoWrapper";
import {
  resetPassword,
  getCurrentUser,
  updateUserProfile,
  createShippingAddress,
  getUserShippingAddresses,
  updateShippingAddress,
  deleteShippingAddress,
  setDefaultShippingAddress,
  getUserOrders,
} from "../services/publicindex";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import {
  showProfileUpdateSuccessToast,
  showProfileUpdateErrorToast,
  showAddressAddedSuccessToast,
  showAddressUpdatedSuccessToast,
  showAddressDeletedSuccessToast,
  showValidationErrorToast,
  showLogoutSuccessToast,
} from "../utils/toast";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";

const tabs = [
  { label: "My Orders" },
  { label: "Shipping Addresses" },
  { label: "Account Details" },
  { label: "Reset Password" },
  { label: "Logout" },
];

function forceEnvImageBase(url) {
  if (!url || typeof url !== "string") return "/assets/card1-left.webp";
  if (url.startsWith("http")) {
    if (url.includes("localhost:5000")) {
      const baseUrl =
        process.env.NEXT_PUBLIC_IMAGE_URL || "https://crosscoin.in";
      const path = url.replace(/^https?:\/\/[^/]+/, "");
      return `${baseUrl}${path}`;
    }
    return url;
  }
  const baseUrl = process.env.NEXT_PUBLIC_IMAGE_URL || "https://crosscoin.in";
  return `${baseUrl}${url}`;
}

export default function Profile() {
  const [selectedTab, setSelectedTab] = useState(0);
  const router = useRouter();
  const { user, isAuthenticated, logout: authLogout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [addressError, setAddressError] = useState("");
  const [addressForm, setAddressForm] = useState({
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    phoneNumber: "",
    isDefault: false,
  });
  const [editingId, setEditingId] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState("");

  // Check authentication on component mount
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
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

  useEffect(() => {
    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const data = await getUserOrders();
        setOrders(data.orders);
        setOrdersError("");
      } catch (err) {
        setOrdersError(err.message || "Failed to load orders");
      }
      setLoadingOrders(false);
    };

    if (selectedTab === 0) {
      fetchOrders();
    }
  }, [selectedTab]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await authLogout();
      sessionStorage.removeItem("isLoggedIn");
      localStorage.removeItem("user");
      router.push("/");
    } catch (err) {
      showProfileUpdateErrorToast("Logout failed. Please try again.");
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
    setAddressForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateShippingAddress(editingId, addressForm);
        showAddressUpdatedSuccessToast();
      } else {
        await createShippingAddress(addressForm);
        showAddressAddedSuccessToast();
      }
      setAddressForm({
        address: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
        phoneNumber: "",
        isDefault: false,
      });
      setEditingId(null);
      const data = await getUserShippingAddresses();
      setAddresses(data);
    } catch (err) {
      showProfileUpdateErrorToast(err.message || "Failed to save address");
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
      isDefault: address.isDefault,
    });
  };

  const handleDeleteAddress = async (id) => {
    try {
      await deleteShippingAddress(id);
      const data = await getUserShippingAddresses();
      setAddresses(data);
      showAddressDeletedSuccessToast();
    } catch (err) {
      showProfileUpdateErrorToast(err.message || "Failed to delete address");
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      await setDefaultShippingAddress(id);
      const data = await getUserShippingAddresses();
      setAddresses(data);
      showAddressUpdatedSuccessToast();
    } catch (err) {
      showProfileUpdateErrorToast(
        err.message || "Failed to set default address"
      );
    }
  };

  // SVGs for eye and eye-off (stroke only, correct color)
  const EyeIcon = (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="#180D3E"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
  const EyeOffIcon = (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="#180D3E"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <path d="M17.94 17.94A10.06 10.06 0 0 1 12 20c-5.52 0-10-8-10-8a17.7 17.7 0 0 1 3.07-4.11" />
      <path d="M1 1l22 22" />
      <path d="M9.53 9.53A3 3 0 0 0 12 15a3 3 0 0 0 2.47-5.47" />
      <path d="M12 4a10.06 10.06 0 0 1 5.94 1.94" />
      <path d="M22 12s-4.48 8-10 8a10.06 10.06 0 0 1-5.94-1.94" />
    </svg>
  );

  // Helper function to format currency
  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Helper function to calculate order total
  const calculateOrderTotal = (order) => {
    const subtotal =
      order.OrderItems?.reduce(
        (sum, item) => sum + parseFloat(item.subtotal || 0),
        0
      ) || 0;
    const shippingFee = parseFloat(order.shipping_fee || 0);
    const discountAmount = parseFloat(order.discount_amount || 0);
    return Math.max(0, subtotal - discountAmount + shippingFee);
  };

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
                {loadingOrders ? (
                  <div>Loading orders...</div>
                ) : ordersError ? (
                  <div className="profile-error-message">{ordersError}</div>
                ) : orders.length === 0 ? (
                  <div>No orders found.</div>
                ) : (
                  orders.map((order) => (
                    <div className="order-card" key={order.id}>
                      <div className="order-card-header">
                        <div>
                          <div className="order-meta">
                            <span>
                              Order Placed
                              <br />
                              <b style={{ color: "#000000" }}>
                                {new Date(order.createdAt).toLocaleDateString()}
                              </b>
                            </span>
                            <span>
                              Total
                              <br />
                              <b style={{ color: "#000000" }}>
                                {formatCurrency(calculateOrderTotal(order))}
                              </b>
                            </span>
                            <span>
                              Ship to
                              <br />
                              <b style={{ color: "#000000" }}>
                                {user?.username}
                              </b>
                            </span>
                          </div>
                        </div>
                        <div className="order-actions">
                          <span className="order-id">
                            Order #{order.order_number}
                          </span>
                          <div className="order-actions-buttons">
                            <a href="#" className="order-link">
                              View order details
                            </a>
                            <span className="part">|</span>
                            <a href="#" className="order-link">
                              View Invoice
                            </a>
                          </div>
                        </div>
                      </div>
                      <div className="order-status">{order.status}</div>
                      {/* Shiprocket Information */}
                      {(order.shiprocket_order_id ||
                        order.shiprocket_shipment_id) && (
                        <div className="shiprocket-info">
                          <div className="shiprocket-details">
                            {order.shiprocket_order_id && (
                              <span className="shiprocket-id">
                                Shiprocket Order: {order.shiprocket_order_id}
                              </span>
                            )}
                            {order.shiprocket_shipment_id && (
                              <span className="shiprocket-shipment">
                                Shipment ID: {order.shiprocket_shipment_id}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {order.OrderItems &&
                        order.OrderItems.map((item) => (
                          <div className="order-card-body" key={item.id}>
                            <Image
                              src={forceEnvImageBase(
                                `${item.Product?.ProductImages?.[0]?.image_url}`
                              )}
                              alt={item.Product?.name}
                              className="order-product-img"
                              width={100}
                              height={100}
                              unoptimized
                            />
                            <div className="order-product-info">
                              <div className="order-product-title">
                                {item.Product?.name}
                              </div>
                              <div className="order-product-desc">
                                Quantity: {item.quantity}
                              </div>
                              <div className="order-card-buttons">
                                <button className="order-btn buy-again">
                                  Buy Again
                                </button>
                                <button className="order-btn view-product">
                                  View your product
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {selectedTab === 1 && (
            <div className="shipping-addresses-section">
              <h3>Shipping Addresses</h3>
              <button
                onClick={() => {
                  setEditingId(null);
                  setAddressForm({
                    address: "",
                    city: "",
                    state: "",
                    postalCode: "",
                    country: "",
                    phoneNumber: "",
                    isDefault: false,
                  });
                  setShowAddressModal(true);
                }}
              >
                <FaPlus /> Add Address
              </button>
              <div className="shipping-address-list">
                {loadingAddresses ? (
                  <div>Loading addresses...</div>
                ) : addresses.length === 0 ? (
                  <div>No addresses found.</div>
                ) : (
                  addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`shipping-address-item${
                        address.is_default ? " default" : ""
                      }`}
                    >
                      <div>
                        <b>Address:</b> {address.address}
                      </div>
                      <div>
                        <b>City:</b> {address.city}
                      </div>
                      <div>
                        <b>State:</b> {address.state}
                      </div>
                      <div>
                        <b>Postal Code:</b> {address.postal_code}
                      </div>
                      <div>
                        <b>Country:</b> {address.country}
                      </div>
                      <div>
                        <b>Phone Number:</b> {address.phone_number}
                      </div>
                      <div className="address-actions">
                        <div className="left-actions">
                          {address.is_default ? (
                            <span className="default-badge">
                              Default
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetDefaultAddress(address.id)}
                            >
                              Set Default
                            </button>
                          )}
                        </div>
                        <div className="right-actions">
                          <button
                            onClick={() => {
                              handleEditAddress({
                                ...address,
                                postalCode: address.postal_code,
                                phoneNumber: address.phone_number,
                                isDefault: address.is_default,
                              });
                              setShowAddressModal(true);
                            }}
                            title="Edit Address"
                          >
                            <FaEdit />
                          </button>
                          <button 
                            onClick={() => handleDeleteAddress(address.id)}
                            title="Delete Address"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {showAddressModal && (
                <div
                  className="modal-overlay"
                  onClick={() => setShowAddressModal(false)}
                >
                  <div
                    className="modal-content"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h4>{editingId ? "Edit Address" : "Add New Address"}</h4>
                    <form
                      onSubmit={async (e) => {
                        await handleAddressSubmit(e);
                        setShowAddressModal(false);
                      }}
                      className="shipping-address-form"
                    >
                      <div className="form-group">
                        <label>Phone Number *</label>
                        <input
                          type="text"
                          name="phoneNumber"
                          value={addressForm.phoneNumber}
                          onChange={handleAddressInputChange}
                          placeholder="Enter your phone number"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Address *</label>
                        <input
                          type="text"
                          name="address"
                          value={addressForm.address}
                          onChange={handleAddressInputChange}
                          placeholder="Street address, apartment, suite, etc."
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>City *</label>
                        <input
                          type="text"
                          name="city"
                          value={addressForm.city}
                          onChange={handleAddressInputChange}
                          placeholder="Enter city"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>State *</label>
                        <input
                          type="text"
                          name="state"
                          value={addressForm.state}
                          onChange={handleAddressInputChange}
                          placeholder="Enter state"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Postal Code *</label>
                        <input
                          type="text"
                          name="postalCode"
                          value={addressForm.postalCode}
                          onChange={handleAddressInputChange}
                          placeholder="Enter postal code"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Country *</label>
                        <input
                          type="text"
                          name="country"
                          value={addressForm.country}
                          onChange={handleAddressInputChange}
                          placeholder="Enter country"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          <input
                            type="checkbox"
                            name="isDefault"
                            checked={addressForm.isDefault}
                            onChange={handleAddressInputChange}
                          />
                          Set as default address
                        </label>
                      </div>
                      <div className="button-row">
                        <button type="submit">
                          {editingId ? "Update Address" : "Save Address"}
                        </button>
                        <button
                          type="button"
                          className="cancel-btn"
                          onClick={() => setShowAddressModal(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
          {selectedTab === 2 && (
            <div className="account-details-form">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const formData = new FormData();
                    formData.append("username", user?.username || "");
                    formData.append("email", user?.email || "");
                    if (profileImage) {
                      formData.append("profileImage", profileImage);
                    }
                    await updateUserProfile(formData);
                    showProfileUpdateSuccessToast();
                    // Optionally refresh image
                    if (profileImage) {
                      setProfileImageUrl(URL.createObjectURL(profileImage));
                    }
                  } catch (err) {
                    showProfileUpdateErrorToast(
                      err.message || "Failed to update profile."
                    );
                  }
                }}
              >
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
                    onChange={(e) => setProfileImage(e.target.files[0])}
                  />
                  {profileImageUrl && (
                    <div style={{ marginTop: 8 }}>
                      <img
                        src={profileImageUrl}
                        alt="Profile"
                        style={{ width: 80, height: 80, borderRadius: "50%" }}
                      />
                    </div>
                  )}
                </div>
                <button className="update-profile-btn" type="submit">
                  Update Profile
                </button>
              </form>
            </div>
          )}
          {selectedTab === 3 && (
            <div className="reset-password-form">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!currentPassword || !newPassword || !confirmPassword) {
                    showValidationErrorToast("All fields are required.");
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    showValidationErrorToast("New passwords do not match.");
                    return;
                  }
                  try {
                    const token = localStorage.getItem("token");
                    const response = await resetPassword({
                      resetToken: token,
                      password: newPassword,
                      confirmPassword: confirmPassword,
                    });
                    showProfileUpdateSuccessToast(
                      response.message || "Password updated successfully."
                    );
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  } catch (err) {
                    showProfileUpdateErrorToast(
                      err.message || "Failed to update password."
                    );
                  }
                }}
              >
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="currentPassword"
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-eye"
                      onClick={() => setShowCurrent((v) => !v)}
                      tabIndex={0}
                      aria-label={
                        showCurrent ? "Hide password" : "Show password"
                      }
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
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-eye"
                      onClick={() => setShowNew((v) => !v)}
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
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-eye"
                      onClick={() => setShowConfirm((v) => !v)}
                      tabIndex={0}
                      aria-label={
                        showConfirm ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirm ? EyeOffIcon : EyeIcon}
                    </button>
                  </div>
                </div>
                <button className="update-profile-btn" type="submit">
                  Update Password
                </button>
              </form>
            </div>
          )}
          {selectedTab === 4 && (
            <div>
              <h2>Logout</h2>
              <div className="profile-placeholder">
                Logout action goes here.
              </div>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </SeoWrapper>
  );
}
