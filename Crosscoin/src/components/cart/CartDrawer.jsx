import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import SafeImage from '../common/SafeImage';
import Skeleton from '../common/Skeleton';
import {
  getUserShippingAddresses,
  createShippingAddress,
  updateShippingAddress,
  getShippingFees,
  createOrder,
  createGuestOrder,
  createRazorpayOrder,
  updateOrderPayment,
  checkPincodeServiceability,
  initiateCheckout,
  initiateGuestCheckout,
  retryCheckout,
  verifyCheckoutPhoneOtp,
  getPublicCoupons,
} from '../../services/publicApi';
import {
  showOrderPlacedSuccessToast,
  showOrderPlacedErrorToast,
  showValidationErrorToast,
} from '../../utils/toast';
import { fbqTrack } from '../../utils/fbqTrack';
import { gtagTrack } from '../../utils/gtagTrack';
import { gtagAdsConversion } from '../../utils/gtagAdsConversion';
import { useFocusTrap } from '../../hooks/useFocusTrap';

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const PREPAID_INSTANT_DISCOUNT_INR = Math.max(
  0,
  Number.parseFloat(process.env.NEXT_PUBLIC_PREPAID_INSTANT_DISCOUNT_INR || '50', 10) || 0
);
const PREPAID_NUDGE_LINE =
  process.env.NEXT_PUBLIC_PREPAID_NUDGE_TEXT ||
  (PREPAID_INSTANT_DISCOUNT_INR > 0
    ? `Get ₹${Math.round(PREPAID_INSTANT_DISCOUNT_INR)} Instant Discount on Prepaid`
    : 'Free Surprise Gift on Prepaid Orders.');
const OTP_VERIFY_SKIP = process.env.NEXT_PUBLIC_OTP_VERIFY_SKIP === 'true';

/** Shown when API returns no fees so checkout UI and selectedFee are never empty. */
const FALLBACK_SHIPPING_FEES = [
  { id: 'fallback-prepaid', orderType: 'prepaid', fee: 0, isDefault: true },
  { id: 'fallback-cod', orderType: 'cod', fee: 0 },
];

// FIX 1 — cookie-backed UUID guest session (30-day expiry)
function getOrCreateGuestSessionId() {
  if (typeof document === 'undefined') return 'guest-' + Date.now();
  const key = 'guestSessionId';
  const match = document.cookie.split('; ').find(r => r.startsWith(key + '='));
  if (match) return match.split('=')[1];
  const id = 'guest-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = key + '=' + id + '; expires=' + expires + '; path=/; SameSite=Lax';
  return id;
}

// FIX 2 — idempotency key generator
function generateIdempotencyKey() {
  return 'idem-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

// FIX 3 — comprehensive address validation (mirrors backend shippingValidationService)
// The shared Zod schema in utils/addressSchema.js covers the same checks
// (and more) and is the recommended choice for NEW address forms. This
// legacy version is intentionally kept to avoid changing validation
// behaviour on the live checkout path.
function validateShippingAddress(addr) {
  if (!addr) return { valid: false, errors: ['Address is empty'], warnings: [] };
  const errors = [];
  const warnings = [];

  // Name
  const name = String(addr.full_name || addr.fullName || '').trim();
  if (!name) errors.push('Customer name is required');
  else if (name.length < 2) errors.push('Name is too short');
  else if (/^\d+$/.test(name)) errors.push('Name cannot be only numbers');

  // Address line
  const addrLine = String(addr.address || '').trim();
  if (!addrLine) errors.push('Street address is required');
  else if (addrLine.length < 10) errors.push('Address is too short (min 10 characters) — add house/flat number and area');
  else if (addrLine.length < 20) warnings.push('Address is short — add a landmark for better delivery');
  const junk = [/^test/i, /^asdf/i, /^xxx/i, /^abc$/i, /^na$/i, /^n\/a$/i, /^\.+$/, /^-+$/];
  if (junk.some(p => p.test(addrLine))) errors.push('Address looks like a placeholder — please enter a real address');

  // City
  const city = String(addr.city || '').trim();
  if (!city) errors.push('City is required');
  else if (city.length < 2) errors.push('City name is too short');
  else if (/^\d+$/.test(city)) errors.push('City cannot be only numbers');

  // State
  const state = String(addr.state || '').trim();
  if (!state) errors.push('State is required');

  // Pincode
  const pin = String(addr.postal_code || addr.postalCode || addr.pincode || '').trim();
  if (!pin) errors.push('PIN code is required');
  else if (!/^\d{6}$/.test(pin)) errors.push('PIN code must be exactly 6 digits');
  else if (['000000', '111111', '999999'].includes(pin)) errors.push('PIN code looks like a placeholder');

  // Phone
  const phone = String(addr.phone_number || addr.phoneNumber || addr.phone || '').replace(/\D/g, '');
  if (!phone || phone.length < 10) {
    errors.push('Valid 10-digit mobile number is required');
  } else {
    let ten = phone;
    if (phone.length === 12 && phone.startsWith('91')) ten = phone.substring(2);
    else if (phone.length === 11 && phone.startsWith('0')) ten = phone.substring(1);
    else if (phone.length > 10) ten = phone.slice(-10);
    if (!/^[6-9]\d{9}$/.test(ten)) errors.push('Phone must be a valid Indian mobile (starts with 6-9)');
    else if (/^(\d)\1{9}$/.test(ten)) errors.push('Phone number is a repeated digit — please enter a real number');
    else if (ten === '9876543210' || ten === '1234567890') errors.push('Phone number looks like a placeholder');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Keep backward-compat wrapper
function isValidAddress(addr) {
  return validateShippingAddress(addr).valid;
}

function isValidEmail(value) {
  const s = String(value || '').trim();
  if (!s || !s.includes('@')) return false;
  const parts = s.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain || /\s/.test(local) || /\s/.test(domain)) return false;
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;
  const tld = domain.slice(domain.lastIndexOf('.') + 1);
  if (!tld || tld.length < 2 || !/^[a-z0-9-]+$/i.test(tld)) return false;
  return true;
}

/** Indian mobile: exactly 10 digits, starts with 6–9 */
function isValidIndianMobileDigits(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length !== 10) return false;
  return /^[6-9]\d{9}$/.test(digits);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pickImage(item) {
  if (Array.isArray(item.images) && item.images.length > 0)
    return item.images[0].image_url || item.images[0];
  return item.image || null;
}
function getPrice(item) {
  return parseFloat(item.variation?.price || item.price || 0);
}
function getMrp(item) {
  return parseFloat(item.variation?.comparePrice || item.comparePrice || 0);
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
  fullName: '', phoneNumber: '', address: '', landmark: '',
  city: '', state: '', postalCode: '', country: 'India', isDefault: false,
};

// Short, plain-text label for an available coupon in the in-drawer picker.
function describeOffer(coupon) {
  const raw = String(coupon.description || '').replace(/<[^>]*>/g, '').trim();
  if (raw) return raw;
  const value = parseFloat(coupon.value);
  if (coupon.type === 'percentage') return `${value}% OFF`;
  if (coupon.type === 'fixed') return `₹${value} OFF`;
  if (coupon.type === 'tiered') return 'Buy more, save more';
  if (coupon.type === 'quantity_based') return 'Volume discount';
  return 'Special offer';
}

// Dynamic delivery date: today + 5 days
function getDeliveryDateStr() {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconX = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const IconBag = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>;
const IconTrash = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>;
const IconEdit = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const IconPlus = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const IconTruck = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>;
const IconSuccess = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
const IconChevronDown = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>;
const IconFlame = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M12 2c0 0-4 4-4 8a4 4 0 008 0c0-1.5-.5-3-1-4 0 0-1 2-2 2s-1-2-1-4z"/><path d="M12 22c-3.3 0-6-2.7-6-6 0-2.2 1.2-4.2 3-5.4"/></svg>;
const IconClock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconStar = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IconStarFilled = () => <svg viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1" width="15" height="15"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IconWhatsApp = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>;
const IconMoneyBag = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M12 2C9 2 7 4 7 6h10c0-2-2-4-5-4z"/><path d="M7 6C4 6 2 9 2 12c0 5 4 10 10 10s10-5 10-10c0-3-2-6-5-6H7z"/><path d="M12 10v4"/><path d="M10 12h4"/></svg>;
const IconLock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
const IconShield = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L4 5.5V11c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V5.5L12 2z" fill="#16a34a"/>
    <polyline points="8.5 12 11 14.5 15.5 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconTruckSmall = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;

// ─── Main Component ───────────────────────────────────────────────────────────

const CartDrawer = ({ isOpen, onClose }) => {
  const { cartItems, cartTotal, removeFromCart, updateQuantity, clearCart, lastAddedItem, buyNowItem, buyNowTotal, clearBuyNow } = useCart();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [isVisible, setIsVisible] = useState(false);
  const [urgencySeconds, setUrgencySeconds] = useState(10 * 60);
  const [reviewStats, setReviewStats] = useState({ total: 0, avg: 4.8 });

  useEffect(() => {
    if (!isOpen) return;
    setUrgencySeconds(10 * 60);
    const id = setInterval(() => setUrgencySeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [isOpen]);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
    fetch(`${API}/api/reviews/all?limit=1`, {
      headers: { 'X-Brand-Name': 'crosscoin' }
    })
      .then(r => r.json())
      .then(data => {
        if (data?.pagination?.total) {
          setReviewStats(prev => ({ ...prev, total: data.pagination.total }));
        }
      })
      .catch(() => {});
  }, []);

  // Guest contact
  const [guestInfo, setGuestInfo] = useState({ email: '', firstName: '', lastName: '', phone: '' });
  const [guestEmailError, setGuestEmailError] = useState('');
  const [guestPhoneError, setGuestPhoneError] = useState('');
  const [addressPhoneError, setAddressPhoneError] = useState('');

  // Address
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDR);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);

  // Delivery
  const [shippingFees, setShippingFees] = useState([]);
  const [selectedFee, setSelectedFee] = useState(null);

  // COD: direct (no OTP)
  const [fieldErrors, setFieldErrors] = useState({});
  // Address validation popup: { errors:[], warnings:[] } while shown, else null.
  const [addrIssues, setAddrIssues] = useState(null);
  // Advisory warnings (e.g. "add a landmark") shown inline under the form.
  const [addrWarnings, setAddrWarnings] = useState([]);
  const [otpSending] = useState(false);

  // Order
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [paymentFailed, setPaymentFailed] = useState({ error: null, rzpOrder: null, retryCount: 0, orderResult: null, reservationId: null });
  const [pincodeServiceability, setPincodeServiceability] = useState(null); // { serviceable, cod_allowed, city, state }
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { id, code, discountAmount, paymentModeRestriction }
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // Available offers picker (collapsed dropdown inside the coupon section)
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [offersOpen, setOffersOpen] = useState(false);
  const couponsFetchedRef = useRef(false);
  const offersRef = useRef(null);

  // Scroll hint
  const bodyRef = useRef(null);
  const dropdownRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const scrollDrawerTo = (anchorId) => {
    requestAnimationFrame(() => {
      const el = typeof document !== 'undefined' ? document.getElementById(anchorId) : null;
      const body = bodyRef.current;
      if (el && body) {
        const top = el.offsetTop - body.offsetTop - 8;
        body.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      } else if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  };

  // ── Visibility ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
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
        couponsFetchedRef.current = false;
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ── InitiateCheckout when drawer opens (one shot per open) ──────────────
  useEffect(() => {
    if (!isOpen) return;
    // Skip when buyNowItem is set — ProductDetails.handleBuyNow already fired InitiateCheckout
    if (buyNowItem) return;
    const activeItems = cartItems;
    const activeTotal = cartTotal;
    if (activeItems.length === 0) return;
    fbqTrack('InitiateCheckout', {
      content_ids: activeItems.map(i => String(i.productId || i.id)),
      content_type: 'product',
      num_items: activeItems.reduce((s, i) => s + (i.quantity || 1), 0),
      value: activeTotal,
      currency: 'INR',
    });
    gtagTrack('begin_checkout', {
      currency: 'INR',
      value: activeTotal,
      items: activeItems.map(i => ({
        item_id: String(i.productId || i.id),
        item_name: i.name || i.title || '',
        quantity: i.quantity || 1,
        price: parseFloat(getPrice(i) || 0),
      })),
    });
    gtagAdsConversion('begin_checkout', { value: activeTotal, currency: 'INR' });
    // Intentionally only when isOpen flips; cart snapshot is current at open time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Shipping fees ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    getShippingFees().then(data => {
      const raw = Array.isArray(data) ? data : data?.shippingFees || data?.fees || [];
      const fees = raw.length > 0 ? raw : FALLBACK_SHIPPING_FEES;
      setShippingFees(fees);
      const def = fees.find(f => f.orderType === 'prepaid')
        || fees.find(f => f.isDefault)
        || fees[0];
      setSelectedFee(def || null);
    }).catch(() => {
      setShippingFees(FALLBACK_SHIPPING_FEES);
      setSelectedFee(FALLBACK_SHIPPING_FEES[0]);
    });
  }, [isOpen]);

  // Keep selected fee valid when list changes (e.g. reopen drawer)
  useEffect(() => {
    if (shippingFees.length === 0) return;
    setSelectedFee((prev) => {
      if (prev && shippingFees.some((f) => f.id === prev.id)) return prev;
      return shippingFees.find((f) => f.orderType === 'prepaid')
        || shippingFees.find((f) => f.isDefault)
        || shippingFees[0];
    });
  }, [shippingFees]);

  // ── Load addresses ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    setAddressLoading(true);
    getUserShippingAddresses().then(data => {
      setAddresses(data || []);
      const def = (data || []).find(a => a.isDefault || a.is_default);
      if (def && !selectedAddress) {
        setSelectedAddress(def);
        // Check serviceability for default address pincode
        const pin = String(def.postal_code || def.postalCode || '').replace(/\D/g, '');
        if (pin.length === 6) {
          checkPincodeServiceability(pin)
            .then(result => setPincodeServiceability({
              serviceable: result?.serviceable !== false,
              cod_allowed: result?.cod_allowed !== false,
              city: result?.city || '',
              state: result?.state || '',
            }))
            .catch(() => setPincodeServiceability(null));
        }
      }
    }).catch(() => { }).finally(() => setAddressLoading(false));
  }, [isOpen, isAuthenticated]);

  // Auto-open address form for guests (no separate contact section anymore)
  useEffect(() => {
    if (!isOpen || isAuthenticated) return;
    if (!selectedAddress) setShowAddressForm(true);
  }, [isOpen, isAuthenticated, selectedAddress]);

  // Live email validation (guest) — debounced while typing
  useEffect(() => {
    if (!isOpen || isAuthenticated) return;
    const t = setTimeout(() => {
      const e = guestInfo.email.trim();
      if (!e) setGuestEmailError('');
      else setGuestEmailError(isValidEmail(e) ? '' : 'Enter a valid email (e.g. name@example.com).');
    }, 320);
    return () => clearTimeout(t);
  }, [guestInfo.email, isOpen, isAuthenticated]);

  // Live phone validation (auth address form)
  useEffect(() => {
    if (!isAuthenticated || !showAddressForm) {
      setAddressPhoneError('');
      return;
    }
    const digits = String(addressForm.phoneNumber || '').replace(/\D/g, '');
    if (digits.length === 0) setAddressPhoneError('');
    else if (!isValidIndianMobileDigits(digits)) {
      setAddressPhoneError('Enter a valid 10-digit Indian mobile (starts with 6–9).');
    } else setAddressPhoneError('');
  }, [addressForm.phoneNumber, isAuthenticated, showAddressForm]);

  // ── Real-time field validation (runs on every keystroke, debounced) ─────
  useEffect(() => {
    if (!showAddressForm) { setFieldErrors({}); return; }
    const t = setTimeout(() => {
      const formToValidate = isAuthenticated
        ? { full_name: addressForm.fullName, address: addressForm.address, city: addressForm.city, state: addressForm.state, postal_code: addressForm.postalCode, phone_number: addressForm.phoneNumber }
        : { full_name: `${guestInfo.firstName} ${guestInfo.lastName}`.trim(), address: addressForm.address, city: addressForm.city, state: addressForm.state, postal_code: addressForm.postalCode, phone_number: guestInfo.phone };
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
        else if (lower.includes('email')) errs.email = err;
      }
      // Also validate email for guests
      if (!isAuthenticated && guestInfo.email.trim() && !isValidEmail(guestInfo.email)) {
        errs.email = 'Enter a valid email (e.g. name@example.com).';
      }
      setFieldErrors(errs);
      // Advisory warnings (e.g. "add a landmark") — non-blocking, shown inline.
      setAddrWarnings(result.warnings || []);
    }, 400);
    return () => clearTimeout(t);
  }, [showAddressForm, addressForm, guestInfo, isAuthenticated]);

  // ── Auto-save the address once every field is valid — no button needed ──
  // Shoppers were stalling at checkout: they'd fill the address form but never
  // click "Save Address", so the address never became the selected one and the
  // order couldn't proceed. Now it commits itself ~0.9s after the form is
  // complete and valid (guests save locally; logged-in users persist to their
  // account). The signature guard stops it from re-saving the same address.
  const lastAutoSaveSig = useRef('');
  useEffect(() => {
    if (!showAddressForm || addressSaving) return;
    const pinOk = /^\d{6}$/.test(String(addressForm.postalCode || ''));
    const nameOk = isAuthenticated
      ? !!String(addressForm.fullName || '').trim()
      : !!String(guestInfo.firstName || '').trim();
    const phoneOk = isAuthenticated
      ? /^\d{10}$/.test(String(addressForm.phoneNumber || '').replace(/\D/g, ''))
      : /^\d{10}$/.test(String(guestInfo.phone || '').replace(/\D/g, ''));
    const filled = String(addressForm.address || '').trim() && String(addressForm.city || '').trim()
      && String(addressForm.state || '').trim() && pinOk && nameOk && phoneOk;
    const noErrors = Object.keys(fieldErrors).length === 0;
    const serviceableOk = !(pincodeServiceability && pincodeServiceability.serviceable === false);
    if (!filled || !noErrors || !serviceableOk) return;
    const sig = JSON.stringify([
      addressForm.address, addressForm.city, addressForm.state, addressForm.postalCode,
      addressForm.fullName, addressForm.phoneNumber, addressForm.landmark, addressForm.country,
      guestInfo.firstName, guestInfo.lastName, guestInfo.phone, editingAddressId,
    ]);
    if (sig === lastAutoSaveSig.current) return; // this exact address is already saved
    const t = setTimeout(() => {
      lastAutoSaveSig.current = sig;
      handleSaveAddress({ preventDefault: () => {} });
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddressForm, addressForm, guestInfo, fieldErrors, pincodeServiceability, addressSaving, isAuthenticated, editingAddressId]);

  // Close the address-issues popup on Escape (capture phase so it wins over the
  // drawer's own Escape-to-close handler).
  useEffect(() => {
    if (!addrIssues) return;
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setAddrIssues(null); } };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [addrIssues]);

  // ── Body class for back-to-top hiding ──────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('cd-drawer-open-body');
    } else {
      document.body.classList.remove('cd-drawer-open-body');
    }
    return () => document.body.classList.remove('cd-drawer-open-body');
  }, [isOpen]);

  // ── Buy Now is a one-shot express item ─────────────────────────────────
  // Drop it whenever the drawer closes, so the next time the cart opens (Add to
  // Bag, cart icon, etc.) it shows the real cart — not a stale single item.
  // Without this, a closed-but-uncompleted Buy Now made Add to Bag look
  // identical to Buy Now (both rendered the same lingering buyNowItem).
  useEffect(() => {
    if (!isOpen && buyNowItem) clearBuyNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Close dropdown on outside click ────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAddressDropdown(false);
      }
    };

    if (showAddressDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddressDropdown]);

  // ── Available offers: fetch once per open when the cart has items ────────
  useEffect(() => {
    if (!isOpen) return;
    if (couponsFetchedRef.current) return;
    const hasItems = buyNowItem ? true : cartItems.length > 0;
    if (!hasItems) return;
    couponsFetchedRef.current = true;
    getPublicCoupons()
      .then((res) => {
        setAvailableCoupons(res && res.success && Array.isArray(res.coupons) ? res.coupons : []);
      })
      .catch(() => setAvailableCoupons([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, buyNowItem, cartItems.length]);

  // Collapse the offers menu once a coupon is applied (any path).
  useEffect(() => {
    if (appliedCoupon) setOffersOpen(false);
  }, [appliedCoupon]);

  // Close the offers menu on outside click / Escape.
  useEffect(() => {
    if (!offersOpen) return;
    const onClick = (e) => {
      if (offersRef.current && !offersRef.current.contains(e.target)) setOffersOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOffersOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [offersOpen]);
  // FIX 6 — ResizeObserver replaces 3x setTimeout scroll hint hack
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const check = () => {
      setShowScrollHint(el.scrollTop < el.scrollHeight - el.clientHeight - 40);
    };
    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', check);
      ro.disconnect();
    };
  }, [isOpen, buyNowItem, cartItems.length]);

  // ── Computed totals ─────────────────────────────────────────────────────
  const activeItems = buyNowItem ? [buyNowItem] : cartItems;
  const activeTotal = buyNowItem ? buyNowTotal : cartTotal;
  const shippingFeeAmount = parseFloat(selectedFee?.fee || 0);
  const couponDiscount = appliedCoupon ? parseFloat(appliedCoupon.discountAmount) : 0;
  // Offers shown in the in-drawer picker, excluding any already-applied coupon.
  const offerCoupons = availableCoupons.filter(
    (c) => !appliedCoupon || String(c.code).toUpperCase() !== String(appliedCoupon.code).toUpperCase()
  );
  const finalTotal = Math.max(0, activeTotal + shippingFeeAmount - couponDiscount);
  const totalQty = activeItems.reduce((s, i) => s + (i.quantity || 1), 0);

  const sortedShippingFees = useMemo(() => {
    const arr = [...shippingFees];
    arr.sort((a, b) => {
      if (a.orderType === 'cod' && b.orderType !== 'cod') return -1;
      if (a.orderType !== 'cod' && b.orderType === 'cod') return 1;
      return 0;
    });
    return arr;
  }, [shippingFees]);

  const prepaidInstantDiscount =
    selectedFee?.orderType === 'prepaid' && PREPAID_INSTANT_DISCOUNT_INR > 0
      ? Math.min(PREPAID_INSTANT_DISCOUNT_INR, finalTotal)
      : 0;
  const prepaidPayable = Math.max(0, finalTotal - prepaidInstantDiscount);
  const isCodDelivery = selectedFee?.orderType === 'cod';
  const isPrepaidDelivery = selectedFee?.orderType === 'prepaid';

  // Reset on delivery/address change
  useEffect(() => {
    setFieldErrors({});
  }, [selectedFee?.id, selectedAddress?.id, guestInfo.phone]);

  // ── Delivery fee ────────────────────────────────────────────────────────
  const handleSelectFee = (fee) => {
    setSelectedFee(fee);
  };

  const getDeliveryPhone = () => {
    const raw = isAuthenticated && selectedAddress
      ? (selectedAddress.phone_number || selectedAddress.phoneNumber || '')
      : (guestInfo.phone || '');
    const digits = String(raw).replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
  };

  const handleGuestPhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setGuestInfo(p => ({ ...p, phone: digits }));
    if (digits.length === 0) setGuestPhoneError('');
    else if (!isValidIndianMobileDigits(digits)) {
      setGuestPhoneError('Enter a valid 10-digit Indian mobile (starts with 6–9).');
    } else setGuestPhoneError('');
  };

  // ── Address form ────────────────────────────────────────────────────────
  const handleAddrChange = (e) => {
    const { name, value, type, checked } = e.target;
    let next = type === 'checkbox' ? checked : value;
    if (name === 'phoneNumber' && typeof next === 'string') {
      next = next.replace(/\D/g, '').slice(0, 10);
    }
    setAddressForm(p => ({ ...p, [name]: next }));
  };

  // Task 16: check pincode serviceability on blur, auto-fill city/state
  const handlePincodeBlur = async (e) => {
    const pin = e.target.value.replace(/\D/g, '');
    if (pin.length !== 6) return;
    try {
      const result = await checkPincodeServiceability(pin);
      const serviceable = result?.serviceable !== false;
      const cod_allowed = result?.cod_allowed !== false;
      const city = result?.city || '';
      const state = result?.state || '';
      setPincodeServiceability({ serviceable, cod_allowed, city, state });
      // Auto-fill city and state if returned
      if (city || state) {
        setAddressForm(p => ({
          ...p,
          city: city || p.city,
          state: state || p.state,
        }));
      }
    } catch {
      // Non-fatal — don't block checkout on serviceability failure
      setPincodeServiceability(null);
    }
  };

  const handleEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      fullName: addr.full_name || addr.fullName || '',
      phoneNumber: addr.phone_number || addr.phoneNumber || '',
      address: addr.address || '',
      landmark: addr.landmark || '',
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
      : { ...addressForm, fullName: `${guestInfo.firstName} ${guestInfo.lastName}`.trim() || addressForm.fullName, phoneNumber: guestInfo.phone || addressForm.phoneNumber };

    // ── Comprehensive address validation ──────────────────────────────────
    const addrToValidate = {
      full_name: formData.fullName,
      address: formData.address,
      landmark: formData.landmark,
      city: formData.city,
      state: formData.state,
      postal_code: formData.postalCode,
      phone_number: isAuthenticated ? formData.phoneNumber : guestInfo.phone,
    };
    const validation = validateShippingAddress(addrToValidate);
    if (!validation.valid) {
      // Show EVERY problem at once in a popup (not just the first, fading toast).
      setAddrIssues({ errors: validation.errors, warnings: validation.warnings });
      return;
    }

    setAddressSaving(true);
    try {
      if (isAuthenticated) {
        let saved;
        if (editingAddressId) saved = await updateShippingAddress(editingAddressId, formData);
        else saved = await createShippingAddress(formData);
        const fresh = await getUserShippingAddresses();
        setAddresses(fresh || []);
        setSelectedAddress(saved || formData);
      } else {
        const saved = { id: Date.now(), full_name: formData.fullName, phone_number: formData.phoneNumber, address: formData.address, landmark: formData.landmark, city: formData.city, state: formData.state, postal_code: formData.postalCode, country: formData.country };
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

  // ── Coupon ──────────────────────────────────────────────────────────────
  const handleApplyCoupon = async (codeArg) => {
    // codeArg is a string when applied from the offers picker; the input's
    // button passes a click event, so fall back to the typed couponCode then.
    const source = typeof codeArg === 'string' ? codeArg : couponCode;
    const code = source.trim().toUpperCase();
    if (!code) return;
    setCouponError('');
    setCouponSuccess('');
    setCouponLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
      const paymentMode = selectedFee?.orderType === 'cod' ? 'cod' : 'prepaid';
      const res = await fetch(`${API}/api/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': 'crosscoin' },
        body: JSON.stringify({ code, cartTotal: activeTotal, paymentMode, cartItems: activeItems }),
      });
      const data = await res.json();
      if (data.success) {
        setAppliedCoupon({ id: data.coupon.id, code: data.coupon.code, discountAmount: data.discountAmount, paymentModeRestriction: data.coupon.paymentModeRestriction });
        setCouponSuccess(`"${data.coupon.code}" applied — ₹${parseFloat(data.discountAmount).toFixed(2)} off!`);
        setCouponCode('');
      } else {
        setCouponError(data.message || 'Invalid coupon code');
      }
    } catch {
      setCouponError('Failed to validate coupon. Please try again.');
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

  const buildItemsPayload = () => activeItems.map(item => ({
    product_id: item.productId || item.id,
    variation_id: item.variationId || item.variation?.id || null,
    quantity: item.quantity,
  }));

  // FIX 8/9 — idempotency key in payload; ip_address removed; cookie session
  const buildPrepaidOrderData = (idempotencyKey) => {
    const itemsPayload = buildItemsPayload();
    const base = {
      items: itemsPayload,
      payment_type: 'upi',
      notes: '',
      discount_amount: prepaidInstantDiscount + couponDiscount,
      coupon_id: appliedCoupon?.id || null,
      idempotency_key: idempotencyKey,
    };
    if (isAuthenticated) {
      return { shipping_address_id: selectedAddress.id, ...base };
    }
    return {
      guest_info: guestInfo,
      shipping_address: {
        fullName: selectedAddress.full_name || selectedAddress.fullName,
        address: selectedAddress.address,
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.postal_code || selectedAddress.postalCode,
        phone: selectedAddress.phone_number || selectedAddress.phoneNumber,
      },
      ...base,
      session_id: getOrCreateGuestSessionId(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };
  };

  const buildCodOrderData = (idempotencyKey) => {
    const itemsPayload = buildItemsPayload();
    const base = {
      items: itemsPayload,
      payment_type: 'cod',
      notes: '',
      discount_amount: couponDiscount,
      coupon_id: appliedCoupon?.id || null,
      idempotency_key: idempotencyKey,
    };
    if (isAuthenticated) {
      return { shipping_address_id: selectedAddress.id, ...base };
    }
    return {
      guest_info: guestInfo,
      shipping_address: {
        fullName: selectedAddress.full_name || selectedAddress.fullName,
        address: selectedAddress.address,
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.postal_code || selectedAddress.postalCode,
        phone: selectedAddress.phone_number || selectedAddress.phoneNumber,
      },
      ...base,
      session_id: getOrCreateGuestSessionId(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };
  };

  const trackPurchase = (value, orderNumber) => {
    try {
      const trackingKey = `fb_purchase_tracked_${orderNumber}`;
      if (sessionStorage.getItem(trackingKey)) return;
      fbqTrack('Purchase', {
        value: Number(value.toFixed(2)),
        currency: 'INR',
        content_type: 'product',
        contents: activeItems.map(i => ({
          id: (i.productId || i.id) && (i.variationId || i.variation?.id)
            ? `${i.productId || i.id}_${i.variationId || i.variation?.id}`
            : String(i.productId || i.id),
          quantity: i.quantity,
        })),
      }, { eventID: `Purchase_${orderNumber}` });
      gtagTrack('purchase', {
        transaction_id: orderNumber,
        value: Number(value.toFixed(2)),
        currency: 'INR',
        items: activeItems.map(i => ({
          item_id: String(i.productId || i.id),
          item_name: i.name || i.title || '',
          quantity: i.quantity || 1,
          price: parseFloat(getPrice(i) || 0),
        })),
      });
      gtagAdsConversion('purchase', { transaction_id: orderNumber, value: Number(value.toFixed(2)), currency: 'INR' });
      sessionStorage.setItem(trackingKey, 'true');
    } catch (_) { }
  };

  const placeCodOrder = async () => {
    setIsProcessing(true);
    // GA4: add_shipping_info + add_payment_info for COD flow
    gtagTrack('add_shipping_info', {
      currency: 'INR',
      value: finalTotal,
      shipping_tier: selectedFee?.orderType || 'cod',
      items: activeItems.map(i => ({
        item_id: String(i.productId || i.id),
        item_name: i.name || i.title || '',
        quantity: i.quantity || 1,
        price: parseFloat(getPrice(i) || 0),
      })),
    });
    gtagAdsConversion('add_shipping_info', { value: finalTotal, currency: 'INR' });
    gtagTrack('add_payment_info', {
      currency: 'INR',
      value: finalTotal,
      payment_type: 'cod',
      items: activeItems.map(i => ({
        item_id: String(i.productId || i.id),
        item_name: i.name || i.title || '',
        quantity: i.quantity || 1,
        price: parseFloat(getPrice(i) || 0),
      })),
    });
    gtagAdsConversion('add_payment_info', { value: finalTotal, currency: 'INR' });
    try {
      const orderData = buildCodOrderData(generateIdempotencyKey());
      const result = isAuthenticated ? await createOrder(orderData) : await createGuestOrder(orderData);
      if (!result?.order) throw new Error('Order creation failed.');
      trackPurchase(finalTotal, result.order.order_number);
      clearCart();
      clearBuyNow();
      showOrderPlacedSuccessToast(result.order.order_number);
      setOrderSuccess({ orderNumber: result.order.order_number });
    } catch (err) {
      showOrderPlacedErrorToast(err.response?.data?.message || err.message || 'Order placement failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // OTP removed — COD orders go directly to placeCodOrder()

  const handlePlaceOrder = async () => {
    // ── Comprehensive address validation before placing order ──────────────
    const addrValidation = validateShippingAddress(selectedAddress);
    if (!addrValidation.valid) {
      setAddrIssues({ errors: addrValidation.errors, warnings: addrValidation.warnings });
      scrollDrawerTo('cd-section-address');
      return;
    }
    // Block orders to a PIN code the courier can't service.
    if (pincodeServiceability && pincodeServiceability.serviceable === false) {
      showValidationErrorToast("Sorry, we don't deliver to this PIN code yet. Please try a different address.");
      scrollDrawerTo('cd-section-address');
      return;
    }
    if (!selectedFee) {
      showValidationErrorToast('Please select a delivery method.');
      scrollDrawerTo('cd-section-delivery');
      return;
    }
    if (!isAuthenticated) {
      if (!String(guestInfo.firstName || '').trim()) {
        showValidationErrorToast('Please enter your first name.');
        scrollDrawerTo('cd-section-address');
        return;
      }
      if (guestEmailError || guestPhoneError || !isValidEmail(guestInfo.email) || !isValidIndianMobileDigits(guestInfo.phone)) {
        showValidationErrorToast('Please fix the errors in your delivery details (email and phone).');
        scrollDrawerTo('cd-section-address');
        return;
      }
    }
    const phone = getDeliveryPhone();
    if (!isValidIndianMobileDigits(phone)) {
      showValidationErrorToast('Please add a valid 10-digit mobile number.');
      scrollDrawerTo('cd-section-address');
      return;
    }

    if (isPrepaidDelivery) {
      if (!RAZORPAY_KEY) {
        showOrderPlacedErrorToast('Razorpay key not configured.');
        return;
      }
      // FIX 11 — guard against zero/negative payable amount
      if (prepaidPayable <= 0) {
        showOrderPlacedErrorToast('Order amount must be greater than zero.');
        return;
      }
      setIsProcessing(true);

      // GA4: add_shipping_info — user confirmed a valid address and delivery method
      gtagTrack('add_shipping_info', {
        currency: 'INR',
        value: prepaidPayable,
        shipping_tier: selectedFee?.orderType || 'prepaid',
        items: activeItems.map(i => ({
          item_id: String(i.productId || i.id),
          item_name: i.name || i.title || '',
          quantity: i.quantity || 1,
          price: parseFloat(getPrice(i) || 0),
        })),
      });
      gtagAdsConversion('add_shipping_info', { value: prepaidPayable, currency: 'INR' });

      try {
        const scriptLoaded = await loadRazorpay();
        if (!scriptLoaded || !window.Razorpay) {
          showOrderPlacedErrorToast('Failed to load payment SDK.');
          setIsProcessing(false);
          return;
        }
        const prepaidIdempotencyKey = generateIdempotencyKey();

        // Step 1: Initiate checkout — reserve stock + create Razorpay order (NO DB order yet)
        let checkoutResult;
        try {
          const checkoutData = {
            shipping_address_id: selectedAddress.id,
            items: buildItemsPayload(),
            payment_type: 'razorpay',
            notes: '',
            discount_amount: prepaidInstantDiscount + couponDiscount,
            coupon_id: appliedCoupon?.id || null,
            idempotency_key: prepaidIdempotencyKey,
          };

          checkoutResult = isAuthenticated
            ? await initiateCheckout(checkoutData)
            : await initiateGuestCheckout({
                ...checkoutData,
                shipping_address_id: undefined,
                phone: selectedAddress.phone_number || selectedAddress.phoneNumber,
                email: guestInfo.email,
                firstName: guestInfo.firstName,
                lastName: guestInfo.lastName,
                shipping_address: {
                  fullName: selectedAddress.full_name || selectedAddress.fullName,
                  address: selectedAddress.address,
                  city: selectedAddress.city,
                  state: selectedAddress.state,
                  pincode: selectedAddress.postal_code || selectedAddress.postalCode,
                  phone: selectedAddress.phone_number || selectedAddress.phoneNumber,
                },
              });

          if (!checkoutResult?.success || !checkoutResult?.razorpay_order) {
            throw new Error('Checkout initiation failed.');
          }
        } catch (err) {
          showOrderPlacedErrorToast(err.message || err.error || 'Failed to start checkout. Please try again.');
          setIsProcessing(false);
          return;
        }

        const rzpOrder = checkoutResult.razorpay_order;
        const reservationId = checkoutResult.reservation_id;

        // GA4: add_payment_info — user is about to pay via Razorpay
        gtagTrack('add_payment_info', {
          currency: 'INR',
          value: prepaidPayable,
          payment_type: 'razorpay',
          items: activeItems.map(i => ({
            item_id: String(i.productId || i.id),
            item_name: i.name || i.title || '',
            quantity: i.quantity || 1,
            price: parseFloat(getPrice(i) || 0),
          })),
        });
        gtagAdsConversion('add_payment_info', { value: prepaidPayable, currency: 'INR' });

        // Step 2: Open Razorpay checkout
        const options = {
          key: RAZORPAY_KEY,
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
            // Step 3: Payment captured — verify + create order in one call
            try {
              const result = await updateOrderPayment({
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
                reservation_id: reservationId,
              });
              const orderNumber = result.order?.order_number;
              trackPurchase(prepaidPayable, orderNumber);
              clearCart();
              clearBuyNow();
              showOrderPlacedSuccessToast(orderNumber);
              setOrderSuccess({ orderNumber });
            } catch (err) {
              // Payment captured but order creation failed — webhook will recover
              showOrderPlacedErrorToast('Payment received successfully. Your order is being processed — you will receive confirmation shortly.');
              clearCart();
              clearBuyNow();
            } finally {
              setIsProcessing(false);
            }
          },
          modal: {
            ondismiss: () => {
              setPaymentFailed(prev => ({ error: 'Payment was cancelled.', rzpOrder, retryCount: prev.retryCount, orderResult: null, reservationId }));
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
            orderResult: null,
            reservationId,
          }));
          setIsProcessing(false);
        });
        rzp.open();
      } catch (err) {
        showOrderPlacedErrorToast(err.response?.data?.message || err.message || 'Order placement failed. Please try again.');
        setIsProcessing(false);
      }
      return;
    }

    if (isCodDelivery) {
      await placeCodOrder();
      return;
    }

    showValidationErrorToast('Please select a delivery method.');
  };

  // Focus trap is active whenever the drawer is open. Escape closes it.
  // Hook must run on every render (before any early return) to satisfy
  // the Rules of Hooks — otherwise the hook order changes between
  // visible / hidden renders and React bails the build.
  const trapRef = useFocusTrap(isOpen, { onEscape: onClose });

  if (!isVisible) return null;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <div className={`cd-backdrop ${isOpen ? 'cd-backdrop-active' : ''}`} onClick={onClose} />
      <div ref={trapRef} className={`cd-drawer ${isOpen ? 'cd-drawer-open' : ''}`} role="dialog" aria-modal="true" aria-label="Shopping cart">

        {/* Address validation popup — lists every problem at once (replaces the
            old single fading toast). Errors block checkout; warnings advise. */}
        {addrIssues && (
          <div
            className="cd-vpop-overlay"
            role="presentation"
            onClick={(e) => { if (e.target === e.currentTarget) setAddrIssues(null); }}
            style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(24,13,62,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}
          >
            <div role="alertdialog" aria-modal="true" aria-labelledby="cd-vpop-title"
              style={{ background: '#fff', borderRadius: 14, boxShadow: '0 12px 40px rgba(24,13,62,.28)', width: '100%', maxWidth: 340, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div id="cd-vpop-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, color: '#c9433c' }}>
                  <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: '50%', background: '#fbecea', border: '1px solid #eab4ae', color: '#c9433c', display: 'grid', placeItems: 'center', fontSize: 13, flex: '0 0 auto' }}>!</span>
                  {addrIssues.errors.length > 0
                    ? `Please fix ${addrIssues.errors.length} thing${addrIssues.errors.length > 1 ? 's' : ''}`
                    : 'A quick tip'}
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
                style={{ alignSelf: 'stretch', textAlign: 'center', border: 'none', background: '#180D3E', color: '#fff', fontWeight: 650, fontSize: 13.5, padding: '10px 16px', borderRadius: 9, cursor: 'pointer' }}>
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
              <button className="cd-btn-primary" onClick={() => { onClose(); router.push(`/thank-you?order_number=${orderSuccess.orderNumber}`); }}>View Order</button>
              <button className="cd-btn-ghost" style={{ marginTop: 8 }} onClick={onClose}>Continue Shopping</button>
            </div>
          ) : isMounted && paymentFailed.error ? (
            /* ── Payment Failure Panel (Task 3) ── */
            <div className="cd-success" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#b91c1c' }}>Payment Failed</h3>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: '#6b7280' }}>{paymentFailed.error}</p>
              {paymentFailed.retryCount < 3 ? (
                <button
                  className="cd-btn-primary"
                  onClick={async () => {
                    setPaymentFailed(prev => ({ ...prev, retryCount: prev.retryCount + 1, error: null }));
                    setIsProcessing(true);
                    try {
                      // Call backend retry — gets new Razorpay order, extends stock reservation
                      const retryResult = await retryCheckout(paymentFailed.reservationId);
                      if (!retryResult?.success || !retryResult?.razorpay_order) {
                        throw new Error(retryResult?.message || 'Retry failed.');
                      }

                      const rzpOrder = retryResult.razorpay_order;
                      const reservationId = retryResult.reservation_id;

                      // GA4: add_payment_info on retry
                      gtagAdsConversion('add_payment_info', { value: prepaidPayable, currency: 'INR' });
                      gtagTrack('add_payment_info', {
                        currency: 'INR',
                        value: prepaidPayable,
                        payment_type: 'razorpay',
                        items: activeItems.map(i => ({
                          item_id: String(i.productId || i.id),
                          item_name: i.name || i.title || '',
                          quantity: i.quantity || 1,
                          price: parseFloat(getPrice(i) || 0),
                        })),
                      });

                      const options = {
                        key: RAZORPAY_KEY,
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
                            const result = await updateOrderPayment({
                              razorpayPaymentId: response.razorpay_payment_id,
                              razorpayOrderId: response.razorpay_order_id,
                              razorpaySignature: response.razorpay_signature,
                              reservation_id: reservationId,
                            });
                            const orderNumber = result.order?.order_number;
                            trackPurchase(prepaidPayable, orderNumber);
                            clearCart(); clearBuyNow();
                            setPaymentFailed({ error: null, rzpOrder: null, retryCount: 0, orderResult: null, reservationId: null });
                            showOrderPlacedSuccessToast(orderNumber);
                            setOrderSuccess({ orderNumber });
                          } catch (err) {
                            showOrderPlacedErrorToast('Payment received successfully. Your order is being processed — you will receive confirmation shortly.');
                            clearCart(); clearBuyNow();
                          } finally {
                            setIsProcessing(false);
                          }
                        },
                        modal: {
                          ondismiss: () => {
                            setPaymentFailed(prev => ({ ...prev, error: 'Payment was cancelled.', rzpOrder, reservationId }));
                            setIsProcessing(false);
                          },
                        },
                      };
                      const rzp = new window.Razorpay(options);
                      rzp.on('payment.failed', (r) => {
                        setPaymentFailed(prev => ({ ...prev, error: r.error?.description || 'Payment failed. Please try again.', rzpOrder, reservationId }));
                        setIsProcessing(false);
                      });
                      rzp.open();
                    } catch (err) {
                      // If session expired, reset so user can start fresh
                      if (err.code === 'SESSION_EXPIRED' || err.message?.includes('expired')) {
                        setPaymentFailed({ error: 'Checkout session expired. Please start a new order.', rzpOrder: null, retryCount: 3, orderResult: null, reservationId: null });
                      } else {
                        showOrderPlacedErrorToast(err.message || 'Could not retry payment.');
                      }
                      setIsProcessing(false);
                    }
                  }}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Please wait…' : `Retry Payment (${3 - paymentFailed.retryCount} left)`}
                </button>
              ) : (
                <p style={{ fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>Maximum retries reached. Please start a new order.</p>
              )}
              <button
                className="cd-btn-ghost"
                style={{ marginTop: 10 }}
                onClick={() => {
                  setPaymentFailed({ error: null, rzpOrder: null, retryCount: 0, orderResult: null, reservationId: null });
                  // Fire-and-forget: record failure if we have a rzpOrder
                  if (paymentFailed.rzpOrder?.id) {
                    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in'}/api/payments/failed`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'X-Brand-Name': 'crosscoin' },
                      body: JSON.stringify({ razorpayOrderId: paymentFailed.rzpOrder.id, errorDescription: paymentFailed.error }),
                    }).catch(() => {});
                  }
                }}
              >
                Cancel
              </button>
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

              {/* ── 1. Items ── */}
              <div className="cd-section-title">Items</div>
              <div className="cd-items-list">
                {activeItems.map(item => {
                  const img = pickImage(item);
                  const price = getPrice(item);
                  const mrp = getMrp(item);
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
                          <div className="cd-item-prices">
                            <span className="cd-item-price">₹{price.toFixed(2)}</span>
                            {mrp > 0 && mrp > price && <span className="cd-item-original-price">₹{mrp.toFixed(2)}</span>}
                          </div>
                          {!buyNowItem && (
                            <div className="cd-qty">
                              <button className="cd-qty-btn" onClick={() => updateQuantity(item.id, -1)} disabled={item.quantity <= 1} aria-label="Decrease quantity">−</button>
                              <span className="cd-qty-val">{item.quantity}</span>
                              <button className="cd-qty-btn" onClick={() => updateQuantity(item.id, 1)} aria-label="Increase quantity">+</button>
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

              {/* ── 2. Coupon (input + collapsed offers picker) ── */}
              <div className="cd-sv-section" id="cd-section-coupon">
                <div className="cd-section-title">Have a coupon?</div>
                {appliedCoupon ? (
                  <div className="cd-coupon-applied">
                    <span>{appliedCoupon.code} applied — ₹{couponDiscount.toFixed(2)} off</span>
                    <button type="button" className="cd-coupon-remove" onClick={handleRemoveCoupon}>Remove</button>
                  </div>
                ) : (
                  <>
                    <div className="cd-coupon-wrap">
                      <input
                        className="cd-coupon-input"
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
                        placeholder="Enter coupon code"
                        autoComplete="off"
                        aria-label="Coupon code"
                      />
                      <button
                        type="button"
                        className="cd-coupon-btn"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                      >
                        {couponLoading ? '…' : 'Apply'}
                      </button>
                    </div>
                    {couponError && <p className="cd-coupon-error" role="alert">{couponError}</p>}

                    {offerCoupons.length > 0 && (
                      <div className="cd-offers" ref={offersRef}>
                        <button
                          type="button"
                          className="cd-offers-trigger"
                          onClick={() => setOffersOpen((o) => !o)}
                          aria-expanded={offersOpen}
                          aria-haspopup="listbox"
                        >
                          <span className="cd-offers-trigger-label">Select a coupon</span>
                          <span className={`cd-dropdown-arrow ${offersOpen ? 'open' : ''}`}><IconChevronDown /></span>
                        </button>
                        {offersOpen && (
                          <div className="cd-offers-menu" role="listbox" aria-label="Available offers">
                            {offerCoupons.map((c) => (
                              <button
                                type="button"
                                key={c.id || c.code}
                                className="cd-offer-row"
                                role="option"
                                onClick={() => { handleApplyCoupon(c.code); setOffersOpen(false); }}
                              >
                                <span className="cd-offer-code">{c.code}</span>
                                <span className="cd-offer-desc">
                                  {describeOffer(c)}
                                  {parseFloat(c.minPurchase) > 0 ? ` · Min ₹${parseFloat(c.minPurchase)}` : ''}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ── 3. Delivery Details (combined contact + address for guests) ── */}
              <div className="cd-sv-section" id="cd-section-address">
                <div className="cd-section-title">{isAuthenticated ? 'Delivery Address' : 'Delivery Details'}</div>

                {addressLoading ? <div className="cd-loading" style={{ display: 'grid', gap: 10 }}>{[0,1].map(i => <Skeleton key={i} height={72} style={{ borderRadius: 10 }} />)}</div> : (
                  <>
                    {isAuthenticated && addresses.length === 0 && !showAddressForm && (
                      <p className="cd-address-empty-hint">Add a delivery address below to place your order.</p>
                    )}
                    {!isAuthenticated && !selectedAddress && !showAddressForm && (
                      <p className="cd-address-empty-hint">Fill in your details below to place your order.</p>
                    )}
                    {isAuthenticated && addresses.length > 1 ? (
                      /* Multiple addresses - show dropdown */
                      <div className="cd-address-section">
                        <div className="cd-section-subtitle">Select your delivery address</div>
                        <div className="cd-address-dropdown-container" ref={dropdownRef}>
                          <div
                            className="cd-address-dropdown-trigger"
                            onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                          >
                            <span>Choose Address</span>
                            <span className={`cd-dropdown-arrow ${showAddressDropdown ? 'open' : ''}`}>
                              <IconChevronDown />
                            </span>
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
                                    // Task 16: check serviceability for saved address pincode
                                    const pin = String(addr.postal_code || addr.postalCode || '').replace(/\D/g, '');
                                    if (pin.length === 6) {
                                      try {
                                        const result = await checkPincodeServiceability(pin);
                                        setPincodeServiceability({
                                          serviceable: result?.serviceable !== false,
                                          cod_allowed: result?.cod_allowed !== false,
                                          city: result?.city || '',
                                          state: result?.state || '',
                                        });
                                      } catch { setPincodeServiceability(null); }
                                    } else {
                                      setPincodeServiceability(null);
                                    }
                                  }}
                                >
                                  <div className="cd-address-body">
                                    <p className="cd-address-name">{addr.full_name || addr.fullName} {(addr.isDefault || addr.is_default) && <span className="cd-default-tag">Default</span>}</p>
                                    <p className="cd-address-line">{addr.address}</p>
                                    {addr.landmark && <p className="cd-address-line cd-address-landmark">Landmark: {addr.landmark}</p>}
                                    <p className="cd-address-line">{addr.city}, {addr.state} {addr.postal_code}</p>
                                    <p className="cd-address-line">{addr.phone_number}</p>
                                  </div>
                                  <button className="cd-address-edit" onClick={e => { e.stopPropagation(); handleEditAddress(addr); setShowAddressDropdown(false); }} aria-label="Edit"><IconEdit /></button>
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
                                {selectedAddress.landmark && <p className="cd-address-line cd-address-landmark">Landmark: {selectedAddress.landmark}</p>}
                                <p className="cd-address-line">{selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code}</p>
                                <p className="cd-address-line">{selectedAddress.phone_number}</p>
                              </div>
                              <button className="cd-address-edit" onClick={e => { e.stopPropagation(); handleEditAddress(selectedAddress); }} aria-label="Edit"><IconEdit /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : isAuthenticated && addresses.length === 1 ? (
                      /* Single address - show as card */
                      <div className="cd-address-card cd-address-selected">
                        <div className="cd-address-radio"><div className="cd-radio-dot active" /></div>
                        <div className="cd-address-body">
                          <p className="cd-address-name">{addresses[0].full_name || addresses[0].fullName} {(addresses[0].isDefault || addresses[0].is_default) && <span className="cd-default-tag">Default</span>}</p>
                          <p className="cd-address-line">{addresses[0].address}</p>
                          {addresses[0].landmark && <p className="cd-address-line cd-address-landmark">Landmark: {addresses[0].landmark}</p>}
                          <p className="cd-address-line">{addresses[0].city}, {addresses[0].state} {addresses[0].postal_code}</p>
                          <p className="cd-address-line">{addresses[0].phone_number}</p>
                        </div>
                        <button className="cd-address-edit" onClick={e => { e.stopPropagation(); handleEditAddress(addresses[0]); }} aria-label="Edit"><IconEdit /></button>
                      </div>
                    ) : !isAuthenticated && selectedAddress && !showAddressForm ? (
                      /* Guest address */
                      <div className="cd-address-card cd-address-selected">
                        <div className="cd-address-radio"><div className="cd-radio-dot active" /></div>
                        <div className="cd-address-body">
                          <p className="cd-address-name">{selectedAddress.full_name}</p>
                          <p className="cd-address-line">{selectedAddress.address}</p>
                          {selectedAddress.landmark && <p className="cd-address-line cd-address-landmark">Landmark: {selectedAddress.landmark}</p>}
                          <p className="cd-address-line">{selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code}</p>
                          <p className="cd-address-line">{selectedAddress.phone_number}</p>
                        </div>
                        <button className="cd-address-edit" onClick={() => { setAddressForm({ fullName: selectedAddress.full_name, phoneNumber: selectedAddress.phone_number, address: selectedAddress.address, landmark: selectedAddress.landmark || '', city: selectedAddress.city, state: selectedAddress.state, postalCode: selectedAddress.postal_code, country: selectedAddress.country, isDefault: false }); setShowAddressForm(true); }} aria-label="Edit"><IconEdit /></button>
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
                          {/* Guest: contact fields merged into address form */}
                          {!isAuthenticated && (
                            <>
                              <div className="cd-form-group">
                                <label className="cd-label">First Name *</label>
                                <input className={`cd-input ${fieldErrors.name ? 'cd-input-error' : ''}`} type="text" value={guestInfo.firstName} onChange={e => setGuestInfo(p => ({ ...p, firstName: e.target.value }))} placeholder="First name" autoComplete="given-name" />
                                {fieldErrors.name && <p className="cd-field-error" role="alert">{fieldErrors.name}</p>}
                              </div>
                              <div className="cd-form-group">
                                <label className="cd-label">Last Name</label>
                                <input className="cd-input" type="text" value={guestInfo.lastName} onChange={e => setGuestInfo(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name" autoComplete="family-name" />
                              </div>
                              <div className="cd-form-group">
                                <label className="cd-label">Email *</label>
                                <input className={`cd-input ${fieldErrors.email ? 'cd-input-error' : ''}`} type="email" inputMode="email" value={guestInfo.email} onChange={e => setGuestInfo(p => ({ ...p, email: e.target.value }))} placeholder="name@example.com" autoComplete="email" aria-invalid={!!fieldErrors.email} />
                                {fieldErrors.email && <p className="cd-field-error" role="alert">{fieldErrors.email}</p>}
                              </div>
                              <div className="cd-form-group">
                                <label className="cd-label">Phone *</label>
                                <input className={`cd-input ${fieldErrors.phone ? 'cd-input-error' : ''}`} type="tel" inputMode="numeric" maxLength={10} value={guestInfo.phone} onChange={handleGuestPhoneChange} placeholder="10-digit mobile" autoComplete="tel" aria-invalid={!!fieldErrors.phone} />
                                {fieldErrors.phone && <p className="cd-field-error" role="alert">{fieldErrors.phone}</p>}
                              </div>
                            </>
                          )}
                          {/* Authenticated: name + phone in address form */}
                          {isAuthenticated && (
                            <>
                              <div className="cd-form-group">
                                <label className="cd-label">Full Name *</label>
                                <input className={`cd-input ${fieldErrors.name ? 'cd-input-error' : ''}`} name="fullName" value={addressForm.fullName} onChange={handleAddrChange} required placeholder="Full name" autoComplete="name" />
                                {fieldErrors.name && <p className="cd-field-error" role="alert">{fieldErrors.name}</p>}
                              </div>
                              <div className="cd-form-group">
                                <label className="cd-label">Phone *</label>
                                <input
                                  className={`cd-input ${fieldErrors.phone || addressPhoneError ? 'cd-input-error' : ''}`}
                                  name="phoneNumber"
                                  type="tel"
                                  inputMode="numeric"
                                  maxLength={10}
                                  value={addressForm.phoneNumber}
                                  onChange={handleAddrChange}
                                  required
                                  placeholder="10-digit mobile"
                                  autoComplete="tel-national"
                                  aria-invalid={!!(fieldErrors.phone || addressPhoneError)}
                                />
                                {(fieldErrors.phone || addressPhoneError) && <p className="cd-field-error" role="alert">{fieldErrors.phone || addressPhoneError}</p>}
                              </div>
                            </>
                          )}
                          <div className="cd-form-group cd-form-full">
                            <label className="cd-label">Address *</label>
                            <input className={`cd-input ${fieldErrors.address ? 'cd-input-error' : ''}`} name="address" value={addressForm.address} onChange={handleAddrChange} required placeholder="House/flat no., street, area" autoComplete="street-address" />
                            {fieldErrors.address && <p className="cd-field-error" role="alert">{fieldErrors.address}</p>}
                          </div>
                          <div className="cd-form-group cd-form-full">
                            <label className="cd-label">Landmark (optional, improves delivery)</label>
                            <input className="cd-input" name="landmark" value={addressForm.landmark} onChange={handleAddrChange} placeholder="Near hospital, opposite school, etc." maxLength={255} autoComplete="address-line2" />
                          </div>
                          <div className="cd-form-group">
                            <label className="cd-label">City *</label>
                            <input className={`cd-input ${fieldErrors.city ? 'cd-input-error' : ''}`} name="city" value={addressForm.city} onChange={handleAddrChange} required placeholder="City" autoComplete="address-level2" />
                            {fieldErrors.city && <p className="cd-field-error" role="alert">{fieldErrors.city}</p>}
                          </div>
                          <div className="cd-form-group">
                            <label className="cd-label">State *</label>
                            <input className={`cd-input ${fieldErrors.state ? 'cd-input-error' : ''}`} name="state" value={addressForm.state} onChange={handleAddrChange} required placeholder="State" autoComplete="address-level1" />
                            {fieldErrors.state && <p className="cd-field-error" role="alert">{fieldErrors.state}</p>}
                          </div>
                          <div className="cd-form-group">
                            <label className="cd-label">PIN Code *</label>
                            <input className={`cd-input ${fieldErrors.pincode ? 'cd-input-error' : ''}`} name="postalCode" value={addressForm.postalCode} onChange={handleAddrChange} onBlur={handlePincodeBlur} required placeholder="6-digit PIN" autoComplete="postal-code" />
                            {fieldErrors.pincode && <p className="cd-field-error" role="alert">{fieldErrors.pincode}</p>}
                            {isMounted && pincodeServiceability && pincodeServiceability.serviceable === false && (
                              <p className="cd-field-error" role="alert" style={{ color: '#dc2626' }}>
                                Sorry, we don’t deliver to this PIN code yet.
                              </p>
                            )}
                          </div>
                          <div className="cd-form-group">
                            <label className="cd-label">Country</label>
                            <input className="cd-input" name="country" value={addressForm.country} onChange={handleAddrChange} placeholder="Country" autoComplete="country-name" />
                          </div>
                          {isAuthenticated && (
                            <div className="cd-form-group cd-form-full"><label className="cd-checkbox-label"><input type="checkbox" name="isDefault" checked={addressForm.isDefault} onChange={handleAddrChange} /> Set as default address</label></div>
                          )}
                        </div>
                        {addrWarnings.length > 0 && (
                          <div className="cd-addr-warnings" role="note" style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '2px 0 8px', padding: '9px 11px', background: '#fdf6e3', border: '1px solid #e6cf9a', borderRadius: 8 }}>
                            {addrWarnings.map((w, i) => (
                              <p key={i} style={{ margin: 0, fontSize: 12.5, color: '#8a5a12', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                <span aria-hidden="true">💡</span>{w}
                              </p>
                            ))}
                          </div>
                        )}
                        <div className="cd-form-actions">
                          <p className="cd-autosave-hint" aria-live="polite" style={{ flex: 1, margin: 0, fontSize: 12.5, color: addressSaving ? '#180D3E' : '#777', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {addressSaving ? (
                              <><span className="cd-autosave-dot" aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: '#2e7d32', display: 'inline-block' }} /> Saving your address…</>
                            ) : (
                              <>Your address saves automatically once all details are filled.</>
                            )}
                          </p>
                          <button type="button" className="cd-btn-ghost" onClick={() => { setShowAddressForm(false); setEditingAddressId(null); setFieldErrors({}); }}>Cancel</button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>

              {/* ── 5. Payment method ── */}
              {sortedShippingFees.length > 0 && (
                <div className="cd-sv-section" id="cd-section-delivery">
                  <div className="cd-section-title">How would you like to pay?</div>
                  <div className="cd-delivery-list">
                    {sortedShippingFees.map(fee => {
                      const isCodBlocked = isMounted && fee.orderType === 'cod' && pincodeServiceability && pincodeServiceability.cod_allowed === false;
                      return (
                        <label
                          key={fee.id}
                          className={`cd-delivery-card ${fee.orderType === 'prepaid' ? 'cd-delivery-prepaid' : 'cd-delivery-cod'} ${selectedFee?.id === fee.id ? 'cd-delivery-selected' : ''} ${isCodBlocked ? 'cd-delivery-disabled' : ''}`}
                          style={isCodBlocked ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                        >
                          <input type="radio" name="delivery" className="cd-radio-hidden" checked={selectedFee?.id === fee.id} onChange={() => !isCodBlocked && handleSelectFee(fee)} disabled={isCodBlocked} />
                          <span className="cd-delivery-icon">
                            {fee.orderType === 'cod' ? <IconMoneyBag /> : <IconTruck />}
                          </span>
                          <div className="cd-delivery-info">
                            <p className="cd-delivery-name">
                              {fee.orderType === 'cod' ? 'Cash on Delivery' : 'UPI / Card (Prepaid)'}
                            </p>
                            {fee.orderType === 'cod' && !isCodBlocked && (
                              <span className="cd-delivery-popular">⭐ Most Popular</span>
                            )}
                            {fee.orderType === 'prepaid' && (
                              <p className="cd-delivery-subdesc">Pay securely via UPI, Credit or Debit Card</p>
                            )}
                            {fee.orderType === 'cod' && !isCodBlocked && (
                              <p className="cd-delivery-subdesc">Pay when you receive your order</p>
                            )}
                            {isCodBlocked && (
                              <p className="cd-delivery-subdesc" style={{ color: '#dc2626' }}>COD not available for this location</p>
                            )}
                            <p className="cd-delivery-desc">
                              {fee.orderType === 'prepaid'
                                ? `₹${Math.round(Math.min(PREPAID_INSTANT_DISCOUNT_INR, finalTotal))} less · Delivery by ${getDeliveryDateStr()}`
                                : `Delivery by ${getDeliveryDateStr()}`}
                            </p>
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

          {/* Scroll hint — inside body so it never overlaps the footer */}
          {showScrollHint && !orderSuccess && activeItems.length > 0 && (
            <div className="cd-scroll-hint" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          )}
        </div>

        {/* ── Fixed bottom area: urgency → CTA → WhatsApp → trust ── */}
        {!orderSuccess && activeItems.length > 0 && (
          <div className="cd-footer">
            {/* Urgency row */}
            {(() => {
              const mm = String(Math.floor(urgencySeconds / 60)).padStart(2, '0');
              const ss = String(urgencySeconds % 60).padStart(2, '0');
              return (
                <div className="cd-urgency-bar">
                  <span className="cd-urgency-item" style={{ color: '#CE1E36' }}>
                    <IconFlame /> <strong>Only 7</strong>&nbsp;left in stock
                  </span>
                  <span style={{ color: '#ccc' }}>|</span>
                  <span className="cd-urgency-item" style={{ color: '#555' }}>
                    <IconClock /> Offer ends in <span className="cd-urgency-timer">{mm}:{ss}</span>
                  </span>
                </div>
              );
            })()}

            {/* Not-serviceable notice — blocks the order for this PIN code */}
            {isMounted && pincodeServiceability && pincodeServiceability.serviceable === false && (
              <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
                We don’t deliver to this PIN code yet — please try a different delivery address.
              </div>
            )}

            {/* CTA button */}
            <button
              className="cd-btn-primary cd-btn-full"
              onClick={handlePlaceOrder}
              disabled={isProcessing || (isMounted && pincodeServiceability && pincodeServiceability.serviceable === false)}
            >
              {isProcessing
                ? 'Processing...'
                : isPrepaidDelivery
                  ? `Place Order – ₹${prepaidPayable.toFixed(2)}`
                  : isCodDelivery
                    ? `Place Order – ₹${finalTotal.toFixed(2)}`
                    : 'Place Order'}
            </button>

            {/* WhatsApp */}
            <a
              href="https://wa.me/917434834000?text=Hi%2C+I+need+help+with+my+order"
              target="_blank"
              rel="noopener noreferrer"
              className="cd-whatsapp-help"
            >
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
};

export default CartDrawer;
