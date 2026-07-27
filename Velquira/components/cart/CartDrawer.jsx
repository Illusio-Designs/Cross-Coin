'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Icon from '@/components/Icon';
import ShimmerImg from '@/components/ui/ShimmerImg';
import { toast } from '@/lib/toast';
import {
  getShippingFees,
  createOrder,
  createGuestOrder,
  initiateCheckout,
  initiateGuestCheckout,
  retryCheckout,
  verifyPayment,
  checkPincodeServiceability,
} from '@/lib/api/orders';
import { getUserAddresses, createShippingAddress } from '@/lib/api/addresses';

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
// Optional instant discount for paying online (prepaid) — same env-gated
// incentive the other brands use. Defaults to 0 (no discount) unless configured.
const PREPAID_INSTANT_DISCOUNT_INR = Math.max(0, parseFloat(process.env.NEXT_PUBLIC_PREPAID_INSTANT_DISCOUNT_INR || '0') || 0);

const FALLBACK_FEES = [
  { id: 'fallback-prepaid', orderType: 'prepaid', fee: 0, isDefault: true },
  { id: 'fallback-cod', orderType: 'cod', fee: 0 },
];
const EMPTY_ADDR = { fullName: '', phoneNumber: '', address: '', city: '', state: '', postalCode: '', country: 'India', isDefault: false };

function isValidEmail(v) {
  const s = String(v || '').trim();
  if (!s.includes('@')) return false;
  const [l, d] = s.split('@');
  return !!l && !!d && d.includes('.') && !d.startsWith('.') && !d.endsWith('.');
}
function isValidMobile(v) {
  const d = String(v || '').replace(/\D/g, '');
  return d.length === 10 && /^[6-9]\d{9}$/.test(d);
}
function validateAddress(a) {
  if (!a) return 'Please add a delivery address.';
  if (String(a.full_name || a.fullName || '').trim().length < 2) return 'Enter a valid full name.';
  if (String(a.address || '').trim().length < 10) return 'Enter a complete street address.';
  if (!String(a.city || '').trim()) return 'City is required.';
  if (!String(a.state || '').trim()) return 'State is required.';
  if (!/^\d{6}$/.test(String(a.postal_code || a.postalCode || '').replace(/\D/g, ''))) return 'PIN code must be 6 digits.';
  if (!isValidMobile(a.phone_number || a.phoneNumber || a.phone)) return 'A valid 10-digit mobile number is required.';
  return null;
}
function loadRazorpay() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (document.getElementById('rzp-script')) return resolve(true);
    const s = document.createElement('script');
    s.id = 'rzp-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}
const genIdem = () => 'idem-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);

// Persist a guest session id in a cookie so the backend can associate a guest's
// cart/session across COD + prepaid checkout — same helper the other brands use.
function getOrCreateGuestSessionId() {
  if (typeof document === 'undefined') return 'guest-' + Date.now();
  const key = 'guestSessionId';
  const match = document.cookie.split('; ').find((r) => r.startsWith(key + '='));
  if (match) return match.split('=')[1];
  const id = 'guest-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${key}=${id}; expires=${expires}; path=/; SameSite=Lax`;
  return id;
}

export default function CartDrawer() {
  const router = useRouter();
  const { items, subtotal, count, setQty, remove, clear, open, closeCart } = useCart();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [guest, setGuest] = useState({ email: '', fullName: '', phone: '' });
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_ADDR);
  const [savingAddr, setSavingAddr] = useState(false);

  const [fees, setFees] = useState([]);
  const [selectedFee, setSelectedFee] = useState(null);
  const [serviceability, setServiceability] = useState(null);


  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [retryState, setRetryState] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [urgencySeconds, setUrgencySeconds] = useState(600);

  // Countdown timer (urgency), like the other brands' drawers.
  useEffect(() => {
    if (!open) return;
    setUrgencySeconds(600);
    const t = setInterval(() => setUrgencySeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [open]);

  // Lock scroll + escape
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') closeCart(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeCart]);

  // Clear transient state whenever the drawer closes
  useEffect(() => { if (!open) { setError(''); setRetryState(null); setOrderSuccess(null); } }, [open]);

  // Load shipping fees + addresses as soon as the drawer opens (single view)
  useEffect(() => {
    if (!open) return;
    let alive = true;
    getShippingFees().then((data) => {
      const raw = Array.isArray(data) ? data : data?.shippingFees || data?.fees || [];
      const list = raw.length ? raw : FALLBACK_FEES;
      if (!alive) return;
      setFees(list);
      setSelectedFee((prev) => prev || list.find((f) => f.orderType === 'prepaid') || list.find((f) => f.isDefault) || list[0]);
    }).catch(() => { if (alive) { setFees(FALLBACK_FEES); setSelectedFee(FALLBACK_FEES[0]); } });
    return () => { alive = false; };
  }, [open]);

  useEffect(() => {
    if (!open || authLoading) return;
    if (!isAuthenticated) { setShowForm(true); return; }
    getUserAddresses().then((data) => {
      const list = Array.isArray(data) ? data : data?.addresses || [];
      setAddresses(list);
      const def = list.find((a) => a.is_default || a.isDefault) || list[0];
      if (def) { setSelectedAddress(def); checkPin(def.postal_code || def.postalCode); }
      else setShowForm(true);
    }).catch(() => setShowForm(true));
  }, [open, authLoading, isAuthenticated]);

  const checkPin = async (pin) => {
    const p = String(pin || '').replace(/\D/g, '');
    if (p.length !== 6) return;
    try {
      const r = await checkPincodeServiceability(p);
      setServiceability({ serviceable: r.serviceable !== false, cod_allowed: r.cod_allowed !== false });
    } catch { setServiceability(null); }
  };

  const shippingFee = parseFloat(selectedFee?.fee || 0);
  const couponDiscount = 0;
  const total = Math.max(0, subtotal + shippingFee - couponDiscount);
  const isCod = selectedFee?.orderType === 'cod';
  const isPrepaid = selectedFee?.orderType === 'prepaid';
  // Prepaid instant discount (0 unless configured) → the amount actually payable
  // online is the total minus that incentive.
  const prepaidInstantDiscount = isPrepaid && PREPAID_INSTANT_DISCOUNT_INR > 0 ? Math.min(PREPAID_INSTANT_DISCOUNT_INR, total) : 0;
  const prepaidPayable = Math.max(0, total - prepaidInstantDiscount);

  const sortedFees = useMemo(() => {
    const arr = [...fees];
    arr.sort((a, b) => (a.orderType === 'cod' ? -1 : 1) - (b.orderType === 'cod' ? -1 : 1));
    return arr;
  }, [fees]);

  const onFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    let v = type === 'checkbox' ? checked : value;
    if (name === 'phoneNumber') v = String(v).replace(/\D/g, '').slice(0, 10);
    if (name === 'postalCode') v = String(v).replace(/\D/g, '').slice(0, 6);
    setForm((p) => ({ ...p, [name]: v }));
  };

  const saveAddress = async (e) => {
    e.preventDefault();
    setError('');
    const candidate = {
      full_name: isAuthenticated ? form.fullName : guest.fullName.trim() || form.fullName,
      address: form.address, city: form.city, state: form.state, postal_code: form.postalCode,
      phone_number: isAuthenticated ? form.phoneNumber : guest.phone,
    };
    const err = validateAddress(candidate);
    if (err) { setError(err); return; }
    if (!isAuthenticated && !isValidEmail(guest.email)) { setError('Please enter a valid email address.'); return; }
    setSavingAddr(true);
    try {
      if (isAuthenticated) {
        await createShippingAddress(form);
        const fresh = await getUserAddresses();
        const list = Array.isArray(fresh) ? fresh : fresh?.addresses || [];
        setAddresses(list);
        setSelectedAddress(list.find((a) => a.address === form.address) || list[list.length - 1]);
      } else {
        setSelectedAddress({
          id: Date.now(), full_name: form.fullName || guest.fullName, phone_number: guest.phone || form.phoneNumber,
          address: form.address, city: form.city, state: form.state, postal_code: form.postalCode, country: form.country,
        });
      }
      checkPin(form.postalCode);
      setShowForm(false);
      setForm(EMPTY_ADDR);
      toast.success('Delivery address saved');
    } catch (e2) {
      setError(e2.message || 'Failed to save address.');
      toast.error(e2.message || 'Failed to save address');
    } finally {
      setSavingAddr(false);
    }
  };


  const buildItems = () => items
    .filter((i) => (i.productId ?? i.id) != null && !Number.isNaN(Number(i.productId ?? i.id)))
    .map((i) => ({ product_id: Number(i.productId ?? i.id), variation_id: i.variationId ? Number(i.variationId) : null, quantity: Number(i.qty) || 1 }));

  const guestBlocks = () => {
    const parts = (guest.fullName || '').trim().split(/\s+/);
    return {
      session_id: getOrCreateGuestSessionId(),
      guest_info: { email: guest.email, firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '', phone: guest.phone },
      email: guest.email, firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '', phone: guest.phone,
      shipping_address: {
        fullName: selectedAddress.full_name || selectedAddress.fullName, address: selectedAddress.address,
        city: selectedAddress.city, state: selectedAddress.state,
        pincode: selectedAddress.postal_code || selectedAddress.postalCode,
        phone: selectedAddress.phone_number || selectedAddress.phoneNumber || guest.phone,
        country: selectedAddress.country || 'India',
      },
    };
  };

  const buildData = (paymentType) => {
    // Prepaid orders fold the instant discount into discount_amount (same as the
    // other brands); COD sends only the coupon discount.
    const discountAmount = paymentType === 'razorpay' ? prepaidInstantDiscount + couponDiscount : couponDiscount;
    const base = {
      items: buildItems(), payment_type: paymentType, notes: '',
      discount_amount: discountAmount, coupon_id: null, idempotency_key: genIdem(),
    };
    if (isAuthenticated) return { shipping_address_id: selectedAddress.id, ...base };
    return { ...guestBlocks(), ...base };
  };

  const finishSuccess = (order) => {
    clear();
    setError('');
    setRetryState(null);
    setOrderSuccess({
      orderNumber: order?.order_number || order?.orderNumber || '—',
      id: order?.id || null,
    });
    toast.success('Order placed successfully!');
  };

  const deliveryDateStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const openRazorpay = (rzpOrder, reservationId) => {
    const options = {
      key: RAZORPAY_KEY, amount: rzpOrder.amount, currency: rzpOrder.currency,
      name: 'Velquira', description: 'Payment for your Velquira order', order_id: rzpOrder.id,
      prefill: {
        name: isAuthenticated ? (user?.username || user?.name || '') : guest.fullName,
        email: isAuthenticated ? (user?.email || '') : guest.email,
        contact: selectedAddress?.phone_number || selectedAddress?.phoneNumber || guest.phone || '',
      },
      theme: { color: '#202c6e' },
      handler: async (response) => {
        try {
          const result = await verifyPayment({
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
            reservation_id: reservationId,
          });
          finishSuccess(result.order);
        } catch { finishSuccess(null); }
        finally { setProcessing(false); }
      },
      modal: { ondismiss: () => { setError('Payment was cancelled. You can retry below.'); setRetryState({ reservationId, count: 0 }); setProcessing(false); } },
    };
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (r) => { setError(r.error?.description || 'Payment failed.'); setRetryState({ reservationId, count: 0 }); setProcessing(false); });
    rzp.open();
  };

  const placeOrder = async () => {
    setError('');
    const addrErr = validateAddress(selectedAddress);
    if (addrErr) { setError(addrErr); return; }
    if (!selectedFee) { setError('Please select a payment method.'); return; }
    if (!isAuthenticated && (!String(guest.fullName).trim() || !isValidEmail(guest.email) || !isValidMobile(guest.phone))) {
      setError('Please complete your contact details (name, valid email and 10-digit phone).');
      return;
    }
    if (isCod) {
      setProcessing(true);
      try {
        const data = buildData('cod');
        const result = isAuthenticated ? await createOrder(data) : await createGuestOrder(data);
        if (!result?.order) throw new Error('Order creation failed.');
        finishSuccess(result.order);
      } catch (e) { setError(e.message || 'Order placement failed.'); toast.error(e.message || 'Order placement failed'); setProcessing(false); }
      return;
    }
    if (isPrepaid) {
      if (!RAZORPAY_KEY) { setError('Online payment is not configured. Please choose Cash on Delivery.'); return; }
      if (prepaidPayable <= 0) { setError('Order amount must be greater than zero.'); return; }
      setProcessing(true);
      try {
        const ok = await loadRazorpay();
        if (!ok || !window.Razorpay) { setError('Could not load the payment SDK.'); setProcessing(false); return; }
        const data = buildData('razorpay');
        const result = isAuthenticated ? await initiateCheckout(data) : await initiateGuestCheckout(data);
        if (!result?.success || !result?.razorpay_order) throw new Error(result?.message || 'Checkout initiation failed.');
        openRazorpay(result.razorpay_order, result.reservation_id);
      } catch (e) { setError(e.message || 'Failed to start checkout.'); setProcessing(false); }
    }
  };

  const doRetry = async () => {
    if (!retryState) return;
    setProcessing(true); setError('');
    try {
      const r = await retryCheckout(retryState.reservationId);
      if (!r?.success || !r?.razorpay_order) throw new Error(r?.message || 'Retry failed.');
      setRetryState((s) => ({ ...s, count: s.count + 1 }));
      openRazorpay(r.razorpay_order, r.reservation_id);
    } catch (e) { setError(e.message || 'Could not retry payment.'); setProcessing(false); }
  };

  const showAddressCard = selectedAddress && !showForm;

  return (
    <>
      <div className={`cd-backdrop${open ? ' show' : ''}`} onClick={closeCart} />
      <aside className={`cd-drawer${open ? ' show' : ''}`} role="dialog" aria-modal="true" aria-label="Shopping cart" aria-hidden={!open}>

        {/* Header */}
        <div className="cd-header">
          <div className="cd-header-left">
            <span className="cd-header-icon"><Icon name="ShoppingBag" size={18} /></span>
            <div>
              <span className="cd-header-title">{orderSuccess ? 'Order confirmed' : 'Your cart'}</span>
              {!orderSuccess && <span className="cd-header-count">{count} item{count !== 1 ? 's' : ''}</span>}
            </div>
          </div>
          <button className="cd-close" onClick={closeCart} aria-label="Close cart"><Icon name="X" size={20} /></button>
        </div>

        {orderSuccess ? (
          <div className="cd-success">
            <span className="cd-success-ic"><Icon name="ShieldCheck" size={40} /></span>
            <b className="cd-success-title">Order placed!</b>
            <p className="cd-success-order">Order #{orderSuccess.orderNumber}</p>
            <p className="cd-success-msg">Thank you! You’ll get a confirmation shortly.</p>
            <button className="btn btn-primary" style={{ width: '100%' }}
              onClick={() => { closeCart(); router.push(orderSuccess.id ? `/account/orders/${orderSuccess.id}` : '/account/orders'); }}>
              Track order
            </button>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={closeCart}>Continue shopping</button>
          </div>
        ) : items.length === 0 ? (
          <div className="cd-empty">
            <span className="cd-empty-ic"><Icon name="ShoppingBag" size={34} /></span>
            <b>Your cart is empty</b>
            <p>Add a few pairs and they’ll show up here.</p>
            <button className="btn btn-primary" onClick={closeCart}>Continue shopping</button>
          </div>
        ) : (
          /* ── Single-view cart + checkout ── */
          <>
            <div className="cd-body cd-body-checkout" data-lenis-prevent>
              {/* Items */}
              <div className="cd-co-section">
                <div className="cd-section-title">Items</div>
                {items.map((i) => (
                  <div className="cd-item" key={i.key}>
                    <Link href={i.slug ? `/products/${i.slug}` : '/products'} className="cd-thumb" onClick={closeCart} aria-hidden>
                      {i.image ? <ShimmerImg src={i.image} alt="" /> : <Icon name="Footprints" size={26} />}
                    </Link>
                    <div className="cd-item-main">
                      <div className="cd-item-top">
                        <Link href={i.slug ? `/products/${i.slug}` : '/products'} className="cd-item-name" onClick={closeCart}>{i.name}</Link>
                        <button className="cd-remove" onClick={() => { remove(i.key); toast.info(`${i.name} removed from cart`); }} aria-label={`Remove ${i.name}`}><Icon name="Trash" size={16} /></button>
                      </div>
                      {i.color && <div className="cd-item-variant">{i.color}</div>}
                      <div className="cd-item-bot">
                        <div className="cd-item-prices">
                          <span className="cd-item-price">₹{Number(i.price).toFixed(0)}</span>
                          {i.oldPrice > i.price && <span className="cd-item-mrp">₹{Number(i.oldPrice).toFixed(0)}</span>}
                          {i.oldPrice > i.price && <span className="cd-item-off">{Math.round((1 - i.price / i.oldPrice) * 100)}% off</span>}
                        </div>
                        <div className="cd-qty">
                          <button onClick={() => setQty(i.key, i.qty - 1)} disabled={i.qty <= 1} aria-label="Decrease quantity">−</button>
                          <span>{i.qty}</span>
                          <button onClick={() => setQty(i.key, i.qty + 1)} aria-label="Increase quantity">+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order summary — right after the items, so pricing is clear up front */}
              <div className="cd-co-section cd-co-summary">
                <div className="cd-summary-row"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
                <div className="cd-summary-row"><span>Shipping</span><span>{shippingFee === 0 ? <b style={{ color: 'var(--teal-600)' }}>FREE</b> : `₹${shippingFee.toFixed(0)}`}</span></div>
                {prepaidInstantDiscount > 0 && <div className="cd-summary-row"><span>Prepaid discount</span><span style={{ color: 'var(--teal-600)' }}>−₹{prepaidInstantDiscount.toFixed(0)}</span></div>}
                <div className="cd-summary-row cd-summary-total"><span>Total</span><span>₹{(isPrepaid ? prepaidPayable : total).toFixed(0)}</span></div>
              </div>

              {/* Delivery details — contact + address in ONE box (like the other brands) */}
              <div className="cd-co-section">
                <div className="cd-section-title">{isAuthenticated ? 'Delivery address' : 'Delivery details'}</div>
                {!isAuthenticated && (
                  <p className="muted" style={{ fontSize: 12, marginTop: -4, marginBottom: 10 }}>Have an account? <Link href="/login" onClick={closeCart} style={{ color: 'var(--navy)', fontWeight: 600 }}>Sign in</Link></p>
                )}
                {isAuthenticated && addresses.length > 1 && !showForm && (
                  <div className="cd-addr-list">
                    {addresses.map((a) => (
                      <label key={a.id} className={`cd-addr-option${selectedAddress?.id === a.id ? ' active' : ''}`}>
                        <input type="radio" name="cdaddr" checked={selectedAddress?.id === a.id} onChange={() => { setSelectedAddress(a); checkPin(a.postal_code || a.postalCode); }} />
                        <div><b>{a.full_name || a.fullName}</b><span className="muted">{a.address}, {a.city}, {a.state} {a.postal_code || a.postalCode}</span></div>
                      </label>
                    ))}
                  </div>
                )}
                {showAddressCard && addresses.length <= 1 && (
                  <div className="cd-addr-card">
                    <div><b>{selectedAddress.full_name || selectedAddress.fullName}</b>
                      <span className="muted">{selectedAddress.address}, {selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code || selectedAddress.postalCode}</span>
                      <span className="muted">{selectedAddress.phone_number || selectedAddress.phoneNumber}</span>
                    </div>
                    <button className="link-more" onClick={() => { setForm(EMPTY_ADDR); setShowForm(true); }}>Change</button>
                  </div>
                )}
                {!showForm && isAuthenticated && addresses.length > 1 && (
                  <button className="btn btn-ghost" style={{ marginTop: 10, width: '100%' }} onClick={() => { setForm(EMPTY_ADDR); setShowForm(true); }}>Add another address</button>
                )}

                {showForm && (
                  <form className="cd-co-form" onSubmit={saveAddress}>
                    {isAuthenticated ? (
                      <div className="cd-form-grid2">
                        <label className="cd-label">Full name<input className="cd-input" name="fullName" value={form.fullName} onChange={onFormChange} required placeholder="Full name" /></label>
                        <label className="cd-label">Phone<input className="cd-input" name="phoneNumber" type="tel" inputMode="numeric" maxLength={10} value={form.phoneNumber} onChange={onFormChange} required placeholder="10-digit mobile" /></label>
                      </div>
                    ) : (
                      <>
                        <label className="cd-label">Full name<input className="cd-input" value={guest.fullName} onChange={(e) => setGuest((p) => ({ ...p, fullName: e.target.value }))} placeholder="Your name" autoComplete="name" /></label>
                        <div className="cd-form-grid2">
                          <label className="cd-label">Email<input className="cd-input" type="email" value={guest.email} onChange={(e) => setGuest((p) => ({ ...p, email: e.target.value }))} placeholder="you@email.com" autoComplete="email" /></label>
                          <label className="cd-label">Phone<input className="cd-input" type="tel" inputMode="numeric" maxLength={10} value={guest.phone} onChange={(e) => setGuest((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="10-digit mobile" autoComplete="tel" /></label>
                        </div>
                      </>
                    )}
                    <label className="cd-label">Address<input className="cd-input" name="address" value={form.address} onChange={onFormChange} required placeholder="House / flat, street, area, landmark" /></label>
                    <div className="cd-form-grid2">
                      <label className="cd-label">City<input className="cd-input" name="city" value={form.city} onChange={onFormChange} required placeholder="City" /></label>
                      <label className="cd-label">State<input className="cd-input" name="state" value={form.state} onChange={onFormChange} required placeholder="State" /></label>
                    </div>
                    <div className="cd-form-grid2">
                      <label className="cd-label">PIN code<input className="cd-input" name="postalCode" value={form.postalCode} onChange={onFormChange} onBlur={(e) => checkPin(e.target.value)} required placeholder="6-digit PIN" /></label>
                      <label className="cd-label">Country<input className="cd-input" name="country" value={form.country} onChange={onFormChange} placeholder="Country" /></label>
                    </div>
                    {isAuthenticated && (
                      <label className="cd-checkbox"><input type="checkbox" name="isDefault" checked={form.isDefault} onChange={onFormChange} /> Set as default</label>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit" className="btn btn-primary" disabled={savingAddr}>{savingAddr ? 'Saving…' : 'Save address'}</button>
                      {(selectedAddress || (isAuthenticated && addresses.length > 0)) && <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>}
                    </div>
                  </form>
                )}
              </div>

              {/* Payment */}
              <div className="cd-co-section">
                <div className="cd-section-title">How would you like to pay?</div>
                <div className="cd-pay-list">
                  {sortedFees.map((fee) => {
                    const codBlocked = fee.orderType === 'cod' && serviceability?.cod_allowed === false;
                    const isCodOpt = fee.orderType === 'cod';
                    return (
                      <label key={fee.id} className={`cd-pay-option${selectedFee?.id === fee.id ? ' active' : ''}${codBlocked ? ' disabled' : ''}`}>
                        <input type="radio" name="cdpay" checked={selectedFee?.id === fee.id} disabled={codBlocked} onChange={() => !codBlocked && setSelectedFee(fee)} />
                        <span className="cd-pay-icon"><Icon name={isCodOpt ? 'ShieldCheck' : 'ShoppingBag'} size={18} /></span>
                        <div className="cd-pay-info">
                          <b>{isCodOpt ? 'Cash on Delivery' : 'UPI / Card (Prepaid)'}</b>
                          <span className="muted">{codBlocked ? 'Not available for this PIN' : isCodOpt ? 'Pay when you receive your order' : `Secure payment via Razorpay${PREPAID_INSTANT_DISCOUNT_INR > 0 ? ` · ₹${Math.round(PREPAID_INSTANT_DISCOUNT_INR)} instant off` : ''}`}</span>
                          <span className="cd-pay-date"><Icon name="Truck" size={12} /> Delivery by {deliveryDateStr()}</span>
                        </div>
                        <span className={`cd-pay-fee${parseFloat(fee.fee || 0) === 0 ? ' free' : ''}`}>{parseFloat(fee.fee || 0) === 0 ? 'FREE' : `₹${parseFloat(fee.fee).toFixed(0)}`}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Checkout footer */}
            <div className="cd-foot">
              {/* Urgency bar */}
              <div className="cd-urgency">
                <span><Icon name="ShieldCheck" size={13} /> Order in the next</span>
                <b>{String(Math.floor(urgencySeconds / 60)).padStart(2, '0')}:{String(urgencySeconds % 60).padStart(2, '0')}</b>
                <span>to get it by {deliveryDateStr()}</span>
              </div>

              {error && <p className="cd-error">{error}</p>}
              {retryState && retryState.count < 3 ? (
                <button className="cd-checkout" onClick={doRetry} disabled={processing}>{processing ? 'Please wait…' : `Retry payment (${3 - retryState.count} left)`}</button>
              ) : (
                <button className="cd-checkout" onClick={placeOrder} disabled={processing || authLoading}>
                  {processing ? 'Processing…' : isPrepaid ? `Pay ₹${prepaidPayable.toFixed(0)}` : isCod ? `Place order · ₹${total.toFixed(0)}` : 'Place order'}
                </button>
              )}

              <a className="cd-whatsapp" href="https://wa.me/919712891700?text=Hi%2C%20I%20need%20help%20with%20my%20Velquira%20order" target="_blank" rel="noopener noreferrer">
                <Icon name="Phone" size={14} /> Need help? Chat on WhatsApp
              </a>

              <div className="cd-trust" style={{ marginTop: 10, marginBottom: 0 }}>
                <span><Icon name="ShieldCheck" size={14} /> Secure</span>
                <span><Icon name="RefreshCw" size={14} /> Easy returns</span>
                <span><Icon name="ShoppingBag" size={14} /> Razorpay</span>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
