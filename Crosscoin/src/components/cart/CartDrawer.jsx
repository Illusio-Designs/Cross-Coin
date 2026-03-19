import React, { useEffect, useState, useCallback } from 'react';
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

// ─── Helpers ────────────────────────────────────────────────────────────────

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
      ? JSON.parse(item.variation.attributes)
      : item.variation.attributes;
    if (a[key]) return Array.isArray(a[key]) ? a[key].join(', ') : a[key];
  }
  if (item[key]) return Array.isArray(item[key]) ? item[key].join(', ') : item[key];
  return null;
}

const STEPS = ['cart', 'contact', 'shipping', 'review'];
const STEP_LABELS = ['Order Summary', 'Contact Info', 'Shipping', 'Place Order'];

const EMPTY_ADDR = {
  fullName: '', phoneNumber: '', address: '',
  city: '', state: '', postalCode: '', country: 'India', isDefault: false,
};

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconBag = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 01-8 0"/>
  </svg>
);
const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconTag = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);
const IconTruck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const IconSuccess = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

// ─── Main Component ──────────────────────────────────────────────────────────

const CartDrawer = ({ isOpen, onClose }) => {
  const { cartItems, cartTotal, removeFromCart, updateQuantity, clearCart, lastAddedItem, buyNowItem, buyNowTotal, clearBuyNow } = useCart();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0); // 0=cart, 1=contact, 2=shipping, 3=review

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Contact (guest) state
  const [guestInfo, setGuestInfo] = useState({ email: '', firstName: '', lastName: '', phone: '' });

  // Shipping state
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDR);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);

  // Delivery method state
  const [shippingFees, setShippingFees] = useState([]);
  const [selectedFee, setSelectedFee] = useState(null);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('cod');

  // Order state
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null); // { orderNumber }

  // Offer bar state
  const [offerData, setOfferData] = useState(null);

  // ── Visibility animation ──────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const t = setTimeout(() => {
        setIsVisible(false);
        // Reset to cart step when closed
        setStep(0);
        setOrderSuccess(null);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ── Restore coupon from session ───────────────────────────────────────────
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

  // ── Load shipping fees ────────────────────────────────────────────────────
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

  // ── Load addresses for auth users ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    setAddressLoading(true);
    getUserShippingAddresses().then(data => {
      setAddresses(data || []);
      const def = (data || []).find(a => a.isDefault || a.is_default);
      if (def && !selectedAddress) setSelectedAddress(def);
    }).catch(() => {}).finally(() => setAddressLoading(false));
  }, [isOpen, isAuthenticated]);

  // ── Offer bar logic ───────────────────────────────────────────────────────
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
          if (c.type === 'percentage') {
            disc = (cartTotal * parseFloat(c.value || 0)) / 100;
            const mx = parseFloat(c.maxDiscount || 0);
            if (mx > 0 && disc > mx) disc = mx;
          } else if (c.type === 'fixed') {
            disc = parseFloat(c.value || 0);
          }
          if (disc > 0 && (!best || disc > best.discount)) {
            best = { type: 'available', coupon: c, discount: disc };
          }
        } else {
          const remaining = min - cartTotal;
          let potDisc = 0;
          if (c.type === 'percentage') potDisc = (min * parseFloat(c.value || 0)) / 100;
          else if (c.type === 'fixed') potDisc = parseFloat(c.value || 0);
          if (potDisc > 0 && (!best || potDisc > best.discount)) {
            best = { type: 'progress', coupon: c, discount: potDisc, remaining, progress: (cartTotal / min) * 100, required: min };
          }
        }
      }
      setOfferData(best);
    }).catch(() => {});
  }, [cartItems, cartTotal, selectedPaymentMode]);

  // ── Computed totals ───────────────────────────────────────────────────────
  const activeItems = buyNowItem ? [buyNowItem] : cartItems;
  const activeTotal = buyNowItem ? buyNowTotal : cartTotal;
  const discountAmount = appliedCoupon ? parseFloat(appliedCoupon.discount || appliedCoupon.discountAmount || 0) : 0;
  const shippingFeeAmount = parseFloat(selectedFee?.fee || 0);
  const finalTotal = Math.max(0, activeTotal - discountAmount + shippingFeeAmount);
  const totalQty = activeItems.reduce((s, i) => s + (i.quantity || 1), 0);

  // ── Coupon handlers ───────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
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

  // ── Fee selection ─────────────────────────────────────────────────────────
  const handleSelectFee = (fee) => {
    setSelectedFee(fee);
    const mode = fee.orderType === 'prepaid' ? 'prepaid' : 'cod';
    setSelectedPaymentMode(mode);
    if (fee.orderType === 'cod' && appliedCoupon) {
      handleRemoveCoupon();
      showValidationErrorToast('Coupons are not applicable for Cash on Delivery orders');
    }
  };

  // ── Address form ──────────────────────────────────────────────────────────
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
    try {
      if (isAuthenticated) {
        let saved;
        if (editingAddressId) {
          saved = await updateShippingAddress(editingAddressId, addressForm);
        } else {
          saved = await createShippingAddress(addressForm);
        }
        const fresh = await getUserShippingAddresses();
        setAddresses(fresh || []);
        setSelectedAddress(saved || addressForm);
      } else {
        const saved = {
          id: Date.now(),
          full_name: addressForm.fullName,
          phone_number: addressForm.phoneNumber,
          address: addressForm.address,
          city: addressForm.city,
          state: addressForm.state,
          postal_code: addressForm.postalCode,
          country: addressForm.country,
        };
        setSelectedAddress(saved);
      }
      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm(EMPTY_ADDR);
    } catch (err) {
      showValidationErrorToast('Failed to save address. Please try again.');
    } finally {
      setAddressSaving(false);
    }
  };

  // ── Razorpay ──────────────────────────────────────────────────────────────
  const loadRazorpay = () => new Promise(resolve => {
    if (document.getElementById('rzp-script')) return resolve(true);
    const s = document.createElement('script');
    s.id = 'rzp-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  // ── Place order ───────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!selectedAddress || !selectedFee) {
      showValidationErrorToast('Please select a shipping address and delivery method.');
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
      ? {
          shipping_address_id: selectedAddress.id,
          items: itemsPayload,
          payment_type: selectedFee.orderType === 'cod' ? 'cod' : 'upi',
          notes: '',
          discount_amount: discountAmount,
          coupon_id: appliedCoupon?.id || null,
        }
      : {
          guest_info: guestInfo,
          shipping_address: {
            fullName: selectedAddress.full_name || selectedAddress.fullName,
            address: selectedAddress.address,
            city: selectedAddress.city,
            state: selectedAddress.state,
            pincode: selectedAddress.postal_code || selectedAddress.postalCode,
            phone: selectedAddress.phone_number || selectedAddress.phoneNumber,
          },
          items: itemsPayload,
          payment_type: selectedFee.orderType === 'cod' ? 'cod' : 'upi',
          notes: '',
          discount_amount: discountAmount,
          coupon_id: appliedCoupon?.id || null,
          session_id: sessionStorage.getItem('sessionId') || 'guest-' + Date.now(),
          ip_address: window.location.hostname,
          user_agent: window.navigator.userAgent,
        };

    try {
      if (selectedFee.orderType === 'cod') {
        const result = isAuthenticated ? await createOrder(orderData) : await createGuestOrder(orderData);
        if (!result?.order) throw new Error('Order creation failed.');

        try {
          fbqTrack('Purchase', { value: Number(finalTotal.toFixed(2)), currency: 'INR', content_type: 'product', contents: activeItems.map(i => ({ id: String(i.productId || i.id), quantity: i.quantity })) });
        } catch (_) {}

        clearCart();
        clearBuyNow();
        sessionStorage.removeItem('appliedCoupon');
        const orderNumber = result.order.order_number;
        showOrderPlacedSuccessToast(orderNumber);
        setOrderSuccess({ orderNumber });
      } else {
        const scriptLoaded = await loadRazorpay();
        if (!scriptLoaded || !window.Razorpay) {
          showOrderPlacedErrorToast('Failed to load payment SDK. Please try again.');
          setIsProcessing(false);
          return;
        }

        const rzpOrder = await createRazorpayOrder({ amount: finalTotal, currency: 'INR', receipt: `rcpt_${Date.now()}`, isGuest: !isAuthenticated });

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          name: 'Cross Coin',
          description: 'Payment for Cross Coin Order',
          order_id: rzpOrder.id,
          prefill: {
            name: isAuthenticated ? (user?.name || '') : `${guestInfo.firstName} ${guestInfo.lastName}`,
            email: isAuthenticated ? (user?.email || '') : guestInfo.email,
            contact: selectedAddress?.phone_number || selectedAddress?.phoneNumber || '',
          },
          theme: { color: '#CE1E36' },
          handler: async (response) => {
            try {
              const result = isAuthenticated ? await createOrder(orderData) : await createGuestOrder(orderData);
              if (!result?.order) throw new Error('Order creation failed.');
              await updateOrderPayment({ orderId: result.order.id, razorpayPaymentId: response.razorpay_payment_id, razorpayOrderId: response.razorpay_order_id, razorpaySignature: response.razorpay_signature });
              try { fbqTrack('Purchase', { value: Number(finalTotal.toFixed(2)), currency: 'INR', content_type: 'product', contents: activeItems.map(i => ({ id: String(i.productId || i.id), quantity: i.quantity })) }); } catch (_) {}
              clearCart();
              clearBuyNow();
              sessionStorage.removeItem('appliedCoupon');
              const orderNumber = result.order.order_number;
              showOrderPlacedSuccessToast(orderNumber);
              setOrderSuccess({ orderNumber });
            } catch (err) {
              showOrderPlacedErrorToast('Payment successful but order creation failed. Please contact support.');
            }
          },
          modal: { ondismiss: () => { showOrderPlacedErrorToast('Payment was cancelled.'); setIsProcessing(false); } },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (r) => { showOrderPlacedErrorToast('Payment failed: ' + (r.error.description || 'Please try again')); setIsProcessing(false); });
        rzp.open();
        return; // Don't set isProcessing false here — Razorpay modal handles it
      }
    } catch (err) {
      showOrderPlacedErrorToast(err.response?.data?.message || err.message || 'Order placement failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Step navigation ───────────────────────────────────────────────────────
  const canGoNext = () => {
    if (step === 0) return activeItems.length > 0;
    if (step === 1) {
      if (isAuthenticated) return true;
      return guestInfo.email && guestInfo.firstName && guestInfo.phone;
    }
    if (step === 2) return !!selectedAddress && !!selectedFee;
    return true;
  };

  const handleNext = () => {
    if (step === 1 && isAuthenticated) { setStep(2); return; }
    if (step < 3) setStep(s => s + 1);
  };

  if (!isVisible) return null;

  // ── Render steps ─────────────────────────────────────────────────────────

  const renderCartStep = () => (
    <div className="cd-step-content">
      {/* Offer bar */}
      {offerData && (
        <div className={`cd-offer-bar ${offerData.type === 'available' ? 'cd-offer-available' : 'cd-offer-progress'}`}>
          <span className="cd-offer-icon"><IconTag /></span>
          <div className="cd-offer-text">
            {offerData.type === 'available'
              ? <><strong>Get ₹{offerData.discount} OFF</strong> — use code <span className="cd-offer-code">{offerData.coupon.code}</span></>
              : <>Add <strong>₹{offerData.remaining.toFixed(0)}</strong> more to get <strong>₹{offerData.discount} OFF</strong></>
            }
          </div>
          {offerData.type === 'progress' && (
            <div className="cd-offer-progress-bar">
              <div className="cd-offer-progress-fill" style={{ width: `${Math.min(offerData.progress, 100)}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Items */}
      {activeItems.length === 0 ? (
        <div className="cd-empty">
          <span className="cd-empty-icon"><IconBag /></span>
          <p>Your cart is empty</p>
          <button className="cd-btn-primary" onClick={onClose}>Continue Shopping</button>
        </div>
      ) : (
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
                    : <div className="cd-item-img-placeholder" />
                  }
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
                  <button className="cd-item-remove" onClick={() => removeFromCart(item.id)} aria-label="Remove item">
                    <IconTrash />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Coupon */}
      {activeItems.length > 0 && (
        <div className="cd-coupon-section">
          {appliedCoupon ? (
            <div className="cd-coupon-applied">
              <span className="cd-coupon-applied-icon"><IconCheck /></span>
              <span className="cd-coupon-applied-text">
                <strong>{appliedCoupon.code}</strong> — ₹{discountAmount.toFixed(2)} off
              </span>
              <button className="cd-coupon-remove" onClick={handleRemoveCoupon}>Remove</button>
            </div>
          ) : (
            <div className="cd-coupon-input-row">
              <input
                className="cd-coupon-input"
                type="text"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
              />
              <button className="cd-coupon-apply-btn" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}>
                {couponLoading ? '...' : 'Apply'}
              </button>
            </div>
          )}
          {couponError && <p className="cd-coupon-error">{couponError}</p>}
        </div>
      )}

      {/* Summary */}
      {activeItems.length > 0 && (
        <div className="cd-summary">
          <div className="cd-summary-row">
            <span>Subtotal ({totalQty} item{totalQty !== 1 ? 's' : ''})</span>
            <span>₹{activeTotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="cd-summary-row cd-summary-discount">
              <span>Discount</span>
              <span>−₹{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="cd-summary-row cd-summary-total">
            <span>Total</span>
            <span>₹{(activeTotal - discountAmount).toFixed(2)}</span>
          </div>
          <p className="cd-summary-note">Shipping calculated at next step</p>
        </div>
      )}
    </div>
  );

  const renderContactStep = () => {
    if (isAuthenticated) {
      return (
        <div className="cd-step-content">
          <div className="cd-auth-info">
            <div className="cd-auth-avatar">{(user?.name || user?.email || 'U')[0].toUpperCase()}</div>
            <div>
              <p className="cd-auth-name">{user?.name || 'Logged in user'}</p>
              <p className="cd-auth-email">{user?.email || ''}</p>
            </div>
            <span className="cd-auth-badge"><IconCheck /> Verified</span>
          </div>
          <p className="cd-step-note">You are logged in. Your contact details are already saved.</p>
        </div>
      );
    }
    return (
      <div className="cd-step-content">
        <p className="cd-step-note">Enter your contact details to continue as a guest.</p>
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
    );
  };

  const renderShippingStep = () => (
    <div className="cd-step-content">
      {/* Address section */}
      <div className="cd-section-title">Delivery Address</div>
      {addressLoading ? (
        <div className="cd-loading">Loading addresses...</div>
      ) : (
        <>
          {isAuthenticated && addresses.length > 0 && (
            <div className="cd-address-list">
              {addresses.map(addr => (
                <div
                  key={addr.id}
                  className={`cd-address-card ${selectedAddress?.id === addr.id ? 'cd-address-selected' : ''}`}
                  onClick={() => setSelectedAddress(addr)}
                >
                  <div className="cd-address-radio">
                    <div className={`cd-radio-dot ${selectedAddress?.id === addr.id ? 'active' : ''}`} />
                  </div>
                  <div className="cd-address-body">
                    <p className="cd-address-name">{addr.full_name || addr.fullName} {(addr.isDefault || addr.is_default) && <span className="cd-default-tag">Default</span>}</p>
                    <p className="cd-address-line">{addr.address}</p>
                    <p className="cd-address-line">{addr.city}, {addr.state} {addr.postal_code}</p>
                    <p className="cd-address-line">{addr.phone_number}</p>
                  </div>
                  <button className="cd-address-edit" onClick={e => { e.stopPropagation(); handleEditAddress(addr); }} aria-label="Edit address">
                    <IconEdit />
                  </button>
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
              <button className="cd-address-edit" onClick={() => { setAddressForm({ fullName: selectedAddress.full_name, phoneNumber: selectedAddress.phone_number, address: selectedAddress.address, city: selectedAddress.city, state: selectedAddress.state, postalCode: selectedAddress.postal_code, country: selectedAddress.country, isDefault: false }); setShowAddressForm(true); }} aria-label="Edit address">
                <IconEdit />
              </button>
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
                <div className="cd-form-group">
                  <label className="cd-label">Full Name *</label>
                  <input className="cd-input" name="fullName" value={addressForm.fullName} onChange={handleAddrChange} required placeholder="Full name" />
                </div>
                <div className="cd-form-group">
                  <label className="cd-label">Phone *</label>
                  <input className="cd-input" name="phoneNumber" value={addressForm.phoneNumber} onChange={handleAddrChange} required placeholder="Phone number" />
                </div>
                <div className="cd-form-group cd-form-full">
                  <label className="cd-label">Address *</label>
                  <input className="cd-input" name="address" value={addressForm.address} onChange={handleAddrChange} required placeholder="Street address, flat, area" />
                </div>
                <div className="cd-form-group">
                  <label className="cd-label">City *</label>
                  <input className="cd-input" name="city" value={addressForm.city} onChange={handleAddrChange} required placeholder="City" />
                </div>
                <div className="cd-form-group">
                  <label className="cd-label">State *</label>
                  <input className="cd-input" name="state" value={addressForm.state} onChange={handleAddrChange} required placeholder="State" />
                </div>
                <div className="cd-form-group">
                  <label className="cd-label">Postal Code *</label>
                  <input className="cd-input" name="postalCode" value={addressForm.postalCode} onChange={handleAddrChange} required placeholder="PIN code" />
                </div>
                <div className="cd-form-group">
                  <label className="cd-label">Country</label>
                  <input className="cd-input" name="country" value={addressForm.country} onChange={handleAddrChange} placeholder="Country" />
                </div>
                {isAuthenticated && (
                  <div className="cd-form-group cd-form-full">
                    <label className="cd-checkbox-label">
                      <input type="checkbox" name="isDefault" checked={addressForm.isDefault} onChange={handleAddrChange} />
                      Set as default address
                    </label>
                  </div>
                )}
              </div>
              <div className="cd-form-actions">
                <button type="submit" className="cd-btn-primary" disabled={addressSaving}>
                  {addressSaving ? 'Saving...' : (editingAddressId ? 'Update Address' : 'Save Address')}
                </button>
                <button type="button" className="cd-btn-ghost" onClick={() => { setShowAddressForm(false); setEditingAddressId(null); }}>Cancel</button>
              </div>
            </form>
          )}
        </>
      )}

      {/* Delivery method */}
      {shippingFees.length > 0 && (
        <>
          <div className="cd-section-title" style={{ marginTop: '20px' }}>Delivery Method</div>
          <div className="cd-delivery-list">
            {shippingFees.map(fee => (
              <label key={fee.id} className={`cd-delivery-card ${selectedFee?.id === fee.id ? 'cd-delivery-selected' : ''}`}>
                <input type="radio" name="delivery" checked={selectedFee?.id === fee.id} onChange={() => handleSelectFee(fee)} />
                <span className="cd-delivery-icon"><IconTruck /></span>
                <div className="cd-delivery-info">
                  <p className="cd-delivery-name">{fee.orderType === 'cod' ? 'Cash on Delivery' : fee.orderType === 'prepaid' ? 'Prepaid Delivery' : fee.orderType}</p>
                  <p className="cd-delivery-desc">{fee.orderType === 'cod' ? 'Pay when you receive' : 'Pay online before delivery'}</p>
                </div>
                <span className={`cd-delivery-fee ${parseFloat(fee.fee || 0) === 0 ? 'free' : ''}`}>
                  {parseFloat(fee.fee || 0) === 0 ? 'Free' : `₹${parseFloat(fee.fee || 0).toFixed(2)}`}
                </span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const renderReviewStep = () => (
    <div className="cd-step-content">
      {/* Items summary */}
      <div className="cd-section-title">Order Items</div>
      <div className="cd-review-items">
        {activeItems.map(item => (
          <div key={item.id} className="cd-review-item">
            <div className="cd-review-item-img">
              {pickImage(item)
                ? <SafeImage imageData={{ image_url: pickImage(item) }} alt={item.name} width={48} height={48} quality={70} style={{ objectFit: 'cover' }} isProductCard />
                : <div className="cd-item-img-placeholder" />
              }
            </div>
            <div className="cd-review-item-info">
              <p className="cd-item-name">{item.name}</p>
              {getAttr(item, 'size') && <p className="cd-item-meta">Size: {getAttr(item, 'size')}</p>}
              <p className="cd-item-meta">Qty: {item.quantity}</p>
            </div>
            <span className="cd-item-price">₹{(getPrice(item) * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Address */}
      {selectedAddress && (
        <>
          <div className="cd-section-title" style={{ marginTop: '16px' }}>Delivering To</div>
          <div className="cd-review-address">
            <p className="cd-address-name">{selectedAddress.full_name || selectedAddress.fullName}</p>
            <p className="cd-address-line">{selectedAddress.address}, {selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code}</p>
            <p className="cd-address-line">{selectedAddress.phone_number || selectedAddress.phoneNumber}</p>
          </div>
        </>
      )}

      {/* Price breakdown */}
      <div className="cd-summary" style={{ marginTop: '16px' }}>
        <div className="cd-summary-row">
          <span>Subtotal</span>
          <span>₹{activeTotal.toFixed(2)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="cd-summary-row cd-summary-discount">
            <span>Discount ({appliedCoupon?.code})</span>
            <span>−₹{discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="cd-summary-row">
          <span>Shipping</span>
          <span>{shippingFeeAmount === 0 ? 'Free' : `₹${shippingFeeAmount.toFixed(2)}`}</span>
        </div>
        <div className="cd-summary-row cd-summary-total">
          <span>Total</span>
          <span>₹{finalTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment method badge */}
      {selectedFee && (
        <div className="cd-payment-badge">
          <span className="cd-payment-icon">
            {selectedFee.orderType === 'cod'
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            }
          </span>
          <span>{selectedFee.orderType === 'cod' ? 'Cash on Delivery' : 'Prepaid (Online Payment)'}</span>
        </div>
      )}
    </div>
  );

  const renderSuccess = () => (
    <div className="cd-success">
      <div className="cd-success-icon"><IconSuccess /></div>
      <h3 className="cd-success-title">Order Placed!</h3>
      <p className="cd-success-order">Order #{orderSuccess?.orderNumber}</p>
      <p className="cd-success-msg">Thank you for your order. You will receive a confirmation shortly.</p>
      <button className="cd-btn-primary" onClick={() => { onClose(); router.push(`/ThankYou?order_number=${orderSuccess?.orderNumber}`); }}>
        View Order
      </button>
      <button className="cd-btn-ghost" style={{ marginTop: '8px' }} onClick={onClose}>
        Continue Shopping
      </button>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <>
      <div className={`cd-backdrop ${isOpen ? 'cd-backdrop-active' : ''}`} onClick={onClose} />
      <div className={`cd-drawer ${isOpen ? 'cd-drawer-open' : ''}`} role="dialog" aria-modal="true" aria-label="Shopping cart">

        {/* Header */}
        <div className="cd-header">
          <div className="cd-header-left">
            {step > 0 && !orderSuccess && (
              <button className="cd-back-btn" onClick={() => setStep(s => s - 1)} aria-label="Go back">
                <IconChevronLeft />
              </button>
            )}
            <span className="cd-header-icon"><IconBag /></span>
            <div>
              <span className="cd-header-title">
                {orderSuccess ? 'Order Confirmed' : STEP_LABELS[step]}
              </span>
              {!orderSuccess && <span className="cd-header-count">{totalQty} item{totalQty !== 1 ? 's' : ''}</span>}
            </div>
          </div>
          <button className="cd-close-btn" onClick={onClose} aria-label="Close cart">
            <IconX />
          </button>
        </div>

        {/* Step indicator */}
        {!orderSuccess && (
          <div className="cd-steps">
            {STEPS.map((s, i) => (
              <div key={s} className={`cd-step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`}>
                <div className="cd-step-circle">{i < step ? <IconCheck /> : i + 1}</div>
                <span className="cd-step-label">{STEP_LABELS[i]}</span>
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="cd-body">
          {orderSuccess
            ? renderSuccess()
            : step === 0 ? renderCartStep()
            : step === 1 ? renderContactStep()
            : step === 2 ? renderShippingStep()
            : renderReviewStep()
          }
        </div>

        {/* Footer */}
        {!orderSuccess && activeItems.length > 0 && (
          <div className="cd-footer">
            {step < 3 ? (
              <button
                className="cd-btn-primary cd-btn-full"
                onClick={handleNext}
                disabled={!canGoNext()}
              >
                {step === 0 ? 'Proceed to Checkout' : step === 1 ? 'Continue to Shipping' : step === 2 ? 'Review Order' : 'Place Order'}
              </button>
            ) : (
              <button
                className="cd-btn-primary cd-btn-full"
                onClick={handlePlaceOrder}
                disabled={isProcessing}
              >
                {isProcessing ? 'Placing Order...' : selectedFee?.orderType === 'prepaid' ? `Pay ₹${finalTotal.toFixed(2)}` : `Place Order — ₹${finalTotal.toFixed(2)}`}
              </button>
            )}
            {step === 0 && (
              <button className="cd-btn-ghost cd-btn-full" onClick={onClose}>Continue Shopping</button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
