import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import SafeImage from '../common/SafeImage';
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
} from '../../services/publicApi';
import {
  showOrderPlacedSuccessToast,
  showOrderPlacedErrorToast,
  showValidationErrorToast,
} from '../../utils/toast';
import { fbqTrack } from '../../utils/fbqTrack';

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

// FIX 3 — full address field validation
function isValidAddress(addr) {
  if (!addr) return false;
  const address = addr.address || '';
  const city = addr.city || '';
  const postalCode = addr.postal_code || addr.postalCode || '';
  return address.trim().length > 0 && city.trim().length > 0 && postalCode.trim().length > 0;
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
  fullName: '', phoneNumber: '', address: '',
  city: '', state: '', postalCode: '', country: 'India', isDefault: false,
};

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

  // COD: OTP
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const otpPollTimerRef = useRef(null); // FIX 4 — cancel poll on modal close
  const otpCode = otpDigits.join('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpHint, setOtpHint] = useState('');
  const [phoneVerifiedForCod, setPhoneVerifiedForCod] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0); // FIX 5/10 — 30s resend timer

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

  // ── Body class for back-to-top hiding ──────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('cd-drawer-open-body');
    } else {
      document.body.classList.remove('cd-drawer-open-body');
    }
    return () => document.body.classList.remove('cd-drawer-open-body');
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

  useEffect(() => {
    setPhoneVerifiedForCod(false);
    setOtpDigits(['', '', '', '']);
    setOtpHint('');
  }, [selectedFee?.id, selectedAddress?.id, guestInfo.phone]);

  // FIX 4/7 — cancel poll timer on close; validate phone before auto-sending OTP
  useEffect(() => {
    if (!showOtpModal) {
      if (otpPollTimerRef.current) {
        clearTimeout(otpPollTimerRef.current);
        otpPollTimerRef.current = null;
      }
      return;
    }
    const phone = getDeliveryPhone();
    if (!isValidIndianMobileDigits(phone)) {
      setShowOtpModal(false);
      showValidationErrorToast(
        isAuthenticated
          ? 'Please add a valid 10-digit mobile number on your delivery address.'
          : 'Please check your phone number in contact info.'
      );
      return;
    }
    handleSendCheckoutOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOtpModal]);

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
    if (isAuthenticated) {
      if (addressPhoneError || !isValidIndianMobileDigits(formData.phoneNumber)) {
        showValidationErrorToast('Please enter a valid 10-digit Indian mobile number for this address.');
        return;
      }
    } else if (!isValidIndianMobileDigits(guestInfo.phone)) {
      showValidationErrorToast('Please enter a valid mobile number in Contact Info first.');
      scrollDrawerTo('cd-section-contact');
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

  // ── Coupon ──────────────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
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
      sessionStorage.setItem(trackingKey, 'true');
    } catch (_) { }
  };

  const placeCodOrder = async () => {
    setIsProcessing(true);
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

  // FIX 4/5/10 — OTP poll timer stored in ref; cancelled on modal close; 30s resend countdown
  const handleSendCheckoutOtp = () => {
    const phone = getDeliveryPhone();
    if (phone.length < 10) {
      showValidationErrorToast('Enter a valid 10-digit mobile number.');
      return;
    }
    if (OTP_VERIFY_SKIP) {
      if (process.env.NODE_ENV !== 'production') {
        setOtpHint('Dev mode: OTP skipped. Enter any 4+ digit code.');
      }
      return;
    }

    setOtpSending(true);
    setOtpHint('');

    const identifier = phone.length === 10 ? '91' + phone : phone;

    let attempts = 0;
    const trySend = () => {
      if (typeof window.sendOtp === 'function') {
        window.sendOtp(
          identifier,
          () => {
            setOtpHint('OTP sent. Enter the code below.');
            setOtpSending(false);
            // Start 30s resend countdown
            setResendCountdown(30);
            const interval = setInterval(() => {
              setResendCountdown(prev => {
                if (prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
              });
            }, 1000);
          },
          (error) => {
            const msg = typeof error === 'string' ? error : (error?.message || 'Could not send OTP.');
            showOrderPlacedErrorToast(msg);
            setOtpSending(false);
          }
        );
      } else if (attempts < 10) {
        attempts++;
        otpPollTimerRef.current = setTimeout(trySend, 500);
      } else {
        showOrderPlacedErrorToast('OTP service not ready. Please refresh and try again.');
        setOtpSending(false);
      }
    };
    trySend();
  };

  const handleVerifyOtpAndContinue = async () => {
    if (otpCode.length < 4) {
      showValidationErrorToast('Enter the OTP you received.');
      return;
    }
    // Dev mode: skip verification entirely
    if (OTP_VERIFY_SKIP) {
      setPhoneVerifiedForCod(true);
      setShowOtpModal(false);
      setOtpDigits(['', '', '', '']);
      setOtpHint('');
      await placeCodOrder();
      return;
    }
    if (typeof window === 'undefined' || typeof window.verifyOtp !== 'function') {
      showOrderPlacedErrorToast('OTP service not ready. Please refresh and try again.');
      return;
    }
    setIsProcessing(true);
    window.verifyOtp(
      otpCode,
      async (data) => {
        // MSG91 widget verified — data is the access token
        const accessToken = typeof data === 'string' ? data : (data?.message || data?.token || JSON.stringify(data));
        const phone = getDeliveryPhone();
        try {
          // Verify access token on backend for server-side validation
          await verifyCheckoutPhoneOtp(phone, accessToken);
          setPhoneVerifiedForCod(true);
          setShowOtpModal(false);
          setOtpDigits(['', '', '', '']);
          setOtpHint('');
          await placeCodOrder();
        } catch (err) {
          const msg = typeof err === 'string' ? err : (err?.message || 'Server verification failed.');
          showOrderPlacedErrorToast(msg);
          setIsProcessing(false);
        }
      },
      (error) => {
        const msg = typeof error === 'string' ? error : (error?.message || 'Verification failed.');
        showOrderPlacedErrorToast(msg);
        setIsProcessing(false);
      }
    );
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress || !isValidAddress(selectedAddress)) {
      showValidationErrorToast('Please add a complete delivery address (address, city, PIN code).');
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
        scrollDrawerTo('cd-section-contact');
        return;
      }
      if (guestEmailError || guestPhoneError || !isValidEmail(guestInfo.email) || !isValidIndianMobileDigits(guestInfo.phone)) {
        showValidationErrorToast('Please fix the errors in Contact Info (email and phone).');
        scrollDrawerTo('cd-section-contact');
        return;
      }
    }
    const phone = getDeliveryPhone();
    if (!isValidIndianMobileDigits(phone)) {
      showValidationErrorToast(
        isAuthenticated
          ? 'Please add a valid 10-digit mobile number on your delivery address.'
          : 'Please check your phone number in contact info.'
      );
      scrollDrawerTo(isAuthenticated ? 'cd-section-address' : 'cd-section-contact');
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
      if (!phoneVerifiedForCod) {
        setShowOtpModal(true);
        setOtpHint('');
        return;
      }
      await placeCodOrder();
      return;
    }

    showValidationErrorToast('Please select a delivery method.');
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
                  {isProcessing ? 'Loading...' : `Retry Payment (${3 - paymentFailed.retryCount} left)`}
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

              {/* ── 2. Order Summary ── */}
              <div className="cd-sv-section">
                <div className="cd-summary">
                  <div className="cd-summary-row"><span>Subtotal ({totalQty} item{totalQty !== 1 ? 's' : ''})</span><span>₹{activeTotal.toFixed(2)}</span></div>
                  <div className="cd-summary-row"><span>Shipping</span><span>{shippingFeeAmount === 0 ? 'Free' : `₹${shippingFeeAmount.toFixed(2)}`}</span></div>
                  {couponDiscount > 0 && (
                    <div className="cd-summary-row cd-summary-discount">
                      <span className="cd-coupon-row-label">
                        Coupon ({appliedCoupon.code})
                        <button onClick={handleRemoveCoupon} className="cd-coupon-inline-remove">✕ Remove</button>
                      </span>
                      <span>-₹{couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {isPrepaidDelivery && prepaidInstantDiscount > 0 && (
                    <div className="cd-summary-row cd-summary-discount">
                      <span className="cd-coupon-row-label">
                        Prepaid discount
                        <span className="cd-saved-badge">₹{Math.round(prepaidInstantDiscount)} saved!</span>
                      </span>
                      <span>-₹{prepaidInstantDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {isPrepaidDelivery && (
                    <div className="cd-summary-row cd-summary-total">
                      <span>Pay now</span>
                      <span>₹{prepaidPayable.toFixed(2)}</span>
                    </div>
                  )}
                  {isCodDelivery && (
                    <div className="cd-summary-row cd-summary-total">
                      <span>Total (pay on delivery)</span>
                      <span>₹{finalTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {!isPrepaidDelivery && !isCodDelivery && (
                    <div className="cd-summary-row cd-summary-total"><span>Total</span><span>₹{finalTotal.toFixed(2)}</span></div>
                  )}
                </div>
                {/* Secure checkout line */}
                <div className="cd-secure-line">
                  <span className="cd-secure-item">
                    <IconShield /> Secure checkout
                  </span>
                  <span className="cd-secure-sep" />
                  <span className="cd-secure-item cd-secure-plain">
                    Easy returns
                  </span>
                </div>
              </div>

              {/* ── 3. Contact (guest only) ── */}
              {!isAuthenticated && (
                <div className="cd-sv-section" id="cd-section-contact">
                  <div className="cd-section-title">Contact Info</div>
                  <div className="cd-form-grid">
                    <div className="cd-form-group">
                      <label className="cd-label">First Name *</label>
                      <input className="cd-input" type="text" value={guestInfo.firstName} onChange={e => setGuestInfo(p => ({ ...p, firstName: e.target.value }))} placeholder="First name" autoComplete="given-name" />
                    </div>
                    <div className="cd-form-group">
                      <label className="cd-label">Last Name</label>
                      <input className="cd-input" type="text" value={guestInfo.lastName} onChange={e => setGuestInfo(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name" autoComplete="family-name" />
                    </div>
                    <div className="cd-form-group cd-form-full">
                      <label className="cd-label">Email *</label>
                      <input
                        className={`cd-input ${guestEmailError ? 'cd-input-error' : ''}`}
                        type="email"
                        inputMode="email"
                        value={guestInfo.email}
                        onChange={e => setGuestInfo(p => ({ ...p, email: e.target.value }))}
                        placeholder="name@example.com"
                        autoComplete="email"
                        aria-invalid={!!guestEmailError}
                      />
                      {guestEmailError && <p className="cd-field-error" role="alert">{guestEmailError}</p>}
                    </div>
                    <div className="cd-form-group cd-form-full">
                      <label className="cd-label">Phone *</label>
                      <input
                        className={`cd-input ${guestPhoneError ? 'cd-input-error' : ''}`}
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={guestInfo.phone}
                        onChange={handleGuestPhoneChange}
                        placeholder="10-digit mobile (starts with 6–9)"
                        autoComplete="tel"
                        aria-invalid={!!guestPhoneError}
                      />
                      {guestPhoneError && <p className="cd-field-error" role="alert">{guestPhoneError}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* ── 4. Delivery Address ── */}
              <div className="cd-sv-section" id="cd-section-address">
                <div className="cd-section-title">Delivery Address</div>

                {/* Delivery info strip */}
                <div className="cd-delivery-info-strip">
                  <div className="cd-dinfo-row">
                    <IconShield />
                    <span>Delivery by 6 April&nbsp;·&nbsp;Ships from India</span>
                  </div>
                  <div className="cd-dinfo-row">
                    <span className="cd-dinfo-stars">
                      <IconStarFilled /><IconStarFilled /><IconStarFilled /><IconStarFilled /><IconStarFilled />
                    </span>
                    <span>
                      <strong>{reviewStats.avg}</strong> rating from&nbsp;
                      <strong>{reviewStats.total > 0 ? `${reviewStats.total.toLocaleString('en-IN')}+` : '1,200+'}</strong> reviews
                    </span>
                  </div>
                </div>
                <div className="cd-orders-delivered">
                  <IconShield />
                  <span>Over <strong>10,000+</strong> Orders Delivered</span>
                  <span className="cd-orders-arrow">›</span>
                </div>
                {addressLoading ? <p className="cd-loading">Loading addresses...</p> : (
                  <>
                    {isAuthenticated && addresses.length === 0 && !showAddressForm && (
                      <p className="cd-address-empty-hint">Add a delivery address below to place your order.</p>
                    )}
                    {!isAuthenticated && !selectedAddress && !showAddressForm && (
                      <p className="cd-address-empty-hint">Add your delivery address below (use the same phone as in Contact Info).</p>
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
                          <p className="cd-address-line">{selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code}</p>
                          <p className="cd-address-line">{selectedAddress.phone_number}</p>
                        </div>
                        <button className="cd-address-edit" onClick={() => { setAddressForm({ fullName: selectedAddress.full_name, phoneNumber: selectedAddress.phone_number, address: selectedAddress.address, city: selectedAddress.city, state: selectedAddress.state, postalCode: selectedAddress.postal_code, country: selectedAddress.country, isDefault: false }); setShowAddressForm(true); }} aria-label="Edit"><IconEdit /></button>
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
                          {isAuthenticated && (
                            <>
                              <div className="cd-form-group"><label className="cd-label">Full Name *</label><input className="cd-input" name="fullName" value={addressForm.fullName} onChange={handleAddrChange} required placeholder="Full name" autoComplete="name" /></div>
                              <div className="cd-form-group">
                                <label className="cd-label">Phone *</label>
                                <input
                                  className={`cd-input ${addressPhoneError ? 'cd-input-error' : ''}`}
                                  name="phoneNumber"
                                  type="tel"
                                  inputMode="numeric"
                                  maxLength={10}
                                  value={addressForm.phoneNumber}
                                  onChange={handleAddrChange}
                                  required
                                  placeholder="10-digit mobile"
                                  autoComplete="tel-national"
                                  aria-invalid={!!addressPhoneError}
                                />
                                {addressPhoneError && <p className="cd-field-error" role="alert">{addressPhoneError}</p>}
                              </div>
                            </>
                          )}
                          <div className="cd-form-group cd-form-full"><label className="cd-label">Address *</label><input className="cd-input" name="address" value={addressForm.address} onChange={handleAddrChange} required placeholder="Street address, flat, area" autoComplete="street-address" /></div>
                          <div className="cd-form-group"><label className="cd-label">City *</label><input className="cd-input" name="city" value={addressForm.city} onChange={handleAddrChange} required placeholder="City" autoComplete="address-level2" /></div>
                          <div className="cd-form-group"><label className="cd-label">State *</label><input className="cd-input" name="state" value={addressForm.state} onChange={handleAddrChange} required placeholder="State" autoComplete="address-level1" /></div>
                          <div className="cd-form-group"><label className="cd-label">Postal Code *</label><input className="cd-input" name="postalCode" value={addressForm.postalCode} onChange={handleAddrChange} onBlur={handlePincodeBlur} required placeholder="PIN code" autoComplete="postal-code" /></div>
                          <div className="cd-form-group"><label className="cd-label">Country</label><input className="cd-input" name="country" value={addressForm.country} onChange={handleAddrChange} placeholder="Country" autoComplete="country-name" /></div>
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
                          <input type="radio" name="delivery" checked={selectedFee?.id === fee.id} onChange={() => !isCodBlocked && handleSelectFee(fee)} disabled={isCodBlocked} />
                          <span className="cd-delivery-icon">
                            {fee.orderType === 'cod' ? <IconMoneyBag /> : <IconTruck />}
                          </span>
                          <div className="cd-delivery-info">
                            <p className="cd-delivery-name">
                              {fee.orderType === 'cod'
                                ? <span>Cash on Delivery <span className="cd-delivery-popular">Most Popular ⭐</span></span>
                                : fee.orderType === 'prepaid'
                                  ? 'UPI / Card (Prepaid)'
                                  : fee.orderType}
                            </p>
                            <p className="cd-delivery-desc">
                              {isCodBlocked
                                ? 'COD not available for this location. Please pay online.'
                                : fee.orderType === 'cod'
                                  ? 'Pay after delivery · Delivery by 5–7 Apr'
                                  : '₹50 OFF applied | Limited Offer'}
                            </p>
                          </div>
                          <span className={`cd-delivery-fee ${parseFloat(fee.fee || 0) === 0 ? 'free' : ''}`}>
                            {parseFloat(fee.fee || 0) === 0 ? 'Free' : `₹${parseFloat(fee.fee || 0).toFixed(2)}`}
                          </span>
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

            {/* CTA button */}
            <button
              className="cd-btn-primary cd-btn-full"
              onClick={handlePlaceOrder}
              disabled={isProcessing}
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
      {showOtpModal && (
        <div className="cd-modal-overlay" role="presentation" onClick={() => !isProcessing && setShowOtpModal(false)}>
          <div
            className="cd-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cd-otp-modal-title"
            onClick={e => e.stopPropagation()}
            style={{ textAlign: 'center' }}
          >
            <h3 id="cd-otp-modal-title" className="cd-modal-title">Verify your number</h3>
            {/* FIX 15 — explain why we verify */}
            <p className="cd-modal-subtext" style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>
              We verify to prevent fake COD orders.
            </p>
            <p className="cd-modal-text" style={{ color: '#666' }}>
              Code sent to <strong>+91 {getDeliveryPhone() || 'your number'}</strong>
            </p>
            {otpHint && <p className="cd-modal-hint">{otpHint}</p>}

            {/* 4-box OTP input */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '20px 0' }}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={otpRefs[i]}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  value={digit}
                  autoFocus={i === 0}
                  style={{
                    width: 52, height: 56,
                    textAlign: 'center',
                    fontSize: 22, fontWeight: 700,
                    border: '1.5px solid ' + (digit ? '#180D3E' : '#ddd'),
                    borderRadius: 10,
                    outline: 'none',
                    fontFamily: 'DM Sans, sans-serif',
                    color: '#180D3E',
                    background: '#fff',
                    transition: 'border-color 0.15s',
                    caretColor: 'transparent',
                  }}
                  onChange={e => {
                    // Handle browser autofill / SMS autofill pasting full code into first box
                    const raw = e.target.value.replace(/\D/g, '');
                    if (raw.length > 1) {
                      const next = ['', '', '', ''];
                      raw.slice(0, 4).split('').forEach((ch, idx) => { next[idx] = ch; });
                      setOtpDigits(next);
                      const focusIdx = Math.min(raw.length, 3);
                      otpRefs[focusIdx].current?.focus();
                      if (next.every(d => d)) setTimeout(() => document.getElementById('cd-otp-verify-btn')?.click(), 50);
                      return;
                    }
                    const val = raw.slice(-1);
                    const next = [...otpDigits];
                    next[i] = val;
                    setOtpDigits(next);
                    if (val && i < 3) otpRefs[i + 1].current?.focus();
                    if (next.every(d => d) && next.join('').length === 4) {
                      setTimeout(() => document.getElementById('cd-otp-verify-btn')?.click(), 50);
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) {
                      otpRefs[i - 1].current?.focus();
                    }
                  }}
                  onPaste={e => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
                    const next = ['', '', '', ''];
                    pasted.split('').forEach((ch, idx) => { next[idx] = ch; });
                    setOtpDigits(next);
                    const focusIdx = Math.min(pasted.length, 3);
                    otpRefs[focusIdx].current?.focus();
                  }}
                />
              ))}
            </div>

            <button
              id="cd-otp-verify-btn"
              type="button"
              className="cd-btn-primary cd-btn-full"
              onClick={handleVerifyOtpAndContinue}
              disabled={isProcessing || otpCode.length < 4}
              style={{ borderRadius: 10, height: 48, fontSize: 15 }}
            >
              {isProcessing ? 'Verifying…' : 'Confirm order'}
            </button>

            <p className="cd-modal-muted" style={{ marginTop: 14 }}>
              Didn&apos;t receive code?{' '}
              {resendCountdown > 0 ? (
                <span style={{ color: '#999', fontSize: 13 }}>Resend in {resendCountdown}s</span>
              ) : (
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#CE1E36', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 13, textDecoration: 'underline' }}
                  onClick={() => { setOtpDigits(['', '', '', '']); setResendCountdown(0); handleSendCheckoutOtp(); otpRefs[0].current?.focus(); }}
                  disabled={otpSending || isProcessing}
                >
                  {otpSending ? 'Sending…' : 'Request again'}
                </button>
              )}
            </p>

            {OTP_VERIFY_SKIP && process.env.NODE_ENV !== 'production' && (
              <p className="cd-modal-muted" style={{ marginTop: 6, fontSize: 11 }}>
                Dev mode: enter any 4 digits to skip real verification.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CartDrawer;
