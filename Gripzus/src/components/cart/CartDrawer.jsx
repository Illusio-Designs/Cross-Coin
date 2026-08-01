import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import {
  getUserAddresses,
  createShippingAddress,
  updateShippingAddress,
  getShippingFees,
  createOrder,
  createGuestOrder,
  initiateCheckout,
  initiateGuestCheckout,
  retryCheckout,
  verifyPayment,
  checkPincodeServiceability,
} from '../../services/orders';
import {
  toastOrderPlaced,
  toastOrderError,
  showError,
} from '../../utils/toast';
import { fbTrack } from '../../utils/pixel';

/* Gripzus cart drawer — full in-drawer checkout, same flow & design as
   the Knitwink cart drawer (guest + signed-in). Styled via CartDrawer.css
   (imported in _app.js). */

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

const FALLBACK_SHIPPING_FEES = [
  { id: 'fallback-prepaid', orderType: 'prepaid', fee: 0, isDefault: true },
  { id: 'fallback-cod', orderType: 'cod', fee: 0 },
];
const EMPTY_ADDR = {
  fullName: '', phoneNumber: '', address: '',
  city: '', state: '', postalCode: '', country: 'India', isDefault: false,
};

/* ── helpers ───────────────────────────────────────────────────────── */
function getOrCreateGuestSessionId() {
  if (typeof document === 'undefined') return 'guest-' + Date.now();
  const key = 'guestSessionId';
  const m = document.cookie.split('; ').find((r) => r.startsWith(key + '='));
  if (m) return m.split('=')[1];
  const id = 'guest-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  document.cookie = `${key}=${id}; expires=${new Date(Date.now() + 2592000000).toUTCString()}; path=/; SameSite=Lax`;
  return id;
}
const idemKey = () => 'idem-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
function isValidEmail(v) {
  const s = String(v || '').trim();
  if (!s.includes('@')) return false;
  const [l, d] = s.split('@');
  return !!l && !!d && d.includes('.') && !d.startsWith('.') && !d.endsWith('.');
}
const isValidMobile = (raw) => /^[6-9]\d{9}$/.test(String(raw || '').replace(/\D/g, '').slice(-10));
function getDeliveryDateStr() {
  const d = new Date(); d.setDate(d.getDate() + 5);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
function validateAddress(a) {
  if (!a) return ['Address is empty'];
  const e = [];
  if (!String(a.full_name || a.fullName || '').trim()) e.push('Customer name is required');
  if (String(a.address || '').trim().length < 10) e.push('Address is too short (min 10 characters)');
  if (!String(a.city || '').trim()) e.push('City is required');
  if (!String(a.state || '').trim()) e.push('State is required');
  if (!/^\d{6}$/.test(String(a.postal_code || a.postalCode || '').trim())) e.push('PIN code must be 6 digits');
  if (!isValidMobile(a.phone_number || a.phoneNumber || a.phone)) e.push('Valid 10-digit mobile number is required');
  return e;
}

/* ── icons ─────────────────────────────────────────────────────────── */
const IconBag = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>;
const IconX = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const IconTrash = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>;
const IconEdit = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const IconPlus = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const IconSuccess = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
const IconTruck = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>;
const IconMoney = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C9 2 7 4 7 6h10c0-2-2-4-5-4z" /><path d="M7 6C4 6 2 9 2 12c0 5 4 10 10 10s10-5 10-10c0-3-2-6-5-6H7z" /><path d="M12 10v4M10 12h4" /></svg>;

export default function CartDrawer() {
  const router = useRouter();
  const { items, open, closeCart, clearCart, removeItem, updateQty, lineKey } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [guestInfo, setGuestInfo] = useState({ email: '', fullName: '', phone: '' });
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDR);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);

  const [shippingFees, setShippingFees] = useState([]);
  const [selectedFee, setSelectedFee] = useState(null);
  const [codAllowed, setCodAllowed] = useState(true);
  const [pincodeServiceable, setPincodeServiceable] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [paymentFailed, setPaymentFailed] = useState(null);

  const getPrice = (it) => Number(it.salePrice ?? it.price ?? 0);
  const getMrp = (it) => {
    const sale = it.salePrice != null ? Number(it.salePrice) : null;
    const base = Number(it.price ?? 0);
    if (sale != null && base > sale) return base;
    return Number(it.compareAtPrice ?? 0);
  };

  /* shipping fees on open */
  useEffect(() => {
    if (!open) return;
    getShippingFees()
      .then((data) => {
        const raw = Array.isArray(data) ? data : data?.shippingFees || data?.fees || [];
        const fees = raw.length ? raw : FALLBACK_SHIPPING_FEES;
        setShippingFees(fees);
        setSelectedFee((prev) => prev || fees.find((f) => f.orderType === 'prepaid') || fees[0] || null);
      })
      .catch(() => { setShippingFees(FALLBACK_SHIPPING_FEES); setSelectedFee(FALLBACK_SHIPPING_FEES[0]); });
  }, [open]);

  /* addresses on open (signed-in) */
  useEffect(() => {
    if (!open || !isAuthenticated) return;
    setAddressLoading(true);
    getUserAddresses()
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setAddresses(arr);
        setSelectedAddress((prev) => prev || arr.find((a) => a.isDefault || a.is_default) || arr[0] || null);
      })
      .catch(() => {})
      .finally(() => setAddressLoading(false));
  }, [open, isAuthenticated]);

  /* guests: open the address form straight away */
  useEffect(() => {
    if (open && !isAuthenticated && !selectedAddress) setShowAddressForm(true);
  }, [open, isAuthenticated, selectedAddress]);

  /* escape to close */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') closeCart(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeCart]);

  /* totals */
  const cartTotal = items.reduce((s, i) => s + getPrice(i) * i.qty, 0);
  const totalQty = items.reduce((s, i) => s + (i.qty || 1), 0);
  const shippingFee = Number(selectedFee?.fee || 0);
  const finalTotal = Math.max(0, cartTotal + shippingFee);
  const isCod = selectedFee?.orderType === 'cod';
  const isPrepaid = selectedFee?.orderType === 'prepaid';

  const sortedFees = useMemo(() => {
    const arr = [...shippingFees];
    arr.sort((a, b) => (a.orderType === 'cod' ? -1 : b.orderType === 'cod' ? 1 : 0));
    return arr;
  }, [shippingFees]);

  /* Meta funnel: InitiateCheckout — fire once when the drawer opens with items
     (this drawer is the full in-drawer checkout). */
  useEffect(() => {
    if (!open || items.length === 0) return;
    fbTrack('InitiateCheckout', {
      content_ids: items.map((i) => String(i.id)),
      content_type: 'product',
      contents: items.map((i) => ({ id: String(i.id), quantity: i.qty || 1 })),
      num_items: items.reduce((s, i) => s + (i.qty || 1), 0),
      value: items.reduce((s, i) => s + getPrice(i) * i.qty, 0),
      currency: 'INR',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ── address handlers ─────────────────────────────────────────── */
  const handleAddrChange = (e) => {
    const { name, value, type, checked } = e.target;
    let v = type === 'checkbox' ? checked : value;
    if (name === 'phoneNumber') v = String(v).replace(/\D/g, '').slice(0, 10);
    if (name === 'postalCode') v = String(v).replace(/\D/g, '').slice(0, 6);
    setAddressForm((p) => ({ ...p, [name]: v }));
  };

  const handlePincodeBlur = async (e) => {
    const pin = e.target.value.replace(/\D/g, '');
    if (pin.length !== 6) return;
    try {
      const r = await checkPincodeServiceability(pin);
      setCodAllowed(r?.cod_allowed !== false);
      setPincodeServiceable(r?.serviceable !== false);
    } catch { setCodAllowed(true); setPincodeServiceable(true); }
  };

  const handleEditAddress = (a) => {
    setEditingAddressId(a.id);
    setAddressForm({
      fullName: a.full_name || a.fullName || '',
      phoneNumber: a.phone_number || a.phoneNumber || '',
      address: a.address || '',
      city: a.city || '',
      state: a.state || '',
      postalCode: a.postal_code || a.postalCode || '',
      country: a.country || 'India',
      isDefault: a.isDefault || a.is_default || false,
    });
    setShowAddressForm(true);
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    const fd = isAuthenticated
      ? addressForm
      : { ...addressForm, fullName: guestInfo.fullName.trim() || addressForm.fullName, phoneNumber: guestInfo.phone || addressForm.phoneNumber };
    const errs = validateAddress({
      full_name: fd.fullName, address: fd.address, city: fd.city, state: fd.state,
      postal_code: fd.postalCode, phone_number: isAuthenticated ? fd.phoneNumber : guestInfo.phone,
    });
    if (errs.length) { showError(errs[0]); return; }

    setAddressSaving(true);
    try {
      if (isAuthenticated) {
        const saved = editingAddressId
          ? await updateShippingAddress(editingAddressId, fd)
          : await createShippingAddress(fd);
        const fresh = await getUserAddresses();
        setAddresses(Array.isArray(fresh) ? fresh : []);
        setSelectedAddress(saved || fd);
      } else {
        setSelectedAddress({
          id: Date.now(), full_name: fd.fullName, phone_number: guestInfo.phone || fd.phoneNumber,
          address: fd.address, city: fd.city, state: fd.state, postal_code: fd.postalCode, country: fd.country,
        });
      }
      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm(EMPTY_ADDR);
    } catch (err) {
      showError(err.message || 'Failed to save address.');
    } finally {
      setAddressSaving(false);
    }
  };

  /* ── order placement ──────────────────────────────────────────── */
  const itemsPayload = () => items
    .filter((it) => it.id != null && !isNaN(Number(it.id)))
    .map((it) => ({
      product_id: Number(it.id),
      variation_id: it.variationId ? Number(it.variationId) : null,
      quantity: Number(it.qty) || 1,
    }));

  const guestParts = () => {
    const p = String(guestInfo.fullName || '').trim().split(/\s+/);
    return { firstName: p[0] || '', lastName: p.slice(1).join(' ') || '' };
  };
  const shippingAddressPayload = () => ({
    fullName: selectedAddress.full_name || selectedAddress.fullName,
    address: selectedAddress.address, city: selectedAddress.city, state: selectedAddress.state,
    pincode: selectedAddress.postal_code || selectedAddress.postalCode,
    phone: selectedAddress.phone_number || selectedAddress.phoneNumber || guestInfo.phone,
    country: selectedAddress.country || 'India',
  });

  const placeCod = async () => {
    setIsProcessing(true);
    try {
      const base = {
        items: itemsPayload(), payment_type: 'cod', notes: '',
        discount_amount: 0, coupon_id: null, idempotency_key: idemKey(),
      };
      let result;
      if (isAuthenticated) {
        result = await createOrder({ shipping_address_id: selectedAddress.id, ...base });
      } else {
        const { firstName, lastName } = guestParts();
        result = await createGuestOrder({
          guest_info: { email: guestInfo.email, firstName, lastName, phone: guestInfo.phone },
          shipping_address: shippingAddressPayload(), ...base, session_id: getOrCreateGuestSessionId(),
        });
      }
      if (!result?.order) throw new Error('Order creation failed.');
      clearCart();
      toastOrderPlaced(result.order.order_number);
      setOrderSuccess({ orderNumber: result.order.order_number });
    } catch (err) {
      toastOrderError(err.message || 'Order placement failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadRazorpay = () => new Promise((resolve) => {
    if (document.getElementById('rzp-script')) return resolve(true);
    const s = document.createElement('script');
    s.id = 'rzp-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const openRazorpay = (rzpOrder, reservationId) => {
    const rzp = new window.Razorpay({
      key: RAZORPAY_KEY,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      name: 'Gripzus',
      description: 'Payment for your Gripzus order',
      order_id: rzpOrder.id,
      prefill: {
        name: isAuthenticated ? (user?.username || user?.name || '') : guestInfo.fullName,
        email: isAuthenticated ? (user?.email || '') : guestInfo.email,
        contact: selectedAddress?.phone_number || selectedAddress?.phoneNumber || guestInfo.phone || '',
      },
      theme: { color: '#0a0a0a' },
      handler: async (resp) => {
        try {
          const result = await verifyPayment({
            razorpayPaymentId: resp.razorpay_payment_id,
            razorpayOrderId: resp.razorpay_order_id,
            razorpaySignature: resp.razorpay_signature,
            reservation_id: reservationId,
          });
          clearCart();
          setPaymentFailed(null);
          toastOrderPlaced(result.order?.order_number);
          setOrderSuccess({ orderNumber: result.order?.order_number || '—' });
        } catch {
          clearCart();
          setOrderSuccess({ orderNumber: '—' });
        } finally {
          setIsProcessing(false);
        }
      },
      modal: { ondismiss: () => { setPaymentFailed({ error: 'Payment was cancelled.', reservationId }); setIsProcessing(false); } },
    });
    rzp.on('payment.failed', (r) => {
      setPaymentFailed({ error: r.error?.description || 'Payment failed.', reservationId });
      setIsProcessing(false);
    });
    rzp.open();
  };

  const placePrepaid = async () => {
    if (!RAZORPAY_KEY) { showError('Online payment is not configured. Please choose Cash on Delivery.'); return; }
    setIsProcessing(true);
    try {
      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) { showError('Could not load the payment SDK.'); setIsProcessing(false); return; }
      const base = {
        items: itemsPayload(), payment_type: 'razorpay', notes: '',
        discount_amount: 0, coupon_id: null, idempotency_key: idemKey(),
      };
      let result;
      if (isAuthenticated) {
        result = await initiateCheckout({ shipping_address_id: selectedAddress.id, ...base });
      } else {
        const { firstName, lastName } = guestParts();
        // Backend /api/checkout/guest/initiate expects guest_info as
        // a nested object — same shape placeCod above already uses.
        // The previous flat email/phone/firstName/lastName tripped a
        // "guest_info: Required" validation error.
        result = await initiateGuestCheckout({
          guest_info: { email: guestInfo.email, firstName, lastName, phone: guestInfo.phone },
          shipping_address: shippingAddressPayload(),
          ...base,
          session_id: getOrCreateGuestSessionId(),
        });
      }
      if (!result?.success || !result?.razorpay_order) throw new Error(result?.message || 'Checkout failed.');
      openRazorpay(result.razorpay_order, result.reservation_id);
    } catch (err) {
      showError(err.message || 'Failed to start checkout.');
      setIsProcessing(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { showError('Please add a delivery address.'); return; }
    const errs = validateAddress(selectedAddress);
    if (errs.length) { showError(errs[0]); return; }
    if (!pincodeServiceable) { showError("Sorry, we don’t deliver to this PIN code yet. Please try a different address."); return; }
    if (!selectedFee) { showError('Please select a payment method.'); return; }
    if (!isAuthenticated) {
      if (!guestInfo.fullName.trim()) { showError('Please enter your full name.'); return; }
      if (!isValidEmail(guestInfo.email)) { showError('Please enter a valid email address.'); return; }
      if (!isValidMobile(guestInfo.phone)) { showError('Please enter a valid 10-digit mobile number.'); return; }
    }
    if (isCod) return placeCod();
    if (isPrepaid) return placePrepaid();
    showError('Please select a payment method.');
  };

  return (
    <>
      <div className={`cd-backdrop ${open ? 'cd-backdrop-active' : ''}`} onClick={closeCart} />
      <div className="cd-clip">
      <div className={`cd-drawer ${open ? 'cd-drawer-open' : ''}`} role="dialog" aria-modal="true" aria-label="Shopping cart">

        {/* Header */}
        <div className="cd-header">
          <div className="cd-header-left">
            <span className="cd-header-icon"><IconBag /></span>
            <div>
              <span className="cd-header-title">{orderSuccess ? 'Order Confirmed' : 'Your Cart'}</span>
              {!orderSuccess && <span className="cd-header-count">{totalQty}</span>}
            </div>
          </div>
          <button className="cd-close-btn" onClick={closeCart} aria-label="Close cart"><IconX /></button>
        </div>

        {/* Body */}
        <div className="cd-body">
          {orderSuccess ? (
            <div className="cd-success">
              <div className="cd-success-icon"><IconSuccess /></div>
              <h3 className="cd-success-title">Order Placed!</h3>
              <p className="cd-success-order">Order #{orderSuccess.orderNumber}</p>
              <p className="cd-success-msg">Thank you! You&apos;ll receive a confirmation shortly.</p>
              <button className="cd-btn-primary cd-btn-full" onClick={() => { closeCart(); router.push(`/track-order?order=${orderSuccess.orderNumber}`); }}>Track Order</button>
              <button className="cd-btn-ghost" style={{ marginTop: 8 }} onClick={closeCart}>Continue Shopping</button>
            </div>
          ) : paymentFailed ? (
            <div className="cd-success">
              <h3 className="cd-success-title">Payment Failed</h3>
              <p className="cd-success-msg">{paymentFailed.error}</p>
              <button
                className="cd-btn-primary cd-btn-full"
                disabled={isProcessing}
                onClick={async () => {
                  setIsProcessing(true);
                  try {
                    const r = await retryCheckout(paymentFailed.reservationId);
                    if (!r?.success || !r?.razorpay_order) throw new Error(r?.message || 'Retry failed.');
                    setPaymentFailed(null);
                    openRazorpay(r.razorpay_order, r.reservation_id);
                  } catch (err) { showError(err.message || 'Could not retry.'); setIsProcessing(false); }
                }}
              >
                {isProcessing ? 'Loading…' : 'Retry Payment'}
              </button>
              <button className="cd-btn-ghost" style={{ marginTop: 8 }} onClick={() => setPaymentFailed(null)}>Back to Cart</button>
            </div>
          ) : items.length === 0 ? (
            <div className="cd-empty">
              <span className="cd-empty-icon"><IconBag /></span>
              <p>Your cart is empty</p>
              <button className="cd-btn-primary" onClick={closeCart}>Continue Shopping</button>
            </div>
          ) : (
            <div className="cd-single-view">

              {/* Items */}
              <div className="cd-sv-section">
                <div className="cd-section-title">Items</div>
                <div className="cd-items-list">
                  {items.map((it) => {
                    const key = lineKey(it);
                    const price = getPrice(it);
                    const mrp = getMrp(it);
                    return (
                      <div key={key} className="cd-item">
                        <div className="cd-item-img">
                          {it.image ? <img src={it.image} alt={it.name} /> : <div className="cd-item-img-placeholder" />}
                        </div>
                        <div className="cd-item-info">
                          <p className="cd-item-name">{it.name}</p>
                          {it.color && <p className="cd-item-meta">Colour: {it.color}</p>}
                          {it.size  && <p className="cd-item-meta">Size: {it.size}</p>}
                          <div className="cd-item-row">
                            <div className="cd-item-prices">
                              <span className="cd-item-price">₹{(price * it.qty).toFixed(0)}</span>
                              {mrp > price && <span className="cd-item-original-price">₹{(mrp * it.qty).toFixed(0)}</span>}
                            </div>
                            <div className="cd-qty">
                              <button className="cd-qty-btn" onClick={() => updateQty(key, it.qty - 1)} disabled={it.qty <= 1} aria-label="Decrease">−</button>
                              <span className="cd-qty-val">{it.qty}</span>
                              <button className="cd-qty-btn" onClick={() => updateQty(key, it.qty + 1)} aria-label="Increase">+</button>
                            </div>
                          </div>
                        </div>
                        <button className="cd-item-remove" onClick={() => removeItem(key)} aria-label="Remove"><IconTrash /></button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Summary */}
              <div className="cd-sv-section">
                <div className="cd-section-title">Order Summary</div>
                <div className="cd-summary">
                  <div className="cd-summary-row"><span>Subtotal</span><span>₹{cartTotal.toFixed(0)}</span></div>
                  <div className="cd-summary-row">
                    <span>Shipping</span>
                    <span style={shippingFee === 0 ? { color: '#16a34a', fontWeight: 700 } : {}}>{shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}</span>
                  </div>
                  <div className="cd-summary-row cd-summary-total"><span>Total</span><span>₹{finalTotal.toFixed(0)}</span></div>
                </div>
              </div>

              {/* Delivery details */}
              <div className="cd-sv-section">
                <div className="cd-section-title">{isAuthenticated ? 'Delivery Address' : 'Delivery Details'}</div>
                {addressLoading ? (
                  <p className="cd-loading">Loading addresses…</p>
                ) : (
                  <>
                    {selectedAddress && !showAddressForm && (
                      <div className="cd-address-card cd-address-selected">
                        <div className="cd-address-radio"><div className="cd-radio-dot active" /></div>
                        <div className="cd-address-body">
                          <p className="cd-address-name">{selectedAddress.full_name || selectedAddress.fullName}</p>
                          <p className="cd-address-line">{selectedAddress.address}</p>
                          <p className="cd-address-line">{selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code || selectedAddress.postalCode}</p>
                          <p className="cd-address-line">{selectedAddress.phone_number || selectedAddress.phoneNumber}</p>
                        </div>
                        <button className="cd-address-edit" onClick={() => handleEditAddress(selectedAddress)} aria-label="Edit"><IconEdit /></button>
                      </div>
                    )}

                    {isAuthenticated && !showAddressForm && addresses.filter((a) => a.id !== selectedAddress?.id).length > 0 && (
                      <div className="cd-other-addresses">
                        {addresses.filter((a) => a.id !== selectedAddress?.id).map((a) => (
                          <div key={a.id} className="cd-address-card" onClick={() => setSelectedAddress(a)}>
                            <div className="cd-address-radio"><div className="cd-radio-dot" /></div>
                            <div className="cd-address-body">
                              <p className="cd-address-name">{a.full_name || a.fullName}</p>
                              <p className="cd-address-line">{a.city}, {a.state} {a.postal_code || a.postalCode}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!showAddressForm && (
                      <button className="cd-add-address-btn" onClick={() => { setShowAddressForm(true); setEditingAddressId(null); setAddressForm(EMPTY_ADDR); }}>
                        <IconPlus /> Add {selectedAddress ? 'another' : 'a new'} address
                      </button>
                    )}

                    {showAddressForm && (
                      <form className="cd-address-form" onSubmit={handleSaveAddress}>
                        <div className="cd-form-grid">
                          {!isAuthenticated && (
                            <>
                              <div className="cd-form-group cd-form-full">
                                <label className="cd-label">Full Name *</label>
                                <input className="cd-input" value={guestInfo.fullName} onChange={(e) => setGuestInfo((p) => ({ ...p, fullName: e.target.value }))} placeholder="Full name" autoComplete="name" />
                              </div>
                              <div className="cd-form-group">
                                <label className="cd-label">Email *</label>
                                <input className="cd-input" type="email" value={guestInfo.email} onChange={(e) => setGuestInfo((p) => ({ ...p, email: e.target.value }))} placeholder="name@example.com" autoComplete="email" />
                              </div>
                              <div className="cd-form-group">
                                <label className="cd-label">Phone *</label>
                                <input className="cd-input" type="tel" inputMode="numeric" maxLength={10} value={guestInfo.phone} onChange={(e) => setGuestInfo((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="10-digit mobile" autoComplete="tel" />
                              </div>
                            </>
                          )}
                          {isAuthenticated && (
                            <>
                              <div className="cd-form-group">
                                <label className="cd-label">Full Name *</label>
                                <input className="cd-input" name="fullName" value={addressForm.fullName} onChange={handleAddrChange} placeholder="Full name" autoComplete="name" />
                              </div>
                              <div className="cd-form-group">
                                <label className="cd-label">Phone *</label>
                                <input className="cd-input" name="phoneNumber" type="tel" inputMode="numeric" maxLength={10} value={addressForm.phoneNumber} onChange={handleAddrChange} placeholder="10-digit mobile" autoComplete="tel" />
                              </div>
                            </>
                          )}
                          <div className="cd-form-group cd-form-full">
                            <label className="cd-label">Address *</label>
                            <input className="cd-input" name="address" value={addressForm.address} onChange={handleAddrChange} placeholder="House/flat no., street, area" autoComplete="street-address" />
                          </div>
                          <div className="cd-form-group">
                            <label className="cd-label">City *</label>
                            <input className="cd-input" name="city" value={addressForm.city} onChange={handleAddrChange} placeholder="City" autoComplete="address-level2" />
                          </div>
                          <div className="cd-form-group">
                            <label className="cd-label">State *</label>
                            <input className="cd-input" name="state" value={addressForm.state} onChange={handleAddrChange} placeholder="State" autoComplete="address-level1" />
                          </div>
                          <div className="cd-form-group">
                            <label className="cd-label">PIN Code *</label>
                            <input className="cd-input" name="postalCode" inputMode="numeric" maxLength={6} value={addressForm.postalCode} onChange={handleAddrChange} onBlur={handlePincodeBlur} placeholder="6-digit PIN" autoComplete="postal-code" />
                            {!pincodeServiceable && (
                              <p role="alert" style={{ color: '#dc2626', fontSize: 12, margin: '6px 0 0' }}>Sorry, we don’t deliver to this PIN code yet.</p>
                            )}
                          </div>
                          <div className="cd-form-group">
                            <label className="cd-label">Country</label>
                            <input className="cd-input" name="country" value={addressForm.country} onChange={handleAddrChange} placeholder="Country" />
                          </div>
                        </div>
                        <div className="cd-form-actions">
                          <button type="submit" className="cd-btn-primary" disabled={addressSaving}>
                            {addressSaving ? 'Saving…' : editingAddressId ? 'Update Address' : 'Save Address'}
                          </button>
                          {(selectedAddress || isAuthenticated) && (
                            <button type="button" className="cd-btn-ghost" onClick={() => { setShowAddressForm(false); setEditingAddressId(null); }}>Cancel</button>
                          )}
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>

              {/* Payment method */}
              {sortedFees.length > 0 && (
                <div className="cd-sv-section">
                  <div className="cd-section-title">How would you like to pay?</div>
                  <div className="cd-delivery-list">
                    {sortedFees.map((fee) => {
                      const blocked = fee.orderType === 'cod' && !codAllowed;
                      const sel = selectedFee?.id === fee.id;
                      const free = Number(fee.fee || 0) === 0;
                      return (
                        <button
                          key={fee.id}
                          type="button"
                          disabled={blocked}
                          onClick={() => setSelectedFee(fee)}
                          className={`cd-delivery-card ${fee.orderType === 'cod' ? 'cd-delivery-cod' : 'cd-delivery-prepaid'} ${sel ? 'cd-delivery-selected' : ''} ${blocked ? 'cd-delivery-disabled' : ''}`}
                        >
                          <span className="cd-delivery-icon">{fee.orderType === 'cod' ? <IconMoney /> : <IconTruck />}</span>
                          <div className="cd-delivery-info">
                            <p className="cd-delivery-name">{fee.orderType === 'cod' ? 'Cash on Delivery' : 'Pay Online (UPI / Card)'}</p>
                            {fee.orderType === 'cod' && !blocked && <span className="cd-delivery-popular">⭐ Most Popular</span>}
                            {blocked && <p className="cd-delivery-desc" style={{ color: '#dc2626' }}>Not available for this pincode</p>}
                            <p className="cd-delivery-desc">Delivery by {getDeliveryDateStr()}</p>
                          </div>
                          <div className="cd-delivery-fee-wrap">
                            <span className={`cd-delivery-fee ${free ? 'free' : ''}`}>{free ? 'FREE' : `₹${Number(fee.fee).toFixed(0)}`}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!orderSuccess && !paymentFailed && items.length > 0 && (
          <div className="cd-footer">
            {!pincodeServiceable && (
              <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
                We don’t deliver to this PIN code yet — please try a different delivery address.
              </div>
            )}
            <button className="cd-btn-primary cd-btn-full" onClick={handlePlaceOrder} disabled={isProcessing || !pincodeServiceable}>
              {isProcessing ? 'Processing…' : `Place Order — ₹${finalTotal.toFixed(0)}`}
            </button>
            <div className="cd-trust-bar">
              <span className="cd-trust-item">Secure checkout</span>
              <span className="cd-trust-sep">·</span>
              <span className="cd-trust-item">Easy returns</span>
              <span className="cd-trust-sep">·</span>
              <span className="cd-trust-item">100% genuine</span>
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
