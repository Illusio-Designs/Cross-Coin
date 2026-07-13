'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCartContext } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
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
  validateCoupon,
} from '@/lib/api/orders';
import {
  toastOrderPlaced,
  toastOrderError,
  showError,
  showWarning,
} from '@/lib/toast';
import '@/styles/CartDrawer.css';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { addressSchema } from '@/lib/addressSchema';

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const PREPAID_INSTANT_DISCOUNT_INR = Math.max(
  0,
  parseFloat(process.env.NEXT_PUBLIC_PREPAID_INSTANT_DISCOUNT_INR || '0') || 0
);
const PREPAID_NUDGE_LINE =
  process.env.NEXT_PUBLIC_PREPAID_NUDGE_TEXT ||
  (PREPAID_INSTANT_DISCOUNT_INR > 0
    ? `Get ₹${Math.round(PREPAID_INSTANT_DISCOUNT_INR)} Instant Discount on Prepaid`
    : 'Free Surprise Gift on Prepaid Orders.');

const FALLBACK_SHIPPING_FEES = [
  { id: 'fallback-prepaid', orderType: 'prepaid', fee: 0, isDefault: true },
  { id: 'fallback-cod', orderType: 'cod', fee: 0 },
];

function getOrCreateGuestSessionId() {
  if (typeof document === 'undefined') return 'guest-' + Date.now();
  const key = 'guestSessionId';
  const match = document.cookie.split('; ').find(r => r.startsWith(key + '='));
  if (match) return match.split('=')[1];
  const id = 'guest-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${key}=${id}; expires=${expires}; path=/; SameSite=Lax`;
  return id;
}

function generateIdempotencyKey() {
  return 'idem-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

// Validate a shipping address using the shared Zod schema. A payload
// that passes here passes the backend's shippingAddressBase. Returns
// the raw issues so the caller can map them onto fieldErrors keyed by
// path (no more brittle keyword-matching).
function validateShippingAddress(addr) {
  if (!addr) return { valid: false, errors: ['Address is empty'], issues: [] };
  const candidate = {
    fullName: addr.full_name || addr.fullName || '',
    phoneNumber: addr.phone_number || addr.phoneNumber || addr.phone || '',
    address: addr.address || '',
    landmark: addr.landmark || '',
    city: addr.city || '',
    state: addr.state || '',
    postalCode: addr.postal_code || addr.postalCode || addr.pincode || '',
    country: addr.country || 'India',
    isDefault: addr.is_default ?? addr.isDefault ?? false,
  };
  const result = addressSchema.safeParse(candidate);
  if (result.success) return { valid: true, errors: [], issues: [] };
  return {
    valid: false,
    errors: result.error.issues.map((i) => i.message),
    issues: result.error.issues,
  };
}

// Map Zod issues to the CartDrawer's fieldErrors shape — keyed by the
// drawer's input names (name / phone / address / city / state /
// pincode), not by the schema path. Single place that does this
// translation so the per-input code stays simple.
function issuesToFieldErrors(issues) {
  const out = {};
  const pathToKey = {
    fullName: 'name', phoneNumber: 'phone', address: 'address',
    city: 'city', state: 'state', postalCode: 'pincode',
  };
  for (const issue of issues || []) {
    const path = issue.path?.[0];
    const key = pathToKey[path];
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

function isValidEmail(v) {
  const s = String(v || '').trim();
  if (!s || !s.includes('@')) return false;
  const [local, domain] = s.split('@');
  if (!local || !domain) return false;
  return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.');
}

function isValidIndianMobile(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  return d.length === 10 && /^[6-9]\d{9}$/.test(d);
}

function getDeliveryDateStr() {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function pickImage(item) {
  if (Array.isArray(item.images) && item.images.length > 0)
    return item.images[0]?.image_url || item.images[0];
  return item.image || null;
}
function getPrice(item) { return parseFloat(item.variation?.price || item.price || 0); }
function getMrp(item) { return parseFloat(item.variation?.comparePrice || item.compareAtPrice || item.comparePrice || 0); }
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

// ── SVG Icons ──────────────────────────────────────────────────────────────
const IconX = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconEdit = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconPlus = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconTruck = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
const IconSuccess = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconChevronDown = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const IconFlame = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M12 2c0 0-4 4-4 8a4 4 0 008 0c0-1.5-.5-3-1-4 0 0-1 2-2 2s-1-2-1-4z"/><path d="M12 22c-3.3 0-6-2.7-6-6 0-2.2 1.2-4.2 3-5.4"/></svg>;
const IconClock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconMoneyBag = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M12 2C9 2 7 4 7 6h10c0-2-2-4-5-4z"/><path d="M7 6C4 6 2 9 2 12c0 5 4 10 10 10s10-5 10-10c0-3-2-6-5-6H7z"/><path d="M12 10v4"/><path d="M10 12h4"/></svg>;
const IconShield = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L4 5.5V11c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V5.5L12 2z"/>
    <polyline points="8.5 12 11 14.5 15.5 10"/>
  </svg>
);
const IconLock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
const IconTruckSmall = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
const IconWhatsApp = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>;

// ── Main Component ──────────────────────────────────────────────────────────
export function CartDrawer() {
  const router = useRouter();
  const {
    cartItems: items,
    isDrawerOpen: drawerOpen,
    setIsDrawerOpen,
    clearCart,
    removeFromCart: removeItem,
    updateQuantity: updateQty,
  } = useCartContext();
  // Stable closeDrawer — useFocusTrap depends on onEscape; a fresh
  // arrow function each render would re-run the trap effect and
  // steal focus from inputs (cursor disappeared after every keystroke
  // in the guest address form).
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [setIsDrawerOpen]);
  const { user, isAuthenticated } = useAuth();

  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [urgencySeconds, setUrgencySeconds] = useState(10 * 60);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    setUrgencySeconds(10 * 60);
    const id = setInterval(() => setUrgencySeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [drawerOpen]);

  // Guest contact
  const [guestInfo, setGuestInfo] = useState({ email: '', fullName: '', phone: '' });
  const [guestPhoneError, setGuestPhoneError] = useState('');

  // Address
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDR);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [addressPhoneError, setAddressPhoneError] = useState('');

  // Shipping
  const [shippingFees, setShippingFees] = useState([]);
  const [selectedFee, setSelectedFee] = useState(null);
  const [pincodeServiceability, setPincodeServiceability] = useState(null);

  // Order
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [paymentFailed, setPaymentFailed] = useState({ error: null, rzpOrder: null, retryCount: 0, reservationId: null });

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  const bodyRef = useRef(null);
  const dropdownRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  // ── Visibility ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (drawerOpen) {
      setIsVisible(true);
    } else {
      const t = setTimeout(() => {
        setIsVisible(false);
        setOrderSuccess(null);
        setCouponCode('');
        setAppliedCoupon(null);
        setCouponError('');
        setCouponSuccess('');
        setPaymentFailed({ error: null, rzpOrder: null, retryCount: 0, reservationId: null });
      }, 300);
      return () => clearTimeout(t);
    }
  }, [drawerOpen]);

  // ── Body open class ─────────────────────────────────────────────────────
  useEffect(() => {
    if (drawerOpen) document.body.classList.add('cd-drawer-open-body');
    else document.body.classList.remove('cd-drawer-open-body');
    return () => document.body.classList.remove('cd-drawer-open-body');
  }, [drawerOpen]);

  // Focus trap + Escape — handled by useFocusTrap. Restores focus to the
  // element that opened the drawer on close.
  const trapRef = useFocusTrap(drawerOpen, { onEscape: closeDrawer });

  // ── Shipping fees ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!drawerOpen) return;
    getShippingFees().then(data => {
      const raw = Array.isArray(data) ? data : data?.shippingFees || data?.fees || [];
      const fees = raw.length > 0 ? raw : FALLBACK_SHIPPING_FEES;
      setShippingFees(fees);
      const def = fees.find(f => f.orderType === 'prepaid') || fees.find(f => f.isDefault) || fees[0];
      setSelectedFee(def || null);
    }).catch(() => {
      setShippingFees(FALLBACK_SHIPPING_FEES);
      setSelectedFee(FALLBACK_SHIPPING_FEES[0]);
    });
  }, [drawerOpen]);

  useEffect(() => {
    if (shippingFees.length === 0) return;
    setSelectedFee(prev => {
      if (prev && shippingFees.some(f => f.id === prev.id)) return prev;
      return shippingFees.find(f => f.orderType === 'prepaid') || shippingFees.find(f => f.isDefault) || shippingFees[0];
    });
  }, [shippingFees]);

  // ── Load addresses ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!drawerOpen || !isAuthenticated) return;
    setAddressLoading(true);
    getUserAddresses().then(data => {
      const list = Array.isArray(data) ? data : data?.shippingAddresses || data?.addresses || [];
      setAddresses(list);
      const def = list.find(a => a.isDefault || a.is_default) || list[0];
      if (def && !selectedAddress) {
        setSelectedAddress(def);
        const pin = String(def.postal_code || def.postalCode || '').replace(/\D/g, '');
        if (pin.length === 6) {
          checkPincodeServiceability(pin)
            .then(r => setPincodeServiceability({ serviceable: r?.serviceable !== false, cod_allowed: r?.cod_allowed !== false }))
            .catch(() => {});
        }
      }
    }).catch(() => {}).finally(() => setAddressLoading(false));
  }, [drawerOpen, isAuthenticated]);

  // Auto-open address form for guests
  useEffect(() => {
    if (!drawerOpen || isAuthenticated) return;
    if (!selectedAddress) setShowAddressForm(true);
  }, [drawerOpen, isAuthenticated, selectedAddress]);

  // Live phone validation (auth address form)
  useEffect(() => {
    if (!isAuthenticated || !showAddressForm) { setAddressPhoneError(''); return; }
    const d = String(addressForm.phoneNumber || '').replace(/\D/g, '');
    if (d.length === 0) setAddressPhoneError('');
    else if (!isValidIndianMobile(d)) setAddressPhoneError('Enter a valid 10-digit Indian mobile (starts with 6–9).');
    else setAddressPhoneError('');
  }, [addressForm.phoneNumber, isAuthenticated, showAddressForm]);

  // Real-time field validation — driven by the shared Zod schema so the
  // CartDrawer accepts exactly what the backend accepts. Issues are
  // mapped onto the drawer's fieldErrors keys via issue.path.
  useEffect(() => {
    if (!showAddressForm) { setFieldErrors({}); return; }
    const t = setTimeout(() => {
      const formToValidate = isAuthenticated
        ? { full_name: addressForm.fullName, address: addressForm.address, city: addressForm.city, state: addressForm.state, postal_code: addressForm.postalCode, phone_number: addressForm.phoneNumber }
        : { full_name: guestInfo.fullName.trim(), address: addressForm.address, city: addressForm.city, state: addressForm.state, postal_code: addressForm.postalCode, phone_number: guestInfo.phone };
      const result = validateShippingAddress(formToValidate);
      setFieldErrors(issuesToFieldErrors(result.issues));
    }, 400);
    return () => clearTimeout(t);
  }, [showAddressForm, addressForm, guestInfo, isAuthenticated]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowAddressDropdown(false);
    };
    if (showAddressDropdown) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddressDropdown]);

  // Scroll hint
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const check = () => setShowScrollHint(el.scrollTop < el.scrollHeight - el.clientHeight - 40);
    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', check); ro.disconnect(); };
  }, [drawerOpen, items.length]);

  // ── Computed totals ─────────────────────────────────────────────────────
  const cartTotal = items.reduce((s, i) => s + getPrice(i) * i.quantity, 0);
  const shippingFeeAmount = parseFloat(selectedFee?.fee || 0);
  const couponDiscount = appliedCoupon ? parseFloat(appliedCoupon.discountAmount) : 0;
  const finalTotal = Math.max(0, cartTotal + shippingFeeAmount - couponDiscount);
  const totalQty = items.reduce((s, i) => s + (i.quantity || 1), 0);

  const sortedShippingFees = useMemo(() => {
    const arr = [...shippingFees];
    arr.sort((a, b) => {
      if (a.orderType === 'cod' && b.orderType !== 'cod') return -1;
      if (a.orderType !== 'cod' && b.orderType === 'cod') return 1;
      return 0;
    });
    return arr;
  }, [shippingFees]);

  const prepaidInstantDiscount = selectedFee?.orderType === 'prepaid' && PREPAID_INSTANT_DISCOUNT_INR > 0
    ? Math.min(PREPAID_INSTANT_DISCOUNT_INR, finalTotal) : 0;
  const prepaidPayable = Math.max(0, finalTotal - prepaidInstantDiscount);
  const isCodDelivery = selectedFee?.orderType === 'cod';
  const isPrepaidDelivery = selectedFee?.orderType === 'prepaid';

  const scrollDrawerTo = (id) => {
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      const body = bodyRef.current;
      if (el && body) body.scrollTo({ top: Math.max(0, el.offsetTop - body.offsetTop - 8), behavior: 'smooth' });
    });
  };

  // ── Address form handlers ───────────────────────────────────────────────
  const handleAddrChange = (e) => {
    const { name, value, type, checked } = e.target;
    let v = type === 'checkbox' ? checked : value;
    if (name === 'phoneNumber' && typeof v === 'string') v = v.replace(/\D/g, '').slice(0, 10);
    setAddressForm(p => ({ ...p, [name]: v }));
  };

  const handlePincodeBlur = async (e) => {
    const pin = e.target.value.replace(/\D/g, '');
    if (pin.length !== 6) return;
    try {
      const result = await checkPincodeServiceability(pin);
      setPincodeServiceability({ serviceable: result?.serviceable !== false, cod_allowed: result?.cod_allowed !== false });
      if (result?.city || result?.state) {
        setAddressForm(p => ({ ...p, city: result.city || p.city, state: result.state || p.state }));
      }
    } catch { setPincodeServiceability(null); }
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
    const formData = isAuthenticated
      ? addressForm
      : { ...addressForm, fullName: guestInfo.fullName.trim() || addressForm.fullName, phoneNumber: guestInfo.phone || addressForm.phoneNumber };

    const addrToValidate = {
      full_name: formData.fullName,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      postal_code: formData.postalCode,
      phone_number: isAuthenticated ? formData.phoneNumber : guestInfo.phone,
    };
    const validation = validateShippingAddress(addrToValidate);
    if (!validation.valid) { showError(validation.errors[0]); return; }

    setAddressSaving(true);
    try {
      if (isAuthenticated) {
        let saved;
        if (editingAddressId) saved = await updateShippingAddress(editingAddressId, formData);
        else saved = await createShippingAddress(formData);
        const fresh = await getUserAddresses();
        setAddresses(Array.isArray(fresh) ? fresh : fresh?.addresses || []);
        setSelectedAddress(saved || formData);
      } else {
        const saved = {
          id: Date.now(),
          full_name: formData.fullName,
          phone_number: guestInfo.phone || formData.phoneNumber,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postalCode,
          country: formData.country,
        };
        setSelectedAddress(saved);
      }
      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm(EMPTY_ADDR);
    } catch (err) {
      showError(err.message || 'Failed to save address. Please try again.');
    } finally {
      setAddressSaving(false);
    }
  };

  // ── Coupon ──────────────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponError('');
    setCouponSuccess('');
    setCouponLoading(true);
    try {
      const paymentMode = selectedFee?.orderType === 'cod' ? 'cod' : 'prepaid';
      const data = await validateCoupon({ code, cartTotal, paymentMode, cartItems: items });
      if (data.success) {
        setAppliedCoupon({ id: data.coupon.id, code: data.coupon.code, discountAmount: data.discountAmount, paymentModeRestriction: data.coupon.paymentModeRestriction });
        setCouponSuccess(`"${data.coupon.code}" applied — ₹${parseFloat(data.discountAmount).toFixed(0)} off!`);
        setCouponCode('');
      } else {
        setCouponError(data.message || 'Invalid coupon code');
      }
    } catch (err) {
      setCouponError(err.message || 'Failed to validate coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponSuccess('');
    setCouponError('');
    setCouponCode('');
  };

  // ── Razorpay ────────────────────────────────────────────────────────────
  const loadRazorpay = () => new Promise(resolve => {
    if (document.getElementById('rzp-script')) return resolve(true);
    const s = document.createElement('script');
    s.id = 'rzp-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  // ── Build payloads ──────────────────────────────────────────────────────
  const buildItemsPayload = () => items
    .filter(item => item.productId != null && !isNaN(Number(item.productId)))
    .map(item => ({
      product_id: Number(item.productId),
      variation_id: item.variationId ? Number(item.variationId) : (item.variation?.id ? Number(item.variation.id) : null),
      quantity: Number(item.quantity) || 1,
    }));

  const buildCodOrderData = (idempotencyKey) => {
    const base = {
      items: buildItemsPayload(),
      payment_type: 'cod',
      notes: '',
      discount_amount: couponDiscount,
      coupon_id: appliedCoupon?.id || null,
      idempotency_key: idempotencyKey,
    };
    if (isAuthenticated) return { shipping_address_id: selectedAddress.id, ...base };
    const nameParts = (guestInfo.fullName || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    return {
      guest_info: { email: guestInfo.email, firstName, lastName, phone: guestInfo.phone },
      shipping_address: {
        fullName: selectedAddress.full_name || selectedAddress.fullName,
        address: selectedAddress.address,
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.postal_code || selectedAddress.postalCode,
        phone: selectedAddress.phone_number || selectedAddress.phoneNumber || guestInfo.phone,
        country: selectedAddress.country || 'India',
      },
      ...base,
      session_id: getOrCreateGuestSessionId(),
    };
  };

  const buildPrepaidCheckoutData = (idempotencyKey) => {
    const base = {
      items: buildItemsPayload(),
      payment_type: 'razorpay',
      notes: '',
      discount_amount: prepaidInstantDiscount + couponDiscount,
      coupon_id: appliedCoupon?.id || null,
      idempotency_key: idempotencyKey,
    };
    if (isAuthenticated) return { shipping_address_id: selectedAddress.id, ...base };
    const nameParts = (guestInfo.fullName || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    // Backend /api/checkout/guest/initiate expects guest_info as a
    // nested object — same shape buildCodOrderData uses. Flat
    // phone/email/firstName/lastName fields trip a
    // "guest_info: Required" + "shipping_address_id: nan" error.
    return {
      guest_info: {
        email: guestInfo.email,
        firstName,
        lastName,
        phone: guestInfo.phone,
      },
      shipping_address: {
        fullName: selectedAddress.full_name || selectedAddress.fullName,
        address: selectedAddress.address,
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.postal_code || selectedAddress.postalCode,
        phone: selectedAddress.phone_number || selectedAddress.phoneNumber || guestInfo.phone,
        country: selectedAddress.country || 'India',
      },
      ...base,
      session_id: getOrCreateGuestSessionId(),
    };
  };

  // ── Place COD order ──────────────────────────────────────────────────────
  const placeCodOrder = async () => {
    setIsProcessing(true);
    try {
      const orderData = buildCodOrderData(generateIdempotencyKey());
      const result = isAuthenticated ? await createOrder(orderData) : await createGuestOrder(orderData);
      if (!result?.order) throw new Error('Order creation failed.');
      clearCart();
      toastOrderPlaced(result.order.order_number);
      setOrderSuccess({ orderNumber: result.order.order_number });
    } catch (err) {
      toastOrderError(err.message || 'Order placement failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Open Razorpay ────────────────────────────────────────────────────────
  const openRazorpay = (rzpOrder, reservationId) => {
    const options = {
      key: RAZORPAY_KEY,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      name: 'Velquira',
      description: 'Payment for Velquira Order',
      order_id: rzpOrder.id,
      prefill: {
        name: isAuthenticated ? (user?.username || user?.name || '') : guestInfo.fullName,
        email: isAuthenticated ? (user?.email || '') : guestInfo.email,
        contact: selectedAddress?.phone_number || selectedAddress?.phoneNumber || '',
      },
      theme: { color: '#0a0a0a' },
      handler: async (response) => {
        try {
          const result = await verifyPayment({
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
            reservation_id: reservationId,
          });
          const orderNumber = result.order?.order_number;
          clearCart();
          setPaymentFailed({ error: null, rzpOrder: null, retryCount: 0, reservationId: null });
          toastOrderPlaced(orderNumber);
          setOrderSuccess({ orderNumber });
        } catch {
          toastOrderPlaced('—');
          clearCart();
        } finally {
          setIsProcessing(false);
        }
      },
      modal: {
        ondismiss: () => {
          setPaymentFailed(prev => ({ error: 'Payment was cancelled.', rzpOrder, retryCount: prev.retryCount, reservationId }));
          setIsProcessing(false);
        },
      },
    };
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (r) => {
      setPaymentFailed(prev => ({
        error: r.error?.description || 'Payment failed. Please try again.',
        rzpOrder,
        retryCount: prev.retryCount,
        reservationId,
      }));
      setIsProcessing(false);
    });
    rzp.open();
  };

  // ── Handle place order ──────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    const addrValidation = validateShippingAddress(selectedAddress);
    if (!addrValidation.valid) {
      showError(addrValidation.errors[0]);
      scrollDrawerTo('cd-section-address');
      return;
    }
    if (!selectedFee) {
      showError('Please select a delivery method.');
      scrollDrawerTo('cd-section-delivery');
      return;
    }
    if (!isAuthenticated) {
      if (!String(guestInfo.fullName || '').trim()) {
        showError('Please enter your full name.');
        scrollDrawerTo('cd-section-address');
        return;
      }
      if (!isValidEmail(guestInfo.email) || !isValidIndianMobile(guestInfo.phone)) {
        showError('Please enter a valid email and 10-digit phone number.');
        scrollDrawerTo('cd-section-address');
        return;
      }
    }
    const phoneRaw = isAuthenticated
      ? (selectedAddress?.phone_number || selectedAddress?.phoneNumber || '')
      : guestInfo.phone;
    if (!isValidIndianMobile(phoneRaw)) {
      showError('Please add a valid 10-digit mobile number.');
      scrollDrawerTo('cd-section-address');
      return;
    }

    if (isCodDelivery) {
      await placeCodOrder();
      return;
    }

    if (isPrepaidDelivery) {
      if (!RAZORPAY_KEY) { showError('Payment not configured. Please contact support.'); return; }
      if (prepaidPayable <= 0) { showError('Order amount must be greater than zero.'); return; }
      setIsProcessing(true);
      try {
        const scriptLoaded = await loadRazorpay();
        if (!scriptLoaded || !window.Razorpay) {
          showError('Failed to load payment SDK. Please refresh and try again.');
          setIsProcessing(false);
          return;
        }
        const checkoutData = buildPrepaidCheckoutData(generateIdempotencyKey());
        const checkoutResult = isAuthenticated
          ? await initiateCheckout(checkoutData)
          : await initiateGuestCheckout(checkoutData);
        if (!checkoutResult?.success || !checkoutResult?.razorpay_order) {
          throw new Error(checkoutResult?.message || 'Checkout initiation failed.');
        }
        openRazorpay(checkoutResult.razorpay_order, checkoutResult.reservation_id);
      } catch (err) {
        showError(err.message || 'Failed to start checkout. Please try again.');
        setIsProcessing(false);
      }
      return;
    }

    showError('Please select a delivery method.');
  };

  if (!isVisible) return null;

  return (
    <>
      <div className={`cd-backdrop ${drawerOpen ? 'cd-backdrop-active' : ''}`} onClick={closeDrawer} />
      <div ref={trapRef} className={`cd-drawer ${drawerOpen ? 'cd-drawer-open' : ''}`} role="dialog" aria-modal="true" aria-label="Shopping cart">

        {/* Header */}
        <div className="cd-header">
          <div className="cd-header-left">
            <span className="cd-header-title vq-display">{orderSuccess ? 'Order Confirmed' : 'Your Bag'}</span>
            {!orderSuccess && (
              <span className="cd-header-count">{totalQty} item{totalQty !== 1 ? 's' : ''}</span>
            )}
          </div>
          <button className="cd-close-btn" onClick={closeDrawer} aria-label="Close cart"><IconX /></button>
        </div>

        {/* Body */}
        <div className="cd-body" ref={bodyRef}>
          {orderSuccess ? (
            <div className="cd-success">
              <div className="cd-success-icon"><IconSuccess /></div>
              <p className="cd-success-eyebrow">Thank You</p>
              <h3 className="cd-success-title vq-display">Order Placed</h3>
              <p className="cd-success-order">#{orderSuccess.orderNumber}</p>
              <p className="cd-success-msg">We have received your order. A confirmation will reach you shortly.</p>
              <button className="cd-btn-primary" onClick={() => { closeDrawer(); router.push(`/track-order?order=${orderSuccess.orderNumber}`); }}>Track Order</button>
              <button className="cd-btn-ghost" style={{ marginTop: 10 }} onClick={closeDrawer}>Continue Shopping</button>
            </div>
          ) : isMounted && paymentFailed.error ? (
            <div className="cd-fail">
              <p className="cd-fail-eyebrow">Payment Failed</p>
              <h3 className="cd-fail-title vq-display">Something went wrong</h3>
              <p className="cd-fail-msg">{paymentFailed.error}</p>
              {paymentFailed.retryCount < 3 ? (
                <button
                  className="cd-btn-primary"
                  disabled={isProcessing}
                  onClick={async () => {
                    setPaymentFailed(prev => ({ ...prev, retryCount: prev.retryCount + 1, error: null }));
                    setIsProcessing(true);
                    try {
                      const retryResult = await retryCheckout(paymentFailed.reservationId);
                      if (!retryResult?.success || !retryResult?.razorpay_order)
                        throw new Error(retryResult?.message || 'Retry failed.');
                      openRazorpay(retryResult.razorpay_order, retryResult.reservation_id);
                    } catch (err) {
                      showError(err.message || 'Could not retry payment.');
                      setIsProcessing(false);
                    }
                  }}
                >
                  {isProcessing ? 'Loading...' : `Try Again (${3 - paymentFailed.retryCount} left)`}
                </button>
              ) : (
                <p className="cd-fail-note">You have reached the retry limit. Please start a new order.</p>
              )}
              <button
                className="cd-btn-ghost"
                style={{ marginTop: 10 }}
                onClick={() => setPaymentFailed({ error: null, rzpOrder: null, retryCount: 0, reservationId: null })}
              >
                Cancel
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="cd-empty">
              <p className="cd-empty-eyebrow">Velquira</p>
              <h3 className="cd-empty-title vq-display">Your bag is empty</h3>
              <p className="cd-empty-sub">Nothing here yet. Find something you love and it will show up right here.</p>
              <button className="cd-btn-primary" onClick={() => { closeDrawer(); router.push('/products'); }}>Shop Products</button>
            </div>
          ) : (
            <div className="cd-single-view">

              {/* Items */}
              <div className="cd-section-title">Products</div>
              <div className="cd-items-list">
                {items.map(item => {
                  const img = pickImage(item);
                  const price = getPrice(item);
                  const mrp = getMrp(item);
                  const size = getAttr(item, 'size');
                  const color = getAttr(item, 'color');
                  const meta = [color, size ? `Size ${size}` : null].filter(Boolean).join(' · ');
                  return (
                    <div key={item.id} className="cd-item">
                      <div className="cd-item-img">
                        {img
                          ? <img src={img} alt={item.name} />
                          : <div className="cd-item-img-placeholder" />}
                      </div>
                      <div className="cd-item-info">
                        <p className="cd-item-name">{item.name}</p>
                        {meta && <p className="cd-item-meta">{meta}</p>}
                        <div className="cd-item-row">
                          <div className="cd-item-prices">
                            <span className="cd-item-price">₹{price.toFixed(0)}</span>
                            {mrp > 0 && mrp > price && <span className="cd-item-original-price">₹{mrp.toFixed(0)}</span>}
                          </div>
                          <div className="cd-qty">
                            <button className="cd-qty-btn" onClick={() => updateQty(item.id, item.quantity - 1)} disabled={item.quantity <= 1} aria-label="Decrease">−</button>
                            <span className="cd-qty-val">{item.quantity}</span>
                            <button className="cd-qty-btn" onClick={() => updateQty(item.id, item.quantity + 1)} aria-label="Increase">+</button>
                          </div>
                        </div>
                        <button className="cd-item-remove" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}>Remove</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary */}
              <div className="cd-sv-section">
                <div className="cd-section-title">Order Summary</div>
                <div className="cd-summary">
                  <div className="cd-summary-row">
                    <span>Subtotal</span>
                    <span>₹{cartTotal.toFixed(0)}</span>
                  </div>
                  {shippingFeeAmount > 0 && (
                    <div className="cd-summary-row">
                      <span>Shipping</span>
                      <span>₹{shippingFeeAmount.toFixed(0)}</span>
                    </div>
                  )}
                  {shippingFeeAmount === 0 && (
                    <div className="cd-summary-row">
                      <span>Shipping</span>
                      <span className="cd-summary-free">Free</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="cd-summary-row">
                      <span className="cd-summary-discount">Coupon ({appliedCoupon?.code})</span>
                      <span className="cd-summary-discount">−₹{couponDiscount.toFixed(0)}</span>
                    </div>
                  )}
                  {prepaidInstantDiscount > 0 && isPrepaidDelivery && (
                    <div className="cd-summary-row">
                      <span className="cd-summary-discount">Prepaid Discount</span>
                      <span className="cd-summary-discount">−₹{prepaidInstantDiscount.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="cd-summary-row cd-summary-total">
                    <span>Total</span>
                    <span>₹{isPrepaidDelivery ? prepaidPayable.toFixed(0) : finalTotal.toFixed(0)}</span>
                  </div>
                </div>

              </div>

              {/* Delivery Address */}
              <div className="cd-sv-section" id="cd-section-address">
                <div className="cd-section-title">{isAuthenticated ? 'Delivery Address' : 'Delivery Details'}</div>
                {addressLoading ? <p className="cd-loading">Loading addresses...</p> : (
                  <>
                    {isAuthenticated && addresses.length === 0 && !showAddressForm && (
                      <p className="cd-address-empty-hint">Add a delivery address below to place your order.</p>
                    )}
                    {!isAuthenticated && !selectedAddress && !showAddressForm && (
                      <p className="cd-address-empty-hint">Fill in your details below to place your order.</p>
                    )}

                    {isAuthenticated && addresses.length > 1 ? (
                      <div className="cd-address-section">
                        <div className="cd-section-subtitle">Select your delivery address</div>
                        <div className="cd-address-dropdown-container" ref={dropdownRef}>
                          <div className="cd-address-dropdown-trigger" onClick={() => setShowAddressDropdown(!showAddressDropdown)}>
                            <span>Choose Address</span>
                            <span className={`cd-dropdown-arrow ${showAddressDropdown ? 'open' : ''}`}><IconChevronDown /></span>
                          </div>
                          {showAddressDropdown && (
                            <div className="cd-address-dropdown">
                              {addresses.map(addr => (
                                <div
                                  key={addr.id}
                                  className={`cd-address-option ${selectedAddress?.id === addr.id ? 'selected' : ''}`}
                                  onClick={async () => {
                                    setSelectedAddress(addr);
                                    setShowAddressDropdown(false);
                                    const pin = String(addr.postal_code || addr.postalCode || '').replace(/\D/g, '');
                                    if (pin.length === 6) {
                                      try {
                                        const r = await checkPincodeServiceability(pin);
                                        setPincodeServiceability({ serviceable: r?.serviceable !== false, cod_allowed: r?.cod_allowed !== false });
                                      } catch { setPincodeServiceability(null); }
                                    } else setPincodeServiceability(null);
                                  }}
                                >
                                  <div className="cd-address-body">
                                    <p className="cd-address-name">{addr.full_name || addr.fullName} {(addr.isDefault || addr.is_default) && <span className="cd-default-tag">Default</span>}</p>
                                    <p className="cd-address-line">{addr.address}</p>
                                    <p className="cd-address-line">{addr.city}, {addr.state} {addr.postal_code}</p>
                                  </div>
                                  <button className="cd-address-edit" onClick={e => { e.stopPropagation(); handleEditAddress(addr); setShowAddressDropdown(false); }}><IconEdit /></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {selectedAddress && (
                          <div className="cd-selected-address">
                            <div className="cd-selected-address-label">Selected Address:</div>
                            <div className="cd-address-card cd-address-selected">
                              <div className="cd-address-radio"><div className="cd-radio-dot active" /></div>
                              <div className="cd-address-body">
                                <p className="cd-address-name">{selectedAddress.full_name || selectedAddress.fullName} {(selectedAddress.isDefault || selectedAddress.is_default) && <span className="cd-default-tag">Default</span>}</p>
                                <p className="cd-address-line">{selectedAddress.address}</p>
                                <p className="cd-address-line">{selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code}</p>
                                <p className="cd-address-line">{selectedAddress.phone_number}</p>
                              </div>
                              <button className="cd-address-edit" onClick={() => handleEditAddress(selectedAddress)}><IconEdit /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : isAuthenticated && addresses.length === 1 ? (
                      <div className="cd-address-card cd-address-selected">
                        <div className="cd-address-radio"><div className="cd-radio-dot active" /></div>
                        <div className="cd-address-body">
                          <p className="cd-address-name">{addresses[0].full_name || addresses[0].fullName} {(addresses[0].isDefault || addresses[0].is_default) && <span className="cd-default-tag">Default</span>}</p>
                          <p className="cd-address-line">{addresses[0].address}</p>
                          <p className="cd-address-line">{addresses[0].city}, {addresses[0].state} {addresses[0].postal_code}</p>
                          <p className="cd-address-line">{addresses[0].phone_number}</p>
                        </div>
                        <button className="cd-address-edit" onClick={() => handleEditAddress(addresses[0])}><IconEdit /></button>
                      </div>
                    ) : !isAuthenticated && selectedAddress && !showAddressForm ? (
                      <div className="cd-address-card cd-address-selected">
                        <div className="cd-address-radio"><div className="cd-radio-dot active" /></div>
                        <div className="cd-address-body">
                          <p className="cd-address-name">{selectedAddress.full_name}</p>
                          <p className="cd-address-line">{selectedAddress.address}</p>
                          <p className="cd-address-line">{selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code}</p>
                          <p className="cd-address-line">{selectedAddress.phone_number}</p>
                        </div>
                        <button className="cd-address-edit" onClick={() => handleEditAddress(selectedAddress)}><IconEdit /></button>
                      </div>
                    ) : null}

                    {!showAddressForm && (
                      <button className="cd-add-address-btn" onClick={() => { setShowAddressForm(true); setEditingAddressId(null); setAddressForm(EMPTY_ADDR); }}>
                        <IconPlus /> Add {selectedAddress || (isAuthenticated && addresses.length > 0) ? 'Another' : 'New'} Address
                      </button>
                    )}

                    {showAddressForm && (
                      <form className="cd-address-form" onSubmit={handleSaveAddress}>
                        <div className="cd-form-grid">
                          {!isAuthenticated && (
                            <>
                              <div className="cd-form-group cd-form-full">
                                <label className="cd-label">Full Name *</label>
                                <input className={`cd-input ${fieldErrors.name ? 'cd-input-error' : ''}`} type="text" value={guestInfo.fullName} onChange={e => setGuestInfo(p => ({ ...p, fullName: e.target.value }))} placeholder="Full name" autoComplete="name" />
                                {fieldErrors.name && <p className="cd-field-error">{fieldErrors.name}</p>}
                              </div>
                              <div className="cd-form-group">
                                <label className="cd-label">Email *</label>
                                <input className={`cd-input ${fieldErrors.email ? 'cd-input-error' : ''}`} type="email" inputMode="email" value={guestInfo.email} onChange={e => setGuestInfo(p => ({ ...p, email: e.target.value }))} placeholder="name@example.com" autoComplete="email" />
                              </div>
                              <div className="cd-form-group">
                                <label className="cd-label">Phone *</label>
                                <input className={`cd-input ${fieldErrors.phone ? 'cd-input-error' : ''}`} type="tel" inputMode="numeric" maxLength={10} value={guestInfo.phone} onChange={e => { const d = e.target.value.replace(/\D/g, '').slice(0, 10); setGuestInfo(p => ({ ...p, phone: d })); }} placeholder="10-digit mobile" autoComplete="tel" />
                                {fieldErrors.phone && <p className="cd-field-error">{fieldErrors.phone}</p>}
                              </div>
                            </>
                          )}
                          {isAuthenticated && (
                            <>
                              <div className="cd-form-group">
                                <label className="cd-label">Full Name *</label>
                                <input className={`cd-input ${fieldErrors.name ? 'cd-input-error' : ''}`} name="fullName" value={addressForm.fullName} onChange={handleAddrChange} required placeholder="Full name" autoComplete="name" />
                                {fieldErrors.name && <p className="cd-field-error">{fieldErrors.name}</p>}
                              </div>
                              <div className="cd-form-group">
                                <label className="cd-label">Phone *</label>
                                <input className={`cd-input ${fieldErrors.phone || addressPhoneError ? 'cd-input-error' : ''}`} name="phoneNumber" type="tel" inputMode="numeric" maxLength={10} value={addressForm.phoneNumber} onChange={handleAddrChange} required placeholder="10-digit mobile" autoComplete="tel-national" />
                                {(fieldErrors.phone || addressPhoneError) && <p className="cd-field-error">{fieldErrors.phone || addressPhoneError}</p>}
                              </div>
                            </>
                          )}
                          <div className="cd-form-group cd-form-full">
                            <label className="cd-label">Address *</label>
                            <input className={`cd-input ${fieldErrors.address ? 'cd-input-error' : ''}`} name="address" value={addressForm.address} onChange={handleAddrChange} required placeholder="House/flat no., street, area, landmark" autoComplete="street-address" />
                            {fieldErrors.address && <p className="cd-field-error">{fieldErrors.address}</p>}
                          </div>
                          <div className="cd-form-group">
                            <label className="cd-label">City *</label>
                            <input className={`cd-input ${fieldErrors.city ? 'cd-input-error' : ''}`} name="city" value={addressForm.city} onChange={handleAddrChange} required placeholder="City" autoComplete="address-level2" />
                            {fieldErrors.city && <p className="cd-field-error">{fieldErrors.city}</p>}
                          </div>
                          <div className="cd-form-group">
                            <label className="cd-label">State *</label>
                            <input className={`cd-input ${fieldErrors.state ? 'cd-input-error' : ''}`} name="state" value={addressForm.state} onChange={handleAddrChange} required placeholder="State" autoComplete="address-level1" />
                            {fieldErrors.state && <p className="cd-field-error">{fieldErrors.state}</p>}
                          </div>
                          <div className="cd-form-group">
                            <label className="cd-label">PIN Code *</label>
                            <input className={`cd-input ${fieldErrors.pincode ? 'cd-input-error' : ''}`} name="postalCode" value={addressForm.postalCode} onChange={handleAddrChange} onBlur={handlePincodeBlur} required placeholder="6-digit PIN" autoComplete="postal-code" />
                            {fieldErrors.pincode && <p className="cd-field-error">{fieldErrors.pincode}</p>}
                          </div>
                          <div className="cd-form-group">
                            <label className="cd-label">Country</label>
                            <input className="cd-input" name="country" value={addressForm.country} onChange={handleAddrChange} placeholder="Country" />
                          </div>
                          {isAuthenticated && (
                            <div className="cd-form-group cd-form-full">
                              <label className="cd-checkbox-label">
                                <input type="checkbox" name="isDefault" checked={addressForm.isDefault} onChange={handleAddrChange} /> Set as default address
                              </label>
                            </div>
                          )}
                        </div>
                        <div className="cd-form-actions">
                          <button type="submit" className="cd-btn-primary" disabled={addressSaving || Object.keys(fieldErrors).length > 0}>
                            {addressSaving ? 'Saving...' : editingAddressId ? 'Update Address' : 'Save Address'}
                          </button>
                          <button type="button" className="cd-btn-ghost" onClick={() => { setShowAddressForm(false); setEditingAddressId(null); setFieldErrors({}); }}>Cancel</button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>

              {/* Payment Method */}
              {sortedShippingFees.length > 0 && (
                <div className="cd-sv-section" id="cd-section-delivery">
                  <div className="cd-section-title">Payment</div>
                  <div className="cd-delivery-list">
                    {sortedShippingFees.map(fee => {
                      const isCodBlocked = isMounted && fee.orderType === 'cod' && pincodeServiceability?.cod_allowed === false;
                      return (
                        <label
                          key={fee.id}
                          className={`cd-delivery-card ${fee.orderType === 'prepaid' ? 'cd-delivery-prepaid' : 'cd-delivery-cod'} ${selectedFee?.id === fee.id ? 'cd-delivery-selected' : ''} ${isCodBlocked ? 'cd-delivery-disabled' : ''}`}
                          style={isCodBlocked ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                        >
                          <input type="radio" name="delivery" className="cd-radio-hidden" checked={selectedFee?.id === fee.id} onChange={() => !isCodBlocked && setSelectedFee(fee)} disabled={isCodBlocked} />
                          <span className="cd-delivery-icon">
                            {fee.orderType === 'cod' ? <IconMoneyBag /> : <IconTruck />}
                          </span>
                          <div className="cd-delivery-info">
                            <p className="cd-delivery-name">{fee.orderType === 'cod' ? 'Cash on Delivery' : 'UPI / Card'}</p>
                            {fee.orderType === 'cod' && !isCodBlocked && <span className="cd-delivery-popular">Most Popular</span>}
                            {fee.orderType === 'prepaid' && PREPAID_NUDGE_LINE && <p className="cd-delivery-subdesc">{PREPAID_NUDGE_LINE}</p>}
                            {fee.orderType === 'cod' && !isCodBlocked && <p className="cd-delivery-subdesc">Pay when you receive your order</p>}
                            {isCodBlocked && <p className="cd-delivery-subdesc" style={{ color: '#b8472f' }}>Cash on Delivery is not available for this location</p>}
                            <p className="cd-delivery-desc">Delivery by {getDeliveryDateStr()}</p>
                          </div>
                          <div className="cd-delivery-fee-wrap">
                            <span className={`cd-delivery-fee ${parseFloat(fee.fee || 0) === 0 ? 'free' : ''}`}>
                              {parseFloat(fee.fee || 0) === 0 ? 'Free' : `₹${parseFloat(fee.fee || 0).toFixed(0)}`}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Scroll hint */}
          {showScrollHint && !orderSuccess && items.length > 0 && (
            <div className="cd-scroll-hint" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          )}
        </div>

        {/* Footer */}
        {!orderSuccess && items.length > 0 && (
          <div className="cd-footer">
            {/* Total */}
            <div className="cd-foot-total">
              <span className="cd-foot-total-label">Total</span>
              <span className="cd-foot-total-value vq-display">
                ₹{isPrepaidDelivery ? prepaidPayable.toFixed(0) : finalTotal.toFixed(0)}
              </span>
            </div>
            <p className="cd-foot-note">
              {shippingFeeAmount === 0
                ? 'Free shipping included. Taxes included in the price.'
                : `Shipping ₹${shippingFeeAmount.toFixed(0)} included. Taxes included in the price.`}
            </p>

            {/* Urgency */}
            {(() => {
              const mm = String(Math.floor(urgencySeconds / 60)).padStart(2, '0');
              const ss = String(urgencySeconds % 60).padStart(2, '0');
              return (
                <div className="cd-urgency-bar">
                  <span className="cd-urgency-item"><IconFlame /> <strong>Only 7</strong>&nbsp;left in stock</span>
                  <span className="cd-urgency-sep">|</span>
                  <span className="cd-urgency-item">
                    <IconClock /> Offer ends in <span className="cd-urgency-timer">{mm}:{ss}</span>
                  </span>
                </div>
              );
            })()}

            {/* CTA */}
            <button className="cd-btn-primary cd-btn-full" onClick={handlePlaceOrder} disabled={isProcessing}>
              {isProcessing
                ? 'Processing...'
                : isPrepaidDelivery
                  ? `Place Order · ₹${prepaidPayable.toFixed(0)}`
                  : isCodDelivery
                    ? `Place Order · ₹${finalTotal.toFixed(0)}`
                    : 'Place Order'}
            </button>

            {/* Continue shopping */}
            <button type="button" className="cd-continue" onClick={closeDrawer}>
              Continue Shopping
            </button>

            {/* WhatsApp help */}
            <a href="https://wa.me/919712891700?text=Hi%2C+I+need+help+with+my+Velquira+order" target="_blank" rel="noopener noreferrer" className="cd-whatsapp-help">
              <IconWhatsApp /> Need help? Chat on WhatsApp
            </a>

            {/* Trust bar */}
            <div className="cd-trust-bar">
              <span className="cd-trust-item"><IconShield /> Money-Back Promise</span>
              <span className="cd-trust-sep">·</span>
              <span className="cd-trust-item"><IconTruckSmall /> Easy Returns</span>
              <span className="cd-trust-sep">·</span>
              <span className="cd-trust-item"><IconLock /> Secure Payment</span>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

export default CartDrawer;
