'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, MapPin,
  CheckCircle2, Wallet, CreditCard, Tag, Loader2, Edit3,
  Sparkles, ChevronDown,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/context/AuthContext';
import {
  getAddresses, createAddress, updateAddress,
} from '@/lib/api/addresses';
import { getBestsellers } from '@/lib/api/products';
import {
  getShippingFees, checkPincodeServiceability, validateCoupon, getPublicCoupons,
  createOrder, createGuestOrder,
  initiateCheckout, initiateGuestCheckout,
  verifyPayment, captureAbandonedCart,
} from '@/lib/api/orders';
import {
  toastOrderPlaced, toastOrderError,
  toastPaymentSuccess, toastPaymentError,
  toastCouponApplied, toastCouponError,
  toastAddressAdded, toastAddressUpdated, toastAddressError,
} from '@/lib/toast';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { fbTrack, fbPurchase, viewCart, addShippingInfo, addPaymentInfo } from '@/utils/pixel';

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

// Cross-sell bestsellers barely change between cart opens; cache the first
// fetch for ~5 min so re-opening the drawer doesn't re-hit the API every time.
// A failed fetch isn't cached, so it retries on the next open.
let _xsCache = { at: 0, p: null };
function _xsFetch() {
  if (_xsCache.p && Date.now() - _xsCache.at < 300000) return _xsCache.p;
  const p = getBestsellers(8);
  _xsCache = { at: Date.now(), p };
  Promise.resolve(p).catch(() => { if (_xsCache.p === p) _xsCache = { at: 0, p: null }; });
  return p;
}

export default function CartDrawer() {
  const router = useRouter();
  const {
    cart: items, cartOpen, setCartOpen, cartTotal, cartCount,
    removeFromCart, updateQuantity, clearCart, addToCart,
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
  // Free-shipping threshold (₹) from the backend; 0 = disabled.
  const [freeShipThreshold, setFreeShipThreshold] = useState(0);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState({ type: '', text: '' });
  // Public "available offers" the customer can tap to auto-apply.
  const [availableCoupons, setAvailableCoupons] = useState([]);
  // Collapsed "Available offers" dropdown — closed by default so the drawer
  // stays compact; the menu overlays the content below when opened.
  const [offersOpen, setOffersOpen] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  // Address validation popup: { errors:[], warnings:[] } while shown, else null.
  const [addrIssues, setAddrIssues] = useState(null);
  // Cross-sell "You may also like" — fetched from the bestsellers service when
  // the drawer opens; excludes items already in the bag.
  const [suggestions, setSuggestions] = useState([]);
  // Two-step checkout: 1 = review bag, 2 = delivery + payment.
  const [coStep, setCoStep] = useState(1);

  // Whole-cart shimmer: the drawer's async loads (coupons, cross-sell, shipping
  // fees) each resolve separately and used to pop in one by one. We reset these
  // on open (for a bag with items) and show one skeleton until all have
  // settled, then render the real bag-review content at once.
  const [ldCoupons, setLdCoupons] = useState(true);
  const [ldSuggest, setLdSuggest] = useState(true);
  const [ldFees, setLdFees] = useState(true);
  const cartReady = ldCoupons && ldSuggest && ldFees;

  const dropdownRef = useRef(null);
  const bodyRef = useRef(null);
  const offersRef = useRef(null);
  const lastAutoSaveSig = useRef('');
  // Last phone we captured an abandoned cart for — guards the capture effect so
  // it fires at most once per distinct 10-digit phone.
  const capturedPhoneRef = useRef('');
  // Abandoned-cart recovery deep link: the coupon remembered from `?coupon=`
  // and a one-shot guard so it is auto-applied at most once per mount.
  const recoverCouponRef = useRef(null);
  const recoverAppliedRef = useRef(false);

  // ── Reset on close ─────────────────────────────────────────────────────
  useEffect(() => {
    if (cartOpen) return;
    const t = setTimeout(() => {
      setOrderSuccess(null);
      setErrorMsg('');
      setCouponMsg({ type: '', text: '' });
      setAppliedCoupon(null);
      setCouponCode('');
      setAvailableCoupons([]);
      setOffersOpen(false);
    }, 300);
    return () => clearTimeout(t);
  }, [cartOpen]);

  // Close the address-issues popup on Escape (capture phase so it wins over the
  // drawer's own focus-trap Escape-to-close).
  useEffect(() => {
    if (!addrIssues) return;
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setAddrIssues(null); } };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [addrIssues]);

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

  // ── Close "Available offers" dropdown on outside click / Escape ─────────
  useEffect(() => {
    if (!offersOpen) return;
    const onDown = (e) => { if (offersRef.current && !offersRef.current.contains(e.target)) setOffersOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOffersOpen(false); } };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [offersOpen]);

  // ── Load brand's public "available offers" once per open (with items) ───
  useEffect(() => {
    if (!cartOpen || items.length === 0) return;
    let alive = true;
    getPublicCoupons()
      .then(list => { if (alive) { setAvailableCoupons(Array.isArray(list) ? list : []); setLdCoupons(true); } })
      .catch(() => { if (alive) setLdCoupons(true); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartOpen]);

  // ── Load cross-sell suggestions (bestsellers) once per open with items ──
  useEffect(() => {
    if (!cartOpen || items.length === 0) return;
    let alive = true;
    _xsFetch()
      .then(list => { if (alive) { setSuggestions(Array.isArray(list) ? list : []); setLdSuggest(true); } })
      .catch(() => { if (alive) { setSuggestions([]); setLdSuggest(true); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartOpen]);

  // Suggestions not already in the bag (match on product id), capped at 4.
  const crossSell = useMemo(() => {
    const inBag = new Set(items.map(i => String(i.productId ?? i.id)));
    const seen = new Set();
    const out = [];
    for (const p of suggestions) {
      const id = String(p.id);
      if (inBag.has(id) || seen.has(id)) continue;
      seen.add(id);
      out.push(p);
      if (out.length >= 4) break;
    }
    return out;
  }, [suggestions, items]);

  const addSuggestion = (p) => {
    const v = p.variations?.find(x => x.id === p.defaultVariationId) || p.variations?.[0];
    addToCart({
      id: `${p.id}:${v?.id || 'default'}`,
      productId: p.id,
      variationId: v?.id || p.defaultVariationId || null,
      name: p.name,
      price: p.price,
      image: p.images?.[0],
      slug: p.slug,
      size: v?.size || '',
      color: v?.colors?.[0] || '',
    });
  };

  // ── Load shipping fees ─────────────────────────────────────────────────
  useEffect(() => {
    if (!cartOpen) return;
    getShippingFees()
      .then(raw => {
        const fees = (raw && raw.length) ? raw : FALLBACK_FEES;
        setShippingFees(fees);
        setFreeShipThreshold(Number(raw?.freeShippingThreshold) || 0);
        const def = fees.find(f => f.orderType === 'prepaid') || fees.find(f => f.isDefault) || fees[0];
        setSelectedFee(def || null);
        setLdFees(true);
      })
      .catch(() => {
        setShippingFees(FALLBACK_FEES);
        setSelectedFee(FALLBACK_FEES[0]);
        setLdFees(true);
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

  // On open: reset to the bag-review step and fire view_cart. InitiateCheckout
  // now fires when the shopper taps "Proceed to checkout" (goToCheckout), not on
  // open. Cart line ids are composite, so content_ids use the real product id.
  useEffect(() => {
    if (!cartOpen) return;
    setCoStep(1);
    if (items.length === 0) return;
    // Re-arm the whole-cart shimmer for this open (bag has items to load for).
    setLdCoupons(false); setLdSuggest(false); setLdFees(false);
    viewCart({
      contents: items.map(i => ({ id: String(i.productId ?? i.id), quantity: i.quantity || 1 })),
      value: items.reduce((s, i) => s + Number(i.price || 0) * (i.quantity || 1), 0),
      currency: 'INR',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartOpen]);

  // Advance to the checkout step. Fires InitiateCheckout (Meta) — tied to
  // checkout intent, not drawer open — then shows the delivery + payment step.
  const goToCheckout = () => {
    if (!items.length) return;
    fbTrack('InitiateCheckout', {
      content_ids: items.map(i => String(i.productId ?? i.id)),
      content_type: 'product',
      contents: items.map(i => ({ id: String(i.productId ?? i.id), quantity: i.quantity || 1 })),
      num_items: items.reduce((s, i) => s + (i.quantity || 1), 0),
      value: items.reduce((s, i) => s + Number(i.price || 0) * (i.quantity || 1), 0),
      currency: 'INR',
    });
    setCoStep(2);
    requestAnimationFrame(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0; });
  };

  /* Abandoned-cart capture: once the shopper reaches the checkout step with a
     valid 10-digit phone + items in the bag, record it so the backend can send
     a WhatsApp recovery if they don't complete (guest or logged-in, COD or
     prepaid). Fires once per distinct phone; best-effort, never blocks checkout. */
  useEffect(() => {
    if (coStep !== 2 || items.length === 0) return;
    const rawPhone = isAuthenticated
      ? (selectedAddress?.phone_number || selectedAddress?.phoneNumber || addrForm.phoneNumber || '')
      : (guestInfo.phone || '');
    const digits = String(rawPhone).replace(/\D/g, '');
    if (digits.length !== 10 || capturedPhoneRef.current === digits) return;
    capturedPhoneRef.current = digits;
    const first = items[0];
    const summary = `${first?.name || 'your items'}${items.length > 1 ? ` (+${items.length - 1} more)` : ''}`;
    const name = isAuthenticated
      ? (selectedAddress?.full_name || selectedAddress?.fullName || user?.username || user?.name || '')
      : (guestInfo.fullName || '');
    captureAbandonedCart({
      phone: digits,
      name,
      cartSummary: summary.slice(0, 250),
      itemCount: cartCount,
      cartValue: cartTotal,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coStep, items, guestInfo.phone, guestInfo.fullName, selectedAddress, addrForm.phoneNumber, isAuthenticated]);

  // ── Computed totals ────────────────────────────────────────────────────
  const subtotal       = cartTotal;
  const rawShippingFee = parseFloat(selectedFee?.fee || 0);
  const couponOff      = appliedCoupon ? parseFloat(appliedCoupon.discountAmount) : 0;
  const isCod          = selectedFee?.orderType === 'cod';
  const isPrepaid      = selectedFee?.orderType === 'prepaid';
  // Free shipping: qualifies once the subtotal reaches the API threshold.
  const freeShipQualifies = freeShipThreshold > 0 && subtotal >= freeShipThreshold;
  const freeShipRemaining = Math.max(0, freeShipThreshold - subtotal);
  // Waive the COD fee in the displayed total once the order qualifies for free
  // shipping (prepaid is already 0). Checkout enforces the same server-side.
  const shippingFee  = (isCod && freeShipQualifies) ? 0 : rawShippingFee;
  const baseTotal    = Math.round(Math.max(0, subtotal + shippingFee - couponOff));
  // Coupon and the ₹50 instant discount DON'T stack: a coupon suppresses it.
  const prepaidDisc  = isPrepaid && PREPAID_INSTANT_DISCOUNT_INR > 0 && !appliedCoupon
    ? Math.min(PREPAID_INSTANT_DISCOUNT_INR, baseTotal) : 0;
  const finalPayable = Math.round(Math.max(0, baseTotal - prepaidDisc));

  // ── Available-offer helpers ─────────────────────────────────────────────
  // Compact, HTML-stripped one-liner for an offer, e.g. "10% off up to ₹200 · Min ₹999".
  const offerDesc = (c) => {
    if (c.description) return String(c.description).replace(/<[^>]*>/g, '').trim();
    const value = parseFloat(c.value) || 0;
    const min = parseFloat(c.minPurchase) || 0;
    const maxD = parseFloat(c.maxDiscount) || 0;
    let head = 'Special offer';
    if (c.type === 'percentage') head = `${value % 1 === 0 ? value : value.toFixed(0)}% off${maxD > 0 ? ` up to ${fmt(maxD)}` : ''}`;
    else if (c.type === 'fixed') head = `${fmt(value)} off`;
    return min > 0 ? `${head} · Min ${fmt(min)}` : head;
  };

  // ── Best-offer preview (client-side estimate) ───────────────────────────
  // Surface the single most valuable *applicable* public coupon as a banner,
  // with the remaining coupons behind a "See all N offers" toggle. The amount
  // shown is only a preview — the real discount comes from server validation
  // on apply. basis = the subtotal the coupon section validates against.
  const bestOffer = useMemo(() => {
    const appliedCode = (appliedCoupon?.code || '').toUpperCase();
    const list = availableCoupons.filter(c => c && c.code && c.code.toUpperCase() !== appliedCode);
    if (list.length === 0) return null;
    const basis = subtotal;
    const est = (c) => {
      const min = parseFloat(c.minPurchase) || 0;
      const value = parseFloat(c.value) || 0;
      const maxD = parseFloat(c.maxDiscount) || 0;
      const hasAmount = (c.type === 'percentage' || c.type === 'fixed') && value > 0;
      let d = 0;
      if (c.type === 'percentage') d = (basis * value) / 100;
      else if (c.type === 'fixed') d = value;
      if (c.type === 'percentage' && maxD > 0) d = Math.min(d, maxD);
      d = Math.round(Math.min(Math.max(0, d), basis));
      return { c, applicable: basis >= min, discount: d, need: Math.max(0, min - basis), hasAmount };
    };
    const enriched = list.map(est);
    const applicable = enriched.filter(e => e.applicable);
    if (applicable.length > 0) {
      applicable.sort((a, b) => b.discount - a.discount);
      const top = applicable[0];
      return { locked: false, coupon: top.c, discount: top.discount, hasAmount: top.hasAmount, rest: enriched.filter(e => e.c !== top.c).map(e => e.c) };
    }
    enriched.sort((a, b) => a.need - b.need);
    const closest = enriched[0];
    return { locked: true, coupon: closest.c, need: Math.round(closest.need), rest: enriched.filter(e => e.c !== closest.c).map(e => e.c) };
  }, [availableCoupons, appliedCoupon, subtotal]);

  // ── Auto-remove a payment-mode-restricted coupon on mode switch ─────────
  // A coupon may be restricted to a single payment mode via
  // paymentModeRestriction ('all' | 'cod' | 'prepaid'). Applying under the
  // wrong mode is already blocked server-side, but switching the delivery
  // method AFTER applying would otherwise leave a now-invalid coupon applied.
  useEffect(() => {
    if (!appliedCoupon) return;
    const restriction = appliedCoupon.paymentModeRestriction;
    if (!restriction || restriction === 'all') return;
    const mode = isCod ? 'cod' : 'prepaid';
    if (restriction !== mode) {
      setAppliedCoupon(null);
      setCouponCode('');
      const modeText = restriction === 'cod' ? 'Cash on Delivery' : 'Prepaid';
      setCouponMsg({ type: 'err', text: `Coupon removed — it's valid only for ${modeText} orders.` });
    }
  }, [isCod, appliedCoupon]);

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
      // Auto-fill City/State from serviceability — only into fields the shopper
      // hasn't already typed into, so their own entry is never overwritten.
      if (r?.city || r?.state) {
        setAddrForm(p => ({
          ...p,
          city:  (!String(p.city  || '').trim() && r.city)  ? r.city  : p.city,
          state: (!String(p.state || '').trim() && r.state) ? r.state : p.state,
        }));
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
    if (errs.length) { setAddrIssues({ errors: errs, warnings: [] }); return; }

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

  // ── Auto-save address once all details are valid ───────────────────────
  // Debounced silent save — mirrors onSaveAddress's validation shape and
  // guest name/phone fallback, then fires onSaveAddress with a no-op event.
  useEffect(() => {
    if (!showAddrForm || addrSaving) return;
    const formForValidation = isAuthenticated
      ? addrForm
      : { ...addrForm, fullName: guestInfo.fullName.trim() || addrForm.fullName, phoneNumber: guestInfo.phone || addrForm.phoneNumber };
    const validationInput = {
      full_name:    formForValidation.fullName,
      address:      formForValidation.address,
      city:         formForValidation.city,
      state:        formForValidation.state,
      postal_code:  formForValidation.postalCode,
      phone_number: isAuthenticated ? formForValidation.phoneNumber : guestInfo.phone,
    };
    if (validateAddress(validationInput).length) return;
    const sig = JSON.stringify({ ...validationInput, editingAddrId });
    if (sig === lastAutoSaveSig.current) return;
    const t = setTimeout(() => {
      lastAutoSaveSig.current = sig;
      onSaveAddress({ preventDefault() {} });
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddrForm, addrSaving, isAuthenticated, addrForm, guestInfo.fullName, guestInfo.phone, editingAddrId]);

  // ── Coupon ────────────────────────────────────────────────────────────
  const onApplyCoupon = async (codeArg) => {
    const code = String(codeArg ?? couponCode).trim().toUpperCase();
    if (!code) return;
    setOffersOpen(false);
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
        setAppliedCoupon({ id: data.coupon.id, code: data.coupon.code, discountAmount: data.discountAmount, paymentModeRestriction: data.coupon.paymentModeRestriction });
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

  // ── Abandoned-cart recovery deep link ───────────────────────────────────
  // A recovery email/SMS links back with `?recover=1` (optionally
  // `&coupon=CART10`). On the shopper's own device the bag still lives in the
  // browser, so we only reopen the drawer — never rebuild it — and, once the
  // total is known, auto-apply the coupon down the same path as typing a code
  // + clicking Apply. Best-effort and SSR-guarded: it must never break the
  // page, and an empty bag is fine (the code is still pre-filled).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('recover') !== '1') return;

      // 1) Reopen the bag via the store's own open mechanism.
      setCartOpen(true);

      // 2) Remember + pre-fill the coupon so the code is visible immediately,
      //    even if clean auto-apply can't run yet (e.g. total not known).
      const coupon = String(params.get('coupon') || '').trim().toUpperCase();
      if (coupon) {
        recoverCouponRef.current = coupon;
        setCouponCode(coupon);
      }

      // 3) Strip the recovery params so a refresh / share doesn't re-trigger.
      params.delete('recover');
      params.delete('coupon');
      const qs = params.toString();
      const clean = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
      window.history.replaceState(null, '', clean);
    } catch (err) {
      console.warn('[recover] deep-link handling failed:', err?.message);
    }
    // Mount-only — reads the URL once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-apply the remembered recovery coupon once the cart total is known and
  // nothing is applied yet — same validation path as a manual Apply.
  useEffect(() => {
    if (recoverAppliedRef.current) return;
    const code = recoverCouponRef.current;
    if (!code) return;
    // Something already applied (or user acted): stand down for good.
    if (appliedCoupon) { recoverAppliedRef.current = true; return; }
    // Wait until the bag has a real total and no apply is in flight.
    if (!(subtotal > 0) || couponLoading) return;
    recoverAppliedRef.current = true;
    try {
      onApplyCoupon(code);
    } catch (err) {
      console.warn('[recover] coupon auto-apply failed:', err?.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, appliedCoupon, couponLoading]);

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
      // "Build Your Pack" lines carry a shared pack_group so the backend can
      // apply the store-wide mix discount, server-authoritatively.
      ...(i.packGroup ? { pack_group: String(i.packGroup) } : {}),
    }));

  // Meta Purchase custom_data — captured from the cart BEFORE it is cleared.
  // Cart line ids are composite, so content_ids use the real product id.
  const buildPurchaseData = (orderNumber, value) => ({
    content_ids: items.map(i => String(i.productId ?? i.id)),
    content_type: 'product',
    contents: items.map(i => ({ id: String(i.productId ?? i.id), quantity: i.quantity || 1 })),
    num_items: items.reduce((s, i) => s + (i.quantity || 1), 0),
    value: Number(value) || 0,
    currency: 'INR',
    order_id: orderNumber,
  });

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
  // GA4 funnel: shipping + payment chosen — fired at order placement (after
  // validation, before the order API call) so GA4 records them ahead of
  // purchase. GA4-only; same item shape as view_cart/InitiateCheckout.
  const fireCheckoutFunnel = (mode, value) => {
    const contents = items.map(i => ({ id: String(i.productId ?? i.id), quantity: i.quantity || 1 }));
    addShippingInfo({ contents, value, currency: 'INR', shipping_tier: mode });
    addPaymentInfo({ contents, value, currency: 'INR', payment_type: mode });
  };

  const placeCod = async () => {
    setIsProcessing(true);
    fireCheckoutFunnel('cod', finalPayable);
    try {
      const data = buildCodOrder(generateIdempotencyKey());
      const result = isAuthenticated ? await createOrder(data) : await createGuestOrder(data);
      if (!result?.order) throw new Error('Order creation failed.');
      const orderNumber = result.order.order_number;
      // Meta Purchase (deduped with the backend's server-side event).
      const purchaseData = buildPurchaseData(orderNumber, finalPayable);
      clearCart(true);
      fbPurchase(orderNumber, purchaseData);
      toastOrderPlaced(orderNumber);
      setOrderSuccess({ orderNumber, paymentType: 'cod' });
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
      theme: { color: '#8F7548' },
      handler: async (resp) => {
        try {
          const result = await verifyPayment({
            razorpayPaymentId: resp.razorpay_payment_id,
            razorpayOrderId:   resp.razorpay_order_id,
            razorpaySignature: resp.razorpay_signature,
            reservation_id:    reservationId,
          });
          const orderNumber = result.order?.order_number;
          // Meta Purchase (deduped with the backend's server-side event).
          const purchaseData = buildPurchaseData(orderNumber, finalPayable);
          clearCart(true);
          fbPurchase(orderNumber, purchaseData);
          toastPaymentSuccess();
          toastOrderPlaced(orderNumber);
          setOrderSuccess({ orderNumber, paymentType: 'prepaid' });
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
    fireCheckoutFunnel('razorpay', finalPayable);
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
    if (errs.length) { setAddrIssues({ errors: errs, warnings: [] }); return; }
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
        className={`fixed right-0 top-0 h-full w-full max-w-md z-[90] bg-[#F7F4EF] border-l border-[#D8D3C9] transition-transform duration-400 ease-out flex flex-col ${cartOpen ? 'translate-x-0' : 'translate-x-full'}`}>

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
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D8D3C9] bg-white">
          <div className="flex items-center gap-3">
            {!orderSuccess && items.length > 0 && coStep === 2 ? (
              <button type="button" onClick={() => setCoStep(1)} aria-label="Back to bag" className="vq-cart-back text-[#8F7548]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
            ) : (
              <ShoppingBag size={18} className="text-[#8F7548]" />
            )}
            <span className="font-serif italic text-lg text-[#11100E]">
              {orderSuccess ? 'Order Confirmed' : coStep === 2 ? 'Checkout' : 'Your Bag'}
            </span>
            {!orderSuccess && (
              coStep === 2 ? (
                <span className="text-[#777168] text-[10px] font-body tracking-wider uppercase">
                  Step 2 of 2 · delivery &amp; payment
                </span>
              ) : cartCount > 0 ? (
                <span className="bg-[#B89A63]/20 text-[#8F7548] text-[10px] font-body px-2 py-0.5  tracking-wider uppercase">
                  {cartCount} {cartCount === 1 ? 'item' : 'items'}
                </span>
              ) : null
            )}
          </div>
          <button onClick={() => setCartOpen(false)} className="text-[#11100E]/60 hover:text-[#8F7548] transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto">

          {/* ── Order success state ───────────────────────────────────── */}
          {orderSuccess ? (
            <div className="px-6 py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#B89A63]/15 border border-[#B89A63]/40 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={28} className="text-[#8F7548]" />
              </div>
              <h3 className="font-display text-2xl uppercase tracking-tight text-[#11100E] mb-2">Order placed</h3>
              <p className="text-sm font-body text-[#49423A] mb-1">Thank you for your order.</p>
              <p className="text-xs font-body text-[#777168] mb-6">
                Order Number: <span className="text-[#11100E] font-medium">{orderSuccess.orderNumber || '—'}</span>
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
              <ShoppingBag size={48} className="text-[#11100E]/15" />
              <p className="font-serif italic text-2xl text-[#11100E]/50">Your bag is empty</p>
              <p className="text-[#49423A] text-sm font-body">Discover our maison's collections.</p>
              <Link href="/shop" onClick={() => setCartOpen(false)} className="pill-cta mt-2">
                Explore the Shop <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <>
              {/* ── Whole-cart shimmer: one skeleton for the whole bag-review
                     body while its async loads settle, so content doesn't pop
                     in piece by piece. ── */}
              {coStep === 1 && items.length > 0 && !cartReady && (
                <div className="animate-pulse" aria-hidden="true">
                  {/* free-shipping row */}
                  <div className="px-5 py-3 border-b border-[#D8D3C9]">
                    <div className="h-3 w-3/4 mx-auto rounded bg-[var(--border)] mb-2" />
                    <div className="h-1.5 w-full rounded-full bg-[var(--border)]" />
                  </div>
                  {/* item rows */}
                  <div className="px-5 py-4 space-y-4 border-b border-[#D8D3C9]">
                    {[0, 1].map((n) => (
                      <div key={n} className="flex gap-3">
                        <div className="w-20 h-24 shrink-0 rounded bg-[var(--border)]" />
                        <div className="flex-1 min-w-0 space-y-2 py-1">
                          <div className="h-4 w-5/6 rounded bg-[var(--border)]" />
                          <div className="h-3 w-1/3 rounded bg-[var(--border)]" />
                          <div className="h-6 w-2/3 rounded bg-[var(--border)] mt-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* chips (coupon + offer) */}
                  <div className="px-5 py-4 border-b border-[#D8D3C9] space-y-2">
                    <div className="h-10 w-full rounded bg-[var(--border)]" />
                    <div className="h-14 w-full rounded bg-[var(--border)]" />
                  </div>
                </div>
              )}
              {/* ── Step 1: review bag (free shipping, items, coupon, cross-sell) ── */}
              {coStep === 1 && (items.length === 0 || cartReady) && (<>
              {/* ── Free-shipping progress ─────────────────────────────── */}
              {freeShipThreshold > 0 && (
                <div className="px-5 py-3 border-b border-[#D8D3C9]">
                  <p className="text-center text-[11px] font-body text-[#49423A] mb-2">
                    {freeShipQualifies
                      ? '🎉 You\'ve unlocked FREE shipping!'
                      : <>Add <span className="font-medium text-[#8F7548]">{fmt(freeShipRemaining)}</span> for FREE shipping</>}
                  </p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#B89A63]/20">
                    <div
                      className="h-full rounded-full bg-[#8F7548] transition-all duration-300"
                      style={{ width: `${freeShipQualifies ? 100 : Math.min(100, (subtotal / freeShipThreshold) * 100)}%` }}
                      role="progressbar"
                      aria-valuenow={freeShipQualifies ? 100 : Math.min(100, Math.round((subtotal / freeShipThreshold) * 100))}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Free shipping progress"
                    />
                  </div>
                </div>
              )}

              {/* ── Items ──────────────────────────────────────────────── */}
              <div className="px-5 py-4 space-y-4 border-b border-[#D8D3C9]">
                {items.map((item, i) => (
                  <div key={`${item.id}-${i}`} className="flex gap-3 pb-4 border-b border-[#D8D3C9] last:border-0 last:pb-0">
                    <Link href={`/product/${item.slug}`} onClick={() => setCartOpen(false)} className="shrink-0">
                      <img src={item.image} alt={item.name} className="w-20 h-24 object-cover" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/product/${item.slug}`} onClick={() => setCartOpen(false)}>
                        <h4 className="font-serif text-sm md:text-base text-[#11100E] hover:text-[#8F7548] transition-colors line-clamp-2">{item.name}</h4>
                        {item.packDiscount > 0 && <p className="text-xs text-[#8F7548] mt-1">Build your pack · {item.packDiscount}% off applied</p>}
                      </Link>
                      {(item.size || item.color) && (
                        <p className="text-[#777168] text-[10px] tracking-[0.2em] uppercase font-body mt-1">
                          {[item.size, item.color].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center border border-[#D8D3C9]  bg-white">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.size)}
                            className="px-2.5 py-1 text-[#49423A] hover:text-[#8F7548]"><Minus size={12} /></button>
                          <span className="px-2 text-[#11100E] text-sm font-body">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.size)}
                            className="px-2.5 py-1 text-[#49423A] hover:text-[#8F7548]"><Plus size={12} /></button>
                        </div>
                        <span className="font-serif italic text-[#11100E] text-sm">{fmt(item.price * item.quantity)}</span>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.id, item.size)}
                      className="text-[#11100E]/30 hover:text-red-500 transition-colors self-start mt-1" aria-label="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* ── Coupon ──────────────────────────────────────────────── */}
              <div className="px-5 py-4 border-b border-[#D8D3C9] space-y-2">
                <p className="text-[10px] tracking-[0.35em] uppercase text-[#777168] font-body">Promo Code</p>
                {appliedCoupon ? (
                  <div className="flex items-center gap-2 bg-[#B89A63]/10 border border-[#B89A63]/40 px-3 py-2.5">
                    <Tag size={13} className="text-[#8F7548]" />
                    <span className="text-sm font-body text-[#11100E] flex-1">
                      <span className="font-serif italic">{appliedCoupon.code}</span> · {fmt(appliedCoupon.discountAmount)} off
                    </span>
                    <button onClick={onRemoveCoupon} className="text-[#777168] hover:text-red-500" aria-label="Remove coupon">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 input-gold px-3 py-2.5 text-sm font-body" />
                    <button onClick={() => onApplyCoupon()} disabled={couponLoading || !couponCode.trim()}
                      className={`px-4 py-2.5 bg-[#11100E] text-white text-[10px] tracking-[0.3em] uppercase font-body hover:bg-[#8F7548] transition-colors ${couponLoading || !couponCode.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {couponLoading ? <Loader2 size={12} className="animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                )}

                {/* Best offer — the single most valuable applicable coupon shown as
                    a banner, with the rest behind a "See all N offers" toggle. The
                    menu is absolutely positioned so it overlays the summary below and
                    the drawer height never grows. Shown only when offers exist and no
                    coupon is applied. */}
                {!appliedCoupon && bestOffer && (
                  <div className="relative" ref={offersRef}>
                    <div className="flex items-center gap-3 bg-[#B89A63]/10 border border-[#B89A63]/40 px-3 py-2.5">
                      <span className="shrink-0 w-9 h-9 rounded-full bg-[#8F7548] text-white flex items-center justify-center" aria-hidden="true">
                        <Sparkles size={15} />
                      </span>
                      <div className="flex-1 min-w-0">
                        {bestOffer.locked ? (
                          <>
                            <p className="text-sm font-body text-[#11100E] font-medium leading-snug">
                              Add {fmt(bestOffer.need)} more to use <span className="font-serif italic">{bestOffer.coupon.code}</span>
                            </p>
                            <p className="text-[10px] font-body text-[#777168] mt-0.5 truncate">{offerDesc(bestOffer.coupon)}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-body text-[#11100E] font-medium leading-snug">
                              Apply <span className="font-serif italic">{bestOffer.coupon.code}</span>
                              {bestOffer.hasAmount && bestOffer.discount > 0 && (
                                <> — save <span className="text-[#8F7548] font-semibold">{fmt(bestOffer.discount)}</span></>
                              )}
                            </p>
                            <p className="text-[10px] font-body text-[#777168] mt-0.5 truncate">
                              {bestOffer.hasAmount && bestOffer.discount > 0 ? 'Best offer for your cart' : offerDesc(bestOffer.coupon)}
                            </p>
                          </>
                        )}
                      </div>
                      {!bestOffer.locked && (
                        <button type="button"
                          onClick={() => onApplyCoupon(bestOffer.coupon.code)}
                          disabled={couponLoading}
                          aria-label={`Apply coupon ${bestOffer.coupon.code}`}
                          className={`shrink-0 px-4 py-2 bg-[#11100E] text-white text-[10px] tracking-[0.3em] uppercase font-body hover:bg-[#8F7548] transition-colors ${couponLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          {couponLoading ? '…' : 'Apply'}
                        </button>
                      )}
                    </div>

                    {bestOffer.rest.length > 0 && (
                      <>
                        <button type="button"
                          onClick={() => setOffersOpen(o => !o)}
                          disabled={couponLoading}
                          aria-haspopup="listbox" aria-expanded={offersOpen}
                          className="mt-2 w-full flex items-center justify-center gap-1.5 text-[10px] tracking-[0.25em] uppercase text-[#8F7548] hover:text-[#11100E] font-body py-1 disabled:opacity-50">
                          See all {bestOffer.rest.length} offer{bestOffer.rest.length > 1 ? 's' : ''}
                          <ChevronDown size={14} className={`transition-transform ${offersOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </button>
                        {offersOpen && (
                          <div className="absolute left-0 right-0 top-full z-20 bg-white border border-[#D8D3C9] shadow-lg max-h-56 overflow-y-auto" role="listbox" aria-label="More offers">
                            {bestOffer.rest.map(c => (
                              <button type="button" key={c.id ?? c.code} role="option" aria-selected={false}
                                onClick={() => { onApplyCoupon(c.code); setOffersOpen(false); }}
                                disabled={couponLoading}
                                aria-label={`Apply coupon ${c.code}`}
                                className="w-full flex items-center gap-2 text-left px-3 py-2.5 border-b border-[#EFEAE2] last:border-0 hover:bg-[#EFEAE2] transition-colors">
                                <span className="flex-1 min-w-0">
                                  <span className="block font-serif italic text-[#11100E] text-sm">{c.code}</span>
                                  <span className="block text-[#777168] text-[10px] font-body truncate">{offerDesc(c)}</span>
                                </span>
                                <span className="shrink-0 text-[10px] tracking-[0.25em] uppercase text-[#8F7548] font-body">{couponLoading ? '…' : 'Apply'}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {couponMsg.text && (
                  <p className={`text-[11px] font-body ${couponMsg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
                    {couponMsg.text}
                  </p>
                )}
              </div>

              {/* ── You may also like — cross-sell strip (above the summary) ─ */}
              {crossSell.length > 0 && (
                <div className="px-5 py-4 border-b border-[#D8D3C9]">
                  <p className="text-[10px] tracking-[0.35em] uppercase text-[#777168] font-body mb-3">You may also like</p>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {crossSell.map((p) => (
                      <div key={p.id} className="shrink-0 w-32 bg-white border border-[#D8D3C9] flex flex-col">
                        <Link href={`/product/${p.slug}`} onClick={() => setCartOpen(false)} className="block">
                          <img src={p.images?.[0]} alt={p.name} loading="lazy" className="w-full h-36 object-cover" />
                        </Link>
                        <div className="flex flex-col gap-1.5 p-2 flex-1">
                          <Link href={`/product/${p.slug}`} onClick={() => setCartOpen(false)}
                            className="font-serif text-xs text-[#11100E] hover:text-[#8F7548] transition-colors line-clamp-2 leading-snug">
                            {p.name}
                          </Link>
                          <div className="mt-auto flex items-center justify-between gap-1.5">
                            <span className="font-serif italic text-[#11100E] text-xs">{fmt(p.price)}</span>
                            <button type="button" onClick={() => addSuggestion(p)} aria-label={`Add ${p.name}`}
                              className="flex items-center gap-0.5 border border-[#B89A63] text-[#8F7548] hover:bg-[#B89A63]/10 transition-colors text-[10px] font-body uppercase tracking-wider px-1.5 py-1">
                              <Plus size={11} /> Add
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </>)}

              {/* ── Summary — visible on both steps so pricing is always clear ─ */}
              <div className="px-5 py-4 space-y-2">
                <p className="text-[10px] tracking-[0.35em] uppercase text-[#777168] font-body mb-2">Order Summary</p>
                <Row label="Subtotal" value={fmt(subtotal)} />
                <Row label="Shipping" value={shippingFee > 0 ? fmt(shippingFee) : 'Free'} />
                {couponOff > 0  && <Row label="Coupon Discount"   value={`- ${fmt(couponOff)}`}  highlight />}
                {prepaidDisc > 0 && <Row label="Prepaid Discount"  value={`- ${fmt(prepaidDisc)}`} highlight />}
                <div className="h-px bg-[#D8D3C9] my-2" />
                <div className="flex items-baseline justify-between">
                  <span className="text-[#11100E] font-body uppercase tracking-[0.2em] text-xs">Total</span>
                  <span className="font-serif italic text-[#11100E] text-2xl">{fmt(finalPayable)}</span>
                </div>
                {isPrepaid && PREPAID_INSTANT_DISCOUNT_INR > 0 && prepaidDisc === 0 && !appliedCoupon && (
                  <p className="text-[10px] font-body text-[#8F7548] mt-1">
                    {fmt(PREPAID_INSTANT_DISCOUNT_INR)} instant discount applied automatically when you pay online.
                  </p>
                )}
              </div>

              {/* ── Step 2: delivery + payment ──────────────────────────── */}
              {coStep === 2 && (<>
              {/* ── Address section ─────────────────────────────────────── */}
              <div className="px-5 py-4 border-b border-[#D8D3C9] space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] tracking-[0.35em] uppercase text-[#777168] font-body">Deliver To</p>
                  {isAuthenticated && addresses.length > 1 && !showAddrForm && (
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setShowAddrDropdown(s => !s)}
                        className="text-[10px] tracking-[0.25em] uppercase text-[#8F7548] hover:text-[#11100E] font-body"
                      >
                        Change
                      </button>
                      {showAddrDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-[#D8D3C9] shadow-lg z-10 max-h-64 overflow-y-auto">
                          {addresses.map(a => (
                            <button key={a.id} onClick={() => { setSelectedAddress(a); setShowAddrDropdown(false); }}
                              className={`w-full text-left px-3 py-2.5 text-xs font-body border-b border-[#EFEAE2] last:border-0 hover:bg-[#EFEAE2] ${selectedAddress?.id === a.id ? 'bg-[#EFEAE2]' : ''}`}>
                              <p className="font-medium text-[#11100E]">{a.full_name || a.fullName}</p>
                              <p className="text-[#777168] truncate">{a.address}, {a.city}, {a.state} - {a.postal_code || a.postalCode}</p>
                            </button>
                          ))}
                          <button onClick={() => { setShowAddrDropdown(false); setEditingAddrId(null); setAddrForm(EMPTY_ADDR); setShowAddrForm(true); }}
                            className="w-full text-left px-3 py-2.5 text-xs font-body text-[#8F7548] hover:bg-[#EFEAE2] flex items-center gap-1.5">
                            <Plus size={12} /> Add new address
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedAddress && !showAddrForm && (
                  <div className="bg-white border border-[#D8D3C9] p-3.5 flex items-start gap-2.5">
                    <MapPin size={14} className="text-[#8F7548] mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-serif italic text-[#11100E] text-sm">{selectedAddress.full_name || selectedAddress.fullName}</p>
                      <p className="text-[#49423A] text-xs font-body mt-0.5 leading-relaxed">
                        {selectedAddress.address}, {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.postal_code || selectedAddress.postalCode}
                      </p>
                      <p className="text-[#777168] text-[10px] font-body mt-1">{selectedAddress.phone_number || selectedAddress.phoneNumber}</p>
                      {pincodeInfo && pincodeInfo.serviceable === false && (
                        <p className="text-red-600 text-[10px] font-body mt-1">Not serviceable in this PIN.</p>
                      )}
                    </div>
                    <button onClick={() => onEditAddress(selectedAddress)} className="text-[#8F7548] hover:text-[#11100E]" aria-label="Edit address">
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
                      placeholder="Full name" className="w-full input-gold px-3 py-2.5 text-sm font-body" />
                    <input name="phoneNumber" value={addrForm.phoneNumber}
                      onChange={(e) => {
                        onAddrField(e);
                        if (!isAuthenticated) setGuestInfo(p => ({ ...p, phone: String(e.target.value).replace(/\D/g, '').slice(0, 10) }));
                      }}
                      placeholder="10-digit mobile" inputMode="numeric"
                      className="w-full input-gold px-3 py-2.5 text-sm font-body" />
                    {!isAuthenticated && (
                      <input value={guestInfo.email}
                        onChange={(e) => setGuestInfo(p => ({ ...p, email: e.target.value }))}
                        placeholder="Email (for order confirmation)" type="email"
                        className="w-full input-gold px-3 py-2.5 text-sm font-body" />
                    )}
                    <input name="address" value={addrForm.address} onChange={onAddrField}
                      placeholder="Street address" className="w-full input-gold px-3 py-2.5 text-sm font-body" />
                    <div className="grid grid-cols-3 gap-2">
                      <input name="postalCode" value={addrForm.postalCode} onChange={onAddrField} onBlur={onPincodeBlur}
                        placeholder="PIN" inputMode="numeric"
                        className="input-gold px-3 py-2.5 text-sm font-body" />
                      <input name="city" value={addrForm.city} onChange={onAddrField}
                        placeholder="City" className="input-gold px-3 py-2.5 text-sm font-body" />
                      <input name="state" value={addrForm.state} onChange={onAddrField}
                        placeholder="State" className="input-gold px-3 py-2.5 text-sm font-body" />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <p className="text-xs text-neutral-500 flex-1">
                        {addrSaving ? 'Saving your address…' : 'Your address saves automatically once all details are filled.'}
                      </p>
                      {selectedAddress && (
                        <button type="button" onClick={() => { setShowAddrForm(false); setEditingAddrId(null); setAddrForm(EMPTY_ADDR); }}
                          className="text-[#777168] text-[10px] tracking-[0.3em] uppercase font-body hover:text-[#11100E]">
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>

              {/* ── Delivery method ─────────────────────────────────────── */}
              <div className="px-5 py-4 border-b border-[#D8D3C9] space-y-3">
                <p className="text-[10px] tracking-[0.35em] uppercase text-[#777168] font-body">Delivery Method</p>
                <div className="space-y-2">
                  {sortedFees.map(f => {
                    const disabled = f.orderType === 'cod' && codBlocked;
                    const active = selectedFee?.id === f.id;
                    return (
                      <button key={f.id} onClick={() => !disabled && setSelectedFee(f)}
                        disabled={disabled}
                        className={`w-full flex items-center gap-3 p-3 border text-left transition-all ${
                          active ? 'border-[#B89A63] bg-[#B89A63]/10' : 'border-[#D8D3C9] bg-white hover:border-[#B89A63]'
                        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        {f.orderType === 'cod'
                          ? <Wallet size={16} className="text-[#8F7548]" />
                          : <CreditCard size={16} className="text-[#8F7548]" />
                        }
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm text-[#11100E] font-medium">
                            {f.orderType === 'cod' ? 'Cash on Delivery' : 'UPI / Card / Net Banking'}
                          </p>
                          <p className="text-[#777168] text-[10px] font-body mt-0.5">
                            {f.orderType === 'cod'
                              ? (disabled ? 'Not available for this PIN' : 'Pay when your order arrives')
                              : `Razorpay${PREPAID_INSTANT_DISCOUNT_INR > 0 && !appliedCoupon ? ` · ${fmt(PREPAID_INSTANT_DISCOUNT_INR)} instant off` : ''}`}
                          </p>
                        </div>
                        <span className="text-[10px] font-body text-[#8F7548]">
                          {parseFloat(f.fee || 0) > 0 ? `+ ${fmt(f.fee)}` : 'Free'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              </>)}
            </>
          )}
        </div>

        {/* Footer — step 1: proceed to checkout · step 2: place order */}
        {!orderSuccess && items.length > 0 && (
          <div className="border-t border-[#D8D3C9] px-5 py-4 bg-white space-y-2">
            {coStep === 1 ? (
              <>
                {errorMsg && (
                  <div className="text-[11px] font-body text-red-700 bg-red-50 border border-red-200 px-3 py-2">
                    {errorMsg}
                  </div>
                )}
                <button onClick={goToCheckout} disabled={isProcessing || !items.length}
                  className={`pill-cta pill-cta-dark w-full justify-center !py-3.5 !text-xs ${isProcessing || !items.length ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  Proceed to checkout · {fmt(baseTotal)} <ArrowRight size={13} />
                </button>
                <p className="text-center text-[10px] tracking-[0.3em] uppercase font-body text-[#777168]">
                  Secure checkout · 14-day returns
                </p>
              </>
            ) : (
              <>
                {errorMsg && (
                  <div className="text-[11px] font-body text-red-700 bg-red-50 border border-red-200 px-3 py-2">
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
                <p className="text-center text-[10px] tracking-[0.3em] uppercase font-body text-[#777168]">
                  Secure checkout · 14-day returns
                </p>
              </>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between text-sm font-body">
      <span className="text-[#49423A]">{label}</span>
      <span className={highlight ? 'text-[#8F7548] font-medium' : 'text-[#11100E]'}>{value}</span>
    </div>
  );
}

// redeploy: coupon dropdown rollout
