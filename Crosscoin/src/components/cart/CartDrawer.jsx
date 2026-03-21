import React, { useEffect, useState, useRef } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import SafeImage from '../common/SafeImage';
import {
  getUserShippingAddresses,
  createShippingAddress,
  updateShippingAddress,
  getShippingFees,
  validateCoupon,
  getPublicCoupons,
  createOrder,
  createGuestOrder,
  createRazorpayOrder,
  updateOrderPayment,
} from '../../services/publicApi';
import {
  showOrderPlacedSuccessToast,
  showOrderPlacedErrorToast,
  showValidationErrorToast,
} from '../../utils/toast';
import { fbqTrack } from '../../utils/fbqTrack';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pickImage(item) {
  if (Array.isArray(item.images) && item.images.length > 0)
    return item.images[0].image_url || item.images[0];
  return item.image || null;
}
function getPrice(item) {
  return parseFloat(item.variation?.price || item.price || 0);
}
function getAttr(item, key) {
  if (item.variation?.attributes) {
    const a = typeof item.variation.attributes === 'string'
      ? JSON.parse(item.variation.attributes) : item.variation.attributes;
    if (a[key]) return Array.isArray(a[key]) ? a[key].join(', ') : a[key];
  }
  if (item[key]) return Array.isArray(item[key]) ? item[key].join(', ') : item[key];
  return null;
}

const EMPTY_ADDR = {
  fullName: '', phoneNumber: '', address: '',
  city: '', state: '', postalCode: '', country: 'India', isDefault: false,
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconX = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconBag = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
const IconTrash = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IconCheck = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconEdit = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconPlus = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconTag = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
const IconTruck = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
const IconSuccess = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

// ─── Main Component ───────────────────────────────────────────────────────────

const CartDrawer = ({ isOpen, onClose }) => {
  const { cartItems, cartTotal, removeFromCart, updateQuantity, clearCart, lastAddedItem, buyNowItem, buyNowTotal, clearBuyNow } = useCart();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [isVisible, setIsVisible] = useState(false);

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Guest contact
  const [guestInfo, setGuestInfo] = useState({ email: '', firstName: '', lastName: '', phone: '' });

  // Address
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDR);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);

  // Delivery
  const [shippingFees, setShippingFees] = useState([]);
  const [selectedFee, setSelectedFee] = useState(null);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('cod');

  // Order
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Offer bar
  const [offerData, setOfferData] = useState(null);

  // Scroll hint
  const bodyRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  // ── Visibility ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const t = setTimeout(() => { setIsVisible(false); setOrderSuccess(null); }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ── Restore coupon ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const saved = sessionStorage.getItem('appliedCoupon');
    if (saved) {
      try {
        const c = JSON.parse(saved);
        setAppliedCoupon(c);
        if (c.paymentMode) setSelectedPaymentMode(c.paymentMode);
      } catch (_) {}
    }
  }, [isOpen]);

  // ── Shipping fees ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    getShippingFees().then(data => {
      const fees = Array.isArray(data) ? data : data?.shippingFees || data?.fees || [];
      setShippingFees(fees);
      if (!selectedFee && fees.length > 0) {
        const def = fees.find(f => f.isDefault) || fees[0];
        setSelectedFee(def);
        setSelectedPaymentMode(def.orderType === 'prepaid' ? 'prepaid' : 'cod');
      }
    }).catch(() => {});
  }, [isOpen]);

  // ── Load addresses ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    setAddressLoading(true);
    getUserShippingAddresses().then(data => {
      setAddresses(data || []);
      const def = (data || []).find(a => a.isDefault || a.is_default);
      if (def && !selectedAddress) setSelectedAddress(def);
    }).catch(() => {}).finally(() => setAddressLoading(false));
  }, [isOpen, isAuthenticated]);

  // ── Body class for back-to-top hiding ──────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('cd-drawer-open-body');
    } else {
      document.body.classList.remove('cd-drawer-open-body');
    }
    return () => document.body.classList.remove('cd-drawer-open-body');
  }, [isOpen]);

  // ── Scroll hint ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const check = () => {
      setShowScrollHint(el.scrollTop < el.scrollHeight - el.clientHeight - 40);
    };
    check();
    el.addEventListener('scroll', check, { passive: true });
    return () => el.removeEventListener('scroll', check);
  }, [isOpen, buyNowItem, cartItems.length]);

  // ── Offer bar ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (cartItems.length === 0) { setOfferData(null); return; }
    getPublicCoupons().then(res => {
      const coupons = (res?.coupons || []).filter(c => !c.firstOrderOnly);
      const applicable = coupons.filter(c =>
        !c.paymentModeRestriction || c.paymentModeRestriction === 'all' || c.paymentModeRestriction === selectedPaymentMode
      );
      if (!applicable.length) { setOfferData(null); return; }
      let best = null;
      for (const c of applicable) {
        const min = parseFloat(c.minPurchase || 0);
        if (cartTotal >= min) {
          let disc = 0;
          if (c.type === 'percentage') { disc = (cartTotal * parseFloat(c.value || 0)) / 100; const mx = parseFloat(c.maxDiscount || 0); if (mx > 0 && disc > mx) disc = mx; }
          else if (c.type === 'fixed') disc = parseFloat(c.value || 0);
          if (disc > 0 && (!best || disc > best.discount)) best = { type: 'available', coupon: c, discount: disc };
        } else {
          const remaining = min - cartTotal;
          let potDisc = 0;
          if (c.type === 'percentage') potDisc = (min * parseFloat(c.value || 0)) / 100;
          else if (c.type === 'fixed') potDisc = parseFloat(c.value || 0);
          if (potDisc > 0 && (!best || potDisc > best.discount)) best = { type: 'progress', coupon: c, discount: potDisc, remaining, progress: (cartTotal / min) * 100, required: min };
        }
      }
      setOfferData(best);
    }).catch(() => {});
  }, [cartItems, cartTotal, selectedPaymentMode]);

  // ── Computed totals ─────────────────────────────────────────────────────
  const activeItems = buyNowItem ? [buyNowItem] : cartItems;
  const activeTotal = buyNowItem ? buyNowTotal : cartTotal;
  const discountAmount = appliedCoupon ? parseFloat(appliedCoupon.discount || appliedCoupon.discountAmount || 0) : 0;
  const shippingFeeAmount = parseFloat(selectedFee?.fee || 0);
  const finalTotal = Math.max(0, activeTotal - discountAmount + shippingFeeAmount);
  const totalQty = activeItems.reduce((s, i) => s + (i.quantity || 1), 0);

  // ── Coupon ──────────────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true); setCouponError('');
    try {
      const res = await validateCoupon(couponCode.trim(), activeTotal, selectedPaymentMode);
      const coupon = { ...res, code: couponCode.trim(), discount: res.discountAmount || res.discount || 0 };
      setAppliedCoupon(coupon);
      sessionStorage.setItem('appliedCoupon', JSON.stringify(coupon));
      setCouponCode('');
    } catch (err) {
      setCouponError(err.message || 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    sessionStorage.removeItem('appliedCoupon');
    setCouponError('');
  };

  // ── Delivery fee ────────────────────────────────────────────────────────
  const handleSelectFee = (fee) => {
    setSelectedFee(fee);
    const mode = fee.orderType === 'prepaid' ? 'prepaid' : 'cod';
    setSelectedPaymentMode(mode);
    if (fee.orderType === 'cod' && appliedCoupon) {
      handleRemoveCoupon();
      showValidationErrorToast('Coupons are not applicable for Cash on Delivery orders');
    }
  };

  // ── Address form ────────────────────────────────────────────────────────
  const handleAddrChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      fullName: addr.full_name || addr.fullName || '',
      phoneNumber: addr.phone_number || addr.phoneNumber || '',
      address: addr.address || '',
      city: addr.city || '',
      state: addr.state || '',
      postalCode: addr.postal_code || addr.postalCode || '',
      country: addr.country || 'India',
      isDefault: addr.isDefault || addr.is_default || false,
    });
    setShowAddressForm(true);
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setAddressSaving(true);
    // For guests, merge name/phone from guestInfo into the address
    const formData = isAuthenticated
      ? addressForm
      : { ...addressForm, fullName: `${guestInfo.firstName} ${guestInfo.lastName}`.trim() || addressForm.fullName, phoneNumber: guestInfo.phone || addressForm.phoneNumber };
    try {
      if (isAuthenticated) {
        let saved;
        if (editingAddressId) saved = await updateShippingAddress(editingAddressId, formData);
        else saved = await createShippingAddress(formData);
        const fresh = await getUserShippingAddresses();
        setAddresses(fresh || []);
        setSelectedAddress(saved || formData);
      } else {
        const saved = { id: Date.now(), full_name: formData.fullName, phone_number: formData.phoneNumber, address: formData.address, city: formData.city, state: formData.state, postal_code: formData.postalCode, country: formData.country };
        setSelectedAddress(saved);
      }
      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm(EMPTY_ADDR);
    } catch {
      showValidationErrorToast('Failed to save address. Please try again.');
    } finally {
      setAddressSaving(false);
    }
  };

  // ── Razorpay ────────────────────────────────────────────────────────────
  const loadRazorpay = () => new Promise(resolve => {
    if (document.getElementById('rzp-script')) return resolve(true);
    const s = document.createElement('script');
    s.id = 'rzp-script'; s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true); s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  // ── Place order ─────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!selectedAddress || !selectedFee) {
      showValidationErrorToast('Please select a delivery address and method.');
      return;
    }
    if (!isAuthenticated && (!guestInfo.email || !guestInfo.firstName || !guestInfo.phone)) {
      showValidationErrorToast('Please fill in all contact information.');
      return;
    }
    setIsProcessing(true);

    const itemsPayload = activeItems.map(item => ({
      product_id: item.productId || item.id,
      variation_id: item.variationId || item.variation?.id || null,
      quantity: item.quantity,
    }));

    const orderData = isAuthenticated
      ? { shipping_address_id: selectedAddress.id, items: itemsPayload, payment_type: selectedFee.orderType === 'cod' ? 'cod' : 'upi', notes: '', discount_amount: discountAmount, coupon_id: appliedCoupon?.id || null }
      : { guest_info: guestInfo, shipping_address: { fullName: selectedAddress.full_name || selectedAddress.fullName, address: selectedAddress.address, city: selectedAddress.city, state: selectedAddress.state, pincode: selectedAddress.postal_code || selectedAddress.postalCode, phone: selectedAddress.phone_number || selectedAddress.phoneNumber }, items: itemsPayload, payment_type: selectedFee.orderType === 'cod' ? 'cod' : 'upi', notes: '', discount_amount: discountAmount, coupon_id: appliedCoupon?.id || null, session_id: sessionStorage.getItem('sessionId') || 'guest-' + Date.now(), ip_address: window.location.hostname, user_agent: window.navigator.userAgent };

    try {
      if (selectedFee.orderType === 'cod') {
        const result = isAuthenticated ? await createOrder(orderData) : await createGuestOrder(orderData);
        if (!result?.order) throw new Error('Order creation failed.');
        try { fbqTrack('Purchase', { value: Number(finalTotal.toFixed(2)), currency: 'INR', content_type: 'product', contents: activeItems.map(i => ({ id: String(i.productId || i.id), quantity: i.quantity })) }); } catch (_) {}
        clearCart(); clearBuyNow(); sessionStorage.removeItem('appliedCoupon');
        showOrderPlacedSuccessToast(result.order.order_number);
        setOrderSuccess({ orderNumber: result.order.order_number });
      } else {
        const scriptLoaded = await loadRazorpay();
        if (!scriptLoaded || !window.Razorpay) { showOrderPlacedErrorToast('Failed to load payment SDK.'); setIsProcessing(false); return; }
        const rzpOrder = await createRazorpayOrder({ amount: finalTotal, currency: 'INR', receipt: `rcpt_${Date.now()}`, isGuest: !isAuthenticated });
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: rzpOrder.amount, currency: rzpOrder.currency,
          name: 'Cross Coin', description: 'Payment for Cross Coin Order', order_id: rzpOrder.id,
          prefill: { name: isAuthenticated ? (user?.name || '') : `${guestInfo.firstName} ${guestInfo.lastName}`, email: isAuthenticated ? (user?.email || '') : guestInfo.email, contact: selectedAddress?.phone_number || selectedAddress?.phoneNumber || '' },
          theme: { color: '#CE1E36' },
          handler: async (response) => {
            try {
              const result = isAuthenticated ? await createOrder(orderData) : await createGuestOrder(orderData);
              if (!result?.order) throw new Error('Order creation failed.');
              await updateOrderPayment({ orderId: result.order.id, razorpayPaymentId: response.razorpay_payment_id, razorpayOrderId: response.razorpay_order_id, razorpaySignature: response.razorpay_signature });
              try { fbqTrack('Purchase', { value: Number(finalTotal.toFixed(2)), currency: 'INR', content_type: 'product', contents: activeItems.map(i => ({ id: String(i.productId || i.id), quantity: i.quantity })) }); } catch (_) {}
              clearCart(); clearBuyNow(); sessionStorage.removeItem('appliedCoupon');
              showOrderPlacedSuccessToast(result.order.order_number);
              setOrderSuccess({ orderNumber: result.order.order_number });
            } catch { showOrderPlacedErrorToast('Payment successful but order creation failed. Please contact support.'); }
          },
          modal: { ondismiss: () => { showOrderPlacedErrorToast('Payment was cancelled.'); setIsProcessing(false); } },
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (r) => { showOrderPlacedErrorToast('Payment failed: ' + (r.error.description || 'Please try again')); setIsProcessing(false); });
        rzp.open();
        return;
      }
    } catch (err) {
      showOrderPlacedErrorToast(err.response?.data?.message || err.message || 'Order placement failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isVisible) return null;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <div className={`cd-backdrop ${isOpen ? 'cd-backdrop-active' : ''}`} onClick={onClose} />
      <div className={`cd-drawer ${isOpen ? 'cd-drawer-open' : ''}`} role="dialog" aria-modal="true" aria-label="Shopping cart">

        {/* Header */}
        <div className="cd-header">
          <div className="cd-header-left">
            <span className="cd-header-icon"><IconBag /></span>
            <div>
              <span className="cd-header-title">{orderSuccess ? 'Order Confirmed' : 'Your Cart'}</span>
              {!orderSuccess && <span className="cd-header-count">{totalQty} item{totalQty !== 1 ? 's' : ''}</span>}
            </div>
          </div>
          <button className="cd-close-btn" onClick={onClose} aria-label="Close cart"><IconX /></button>
        </div>

        {/* Scrollable body — everything in one view */}
        <div className="cd-body" ref={bodyRef}>
          {orderSuccess ? (
            /* ── Success ── */
            <div className="cd-success">
              <div className="cd-success-icon"><IconSuccess /></div>
              <h3 className="cd-success-title">Order Placed!</h3>
              <p className="cd-success-order">Order #{orderSuccess.orderNumber}</p>
              <p className="cd-success-msg">Thank you! You will receive a confirmation shortly.</p>
              <button className="cd-btn-primary" onClick={() => { onClose(); router.push(`/ThankYou?order_number=${orderSuccess.orderNumber}`); }}>View Order</button>
              <button className="cd-btn-ghost" style={{ marginTop: 8 }} onClick={onClose}>Continue Shopping</button>
            </div>
          ) : activeItems.length === 0 ? (
            /* ── Empty ── */
            <div className="cd-empty">
              <span className="cd-empty-icon"><IconBag /></span>
              <p>Your cart is empty</p>
              <button className="cd-btn-primary" onClick={onClose}>Continue Shopping</button>
            </div>
          ) : (
            <div className="cd-single-view">

              {/* Offer bar */}
              {offerData && (
                <div className={`cd-offer-bar ${offerData.type === 'available' ? 'cd-offer-available' : 'cd-offer-progress'}`}>
                  <span className="cd-offer-icon"><IconTag /></span>
                  <div className="cd-offer-text">
                    {offerData.type === 'available'
                      ? <><strong>Get ₹{offerData.discount} OFF</strong> — use code <span className="cd-offer-code">{offerData.coupon.code}</span></>
                      : <>Add <strong>₹{offerData.remaining.toFixed(0)}</strong> more to unlock <strong>₹{offerData.discount} OFF</strong></>
                    }
                    {offerData.type === 'progress' && (
                      <div className="cd-offer-progress-bar">
                        <div className="cd-offer-progress-fill" style={{ width: `${Math.min(offerData.progress, 100)}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── 1. Items ── */}
              <div className="cd-section-title">Items</div>
              <div className="cd-items-list">
                {activeItems.map(item => {
                  const img = pickImage(item);
                  const price = getPrice(item);
                  const size = getAttr(item, 'size');
                  const color = getAttr(item, 'color');
                  return (
                    <div key={item.id} className={`cd-item ${lastAddedItem?.id === item.id ? 'cd-item-highlight' : ''}`}>
                      <div className="cd-item-img">
                        {img
                          ? <SafeImage imageData={{ image_url: img }} alt={item.name} width={80} height={80} quality={70} style={{ objectFit: 'cover' }} isProductCard />
                          : <div className="cd-item-img-placeholder" />}
                      </div>
                      <div className="cd-item-info">
                        <p className="cd-item-name">{item.name}</p>
                        {item.variation?.name && <p className="cd-item-meta">{item.variation.name}</p>}
                        {size && <p className="cd-item-meta">Size: {size}</p>}
                        {color && <p className="cd-item-meta">{color}</p>}
                        <div className="cd-item-row">
                          <span className="cd-item-price">₹{price.toFixed(2)}</span>
                          {!buyNowItem && (
                            <div className="cd-qty">
                              <button className="cd-qty-btn" onClick={() => updateQuantity(item.id, -1)} disabled={item.quantity <= 1}>−</button>
                              <span className="cd-qty-val">{item.quantity}</span>
                              <button className="cd-qty-btn" onClick={() => updateQuantity(item.id, 1)}>+</button>
                            </div>
                          )}
                        </div>
                      </div>
                      {!buyNowItem && (
                        <button className="cd-item-remove" onClick={() => removeFromCart(item.id)} aria-label="Remove item"><IconTrash /></button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── 2. Coupon ── */}
              <div className="cd-sv-section">
                <div className="cd-section-title">Coupon</div>
                {appliedCoupon ? (
                  <div className="cd-coupon-applied">
                    <span className="cd-coupon-applied-icon"><IconCheck /></span>
                    <span className="cd-coupon-applied-text"><strong>{appliedCoupon.code}</strong> — ₹{discountAmount.toFixed(2)} off</span>
                    <button className="cd-coupon-remove" onClick={handleRemoveCoupon}>Remove</button>
                  </div>
                ) : (
                  <div className="cd-coupon-input-row">
                    <input className="cd-coupon-input" type="text" placeholder="Enter coupon code" value={couponCode} onChange={e => setCouponCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()} />
                    <button className="cd-coupon-apply-btn" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}>{couponLoading ? '...' : 'Apply'}</button>
                  </div>
                )}
                {couponError && <p className="cd-coupon-error">{couponError}</p>}
              </div>

              {/* ── 3. Contact (guest only) ── */}
              {!isAuthenticated && (
                <div className="cd-sv-section">
                  <div className="cd-section-title">Contact Info</div>
                  <div className="cd-form-grid">
                    <div className="cd-form-group">
                      <label className="cd-label">First Name *</label>
                      <input className="cd-input" type="text" value={guestInfo.firstName} onChange={e => setGuestInfo(p => ({ ...p, firstName: e.target.value }))} placeholder="First name" />
                    </div>
                    <div className="cd-form-group">
                      <label className="cd-label">Last Name</label>
                      <input className="cd-input" type="text" value={guestInfo.lastName} onChange={e => setGuestInfo(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name" />
                    </div>
                    <div className="cd-form-group cd-form-full">
                      <label className="cd-label">Email *</label>
                      <input className="cd-input" type="email" value={guestInfo.email} onChange={e => setGuestInfo(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" />
                    </div>
                    <div className="cd-form-group cd-form-full">
                      <label className="cd-label">Phone *</label>
                      <input className="cd-input" type="tel" value={guestInfo.phone} onChange={e => setGuestInfo(p => ({ ...p, phone: e.target.value }))} placeholder="10-digit mobile number" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── 4. Delivery Address ── */}
              <div className="cd-sv-section">
                <div className="cd-section-title">Delivery Address</div>
                {addressLoading ? <p className="cd-loading">Loading addresses...</p> : (
                  <>
                    {isAuthenticated && addresses.length > 0 && (
                      <div className="cd-address-list">
                        {addresses.map(addr => (
                          <div key={addr.id} className={`cd-address-card ${selectedAddress?.id === addr.id ? 'cd-address-selected' : ''}`} onClick={() => setSelectedAddress(addr)}>
                            <div className="cd-address-radio"><div className={`cd-radio-dot ${selectedAddress?.id === addr.id ? 'active' : ''}`} /></div>
                            <div className="cd-address-body">
                              <p className="cd-address-name">{addr.full_name || addr.fullName} {(addr.isDefault || addr.is_default) && <span className="cd-default-tag">Default</span>}</p>
                              <p className="cd-address-line">{addr.address}</p>
                              <p className="cd-address-line">{addr.city}, {addr.state} {addr.postal_code}</p>
                              <p className="cd-address-line">{addr.phone_number}</p>
                            </div>
                            <button className="cd-address-edit" onClick={e => { e.stopPropagation(); handleEditAddress(addr); }} aria-label="Edit"><IconEdit /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    {!isAuthenticated && selectedAddress && !showAddressForm && (
                      <div className="cd-address-card cd-address-selected">
                        <div className="cd-address-radio"><div className="cd-radio-dot active" /></div>
                        <div className="cd-address-body">
                          <p className="cd-address-name">{selectedAddress.full_name}</p>
                          <p className="cd-address-line">{selectedAddress.address}</p>
                          <p className="cd-address-line">{selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code}</p>
                          <p className="cd-address-line">{selectedAddress.phone_number}</p>
                        </div>
                        <button className="cd-address-edit" onClick={() => { setAddressForm({ fullName: selectedAddress.full_name, phoneNumber: selectedAddress.phone_number, address: selectedAddress.address, city: selectedAddress.city, state: selectedAddress.state, postalCode: selectedAddress.postal_code, country: selectedAddress.country, isDefault: false }); setShowAddressForm(true); }} aria-label="Edit"><IconEdit /></button>
                      </div>
                    )}
                    {!showAddressForm && (
                      <button className="cd-add-address-btn" onClick={() => { setShowAddressForm(true); setEditingAddressId(null); setAddressForm(EMPTY_ADDR); }}>
                        <IconPlus /> Add {selectedAddress || (isAuthenticated && addresses.length > 0) ? 'Another' : 'New'} Address
                      </button>
                    )}
                    {showAddressForm && (
                      <form className="cd-address-form" onSubmit={handleSaveAddress}>
                        <div className="cd-form-grid">
                          {isAuthenticated && (
                            <>
                              <div className="cd-form-group"><label className="cd-label">Full Name *</label><input className="cd-input" name="fullName" value={addressForm.fullName} onChange={handleAddrChange} required placeholder="Full name" /></div>
                              <div className="cd-form-group"><label className="cd-label">Phone *</label><input className="cd-input" name="phoneNumber" value={addressForm.phoneNumber} onChange={handleAddrChange} required placeholder="Phone number" /></div>
                            </>
                          )}
                          <div className="cd-form-group cd-form-full"><label className="cd-label">Address *</label><input className="cd-input" name="address" value={addressForm.address} onChange={handleAddrChange} required placeholder="Street address, flat, area" /></div>
                          <div className="cd-form-group"><label className="cd-label">City *</label><input className="cd-input" name="city" value={addressForm.city} onChange={handleAddrChange} required placeholder="City" /></div>
                          <div className="cd-form-group"><label className="cd-label">State *</label><input className="cd-input" name="state" value={addressForm.state} onChange={handleAddrChange} required placeholder="State" /></div>
                          <div className="cd-form-group"><label className="cd-label">Postal Code *</label><input className="cd-input" name="postalCode" value={addressForm.postalCode} onChange={handleAddrChange} required placeholder="PIN code" /></div>
                          <div className="cd-form-group"><label className="cd-label">Country</label><input className="cd-input" name="country" value={addressForm.country} onChange={handleAddrChange} placeholder="Country" /></div>
                          {isAuthenticated && (
                            <div className="cd-form-group cd-form-full"><label className="cd-checkbox-label"><input type="checkbox" name="isDefault" checked={addressForm.isDefault} onChange={handleAddrChange} /> Set as default address</label></div>
                          )}
                        </div>
                        <div className="cd-form-actions">
                          <button type="submit" className="cd-btn-primary" disabled={addressSaving}>{addressSaving ? 'Saving...' : editingAddressId ? 'Update Address' : 'Save Address'}</button>
                          <button type="button" className="cd-btn-ghost" onClick={() => { setShowAddressForm(false); setEditingAddressId(null); }}>Cancel</button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>

              {/* ── 5. Delivery Method ── */}
              {shippingFees.length > 0 && (
                <div className="cd-sv-section">
                  <div className="cd-section-title">Delivery Method</div>
                  <div className="cd-delivery-list">
                    {shippingFees.map(fee => (
                      <label key={fee.id} className={`cd-delivery-card ${selectedFee?.id === fee.id ? 'cd-delivery-selected' : ''}`}>
                        <input type="radio" name="delivery" checked={selectedFee?.id === fee.id} onChange={() => handleSelectFee(fee)} />
                        <span className="cd-delivery-icon"><IconTruck /></span>
                        <div className="cd-delivery-info">
                          <p className="cd-delivery-name">{fee.orderType === 'cod' ? 'Cash on Delivery' : fee.orderType === 'prepaid' ? 'Prepaid Delivery' : fee.orderType}</p>
                          <p className="cd-delivery-desc">{fee.orderType === 'cod' ? 'Pay when you receive' : 'Pay online before delivery'}</p>
                        </div>
                        <span className={`cd-delivery-fee ${parseFloat(fee.fee || 0) === 0 ? 'free' : ''}`}>{parseFloat(fee.fee || 0) === 0 ? 'Free' : `₹${parseFloat(fee.fee || 0).toFixed(2)}`}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 6. Order Summary ── */}
              <div className="cd-sv-section">
                <div className="cd-summary">
                  <div className="cd-summary-row"><span>Subtotal ({totalQty} item{totalQty !== 1 ? 's' : ''})</span><span>₹{activeTotal.toFixed(2)}</span></div>
                  {discountAmount > 0 && <div className="cd-summary-row cd-summary-discount"><span>Discount ({appliedCoupon?.code})</span><span>−₹{discountAmount.toFixed(2)}</span></div>}
                  <div className="cd-summary-row"><span>Shipping</span><span>{shippingFeeAmount === 0 ? 'Free' : `₹${shippingFeeAmount.toFixed(2)}`}</span></div>
                  <div className="cd-summary-row cd-summary-total"><span>Total</span><span>₹{finalTotal.toFixed(2)}</span></div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Scroll hint */}
        {showScrollHint && !orderSuccess && activeItems.length > 0 && (
          <div className="cd-scroll-hint" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        )}

        {/* ── Single CTA footer ── */}
        {!orderSuccess && activeItems.length > 0 && (
          <div className="cd-footer">
            <button className="cd-btn-primary cd-btn-full" onClick={handlePlaceOrder} disabled={isProcessing}>
              {isProcessing
                ? 'Processing...'
                : selectedFee?.orderType === 'prepaid'
                  ? `Pay ₹${finalTotal.toFixed(2)}`
                  : `Place Order — ₹${finalTotal.toFixed(2)}`
              }
            </button>
          </div>
        )}

      </div>
    </>
  );
};

export default CartDrawer;
