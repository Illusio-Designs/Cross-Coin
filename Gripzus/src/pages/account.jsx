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
  if (!name) return 'G';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return ''; }
}

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

  const NAV = [
    { key: 'orders',    label: 'Orders',          value: orders.length },
    { key: 'addresses', label: 'Addresses',       value: addresses.length },
    { key: 'details',   label: 'Account Details', value: null },
  ];

  return (
    <SeoWrapper pageName="profile">
      <main className="bg-paper">

        {/* Hero */}
        <section className="bg-ink text-center px-6 py-14 md:py-16">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center bg-paper/10 text-paper font-display font-bold text-xl">
            {getInitials(user.username)}
          </div>
          <p className="eyebrow text-paper/45">My Account</p>
          <h1 className="h-display text-paper text-3xl md:text-4xl mt-2">{user.username || 'Gripzus member'}</h1>
          <p className="text-paper/55 text-sm mt-2">{user.email}</p>
          {user.phone && <p className="text-paper/35 text-xs mt-1">+91 {user.phone}</p>}
          <button
            onClick={async () => { await logout(); window.location.replace('/'); }}
            className="mt-5 inline-flex items-center gap-2 border border-paper/25 px-5 py-2 text-[11px] tracking-[0.14em] uppercase text-paper/75 transition-colors hover:border-paper hover:text-paper"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            Sign Out
          </button>
        </section>

        {/* Section nav — these three are the tabs */}
        <div className="border-b border-line">
          <div className="max-w-site mx-auto grid grid-cols-3 divide-x divide-line">
            {NAV.map((n) => {
              const active = tab === n.key;
              return (
                <button
                  key={n.key}
                  onClick={() => setTab(n.key)}
                  className={`relative py-6 text-center transition-colors ${active ? 'bg-paper-warm' : 'hover:bg-paper-warm/50'}`}
                >
                  {n.value !== null ? (
                    <p className={`h-display text-2xl md:text-3xl ${active ? 'text-ink' : 'text-ink-muted'}`}>{n.value}</p>
                  ) : (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`mx-auto ${active ? 'text-ink' : 'text-ink-muted'}`}>
                      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" strokeLinecap="round" />
                    </svg>
                  )}
                  <p className={`eyebrow mt-1.5 ${active ? 'text-ink' : ''}`}>{n.label}</p>
                  {active && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-ink" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="max-w-site mx-auto px-6 md:px-12 lg:px-20 py-10 md:py-12">
          <div>

            {/* ORDERS */}
            {tab === 'orders' && (
              <div>
                <h2 className="h-display text-2xl text-ink mb-6">My Orders</h2>
                {loadingOrders ? (
                  <p className="py-12 text-center eyebrow">Loading orders…</p>
                ) : orders.length === 0 ? (
                  <div className="py-16 text-center border border-line">
                    <p className="h-display text-2xl text-ink mb-3">No orders yet</p>
                    <Link href="/products" className="eyebrow text-clay-deep hover:text-ink">Start shopping →</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {orders.map((o) => {
                      const status = (o.status || '').toLowerCase();
                      const canCancel = ['pending', 'confirmed', 'processing'].includes(status);
                      return (
                        <div key={o.id} className="border border-line p-5 md:p-6">
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-line">
                            <div>
                              <p className="font-display uppercase text-ink text-base tracking-[-0.01em]" style={{ fontWeight: 700 }}>#{o.order_number}</p>
                              <p className="eyebrow mt-1">{formatDate(o.createdAt)}</p>
                            </div>
                            <span className={`font-mono text-[10px] tracking-[0.2em] uppercase px-2.5 py-1 ${
                              status === 'delivered' ? 'bg-ink text-paper' :
                              status === 'cancelled' ? 'border border-line text-ink-muted' :
                              'bg-clay text-paper'
                            }`}>{(o.status || '').replace(/_/g, ' ')}</span>
                          </div>

                          {o.OrderItems?.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 py-3 border-b border-line">
                              <div className="w-14 h-14 bg-paper-deep border border-line overflow-hidden shrink-0">
                                {getOrderImage(item) && <img src={getOrderImage(item)} alt="" className="w-full h-full object-cover" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-ink line-clamp-1">{item.Product?.name || item.product_name}</p>
                                <p className="eyebrow mt-0.5">Qty {item.quantity}</p>
                              </div>
                              <p className="text-sm font-display font-bold text-ink">₹{parseFloat(item.subtotal || 0).toLocaleString('en-IN')}</p>
                            </div>
                          ))}

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                            <p className="font-display font-bold text-ink">Total: ₹{parseFloat(o.final_amount || 0).toLocaleString('en-IN')}</p>
                            <div className="flex items-center gap-4">
                              <Link href={`/track-order?order=${o.order_number}`} className="eyebrow text-clay-deep hover:text-ink">Track Order →</Link>
                              {canCancel && (
                                <button
                                  onClick={() => handleCancelOrder(o.id)}
                                  disabled={cancellingId === o.id}
                                  className="eyebrow text-clay-deep hover:text-ink disabled:opacity-50"
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
                <div className="flex items-center justify-between mb-6">
                  <h2 className="h-display text-2xl text-ink">Saved Addresses</h2>
                  <button onClick={openAddAddr} className="cta !py-2.5 !px-4 text-[11px]">+ Add Address</button>
                </div>
                {loadingAddresses ? (
                  <p className="py-12 text-center eyebrow">Loading addresses…</p>
                ) : addresses.length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-line">
                    <p className="eyebrow">No addresses saved.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((a) => (
                      <div key={a.id} className={`border p-6 ${a.is_default ? 'border-ink' : 'border-line'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <p className="font-display uppercase text-ink text-lg tracking-[-0.02em]" style={{ fontWeight: 700 }}>{a.full_name}</p>
                          {a.is_default && <span className="font-mono text-[9px] tracking-[0.2em] uppercase bg-ink text-paper px-2 py-0.5">Default</span>}
                        </div>
                        <p className="prose-body text-sm">
                          {a.address}<br />
                          {[a.city, a.state].filter(Boolean).join(', ')}{(a.postal_code || a.pincode) ? ` — ${a.postal_code || a.pincode}` : ''}
                        </p>
                        {(a.phone_number || a.phone) && <p className="eyebrow mt-2">{a.phone_number || a.phone}</p>}
                        <div className="flex gap-4 mt-4 pt-4 border-t border-line">
                          {!a.is_default && <button onClick={() => handleSetDefault(a.id)} className="eyebrow hover:text-ink">Set default</button>}
                          <button onClick={() => openEditAddr(a)} className="eyebrow hover:text-ink">Edit</button>
                          <button onClick={() => handleDeleteAddr(a.id)} className="eyebrow hover:text-clay-deep">Delete</button>
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
                <h2 className="h-display text-2xl text-ink mb-6">Account Details</h2>
                <form onSubmit={handleProfileUpdate} className="border border-line p-7 md:p-8 max-w-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="Name" value={profile.username} onChange={(v) => setProfile({ ...profile, username: v })} />
                    <Field label="Email" type="email" value={profile.email} onChange={(v) => setProfile({ ...profile, email: v })} />
                    {user.phone && (
                      <div>
                        <p className="eyebrow mb-2">Phone</p>
                        <input value={`+91 ${user.phone}`} readOnly className="w-full bg-paper-deep border border-line px-4 py-3 text-sm text-ink-muted" />
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

        {/* Address modal */}
        {showAddrModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/50 backdrop-blur-[2px] px-4" onClick={() => setShowAddrModal(false)}>
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
                    className="w-full bg-paper-deep border border-line focus:border-ink outline-none px-4 py-3 text-sm text-ink transition-colors"
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
    <div>
      <label className="eyebrow block mb-2">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required
        className="w-full bg-paper-deep border border-line focus:border-ink outline-none px-4 py-3 text-sm text-ink placeholder:text-ink-muted transition-colors"
      />
    </div>
  );
}
