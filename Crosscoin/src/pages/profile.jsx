import React, { useState, useEffect } from "react";
import SafeImage from "../components/common/SafeImage";
import { useRouter } from "next/router";
import SeoWrapper from "../console/SeoWrapper";
import {
  resetPassword,
  getCurrentUser,
  updateUserProfile,
  updateUserPassword,
  createShippingAddress,
  getUserShippingAddresses,
  updateShippingAddress,
  deleteShippingAddress,
  setDefaultShippingAddress,
  getUserOrders,
  cancelOrder,
  initiateReturn,
} from "../services/publicApi";
import { useAuth } from "../context/AuthContext";
import {
  showProfileUpdateSuccessToast,
  showProfileUpdateErrorToast,
  showAddressAddedSuccessToast,
  showAddressUpdatedSuccessToast,
  showAddressDeletedSuccessToast,
  showValidationErrorToast,
} from "../utils/toast";

const TABS = ["My Orders", "Addresses", "Account Details", "Reset Password"];

const EyeIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.06 10.06 0 0112 20c-5.52 0-10-8-10-8a17.7 17.7 0 013.07-4.11"/><path d="M1 1l22 22"/><path d="M9.53 9.53A3 3 0 0012 15a3 3 0 002.47-5.47"/><path d="M12 4a10.06 10.06 0 015.94 1.94"/>
  </svg>
);

function getInitials(name) {
  if (!name) return "U";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(d) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return ""; }
}

function getStatusColor(status) {
  const s = (status || "").toLowerCase();
  if (s === "delivered") return { bg: "#e8f5e9", color: "#2e7d32" };
  if (s === "shipped" || s === "processing" || s === "booked") return { bg: "#e8f4ff", color: "#1a5cb5" };
  if (s === "out_for_delivery" || s === "out for delivery") return { bg: "#fff3e0", color: "#e65100" };
  if (s === "cancelled" || s === "order_cancelled") return { bg: "#fce4ec", color: "#c62828" };
  return { bg: "#f3f4f6", color: "#555" };
}

function getStatusLabel(status) {
  if (!status) return "Pending";
  return status.split(/[_\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function Profile() {
  const [activeTab, setActiveTab] = useState(0);
  const router = useRouter();
  const { user, isAuthenticated, logout: authLogout } = useAuth();

  // Orders
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [orderActionLoading, setOrderActionLoading] = useState(null); // orderId being actioned

  // Addresses
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [addressForm, setAddressForm] = useState({ address: "", city: "", state: "", postalCode: "", country: "", phoneNumber: "", isDefault: false });

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Profile image
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [accountUsername, setAccountUsername] = useState("");
  const [accountEmail, setAccountEmail] = useState("");

  useEffect(() => { if (!isAuthenticated) router.push("/login"); }, [isAuthenticated, router]);
  useEffect(() => {
    if (user) {
      setProfileImageUrl(user.profileImageUrl || "");
      setAccountUsername(user.username || "");
      setAccountEmail(user.email || "");
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 0) {
      setLoadingOrders(true);
      getUserOrders().then(d => { setOrders(d.orders || []); setOrdersError(""); }).catch(e => setOrdersError(e.message || "Failed to load orders")).finally(() => setLoadingOrders(false));
    }
    if (activeTab === 1) {
      setLoadingAddresses(true);
      getUserShippingAddresses().then(d => setAddresses(d || [])).catch(() => {}).finally(() => setLoadingAddresses(false));
    }
  }, [activeTab]);

  const handleLogout = async () => {
    try { await authLogout(); sessionStorage.removeItem("isLoggedIn"); localStorage.removeItem("user"); router.push("/"); }
    catch { showProfileUpdateErrorToast("Logout failed."); }
  };

  const openAddAddress = () => {
    setEditingId(null);
    setAddressForm({ address: "", city: "", state: "", postalCode: "", country: "", phoneNumber: "", isDefault: false });
    setShowAddressModal(true);
  };

  const openEditAddress = (addr) => {
    setEditingId(addr.id);
    setAddressForm({ address: addr.address, city: addr.city, state: addr.state, postalCode: addr.postal_code, country: addr.country, phoneNumber: addr.phone_number, isDefault: addr.is_default });
    setShowAddressModal(true);
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateShippingAddress(editingId, addressForm);
        setAddresses(prev => prev.map(a => a.id === editingId ? { ...a, ...addressForm, postal_code: addressForm.postalCode, phone_number: addressForm.phoneNumber, is_default: addressForm.isDefault } : a));
        showAddressUpdatedSuccessToast();
      } else {
        const res = await createShippingAddress(addressForm);
        if (res?.shippingAddress) setAddresses(prev => [...prev, res.shippingAddress]);
        else { const d = await getUserShippingAddresses(); setAddresses(d); }
        showAddressAddedSuccessToast();
      }
      setShowAddressModal(false);
    } catch (err) { showProfileUpdateErrorToast(err.message || "Failed to save address"); }
  };

  const handleDeleteAddress = async (id) => {
    try {
      await deleteShippingAddress(id);
      // Re-fetch to get accurate default state after backend auto-promotes
      const updated = await getUserShippingAddresses();
      setAddresses(updated || []);
      showAddressDeletedSuccessToast();
    } catch (err) { showProfileUpdateErrorToast(err.message || "Failed to delete"); }
  };

  const handleSetDefault = async (id) => {
    try { await setDefaultShippingAddress(id); setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id }))); showAddressUpdatedSuccessToast(); }
    catch (err) { showProfileUpdateErrorToast(err.message || "Failed"); }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("username", accountUsername);
      formData.append("email", accountEmail);
      if (profileImage) formData.append("profilePic", profileImage);
      const res = await updateUserProfile(formData);
      showProfileUpdateSuccessToast(res.message || "Profile updated.");
      if (profileImage) setProfileImageUrl(URL.createObjectURL(profileImage));
    } catch (err) { showProfileUpdateErrorToast(err.message || "Failed to update profile."); }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) { showValidationErrorToast("All fields are required."); return; }
    if (newPassword !== confirmPassword) { showValidationErrorToast("Passwords do not match."); return; }
    try {
      const res = await updateUserPassword({ currentPassword, newPassword, confirmPassword });
      showProfileUpdateSuccessToast(res.message || "Password updated.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) { showProfileUpdateErrorToast(err.message || "Failed to update password."); }
  };

  return (
    <SeoWrapper pageName="profile">
      <div className="pf-page">
        {/* Hero */}
        <div className="pf-hero">
          <div className="pf-hero-inner">
            <div className="pf-avatar">{getInitials(user?.username)}</div>
            <div className="pf-hero-info">
              <div className="pf-greeting">Welcome back,</div>
              <div className="pf-name">{user?.username || "User"}</div>
              <div className="pf-email">{user?.email}</div>
            </div>
            <button className="pf-logout-btn" onClick={handleLogout}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="pf-stats">
          <div className="pf-stat"><div className="pf-stat-val">{orders.length}</div><div className="pf-stat-label">Orders</div></div>
          <div className="pf-stat"><div className="pf-stat-val">{addresses.length}</div><div className="pf-stat-label">Addresses</div></div>
          <div className="pf-stat"><div className="pf-stat-val">{orders.filter(o => o.status === "delivered").length}</div><div className="pf-stat-label">Delivered</div></div>
          <div className="pf-stat"><div className="pf-stat-val">{orders.filter(o => ["pending","processing","shipped","booked"].includes(o.status)).length}</div><div className="pf-stat-label">Active</div></div>
          {(user?.loyalty_points > 0) && (
            <div className="pf-stat" title="Earn points on every delivery. Redeem on future orders.">
              <div className="pf-stat-val" style={{ color: '#f59e0b' }}>⭐ {user.loyalty_points}</div>
              <div className="pf-stat-label">Points</div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="pf-body">
          {/* Sidebar */}
          <aside className="pf-sidebar">
            <nav className="pf-nav">
              {TABS.map((tab, i) => (
                <button key={tab} className={`pf-nav-btn${activeTab === i ? " active" : ""}`} onClick={() => setActiveTab(i)}>
                  {i === 0 && <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>}
                  {i === 1 && <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>}
                  {i === 2 && <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                  {i === 3 && <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
                  {tab}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="pf-main">

            {/* ORDERS */}
            {activeTab === 0 && (
              <div className="pf-section">
                <div className="pf-section-title">My Orders</div>
                {loadingOrders ? <div className="pf-loading">Loading orders...</div>
                  : ordersError ? <div className="pf-error">{ordersError}</div>
                  : orders.length === 0 ? <div className="pf-empty">No orders yet.</div>
                  : orders.map(order => {
                    const sc = getStatusColor(order.status);
                    return (
                      <div className="pf-order-card" key={order.id}>
                        <div className="pf-order-head">
                          <div className="pf-order-meta">
                            <span className="pf-order-num">#{order.order_number}</span>
                            <span className="pf-order-date">{formatDate(order.createdAt)}</span>
                          </div>
                          <span className="pf-order-status" style={{ background: sc.bg, color: sc.color }}>{getStatusLabel(order.status)}</span>
                        </div>
                        {order.OrderItems?.map(item => (
                          <div className="pf-order-item" key={item.id}>
                            <div className="pf-order-img">
                              <SafeImage imageData={{ image_url: item.Product?.ProductImages?.[0]?.image_url }} alt={item.Product?.name} width="72" height="72" style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                            </div>
                            <div className="pf-order-item-info">
                              <div className="pf-order-item-name">{item.Product?.name}</div>
                              <div className="pf-order-item-meta">Qty: {item.quantity} &nbsp;·&nbsp; ₹{parseFloat(item.subtotal || 0).toFixed(2)}</div>
                            </div>
                            <div className="pf-order-item-total">₹{parseFloat(item.subtotal || 0).toFixed(2)}</div>
                          </div>
                        ))}
                        <div className="pf-order-foot">
                          <span className="pf-order-total">Total: ₹{parseFloat(order.final_amount || 0).toFixed(2)}</span>
                          <div className="pf-order-actions">
                            <button className="pf-btn-ghost" onClick={() => router.push(`/order-tracking?order=${order.order_number}`)}>Track Order</button>
                            {['pending', 'confirmed', 'processing'].includes(order.status) && (
                              <button
                                className="pf-btn-ghost"
                                style={{ color: '#c62828', borderColor: '#c62828' }}
                                disabled={orderActionLoading === order.id}
                                onClick={async () => {
                                  if (!window.confirm('Cancel this order?')) return;
                                  setOrderActionLoading(order.id);
                                  try {
                                    await cancelOrder(order.id, 'Cancelled by customer');
                                    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o));
                                  } catch (e) {
                                    showValidationErrorToast(e?.message || 'Could not cancel order. Please try again.');
                                  } finally { setOrderActionLoading(null); }
                                }}
                              >
                                {orderActionLoading === order.id ? 'Cancelling...' : 'Cancel'}
                              </button>
                            )}
                            {order.status === 'delivered' && (
                              <button
                                className="pf-btn-ghost"
                                disabled={orderActionLoading === order.id}
                                onClick={async () => {
                                  const reason = window.prompt('Reason for return (optional):') ?? '';
                                  setOrderActionLoading(order.id);
                                  try {
                                    await initiateReturn(order.id, reason);
                                    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'return_initiated' } : o));
                                  } catch (e) {
                                    showValidationErrorToast(e?.message || 'Could not initiate return. Please try again.');
                                  } finally { setOrderActionLoading(null); }
                                }}
                              >
                                {orderActionLoading === order.id ? 'Processing...' : 'Return'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            )}

            {/* ADDRESSES */}
            {activeTab === 1 && (
              <div className="pf-section">
                <div className="pf-section-header">
                  <div className="pf-section-title">Saved Addresses</div>
                  <button className="pf-btn-primary" onClick={openAddAddress}>
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add Address
                  </button>
                </div>
                {loadingAddresses ? <div className="pf-loading">Loading...</div>
                  : addresses.length === 0 ? <div className="pf-empty">No addresses saved.</div>
                  : <div className="pf-addr-grid">
                    {addresses.map(addr => (
                      <div className={`pf-addr-card${addr.is_default ? " default" : ""}`} key={addr.id}>
                        <div className="pf-addr-icon">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        </div>
                        <div className="pf-addr-body">
                          {addr.is_default && <span className="pf-addr-default">Default</span>}
                          <div className="pf-addr-text">{addr.address}</div>
                          <div className="pf-addr-text">{addr.city}, {addr.state} — {addr.postal_code}</div>
                          <div className="pf-addr-text">{addr.country}</div>
                          <div className="pf-addr-text">📞 {addr.phone_number}</div>
                          <div className="pf-addr-actions">
                            {!addr.is_default && <button className="pf-addr-btn" onClick={() => handleSetDefault(addr.id)}>Set Default</button>}
                            <button className="pf-addr-btn" onClick={() => openEditAddress(addr)}>Edit</button>
                            <button className="pf-addr-btn danger" onClick={() => handleDeleteAddress(addr.id)}>Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                }
              </div>
            )}

            {/* ACCOUNT DETAILS */}
            {activeTab === 2 && (
              <div className="pf-section">
                <div className="pf-section-title">Account Details</div>
                <form className="pf-form" onSubmit={handleProfileUpdate}>
                  <div className="pf-form-group">
                    <label>Username</label>
                    <input type="text" value={accountUsername} onChange={e => setAccountUsername(e.target.value)} placeholder="Enter username" required />
                  </div>
                  <div className="pf-form-group">
                    <label>Email Address</label>
                    <input type="email" value={accountEmail} onChange={e => setAccountEmail(e.target.value)} placeholder="Enter email" required />
                  </div>
                  <div className="pf-form-group">
                    <label>Profile Image</label>
                    <input type="file" accept="image/*" onChange={e => setProfileImage(e.target.files[0])} />
                    {profileImageUrl && <img src={profileImageUrl} alt="Profile" className="pf-profile-preview" />}
                  </div>
                  <button type="submit" className="pf-btn-primary pf-btn-full">Update Profile</button>
                </form>
              </div>
            )}

            {/* RESET PASSWORD */}
            {activeTab === 3 && (
              <div className="pf-section">
                <div className="pf-section-title">Reset Password</div>
                <form className="pf-form" onSubmit={handlePasswordReset}>
                  {[
                    { label: "Current Password", val: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
                    { label: "New Password", val: newPassword, set: setNewPassword, show: showNew, toggle: () => setShowNew(v => !v) },
                    { label: "Confirm Password", val: confirmPassword, set: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
                  ].map(({ label, val, set, show, toggle }) => (
                    <div className="pf-form-group" key={label}>
                      <label>{label}</label>
                      <div className="pf-pw-wrap">
                        <input type={show ? "text" : "password"} value={val} onChange={e => set(e.target.value)} />
                        <button type="button" className="pf-pw-eye" onClick={toggle} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOffIcon /> : <EyeIcon />}</button>
                      </div>
                    </div>
                  ))}
                  <button type="submit" className="pf-btn-primary pf-btn-full">Update Password</button>
                </form>
              </div>
            )}
          </main>
        </div>

        {/* Address Modal */}
        {showAddressModal && (
          <div className="pf-modal-overlay">
            <div className="pf-modal" onClick={e => e.stopPropagation()}>
              <div className="pf-modal-header">
                <div className="pf-modal-title">{editingId ? "Edit Address" : "Add New Address"}</div>
                <button type="button" className="pf-modal-close" onClick={() => setShowAddressModal(false)} aria-label="Close">×</button>
              </div>
              <form onSubmit={handleAddressSubmit} className="pf-form">
                {[
                  { name: "phoneNumber", label: "Phone Number", placeholder: "Enter phone number" },
                  { name: "address", label: "Address", placeholder: "Street, apartment, etc." },
                  { name: "city", label: "City", placeholder: "City" },
                  { name: "state", label: "State", placeholder: "State" },
                  { name: "postalCode", label: "Postal Code", placeholder: "Postal code" },
                  { name: "country", label: "Country", placeholder: "Country" },
                ].map(f => (
                  <div className="pf-form-group" key={f.name}>
                    <label>{f.label}</label>
                    <input type="text" name={f.name} value={addressForm[f.name]} onChange={e => setAddressForm(p => ({ ...p, [e.target.name]: e.target.value }))} placeholder={f.placeholder} required />
                  </div>
                ))}
                <div className="pf-form-group pf-checkbox-group">
                  <label><input type="checkbox" name="isDefault" checked={addressForm.isDefault} onChange={e => setAddressForm(p => ({ ...p, isDefault: e.target.checked }))} /> Set as default address</label>
                </div>
                <div className="pf-modal-btns">
                  <button type="submit" className="pf-btn-primary">{editingId ? "Update" : "Save"}</button>
                  <button type="button" className="pf-btn-cancel" onClick={() => setShowAddressModal(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SeoWrapper>
  );
}
