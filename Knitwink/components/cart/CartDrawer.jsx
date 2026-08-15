'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCartContext } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useFocusTrap } from '@/hooks/useFocusTrap';
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
  getPublicCoupons,
} from '@/lib/api/orders';
import {
  toastOrderPlaced,
  toastOrderError,
  showError,
  showWarning,
} from '@/lib/toast';
import { fbTrack, fbPurchase } from '@/utils/pixel';
import '@/styles/CartDrawer.css';

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

function validateShippingAddress(addr) {
  if (!addr) return { valid: false, errors: ['Address is empty'] };
  const errors = [];
  const name = String(addr.full_name || addr.fullName || '').trim();
  if (!name) errors.push('Customer name is required');
  else if (name.length < 2) errors.push('Name is too short');
  else if (/^\d+$/.test(name)) errors.push('Name cannot be only numbers');

  const addrLine = String(addr.address || '').trim();
  if (!addrLine) errors.push('Street address is required');
  else if (addrLine.length < 10) errors.push('Address is too short (min 10 characters)');
  const junk = [/^test/i, /^asdf/i, /^xxx/i, /^abc$/i, /^na$/i, /^n\/a$/i];
  if (junk.some(p => p.test(addrLine))) errors.push('Please enter a real address');

  const city = String(addr.city || '').trim();
  if (!city) errors.push('City is required');
  else if (city.length < 2) errors.push('City name is too short');

  const state = String(addr.state || '').trim();
  if (!state) errors.push('State is required');

  const pin = String(addr.postal_code || addr.postalCode || addr.pincode || '').trim();
  if (!pin) errors.push('PIN code is required');
  else if (!/^\d{6}$/.test(pin)) errors.push('PIN code must be exactly 6 digits');

  const phone = String(addr.phone_number || addr.phoneNumber || addr.phone || '').replace(/\D/g, '');
  if (!phone || phone.length < 10) {
    errors.push('Valid 10-digit mobile number is required');
  } else {
    let ten = phone.length > 10 ? phone.slice(-10) : phone;
    if (!/^[6-9]\d{9}$/.test(ten)) errors.push('Phone must be a valid Indian mobile (starts with 6-9)');
  }
  return { valid: errors.length === 0, errors };
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
const IconX = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconBag = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
const IconTrash = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IconEdit = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconPlus = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconTruck = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
const IconSuccess = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconChevronDown = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const IconFlame = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M12 2c0 0-4 4-4 8a4 4 0 008 0c0-1.5-.5-3-1-4 0 0-1 2-2 2s-1-2-1-4z"/><path d="M12 22c-3.3 0-6-2.7-6-6 0-2.2 1.2-4.2 3-5.4"/></svg>;
const IconClock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconMoneyBag = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M12 2C9 2 7 4 7 6h10c0-2-2-4-5-4z"/><path d="M7 6C4 6 2 9 2 12c0 5 4 10 10 10s10-5 10-10c0-3-2-6-5-6H7z"/><path d="M12 10v4"/><path d="M10 12h4"/></svg>;
const IconShield = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <path d="M12 2L4 5.5V11c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V5.5L12 2z" fill="#16a34a"/>
    <polyline points="8.5 12 11 14.5 15.5 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
  // Stable closeDrawer reference — useFocusTrap takes onEscape as a
  // dependency. If we recreated this function on every render the
  // focus trap effect would re-run on every keystroke and steal
  // focus from whatever input the user was typing in (which
  // manifested as the cursor disappearing after each letter).
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
  // Address validation popup: { errors:[], warnings:[] } while shown, else null.
  const [addrIssues, setAddrIssues] = useState(null);
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
  // Available offers: public coupon list + the collapsed dropdown's open state.
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [offersOpen, setOffersOpen] = useState(false);

  const bodyRef = useRef(null);
  const dropdownRef = useRef(null);
  const offersRef = useRef(null);
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
        setOffersOpen(false);
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

  // ── Escape key ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closeDrawer(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer]);
  // Close the address-issues popup on Escape (capture phase so it wins over the
  // drawer's own Escape-to-close).
  useEffect(() => {
    if (!addrIssues) return;
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setAddrIssues(null); } };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [addrIssues]);

  // ── Meta funnel: InitiateCheckout ─────────────────────────────────────────
  // Fire once when the drawer opens with items (this drawer is the full
  // in-drawer checkout).
  useEffect(() => {
    if (!drawerOpen || items.length === 0) return;
    fbTrack('InitiateCheckout', {
      content_ids: items.map(i => String(i.productId)),
      content_type: 'product',
      contents: items.map(i => ({ id: String(i.productId), quantity: i.quantity || 1 })),
      num_items: items.reduce((s, i) => s + (i.quantity || 1), 0),
      value: items.reduce((s, i) => s + getPrice(i) * i.quantity, 0),
      currency: 'INR',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen]);

  // ── Available offers (public coupons) ─────────────────────────────────────
  // Fetch once when the drawer opens with items so shoppers can tap-to-apply.
  useEffect(() => {
    if (!drawerOpen || items.length === 0) return;
    let alive = true;
    getPublicCoupons()
      .then(list => { if (alive) setAvailableCoupons(Array.isArray(list) ? list : []); })
      .catch(() => { if (alive) setAvailableCoupons([]); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen]);

  // Close the "Select a coupon" dropdown on outside click / Escape. Kept local
  // (capture-phase Escape + stopPropagation) so it doesn't also close the drawer.
  useEffect(() => {
    if (!offersOpen) return;
    const onDown = (e) => { if (offersRef.current && !offersRef.current.contains(e.target)) setOffersOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOffersOpen(false); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [offersOpen]);

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

  // Real-time field validation
  useEffect(() => {
    if (!showAddressForm) { setFieldErrors({}); return; }
    const t = setTimeout(() => {
      const formToValidate = isAuthenticated
        ? { full_name: addressForm.fullName, address: addressForm.address, city: addressForm.city, state: addressForm.state, postal_code: addressForm.postalCode, phone_number: addressForm.phoneNumber }
        : { full_name: guestInfo.fullName.trim(), address: addressForm.address, city: addressForm.city, state: addressForm.state, postal_code: addressForm.postalCode, phone_number: guestInfo.phone };
      const result = validateShippingAddress(formToValidate);
      const errs = {};
      for (const err of result.errors) {
        const lower = err.toLowerCase();
        if (lower.includes('name') && !errs.name) errs.name = err;
        else if ((lower.includes('address') || lower.includes('street')) && !errs.address) errs.address = err;
        else if (lower.includes('city') && !errs.city) errs.city = err;
        else if (lower.includes('state') && !errs.state) errs.state = err;
        else if ((lower.includes('pin') || lower.includes('postal')) && !errs.pincode) errs.pincode = err;
        else if (lower.includes('phone') || lower.includes('mobile')) errs.phone = err;
      }
      // Email is a required field for guests but validateShippingAddress
      // doesn't cover it (the backend address table has no email column).
      // Validate inline so the Save button reflects the real state and
      // the user sees an error message under the input.
      if (!isAuthenticated) {
        const e = String(guestInfo.email || '').trim();
        if (!e) errs.email = 'Email is required';
        else if (!isValidEmail(e)) errs.email = 'Please enter a valid email address';
      }
      setFieldErrors(errs);
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

  // Compact one-line summary for an available offer, e.g. "10% off, min ₹499".
  const couponSummary = (c) => {
    if (c.description) return String(c.description).replace(/<[^>]*>/g, '').trim();
    const value = parseFloat(c.value) || 0;
    const min = parseFloat(c.minPurchase) || 0;
    const maxD = parseFloat(c.maxDiscount) || 0;
    let head = '';
    if (c.type === 'percentage') head = `${value % 1 === 0 ? value : value.toFixed(0)}% off${maxD > 0 ? ` up to ₹${maxD.toFixed(0)}` : ''}`;
    else if (c.type === 'fixed') head = `₹${value.toFixed(0)} off`;
    else head = 'Special offer';
    return min > 0 ? `${head}, min ₹${min.toFixed(0)}` : head;
  };

  // Offers to surface in the dropdown — hide the one already applied.
  const offersToShow = availableCoupons.filter(
    (c) => !appliedCoupon || String(c.code).toUpperCase() !== String(appliedCoupon.code).toUpperCase()
  );

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
    if (!validation.valid) { setAddrIssues({ errors: validation.errors, warnings: validation.warnings || [] }); return; }

    // Email is required for guest checkout but isn't part of
    // validateShippingAddress (address has no email column). Check
    // here so a missing/invalid email is caught at Save time, not
    // surfaced later at Place Order with a confusing "valid email
    // and 10-digit phone" toast after the address looked fine.
    if (!isAuthenticated) {
      const guestEmail = String(guestInfo.email || '').trim();
      if (!guestEmail) { showError('Please enter your email.'); return; }
      if (!isValidEmail(guestEmail)) { showError('Please enter a valid email address.'); return; }
    }

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

  // ── Auto-save address ─────────────────────────────────────────────────────
  // Once every required field is valid, silently persist the address after a
  // short debounce so the user never has to press a Save button. A signature
  // of the current field values guards against re-saving unchanged data.
  const lastAutoSaveSig = useRef('');
  useEffect(() => {
    if (!showAddressForm || addressSaving) return;

    const name = String((isAuthenticated ? addressForm.fullName : guestInfo.fullName) || '').trim();
    const phone = isAuthenticated ? addressForm.phoneNumber : guestInfo.phone;
    const address = String(addressForm.address || '').trim();
    const city = String(addressForm.city || '').trim();
    const state = String(addressForm.state || '').trim();
    const postalCode = String(addressForm.postalCode || '').trim();

    const pincodeOk = /^\d{6}$/.test(postalCode);
    const phoneOk = isValidIndianMobile(phone);
    const basicsOk = !!name && !!address && !!city && !!state;
    const emailOk = isAuthenticated ? true : isValidEmail(guestInfo.email);
    const noErrors = Object.keys(fieldErrors).length === 0;
    const serviceable = !(pincodeServiceability?.serviceable === false);

    if (!(pincodeOk && phoneOk && basicsOk && emailOk && noErrors && serviceable)) return;

    const sig = JSON.stringify({
      name, phone, address, city, state, postalCode,
      email: isAuthenticated ? '' : String(guestInfo.email || '').trim(),
      editingAddressId,
    });
    if (sig === lastAutoSaveSig.current) return;

    const t = setTimeout(() => {
      lastAutoSaveSig.current = sig;
      handleSaveAddress({ preventDefault() {} });
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddressForm, addressSaving, addressForm, guestInfo, fieldErrors, pincodeServiceability, editingAddressId, isAuthenticated]);

  // ── Coupon ──────────────────────────────────────────────────────────────
  const handleApplyCoupon = async (overrideCode) => {
    const code = String(overrideCode ?? couponCode).trim().toUpperCase();
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
        setOffersOpen(false);
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

  // Meta Purchase custom_data — captured from the cart BEFORE it is cleared.
  const buildPurchaseData = (orderNumber, value) => ({
    content_ids: items.map(i => String(i.productId)),
    content_type: 'product',
    contents: items.map(i => ({ id: String(i.productId), quantity: i.quantity || 1 })),
    num_items: items.reduce((s, i) => s + (i.quantity || 1), 0),
    value: Number(value) || 0,
    currency: 'INR',
    order_id: orderNumber,
  });

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
    // The Backend guest endpoint is inconsistent between its two layers:
    // the zod route schema requires guest_info as a NESTED object, while
    // the controller destructures phone/email/firstName/lastName FLAT off
    // req.body. Sending both shapes satisfies whichever the request hits
    // (the schema is .passthrough(), so the extra flat keys are ignored
    // by validation). shipping_address_id is omitted on purpose — guests
    // have none; the controller creates it from shipping_address.
    return {
      guest_info: {
        email: guestInfo.email,
        firstName,
        lastName,
        phone: guestInfo.phone,
      },
      // Flat mirror of guest_info for the controller's destructure
      email: guestInfo.email,
      firstName,
      lastName,
      phone: guestInfo.phone,
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
      const orderNumber = result.order.order_number;
      // Meta Purchase (deduped with the backend's server-side event).
      const purchaseData = buildPurchaseData(orderNumber, finalTotal);
      clearCart();
      fbPurchase(orderNumber, purchaseData);
      toastOrderPlaced(orderNumber);
      setOrderSuccess({ orderNumber });
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
      name: 'Knitwink',
      description: 'Payment for Knitwink Order',
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
          // Meta Purchase (deduped with the backend's server-side event).
          const purchaseData = buildPurchaseData(orderNumber, prepaidPayable);
          clearCart();
          setPaymentFailed({ error: null, rzpOrder: null, retryCount: 0, reservationId: null });
          fbPurchase(orderNumber, purchaseData);
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
      setAddrIssues({ errors: addrValidation.errors, warnings: addrValidation.warnings || [] });
      scrollDrawerTo('cd-section-address');
      return;
    }
    if (pincodeServiceability && pincodeServiceability.serviceable === false) {
      showError("Sorry, we don’t deliver to this PIN code yet. Please try a different address.");
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

  // Trap focus inside the drawer while it's open. Restores focus to
  // the trigger button (header bag icon) on close. Escape closes.
  // Must be called BEFORE the `!isVisible` early return so the hook
  // count stays consistent across renders (Rules of Hooks).
  const trapRef = useFocusTrap(drawerOpen, { onEscape: closeDrawer });

  if (!isVisible) return null;

  return (
    <>
      <div className={`cd-backdrop ${drawerOpen ? 'cd-backdrop-active' : ''}`} onClick={closeDrawer} />
      <div ref={trapRef} className={`cd-drawer ${drawerOpen ? 'cd-drawer-open' : ''}`} role="dialog" aria-modal="true" aria-label="Shopping cart">

        {/* Address validation popup — lists EVERY problem at once (not just the
            first) plus advisory tips. Shown on a failed save / checkout. */}
        {addrIssues && (
          <div role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setAddrIssues(null); }}
            style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(15,20,40,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
            <div role="alertdialog" aria-modal="true" aria-label="Fix your delivery address"
              style={{ background: '#fff', borderRadius: 14, boxShadow: '0 12px 40px rgba(15,20,40,.28)', width: '100%', maxWidth: 340, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, color: '#c9433c' }}>
                  <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: '50%', background: '#fbecea', border: '1px solid #eab4ae', color: '#c9433c', display: 'grid', placeItems: 'center', fontSize: 13, flex: '0 0 auto' }}>!</span>
                  {addrIssues.errors.length > 0 ? `Please fix ${addrIssues.errors.length} thing${addrIssues.errors.length > 1 ? 's' : ''}` : 'A quick tip'}
                </div>
                <button type="button" aria-label="Close" onClick={() => setAddrIssues(null)}
                  style={{ border: 'none', background: 'transparent', color: '#999', fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: '0 2px' }}>×</button>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                {addrIssues.errors.map((er, i) => (
                  <li key={`e${i}`} style={{ display: 'flex', gap: 8, fontSize: 13.5, color: '#2a2d3a', lineHeight: 1.35 }}>
                    <span aria-hidden="true" style={{ color: '#c9433c', fontWeight: 700, flex: '0 0 auto' }}>✕</span>{er}
                  </li>
                ))}
                {addrIssues.warnings.map((wr, i) => (
                  <li key={`w${i}`} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#8a5a12', lineHeight: 1.35, borderTop: addrIssues.errors.length ? '1px dashed #eee' : 'none', paddingTop: addrIssues.errors.length ? 8 : 0 }}>
                    <span aria-hidden="true" style={{ fontWeight: 700, flex: '0 0 auto' }}>💡</span>{wr}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setAddrIssues(null)}
                style={{ alignSelf: 'stretch', textAlign: 'center', border: 'none', background: 'var(--navy, #1a2450)', color: '#fff', fontWeight: 650, fontSize: 13.5, padding: '10px 16px', borderRadius: 9, cursor: 'pointer' }}>
                Fix my address
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="cd-header">
          <div className="cd-header-left">
            <span className="cd-header-icon"><IconBag /></span>
            <div>
              <span className="cd-header-title">{orderSuccess ? 'Order Confirmed' : 'Your Cart'}</span>
              {!orderSuccess && <span className="cd-header-count">{totalQty} item{totalQty !== 1 ? 's' : ''}</span>}
            </div>
          </div>
          <button className="cd-close-btn" onClick={closeDrawer} aria-label="Close cart"><IconX /></button>
        </div>

        {/* Body */}
        <div className="cd-body" ref={bodyRef}>
          {orderSuccess ? (
            <div className="cd-success">
              <div className="cd-success-icon"><IconSuccess /></div>
              <h3 className="cd-success-title">Order Placed!</h3>
              <p className="cd-success-order">Order #{orderSuccess.orderNumber}</p>
              <p className="cd-success-msg">Thank you! You will receive a confirmation shortly.</p>
              <button className="cd-btn-primary" onClick={() => { closeDrawer(); router.push(`/track-order?order=${orderSuccess.orderNumber}`); }}>Track Order</button>
              <button className="cd-btn-ghost" style={{ marginTop: 8 }} onClick={closeDrawer}>Continue Shopping</button>
            </div>
          ) : isMounted && paymentFailed.error ? (
            <div className="cd-success" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#b91c1c' }}>Payment Failed</h3>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: '#6b7280' }}>{paymentFailed.error}</p>
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
                  {isProcessing ? 'Please wait…' : `Retry Payment (${3 - paymentFailed.retryCount} left)`}
                </button>
              ) : (
                <p style={{ fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>Maximum retries reached. Please start a new order.</p>
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
              <span className="cd-empty-icon"><IconBag /></span>
              <p>Your cart is empty</p>
              <button className="cd-btn-primary" onClick={closeDrawer}>Continue Shopping</button>
            </div>
          ) : (
            <div className="cd-single-view">

              {/* Items */}
              <div className="cd-section-title">Items</div>
              <div className="cd-items-list">
                {items.map(item => {
                  const img = pickImage(item);
                  const price = getPrice(item);
                  const mrp = getMrp(item);
                  const size = getAttr(item, 'size');
                  const color = getAttr(item, 'color');
                  return (
                    <div key={item.id} className="cd-item">
                      <div className="cd-item-img">
                        {img
                          ? <img src={img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div className="cd-item-img-placeholder" />}
                      </div>
                      <div className="cd-item-info">
                        <p className="cd-item-name">{item.name}</p>
                        {size && <p className="cd-item-meta">Size: {size}</p>}
                        {color && <p className="cd-item-meta">{color}</p>}
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
                      </div>
                      <button className="cd-item-remove" onClick={() => removeItem(item.id)} aria-label="Remove"><IconTrash /></button>
                    </div>
                  );
                })}
              </div>

              {/* Coupon */}
              <div className="cd-sv-section">
                <div className="cd-section-title">Coupon</div>
                {appliedCoupon ? (
                  <div className="cd-coupon-applied">
                    <span>✓ {appliedCoupon.code}{couponDiscount > 0 ? ` · −₹${couponDiscount.toFixed(0)}` : ''}</span>
                    <button type="button" className="cd-coupon-remove" onClick={handleRemoveCoupon}>Remove</button>
                  </div>
                ) : (
                  <>
                    <div className="cd-coupon-wrap">
                      <input
                        className="cd-coupon-input"
                        value={couponCode}
                        onChange={e => { setCouponCode(e.target.value.toUpperCase()); if (couponError) setCouponError(''); }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
                        placeholder="Enter coupon code"
                        aria-label="Coupon code"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        disabled={couponLoading}
                      />
                      <button type="button" className="cd-coupon-btn" onClick={() => handleApplyCoupon()} disabled={couponLoading || !couponCode.trim()}>
                        {couponLoading ? 'Applying…' : 'Apply'}
                      </button>
                    </div>
                    {couponError && <p className="cd-coupon-error" role="alert">{couponError}</p>}
                    {couponSuccess && <p className="cd-coupon-success">{couponSuccess}</p>}
                    {offersToShow.length > 0 && (
                      <div className="cd-offers-wrap" ref={offersRef}>
                        <button
                          type="button"
                          className={`cd-offers-select${offersOpen ? ' open' : ''}`}
                          onClick={() => setOffersOpen(o => !o)}
                          disabled={couponLoading}
                          aria-haspopup="listbox"
                          aria-expanded={offersOpen}
                          aria-label="Available offers"
                        >
                          <span className="cd-offers-label">Available offers · Select a coupon</span>
                          <span className="cd-offers-chev" aria-hidden="true"><IconChevronDown /></span>
                        </button>
                        {offersOpen && (
                          <div className="cd-offers-menu" role="listbox" aria-label="Available offers">
                            {offersToShow.map(c => (
                              <button
                                type="button"
                                key={c.id ?? c.code}
                                className="cd-offers-opt"
                                role="option"
                                onClick={() => handleApplyCoupon(c.code)}
                                disabled={couponLoading}
                                aria-label={`Apply coupon ${c.code}`}
                              >
                                <span className="cd-offers-opt-text">
                                  <b>{c.code}</b>
                                  <span>{couponSummary(c)}</span>
                                </span>
                                <span className="cd-offers-opt-apply">Apply</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
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
                      <span style={{ color: '#16a34a', fontWeight: 700 }}>FREE</span>
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
                                {fieldErrors.email && <p className="cd-field-error">{fieldErrors.email}</p>}
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
                            {isMounted && pincodeServiceability && pincodeServiceability.serviceable === false && (
                              <p className="cd-field-error" role="alert" style={{ color: '#dc2626' }}>Sorry, we don’t deliver to this PIN code yet.</p>
                            )}
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
                          <p className="cd-autosave-hint" aria-live="polite">{addressSaving ? 'Saving your address…' : 'Your address saves automatically once all details are filled.'}</p>
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
                  <div className="cd-section-title">How would you like to pay?</div>
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
                            <p className="cd-delivery-name">{fee.orderType === 'cod' ? 'Cash on Delivery' : 'UPI / Card (Prepaid)'}</p>
                            {fee.orderType === 'cod' && !isCodBlocked && <span className="cd-delivery-popular">⭐ Most Popular</span>}
                            {fee.orderType === 'prepaid' && PREPAID_NUDGE_LINE && <p className="cd-delivery-subdesc">{PREPAID_NUDGE_LINE}</p>}
                            {fee.orderType === 'cod' && !isCodBlocked && <p className="cd-delivery-subdesc">Pay when you receive your order</p>}
                            {isCodBlocked && <p className="cd-delivery-subdesc" style={{ color: '#dc2626' }}>COD not available for this location</p>}
                            <p className="cd-delivery-desc">Delivery by {getDeliveryDateStr()}</p>
                          </div>
                          <div className="cd-delivery-fee-wrap">
                            <span className="cd-delivery-sparkle">✦</span>
                            <span className={`cd-delivery-fee ${parseFloat(fee.fee || 0) === 0 ? 'free' : ''}`}>
                              {parseFloat(fee.fee || 0) === 0 ? 'FREE' : `₹${parseFloat(fee.fee || 0).toFixed(0)}`}
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
            {/* Urgency */}
            {(() => {
              const mm = String(Math.floor(urgencySeconds / 60)).padStart(2, '0');
              const ss = String(urgencySeconds % 60).padStart(2, '0');
              return (
                <div className="cd-urgency-bar">
                  <span className="cd-urgency-item"><IconFlame /> <strong>Only 7</strong>&nbsp;left in stock</span>
                  <span style={{ color: '#ccc' }}>|</span>
                  <span className="cd-urgency-item" style={{ color: '#555' }}>
                    <IconClock /> Offer ends in <span className="cd-urgency-timer">{mm}:{ss}</span>
                  </span>
                </div>
              );
            })()}

            {/* CTA */}
            {isMounted && pincodeServiceability && pincodeServiceability.serviceable === false && (
              <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
                We don’t deliver to this PIN code yet — please try a different delivery address.
              </div>
            )}
            <button className="cd-btn-primary cd-btn-full" onClick={handlePlaceOrder} disabled={isProcessing || (isMounted && pincodeServiceability && pincodeServiceability.serviceable === false)}>
              {isProcessing
                ? 'Processing...'
                : isPrepaidDelivery
                  ? `Place Order – ₹${prepaidPayable.toFixed(0)}`
                  : isCodDelivery
                    ? `Place Order – ₹${finalTotal.toFixed(0)}`
                    : 'Place Order'}
            </button>

            {/* WhatsApp help */}
            <a href="https://wa.me/917434834000?text=Hi%2C+I+need+help+with+my+Knitwink+order" target="_blank" rel="noopener noreferrer" className="cd-whatsapp-help">
              <IconWhatsApp /> Need help? Chat on WhatsApp
            </a>

            {/* Trust bar */}
            <div className="cd-trust-bar">
              <span className="cd-trust-item"><IconShield /> 100% Money-Back</span>
              <span className="cd-trust-sep">·</span>
              <span className="cd-trust-item"><IconTruckSmall /> Easy Returns</span>
              <span className="cd-trust-sep">·</span>
              <span className="cd-trust-item"><IconLock /> Powered by Razorpay</span>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

export default CartDrawer;

// redeploy: coupon dropdown rollout
