'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, MapPin,
  CheckCircle2, Wallet, CreditCard, Tag, Loader2, Edit3,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/context/AuthContext';
import {
  getAddresses, createAddress, updateAddress,
} from '@/lib/api/addresses';
import {
  getShippingFees, checkPincodeServiceability, validateCoupon,
  createOrder, createGuestOrder,
  initiateCheckout, initiateGuestCheckout,
  verifyPayment,
} from '@/lib/api/orders';
import {
  toastOrderPlaced, toastOrderError,
  toastPaymentSuccess, toastPaymentError,
  toastCouponApplied, toastCouponError,
  toastAddressAdded, toastAddressUpdated, toastAddressError,
} from '@/lib/toast';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const PREPAID_INSTANT_DISCOUNT_INR = Math.max(0, parseFloat(process.env.NEXT_PUBLIC_PREPAID_INSTANT_DISCOUNT_INR || '0') || 0);

const FALLBACK_FEES = [
  { id: 'fb-prepaid', orderType: 'prepaid', fee: 0, isDefault: true },
  { id: 'fb-cod',     orderType: 'cod',     fee: 0 },
];

const EMPTY_ADDR = {
  fullName: '', phoneNumber: '', address: '',
  city: '', state: '', postalCode: '', country: 'India', isDefault: false,
};

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function getOrCreateGuestSessionId() {
  if (typeof document === 'undefined') return 'guest-' + Date.now();
  const key = 'velmiqueGuestSessionId';
  const m = document.cookie.split('; ').find(r => r.startsWith(key + '='));
  if (m) return m.split('=')[1];
  const id = 'guest-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  const exp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${key}=${id}; expires=${exp}; path=/; SameSite=Lax`;
  return id;
}

function generateIdempotencyKey() {
  return 'idem-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

function isValidEmail(v) {
  const s = String(v || '').trim();
  if (!s.includes('@')) return false;
  const [a, b] = s.split('@');
  return !!a && !!b && b.includes('.');
}
function isValidIndianMobile(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  return d.length === 10 && /^[6-9]\d{9}$/.test(d);
}

function validateAddress(a) {
  if (!a) return ['Address is empty'];
  const errs = [];
  const name = String(a.full_name || a.fullName || '').trim();
  if (!name || name.length < 2) errs.push('Customer name is required');
  const addr = String(a.address || '').trim();
  if (!addr || addr.length < 10) errs.push('Street address is required (min 10 chars)');
  if (!String(a.city || '').trim())  errs.push('City is required');
  if (!String(a.state || '').trim()) errs.push('State is required');
  const pin = String(a.postal_code || a.postalCode || '').trim();
  if (!/^\d{6}$/.test(pin)) errs.push('PIN code must be 6 digits');
  const phone = String(a.phone_number || a.phoneNumber || a.phone || '').replace(/\D/g, '');
  if (!isValidIndianMobile(phone)) errs.push('Valid 10-digit mobile (starts 6-9) required');
  return errs;
}

export default function CartDrawer() {
  const router = useRouter();
  const {
    cart: items, cartOpen, setCartOpen, cartTotal, cartCount,
    removeFromCart, updateQuantity, clearCart,
  } = useStore();
  const { user, isAuthenticated } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────
  const [guestInfo, setGuestInfo] = useState({ email: '', fullName: '', phone: '' });
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [showAddrDropdown, setShowAddrDropdown] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState(null);
  const [addrForm, setAddrForm] = useState(EMPTY_ADDR);
  const [addrSaving, setAddrSaving] = useState(false);
  const [pincodeInfo, setPincodeInfo] = useState(null);

  const [shippingFees, setShippingFees] = useState([]);
  const [selectedFee, setSelectedFee] = useState(null);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState({ type: '', text: '' });

  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const dropdownRef = useRef(null);

  // ── Reset on close ─────────────────────────────────────────────────────
  useEffect(() => {
    if (cartOpen) return;
    const t = setTimeout(() => {
      setOrderSuccess(null);
      setErrorMsg('');
      setCouponMsg({ type: '', text: '' });
      setAppliedCoupon(null);
      setCouponCode('');
    }, 300);
    return () => clearTimeout(t);
  }, [cartOpen]);

  // Body lock — Escape + focus-trap are now handled by useFocusTrap below.
  useEffect(() => {
    if (cartOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [cartOpen]);

  // Trap focus inside the drawer panel; Escape closes the drawer and
  // restores focus to whatever opened it. onEscape MUST be a stable
  // reference — a fresh arrow function on every render would make
  // useFocusTrap's effect re-run each time and steal focus from the
  // input being typed in (cursor visibly disappeared after each
  // keystroke in the guest address form).
  const handleEscapeCloseDrawer = useCallback(() => setCartOpen(false), [setCartOpen]);
  const trapRef = useFocusTrap(cartOpen, { onEscape: handleEscapeCloseDrawer });

  // ── Outside-click close for address dropdown ───────────────────────────
  useEffect(() => {
    if (!showAddrDropdown) return;
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowAddrDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showAddrDropdown]);

  // ── Load shipping fees ─────────────────────────────────────────────────
  useEffect(() => {
    if (!cartOpen) return;
    getShippingFees()
      .then(raw => {
        const fees = (raw && raw.length) ? raw : FALLBACK_FEES;
        setShippingFees(fees);
        const def = fees.find(f => f.orderType === 'prepaid') || fees.find(f => f.isDefault) || fees[0];
        setSelectedFee(def || null);
      })
      .catch(() => {
        setShippingFees(FALLBACK_FEES);
        setSelectedFee(FALLBACK_FEES[0]);
      });
  }, [cartOpen]);

  // ── Load addresses for authed users ────────────────────────────────────
  useEffect(() => {
    if (!cartOpen || !isAuthenticated) return;
    getAddresses().then(list => {
      setAddresses(list || []);
      if (!selectedAddress) {
        const def = (list || []).find(a => a.isDefault || a.is_default) || list?.[0];
        if (def) {
          setSelectedAddress(def);
          const pin = String(def.postal_code || def.postalCode || '').replace(/\D/g, '');
          if (pin.length === 6) {
            checkPincodeServiceability(pin).then(setPincodeInfo).catch(() => {});
          }
        }
      }
    }).catch(() => {});
  }, [cartOpen, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-show address form for guests on open
  useEffect(() => {
    if (!cartOpen || isAuthenticated) return;
    if (!selectedAddress) setShowAddrForm(true);
  }, [cartOpen, isAuthenticated, selectedAddress]);

  // ── Computed totals ────────────────────────────────────────────────────
  const subtotal     = cartTotal;
  const shippingFee  = parseFloat(selectedFee?.fee || 0);
  const couponOff    = appliedCoupon ? parseFloat(appliedCoupon.discountAmount) : 0;
  const isCod        = selectedFee?.orderType === 'cod';
  const isPrepaid    = selectedFee?.orderType === 'prepaid';
  const baseTotal    = Math.max(0, subtotal + shippingFee - couponOff);
  const prepaidDisc  = isPrepaid && PREPAID_INSTANT_DISCOUNT_INR > 0
    ? Math.min(PREPAID_INSTANT_DISCOUNT_INR, baseTotal) : 0;
  const finalPayable = Math.max(0, baseTotal - prepaidDisc);

  // ── Address form handlers ──────────────────────────────────────────────
  const onAddrField = (e) => {
    const { name, value, type, checked } = e.target;
    let v = type === 'checkbox' ? checked : value;
    if (name === 'phoneNumber') v = String(v).replace(/\D/g, '').slice(0, 10);
    if (name === 'postalCode')  v = String(v).replace(/\D/g, '').slice(0, 6);
    setAddrForm(p => ({ ...p, [name]: v }));
  };

  const onPincodeBlur = async (e) => {
    const pin = e.target.value.replace(/\D/g, '');
    if (pin.length !== 6) return;
    try {
      const r = await checkPincodeServiceability(pin);
      setPincodeInfo(r);
      if (r?.city || r?.state) {
        setAddrForm(p => ({ ...p, city: r.city || p.city, state: r.state || p.state }));
      }
    } catch {}
  };

  const onEditAddress = (a) => {
    setEditingAddrId(a.id);
    setAddrForm({
      fullName:    a.full_name    || a.fullName    || '',
      phoneNumber: a.phone_number || a.phoneNumber || '',
      address:     a.address      || '',
      city:        a.city         || '',
      state:       a.state        || '',
      postalCode:  a.postal_code  || a.postalCode  || '',
      country:     a.country      || 'India',
      isDefault:   a.is_default ?? a.isDefault ?? false,
    });
    setShowAddrForm(true);
    setShowAddrDropdown(false);
  };

  const onSaveAddress = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const formForValidation = isAuthenticated
      ? addrForm
      : { ...addrForm, fullName: guestInfo.fullName.trim() || addrForm.fullName, phoneNumber: guestInfo.phone || addrForm.phoneNumber };
    const errs = validateAddress({
      full_name:    formForValidation.fullName,
      address:      formForValidation.address,
      city:         formForValidation.city,
      state:        formForValidation.state,
      postal_code:  formForValidation.postalCode,
      phone_number: isAuthenticated ? formForValidation.phoneNumber : guestInfo.phone,
    });
    if (errs.length) { setErrorMsg(errs[0]); return; }

    setAddrSaving(true);
    try {
      if (isAuthenticated) {
        const payload = {
          fullName: addrForm.fullName, phoneNumber: addrForm.phoneNumber,
          address: addrForm.address, city: addrForm.city, state: addrForm.state,
          postalCode: addrForm.postalCode, country: addrForm.country, isDefault: addrForm.isDefault,
        };
        if (editingAddrId) {
          await updateAddress(editingAddrId, payload);
          toastAddressUpdated();
        } else {
          await createAddress(payload);
          toastAddressAdded();
        }
        const fresh = await getAddresses();
        setAddresses(fresh || []);
        const justSaved = (fresh || []).find(a => a.id === editingAddrId)
          || (fresh || []).find(a => a.is_default || a.isDefault)
          || (fresh || [])[0];
        setSelectedAddress(justSaved || null);
      } else {
        // Guest — store the address locally; backend will receive it as
        // shipping_address in the order payload.
        const local = {
          id: 'guest-' + Date.now(),
          full_name:    addrForm.fullName,
          phone_number: guestInfo.phone || addrForm.phoneNumber,
          address:      addrForm.address,
          city:         addrForm.city,
          state:        addrForm.state,
          postal_code:  addrForm.postalCode,
          country:      addrForm.country,
        };
        setSelectedAddress(local);
      }
      setShowAddrForm(false);
      setEditingAddrId(null);
      setAddrForm(EMPTY_ADDR);
    } catch (err) {
      const msg = err.message || 'Failed to save address.';
      setErrorMsg(msg);
      toastAddressError(msg);
    } finally {
      setAddrSaving(false);
    }
  };

  // ── Coupon ────────────────────────────────────────────────────────────
  const onApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponMsg({ type: '', text: '' });
    setCouponLoading(true);
    try {
      const data = await validateCoupon({
        code,
        cartTotal: subtotal,
        paymentMode: isCod ? 'cod' : 'prepaid',
        cartItems: items,
      });
      if (data.success && data.coupon) {
        setAppliedCoupon({ id: data.coupon.id, code: data.coupon.code, discountAmount: data.discountAmount });
        setCouponMsg({ type: 'ok', text: `${data.coupon.code} applied — ${fmt(parseFloat(data.discountAmount))} off` });
        setCouponCode('');
        toastCouponApplied(data.coupon.code);
      } else {
        const msg = data.message || 'Invalid coupon';
        setCouponMsg({ type: 'err', text: msg });
        toastCouponError(msg);
      }
    } catch (err) {
      const msg = err.message || 'Could not apply coupon';
      setCouponMsg({ type: 'err', text: msg });
      toastCouponError(msg);
    } finally {
      setCouponLoading(false);
    }
  };

  const onRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponMsg({ type: '', text: '' });
  };

  // ── Razorpay loader ───────────────────────────────────────────────────
  const loadRazorpay = () => new Promise(resolve => {
    if (document.getElementById('rzp-script')) return resolve(true);
    const s = document.createElement('script');
    s.id = 'rzp-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  // ── Order payload builders ────────────────────────────────────────────
  const buildItems = () => items
    .filter(i => i.productId != null && !isNaN(Number(i.productId)))
    .map(i => ({
      product_id:   Number(i.productId),
      variation_id: i.variationId ? Number(i.variationId) : null,
      quantity:     Number(i.quantity) || 1,
    }));

  const buildCodOrder = (idem) => {
    const base = {
      items: buildItems(),
      payment_type: 'cod',
      notes: '',
      discount_amount: couponOff,
      coupon_id: appliedCoupon?.id || null,
      idempotency_key: idem,
    };
    if (isAuthenticated) return { shipping_address_id: selectedAddress.id, ...base };
    const parts = (guestInfo.fullName || '').trim().split(/\s+/);
    return {
      guest_info: {
        email: guestInfo.email,
        firstName: parts[0] || '',
        lastName:  parts.slice(1).join(' ') || '',
        phone: guestInfo.phone,
      },
      shipping_address: {
        fullName: selectedAddress.full_name || selectedAddress.fullName,
        address:  selectedAddress.address,
        city:     selectedAddress.city,
        state:    selectedAddress.state,
        pincode:  selectedAddress.postal_code || selectedAddress.postalCode,
        phone:    selectedAddress.phone_number || selectedAddress.phoneNumber || guestInfo.phone,
        country:  selectedAddress.country || 'India',
      },
      ...base,
      session_id: getOrCreateGuestSessionId(),
    };
  };

  const buildPrepaidCheckout = (idem) => {
    const base = {
      items: buildItems(),
      payment_type: 'razorpay',
      notes: '',
      discount_amount: prepaidDisc + couponOff,
      coupon_id: appliedCoupon?.id || null,
      idempotency_key: idem,
    };
    if (isAuthenticated) return { shipping_address_id: selectedAddress.id, ...base };
    const parts = (guestInfo.fullName || '').trim().split(/\s+/);
    // Backend /api/checkout/guest/initiate expects guest_info as a
    // nested object — same shape the COD path already uses. The
    // previous flat phone/email/firstName/lastName fields tripped a
    // "guest_info: Required" + "shipping_address_id: Expected
    // number, received nan" validation error.
    return {
      guest_info: {
        email: guestInfo.email,
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || '',
        phone: guestInfo.phone,
      },
      shipping_address: {
        fullName: selectedAddress.full_name || selectedAddress.fullName,
        address:  selectedAddress.address,
        city:     selectedAddress.city,
        state:    selectedAddress.state,
        pincode:  selectedAddress.postal_code || selectedAddress.postalCode,
        phone:    selectedAddress.phone_number || selectedAddress.phoneNumber || guestInfo.phone,
        country:  selectedAddress.country || 'India',
      },
      ...base,
      session_id: getOrCreateGuestSessionId(),
    };
  };

  // ── Place order ───────────────────────────────────────────────────────
  const placeCod = async () => {
    setIsProcessing(true);
    try {
      const data = buildCodOrder(generateIdempotencyKey());
      const result = isAuthenticated ? await createOrder(data) : await createGuestOrder(data);
      if (!result?.order) throw new Error('Order creation failed.');
      clearCart(true);
      toastOrderPlaced(result.order.order_number);
      setOrderSuccess({ orderNumber: result.order.order_number, paymentType: 'cod' });
    } catch (err) {
      const msg = err.message || 'Order placement failed.';
      setErrorMsg(msg);
      toastOrderError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const openRazorpay = (rzpOrder, reservationId) => {
    const opts = {
      key: RAZORPAY_KEY,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      name: 'Velmique',
      description: 'Velmique Maison Order',
      order_id: rzpOrder.id,
      prefill: {
        name:    isAuthenticated ? (user?.username || user?.name || '') : guestInfo.fullName,
        email:   isAuthenticated ? (user?.email || '') : guestInfo.email,
        contact: selectedAddress?.phone_number || selectedAddress?.phoneNumber || guestInfo.phone || '',
      },
      theme: { color: '#8B6914' },
      handler: async (resp) => {
        try {
          const result = await verifyPayment({
            razorpayPaymentId: resp.razorpay_payment_id,
            razorpayOrderId:   resp.razorpay_order_id,
            razorpaySignature: resp.razorpay_signature,
            reservation_id:    reservationId,
          });
          clearCart(true);
          toastPaymentSuccess();
          toastOrderPlaced(result.order?.order_number);
          setOrderSuccess({ orderNumber: result.order?.order_number, paymentType: 'prepaid' });
        } catch (err) {
          const msg = err.message || 'Payment verification failed.';
          setErrorMsg(msg);
          toastPaymentError(msg);
        } finally {
          setIsProcessing(false);
        }
      },
      modal: {
        ondismiss: () => {
          setErrorMsg('Payment was cancelled.');
          toastPaymentError('Payment was cancelled.');
          setIsProcessing(false);
        },
      },
    };
    const rzp = new window.Razorpay(opts);
    rzp.on('payment.failed', (r) => {
      const msg = r.error?.description || 'Payment failed. Please try again.';
      setErrorMsg(msg);
      toastPaymentError(msg);
      setIsProcessing(false);
    });
    rzp.open();
  };

  const placePrepaid = async () => {
    if (!RAZORPAY_KEY) { setErrorMsg('Payment not configured.'); return; }
    setIsProcessing(true);
    try {
      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) {
        setErrorMsg('Failed to load payment SDK.');
        setIsProcessing(false);
        return;
      }
      const data = buildPrepaidCheckout(generateIdempotencyKey());
      const result = isAuthenticated ? await initiateCheckout(data) : await initiateGuestCheckout(data);
      if (!result?.success || !result?.razorpay_order) {
        throw new Error(result?.message || 'Checkout initiation failed.');
      }
      openRazorpay(result.razorpay_order, result.reservation_id);
    } catch (err) {
      const msg = err.message || 'Failed to start checkout.';
      setErrorMsg(msg);
      toastOrderError(msg);
      setIsProcessing(false);
    }
  };

  const onPlaceOrder = async () => {
    setErrorMsg('');
    if (!selectedAddress) { setErrorMsg('Please add a delivery address.'); return; }
    const errs = validateAddress(selectedAddress);
    if (errs.length) { setErrorMsg(errs[0]); return; }
    if (pincodeInfo && pincodeInfo.serviceable === false) { setErrorMsg("Sorry, we don’t deliver to this PIN code yet. Please try a different address."); return; }
    if (!selectedFee) { setErrorMsg('Please pick a delivery method.'); return; }
    if (!isAuthenticated) {
      if (!String(guestInfo.fullName || '').trim()) { setErrorMsg('Please enter your full name.'); return; }
      if (!isValidEmail(guestInfo.email))    { setErrorMsg('Please enter a valid email.'); return; }
      if (!isValidIndianMobile(guestInfo.phone)) { setErrorMsg('Please enter a valid 10-digit mobile.'); return; }
    }
    if (isCod)     { await placeCod();      return; }
    if (isPrepaid) { await placePrepaid();  return; }
    setErrorMsg('Please pick a delivery method.');
  };

  // ── Render ────────────────────────────────────────────────────────────
  const sortedFees = useMemo(() => {
    const arr = [...shippingFees];
    arr.sort((a, b) => (a.orderType === 'cod' ? -1 : 1) - (b.orderType === 'cod' ? -1 : 1));
    return arr;
  }, [shippingFees]);

  const codBlocked = pincodeInfo && pincodeInfo.cod_allowed === false;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm transition-opacity duration-300 ${cartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setCartOpen(false)}
      />

      {/* Drawer */}
      <aside
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        className={`fixed right-0 top-0 h-full w-full max-w-md z-[90] bg-[#FBF7EC] border-l border-[#E0D4B8] transition-transform duration-400 ease-out flex flex-col ${cartOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E0D4B8] bg-white">
          <div className="flex items-center gap-3">
            <ShoppingBag size={18} className="text-[#8B6914]" />
            <span className="font-serif italic text-lg text-[#1A1612]">
              {orderSuccess ? 'Order Confirmed' : 'Your Bag'}
            </span>
            {!orderSuccess && cartCount > 0 && (
              <span className="bg-[#C9A84C]/20 text-[#8B6914] text-[10px] font-body px-2 py-0.5 rounded-full tracking-wider uppercase">
                {cartCount} {cartCount === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          <button onClick={() => setCartOpen(false)} className="text-[#1A1612]/60 hover:text-[#8B6914] transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Order success state ───────────────────────────────────── */}
          {orderSuccess ? (
            <div className="px-6 py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#C9A84C]/15 border border-[#C9A84C]/40 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={28} className="text-[#8B6914]" />
              </div>
              <h3 className="font-display text-2xl uppercase tracking-tight text-[#1A1612] mb-2">Order placed</h3>
              <p className="text-sm font-body text-[#4A3F33] mb-1">Thank you for your order.</p>
              <p className="text-xs font-body text-[#8A7E6C] mb-6">
                Order Number: <span className="text-[#1A1612] font-medium">{orderSuccess.orderNumber || '—'}</span>
              </p>
              <button
                onClick={() => {
                  setCartOpen(false);
                  if (orderSuccess.orderNumber) router.push(`/track-order?order=${orderSuccess.orderNumber}`);
                }}
                className="pill-cta mx-auto !py-2.5 !px-6"
              >
                Track Order <ArrowRight size={13} />
              </button>
            </div>
          ) : items.length === 0 ? (
            // ── Empty cart ──────────────────────────────────────────────
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-6 py-20">
              <ShoppingBag size={48} className="text-[#1A1612]/15" />
              <p className="font-serif italic text-2xl text-[#1A1612]/50">Your bag is empty</p>
              <p className="text-[#4A3F33] text-sm font-body">Discover our maison's collections.</p>
              <Link href="/shop" onClick={() => setCartOpen(false)} className="pill-cta mt-2">
                Explore the Shop <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <>
              {/* ── Items ──────────────────────────────────────────────── */}
              <div className="px-5 py-4 space-y-4 border-b border-[#E0D4B8]">
                {items.map((item, i) => (
                  <div key={`${item.id}-${i}`} className="flex gap-3 pb-4 border-b border-[#E0D4B8] last:border-0 last:pb-0">
                    <Link href={`/product/${item.slug}`} onClick={() => setCartOpen(false)} className="shrink-0">
                      <img src={item.image} alt={item.name} className="w-20 h-24 object-cover rounded-md" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/product/${item.slug}`} onClick={() => setCartOpen(false)}>
                        <h4 className="font-serif text-sm md:text-base text-[#1A1612] hover:text-[#8B6914] transition-colors line-clamp-2">{item.name}</h4>
                      </Link>
                      {(item.size || item.color) && (
                        <p className="text-[#8A7E6C] text-[10px] tracking-[0.2em] uppercase font-body mt-1">
                          {[item.size, item.color].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center border border-[#E0D4B8] rounded-full bg-white">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.size)}
                            className="px-2.5 py-1 text-[#4A3F33] hover:text-[#8B6914]"><Minus size={12} /></button>
                          <span className="px-2 text-[#1A1612] text-sm font-body">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.size)}
                            className="px-2.5 py-1 text-[#4A3F33] hover:text-[#8B6914]"><Plus size={12} /></button>
                        </div>
                        <span className="font-serif italic text-[#1A1612] text-sm">{fmt(item.price * item.quantity)}</span>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.id, item.size)}
                      className="text-[#1A1612]/30 hover:text-red-500 transition-colors self-start mt-1" aria-label="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* ── Address section ─────────────────────────────────────── */}
              <div className="px-5 py-4 border-b border-[#E0D4B8] space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] tracking-[0.35em] uppercase text-[#8A7E6C] font-body">Deliver To</p>
                  {isAuthenticated && addresses.length > 1 && !showAddrForm && (
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setShowAddrDropdown(s => !s)}
                        className="text-[10px] tracking-[0.25em] uppercase text-[#8B6914] hover:text-[#1A1612] font-body"
                      >
                        Change
                      </button>
                      {showAddrDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-[#E0D4B8] rounded-xl shadow-lg z-10 max-h-64 overflow-y-auto">
                          {addresses.map(a => (
                            <button key={a.id} onClick={() => { setSelectedAddress(a); setShowAddrDropdown(false); }}
                              className={`w-full text-left px-3 py-2.5 text-xs font-body border-b border-[#F5EFE0] last:border-0 hover:bg-[#F5EFE0] ${selectedAddress?.id === a.id ? 'bg-[#F5EFE0]' : ''}`}>
                              <p className="font-medium text-[#1A1612]">{a.full_name || a.fullName}</p>
                              <p className="text-[#8A7E6C] truncate">{a.address}, {a.city}, {a.state} - {a.postal_code || a.postalCode}</p>
                            </button>
                          ))}
                          <button onClick={() => { setShowAddrDropdown(false); setEditingAddrId(null); setAddrForm(EMPTY_ADDR); setShowAddrForm(true); }}
                            className="w-full text-left px-3 py-2.5 text-xs font-body text-[#8B6914] hover:bg-[#F5EFE0] flex items-center gap-1.5">
                            <Plus size={12} /> Add new address
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedAddress && !showAddrForm && (
                  <div className="bg-white border border-[#E0D4B8] rounded-xl p-3.5 flex items-start gap-2.5">
                    <MapPin size={14} className="text-[#8B6914] mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-serif italic text-[#1A1612] text-sm">{selectedAddress.full_name || selectedAddress.fullName}</p>
                      <p className="text-[#4A3F33] text-xs font-body mt-0.5 leading-relaxed">
                        {selectedAddress.address}, {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.postal_code || selectedAddress.postalCode}
                      </p>
                      <p className="text-[#8A7E6C] text-[10px] font-body mt-1">{selectedAddress.phone_number || selectedAddress.phoneNumber}</p>
                      {pincodeInfo && pincodeInfo.serviceable === false && (
                        <p className="text-red-600 text-[10px] font-body mt-1">Not serviceable in this PIN.</p>
                      )}
                    </div>
                    <button onClick={() => onEditAddress(selectedAddress)} className="text-[#8B6914] hover:text-[#1A1612]" aria-label="Edit address">
                      <Edit3 size={13} />
                    </button>
                  </div>
                )}

                {(!selectedAddress || showAddrForm) && (
                  <form onSubmit={onSaveAddress} className="space-y-2">
                    <input name="fullName" value={addrForm.fullName}
                      onChange={(e) => {
                        onAddrField(e);
                        if (!isAuthenticated) setGuestInfo(p => ({ ...p, fullName: e.target.value }));
                      }}
                      placeholder="Full name" className="w-full input-gold px-3 py-2.5 text-sm font-body rounded-md" />
                    <input name="phoneNumber" value={addrForm.phoneNumber}
                      onChange={(e) => {
                        onAddrField(e);
                        if (!isAuthenticated) setGuestInfo(p => ({ ...p, phone: String(e.target.value).replace(/\D/g, '').slice(0, 10) }));
                      }}
                      placeholder="10-digit mobile" inputMode="numeric"
                      className="w-full input-gold px-3 py-2.5 text-sm font-body rounded-md" />
                    {!isAuthenticated && (
                      <input value={guestInfo.email}
                        onChange={(e) => setGuestInfo(p => ({ ...p, email: e.target.value }))}
                        placeholder="Email (for order confirmation)" type="email"
                        className="w-full input-gold px-3 py-2.5 text-sm font-body rounded-md" />
                    )}
                    <input name="address" value={addrForm.address} onChange={onAddrField}
                      placeholder="Street address" className="w-full input-gold px-3 py-2.5 text-sm font-body rounded-md" />
                    <div className="grid grid-cols-3 gap-2">
                      <input name="postalCode" value={addrForm.postalCode} onChange={onAddrField} onBlur={onPincodeBlur}
                        placeholder="PIN" inputMode="numeric"
                        className="input-gold px-3 py-2.5 text-sm font-body rounded-md" />
                      <input name="city" value={addrForm.city} onChange={onAddrField}
                        placeholder="City" className="input-gold px-3 py-2.5 text-sm font-body rounded-md" />
                      <input name="state" value={addrForm.state} onChange={onAddrField}
                        placeholder="State" className="input-gold px-3 py-2.5 text-sm font-body rounded-md" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button type="submit" disabled={addrSaving}
                        className={`pill-cta justify-center flex-1 !py-2.5 !text-[10px] ${addrSaving ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        {addrSaving && <Loader2 size={12} className="animate-spin" />}
                        {editingAddrId ? 'Update' : 'Save'} Address
                      </button>
                      {selectedAddress && (
                        <button type="button" onClick={() => { setShowAddrForm(false); setEditingAddrId(null); setAddrForm(EMPTY_ADDR); }}
                          className="text-[#8A7E6C] text-[10px] tracking-[0.3em] uppercase font-body hover:text-[#1A1612]">
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>

              {/* ── Delivery method ─────────────────────────────────────── */}
              <div className="px-5 py-4 border-b border-[#E0D4B8] space-y-3">
                <p className="text-[10px] tracking-[0.35em] uppercase text-[#8A7E6C] font-body">Delivery Method</p>
                <div className="space-y-2">
                  {sortedFees.map(f => {
                    const disabled = f.orderType === 'cod' && codBlocked;
                    const active = selectedFee?.id === f.id;
                    return (
                      <button key={f.id} onClick={() => !disabled && setSelectedFee(f)}
                        disabled={disabled}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          active ? 'border-[#C9A84C] bg-[#C9A84C]/10' : 'border-[#E0D4B8] bg-white hover:border-[#C9A84C]'
                        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        {f.orderType === 'cod'
                          ? <Wallet size={16} className="text-[#8B6914]" />
                          : <CreditCard size={16} className="text-[#8B6914]" />
                        }
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm text-[#1A1612] font-medium">
                            {f.orderType === 'cod' ? 'Cash on Delivery' : 'UPI / Card / Net Banking'}
                          </p>
                          <p className="text-[#8A7E6C] text-[10px] font-body mt-0.5">
                            {f.orderType === 'cod'
                              ? (disabled ? 'Not available for this PIN' : 'Pay when your order arrives')
                              : `Razorpay${PREPAID_INSTANT_DISCOUNT_INR > 0 ? ` · ${fmt(PREPAID_INSTANT_DISCOUNT_INR)} instant off` : ''}`}
                          </p>
                        </div>
                        <span className="text-[10px] font-body text-[#8B6914]">
                          {parseFloat(f.fee || 0) > 0 ? `+ ${fmt(f.fee)}` : 'Free'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Coupon ──────────────────────────────────────────────── */}
              <div className="px-5 py-4 border-b border-[#E0D4B8] space-y-2">
                <p className="text-[10px] tracking-[0.35em] uppercase text-[#8A7E6C] font-body">Promo Code</p>
                {appliedCoupon ? (
                  <div className="flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/40 rounded-md px-3 py-2.5">
                    <Tag size={13} className="text-[#8B6914]" />
                    <span className="text-sm font-body text-[#1A1612] flex-1">
                      <span className="font-serif italic">{appliedCoupon.code}</span> · {fmt(appliedCoupon.discountAmount)} off
                    </span>
                    <button onClick={onRemoveCoupon} className="text-[#8A7E6C] hover:text-red-500" aria-label="Remove coupon">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 input-gold px-3 py-2.5 text-sm font-body rounded-md" />
                    <button onClick={onApplyCoupon} disabled={couponLoading || !couponCode.trim()}
                      className={`px-4 py-2.5 bg-[#1A1612] text-white text-[10px] tracking-[0.3em] uppercase font-body rounded-md hover:bg-[#8B6914] transition-colors ${couponLoading || !couponCode.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {couponLoading ? <Loader2 size={12} className="animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                )}
                {couponMsg.text && (
                  <p className={`text-[11px] font-body ${couponMsg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
                    {couponMsg.text}
                  </p>
                )}
              </div>

              {/* ── Summary ─────────────────────────────────────────────── */}
              <div className="px-5 py-4 space-y-2">
                <p className="text-[10px] tracking-[0.35em] uppercase text-[#8A7E6C] font-body mb-2">Order Summary</p>
                <Row label="Subtotal" value={fmt(subtotal)} />
                <Row label="Shipping" value={shippingFee > 0 ? fmt(shippingFee) : 'Free'} />
                {couponOff > 0  && <Row label="Coupon Discount"   value={`- ${fmt(couponOff)}`}  highlight />}
                {prepaidDisc > 0 && <Row label="Prepaid Discount"  value={`- ${fmt(prepaidDisc)}`} highlight />}
                <div className="h-px bg-[#E0D4B8] my-2" />
                <div className="flex items-baseline justify-between">
                  <span className="text-[#1A1612] font-body uppercase tracking-[0.2em] text-xs">Total</span>
                  <span className="font-serif italic text-[#1A1612] text-2xl">{fmt(finalPayable)}</span>
                </div>
                {isPrepaid && PREPAID_INSTANT_DISCOUNT_INR > 0 && prepaidDisc === 0 && (
                  <p className="text-[10px] font-body text-[#8B6914] mt-1">
                    {fmt(PREPAID_INSTANT_DISCOUNT_INR)} instant discount applied automatically when you pay online.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer — place order */}
        {!orderSuccess && items.length > 0 && (
          <div className="border-t border-[#E0D4B8] px-5 py-4 bg-white space-y-2">
            {errorMsg && (
              <div className="text-[11px] font-body text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {errorMsg}
              </div>
            )}
            <button onClick={onPlaceOrder} disabled={isProcessing || (pincodeInfo && pincodeInfo.serviceable === false)}
              className={`pill-cta pill-cta-dark w-full justify-center !py-3.5 !text-xs ${isProcessing || (pincodeInfo && pincodeInfo.serviceable === false) ? 'opacity-60 cursor-not-allowed' : ''}`}>
              {isProcessing
                ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
                : <>{isCod ? 'Place COD Order' : 'Pay & Place Order'} · {fmt(finalPayable)} <ArrowRight size={13} /></>
              }
            </button>
            <p className="text-center text-[10px] tracking-[0.3em] uppercase font-body text-[#8A7E6C]">
              Secure checkout · 14-day returns
            </p>
          </div>
        )}
      </aside>
    </>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between text-sm font-body">
      <span className="text-[#4A3F33]">{label}</span>
      <span className={highlight ? 'text-[#8B6914] font-medium' : 'text-[#1A1612]'}>{value}</span>
    </div>
  );
}
