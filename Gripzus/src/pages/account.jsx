import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import SeoWrapper from '../components/SeoWrapper';
import { getUserOrders, cancelOrder } from '../services/orders';
import { getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from '../services/addresses';
import { updateProfile } from '../services/auth';
import {
  toastProfileUpdated, toastProfileError,
  toastAddressAdded, toastAddressUpdated, toastAddressDeleted,
  toastOrderCancelled, showError,
} from '../utils/toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry','Chandigarh'];

const EMPTY_ADDR = { full_name: '', phone: '', address: '', city: '', state: '', pincode: '', country: 'India', is_default: false };

const ACTIVE_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'booked'];

function toAbsoluteUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}/uploads${url.startsWith('/') ? '' : '/'}${url}`;
}

function getOrderImage(item) {
  const images = item.Product?.ProductImages || [];
  const match = images.find((img) => img.product_variation_id === item.variation_id);
  return toAbsoluteUrl(match?.image_url || images[0]?.image_url || item.image_url || item.image || '');
}

function getInitials(name) {
  if (!name) return 'U';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return ''; }
}

function badgeClass(status) {
  const s = (status || '').toLowerCase();
  if (s === 'delivered') return 'delivered';
  if (s === 'cancelled' || s === 'order_cancelled') return 'cancelled';
  return 'active';
}

// ── Nav icons ────────────────────────────────────────────────────────
const IconOrders = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
);
const IconAddress = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
);
const IconUser = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const IconLogout = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);

export default function AccountPage() {
  const { user, loading, logout, fetchUser } = useAuth();
  const [tab, setTab] = useState('orders');

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddrModal, setShowAddrModal] = useState(false);
  const [editingAddr, setEditingAddr] = useState(null);
  const [addrForm, setAddrForm] = useState(EMPTY_ADDR);

  const [profile, setProfile] = useState({ username: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) setProfile({ username: user.username || '', email: user.email || '' });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoadingOrders(true);
    getUserOrders({ limit: 20 })
      .then((d) => setOrders(d?.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
    setLoadingAddresses(true);
    getAddresses()
      .then(setAddresses)
      .catch(() => setAddresses([]))
      .finally(() => setLoadingAddresses(false));
  }, [user]);

  const refreshAddresses = () => getAddresses().then(setAddresses).catch(() => {});

  // ── Address handlers ──────────────────────────────────────────────
  const openAddAddr = () => { setEditingAddr(null); setAddrForm(EMPTY_ADDR); setShowAddrModal(true); };
  const openEditAddr = (a) => {
    setEditingAddr(a);
    setAddrForm({
      full_name: a.full_name || '', phone: a.phone_number || a.phone || '',
      address: a.address || '', city: a.city || '', state: a.state || '',
      pincode: a.postal_code || a.pincode || '', country: a.country || 'India',
      is_default: a.is_default || false,
    });
    setShowAddrModal(true);
  };
  const handleAddrSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAddr) { await updateAddress(editingAddr.id, addrForm); toastAddressUpdated(); }
      else { await createAddress(addrForm); toastAddressAdded(); }
      await refreshAddresses();
      setShowAddrModal(false);
    } catch (err) { showError(err.message || 'Could not save address.'); }
  };
  const handleDeleteAddr = async (id) => {
    if (!confirm('Delete this address?')) return;
    try { await deleteAddress(id); toastAddressDeleted(); } catch { /* ignore */ }
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };
  const handleSetDefault = async (id) => {
    await setDefaultAddress(id).catch(() => {});
    setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })));
  };

  // ── Profile ───────────────────────────────────────────────────────
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({ username: profile.username, email: profile.email });
      await fetchUser();
      toastProfileUpdated();
    } catch (err) { toastProfileError(err.message); }
    finally { setSavingProfile(false); }
  };

  // ── Order cancel ──────────────────────────────────────────────────
  const handleCancelOrder = async (id) => {
    if (!confirm('Cancel this order?')) return;
    setCancellingId(id);
    try {
      await cancelOrder(id, 'Cancelled by customer');
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'cancelled' } : o)));
      toastOrderCancelled();
    } catch (err) { showError(err.message || 'Could not cancel order.'); }
    finally { setCancellingId(null); }
  };

  const handleLogout = async () => { await logout(); window.location.replace('/'); };

  // ── Gates ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="bg-paper min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-line border-t-ink animate-spin" />
      </main>
    );
  }

  if (!user) {
    return (
      <SeoWrapper pageName="profile">
        <main className="bg-paper min-h-[60vh] flex flex-col items-center justify-center text-center px-6 gap-5">
          <p className="h-display text-3xl text-ink">Please sign in</p>
          <p className="prose-body text-sm">Sign in to view your orders, addresses and details.</p>
          <Link href="/login" className="cta">Go to Sign In</Link>
        </main>
      </SeoWrapper>
    );
  }

  const deliveredCount = orders.filter((o) => (o.status || '').toLowerCase() === 'delivered').length;
  const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes((o.status || '').toLowerCase())).length;
  const hasPoints = Number(user.loyalty_points) > 0;

  const NAV = [
    { key: 'orders', label: 'My Orders', icon: <IconOrders /> },
    { key: 'addresses', label: 'Addresses', icon: <IconAddress /> },
    { key: 'details', label: 'Account Details', icon: <IconUser /> },
  ];

  return (
    <SeoWrapper pageName="profile">
      <main className="acc-page">

        {/* Hero — graphite gradient card, light type */}
        <section className="acc-hero">
          <div className="wrap">
            <div className="acc-hero-inner">
              <div className="acc-avatar">{getInitials(user.username)}</div>
              <div className="acc-hero-info">
                <div className="acc-greeting">Welcome back,</div>
                <div className="acc-name">{user.username || 'Gripzus member'}</div>
                <div className="acc-contact">
                  {user.email && <span>{user.email}</span>}
                  {user.phone && <span>+91 {user.phone}</span>}
                </div>
              </div>
              <button className="acc-logout-btn" onClick={handleLogout}>
                <IconLogout />
                Sign Out
              </button>
            </div>
          </div>
        </section>

        {/* Stats */}
        <div className="wrap">
          <div className={`acc-stats${hasPoints ? ' has-points' : ''}`}>
            <div className="acc-stat"><div className="acc-stat-val">{orders.length}</div><div className="acc-stat-label">Orders</div></div>
            <div className="acc-stat"><div className="acc-stat-val">{addresses.length}</div><div className="acc-stat-label">Addresses</div></div>
            <div className="acc-stat"><div className="acc-stat-val">{deliveredCount}</div><div className="acc-stat-label">Delivered</div></div>
            <div className="acc-stat"><div className="acc-stat-val">{activeCount}</div><div className="acc-stat-label">Active</div></div>
            {hasPoints && (
              <div className="acc-stat" title="Earn points on every delivery. Redeem on future orders.">
                <div className="acc-stat-val">{user.loyalty_points}</div>
                <div className="acc-stat-label">Points</div>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="wrap">
          <div className="acc-body">

            {/* Sidebar */}
            <aside className="acc-sidebar">
              <nav className="acc-nav">
                {NAV.map((n) => (
                  <button
                    key={n.key}
                    className={`acc-nav-btn${tab === n.key ? ' active' : ''}`}
                    onClick={() => setTab(n.key)}
                  >
                    {n.icon}
                    {n.label}
                  </button>
                ))}
                <button className="acc-nav-btn danger" onClick={handleLogout}>
                  <IconLogout />
                  Log out
                </button>
              </nav>
            </aside>

            {/* Main */}
            <div className="acc-main">

              {/* ORDERS */}
              {tab === 'orders' && (
                <div>
                  <div className="acc-section-header">
                    <h2 className="acc-section-title">My Orders</h2>
                  </div>
                  {loadingOrders ? (
                    <p className="acc-note" style={{ padding: '48px 0', textAlign: 'center' }}>Loading orders…</p>
                  ) : orders.length === 0 ? (
                    <div className="acc-empty">
                      <p className="acc-empty-title">No orders yet</p>
                      <Link href="/products" className="link-line">Start shopping</Link>
                    </div>
                  ) : (
                    <div className="acc-orders">
                      {orders.map((o) => {
                        const status = (o.status || '').toLowerCase();
                        const canCancel = ['pending', 'confirmed', 'processing'].includes(status);
                        return (
                          <div key={o.id} className="acc-order-card">
                            <div className="acc-order-head">
                              <div>
                                <div className="acc-order-num">#{o.order_number}</div>
                                <div className="acc-order-date">{formatDate(o.createdAt)}</div>
                              </div>
                              <span className={`acc-badge ${badgeClass(o.status)}`}>{(o.status || 'pending').replace(/_/g, ' ')}</span>
                            </div>

                            {o.OrderItems?.map((item) => (
                              <div key={item.id} className="acc-order-item">
                                <div className="acc-order-img">
                                  {getOrderImage(item) && <img src={getOrderImage(item)} alt="" />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div className="acc-order-item-name">{item.Product?.name || item.product_name}</div>
                                  <div className="acc-order-item-meta">Qty {item.quantity}</div>
                                </div>
                                <div className="acc-order-item-total">₹{parseFloat(item.subtotal || 0).toLocaleString('en-IN')}</div>
                              </div>
                            ))}

                            <div className="acc-order-foot">
                              <div className="acc-order-total">Total: ₹{parseFloat(o.final_amount || 0).toLocaleString('en-IN')}</div>
                              <div className="acc-order-actions">
                                <Link href={`/track-order?order=${o.order_number}`} className="acc-link">Track Order</Link>
                                {canCancel && (
                                  <button
                                    onClick={() => handleCancelOrder(o.id)}
                                    disabled={cancellingId === o.id}
                                    className="acc-link"
                                  >
                                    {cancellingId === o.id ? 'Cancelling…' : 'Cancel'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ADDRESSES */}
              {tab === 'addresses' && (
                <div>
                  <div className="acc-section-header">
                    <h2 className="acc-section-title">Saved Addresses</h2>
                    <button onClick={openAddAddr} className="cta !py-2.5 !px-4 text-[11px]">+ Add Address</button>
                  </div>
                  {loadingAddresses ? (
                    <p className="acc-note" style={{ padding: '48px 0', textAlign: 'center' }}>Loading addresses…</p>
                  ) : addresses.length === 0 ? (
                    <div className="acc-empty">
                      <p className="acc-note">No addresses saved.</p>
                    </div>
                  ) : (
                    <div className="acc-addr-grid">
                      {addresses.map((a) => (
                        <div key={a.id} className={`acc-addr-card${a.is_default ? ' default' : ''}`}>
                          <div className="acc-addr-top">
                            <div className="acc-addr-name">{a.full_name}</div>
                            {a.is_default && <span className="acc-addr-default">Default</span>}
                          </div>
                          <div className="acc-addr-text">
                            {a.address}<br />
                            {[a.city, a.state].filter(Boolean).join(', ')}{(a.postal_code || a.pincode) ? ` — ${a.postal_code || a.pincode}` : ''}
                            {a.country && <><br />{a.country}</>}
                          </div>
                          {(a.phone_number || a.phone) && <div className="acc-addr-phone">{a.phone_number || a.phone}</div>}
                          <div className="acc-addr-actions">
                            {!a.is_default && <button onClick={() => handleSetDefault(a.id)} className="acc-link">Set default</button>}
                            <button onClick={() => openEditAddr(a)} className="acc-link">Edit</button>
                            <button onClick={() => handleDeleteAddr(a.id)} className="acc-link">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* DETAILS */}
              {tab === 'details' && (
                <div>
                  <div className="acc-section-header">
                    <h2 className="acc-section-title">Account Details</h2>
                  </div>
                  <form onSubmit={handleProfileUpdate} className="acc-form">
                    <div className="acc-form-grid">
                      <Field label="Name" value={profile.username} onChange={(v) => setProfile({ ...profile, username: v })} />
                      <Field label="Email" type="email" value={profile.email} onChange={(v) => setProfile({ ...profile, email: v })} />
                      {user.phone && (
                        <div className="acc-field">
                          <label>Phone</label>
                          <input value={`+91 ${user.phone}`} readOnly />
                        </div>
                      )}
                    </div>
                    <button type="submit" disabled={savingProfile} className="cta mt-8 disabled:opacity-50">
                      {savingProfile ? 'Saving…' : 'Update Profile'}
                    </button>
                  </form>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Address modal */}
        {showAddrModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-[2px] px-4" onClick={() => setShowAddrModal(false)}>
            <div className="bg-paper w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-line px-6 py-5">
                <h3 className="h-display text-xl text-ink">{editingAddr ? 'Edit address' : 'Add address'}</h3>
                <button onClick={() => setShowAddrModal(false)} aria-label="Close" className="text-ink hover:text-ink-soft">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              <form onSubmit={handleAddrSubmit} className="px-6 py-6 space-y-5">
                <Field label="Full name" value={addrForm.full_name} onChange={(v) => setAddrForm({ ...addrForm, full_name: v })} />
                <Field label="Phone" value={addrForm.phone} onChange={(v) => setAddrForm({ ...addrForm, phone: v })} />
                <Field label="Address" value={addrForm.address} onChange={(v) => setAddrForm({ ...addrForm, address: v })} />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="City" value={addrForm.city} onChange={(v) => setAddrForm({ ...addrForm, city: v })} />
                  <Field label="Pincode" value={addrForm.pincode} onChange={(v) => setAddrForm({ ...addrForm, pincode: v })} />
                </div>
                <div>
                  <label className="eyebrow block mb-2">State</label>
                  <select
                    value={addrForm.state}
                    onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
                    required
                    className="w-full bg-paper-deep rounded-lg border border-line focus:border-ink outline-none px-4 py-3 text-sm text-ink transition-colors"
                  >
                    <option value="">Select state</option>
                    {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2.5 eyebrow cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addrForm.is_default}
                    onChange={(e) => setAddrForm({ ...addrForm, is_default: e.target.checked })}
                    className="w-4 h-4 accent-ink"
                  />
                  Set as default address
                </label>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddrModal(false)} className="btn-outline flex-1 justify-center">Cancel</button>
                  <button type="submit" className="cta flex-1 justify-center">{editingAddr ? 'Update' : 'Save'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </SeoWrapper>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div className="acc-field">
      <label>{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required
      />
    </div>
  );
}
