import { useEffect, useState, useMemo, useRef } from 'react';
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
  validateCoupon,
  captureAbandonedCart,
} from '../../services/orders';
import { getPublicCoupons } from '../../services/publicindex';
import { getBestsellers, resolveVariationId, getBundleTiers, getProductBySlug } from '../../services/products';
import {
  toastOrderPlaced,
  toastOrderError,
  showError,
} from '../../utils/toast';
import { fbTrack, viewCart, cartPageView, addShippingInfo, addPaymentInfo } from '../../utils/pixel';
import { readCartRecovery, clearCartRecoveryParams, fetchRecoveredCart, toRecoveryItems } from '../../utils/cartRecovery';
import { shiprocketEnabled, openShiprocketCheckout } from '../../services/shiprocketCheckout';
import { savePurchaseForThankYou } from '../../lib/thankYou';
import ShiprocketButton from '../checkout/ShiprocketButton';
import GzImage from '../common/GzImage';
import { Sk, SkBusy } from '../common/Skeleton';

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
  const { items, open, openCart, closeCart, clearCart, removeItem, updateQty, lineKey, addItem, hydrated, restoreCart } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [guestInfo, setGuestInfo] = useState({ email: '', fullName: '', phone: '' });
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDR);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const lastAutoSaveSig = useRef('');
  // Abandoned-cart capture guard — the last 10-digit phone we posted, so the
  // capture fires at most once per phone (not on every checkout-step re-render).
  const capturedPhoneRef = useRef('');

  const [shippingFees, setShippingFees] = useState([]);
  const [selectedFee, setSelectedFee] = useState(null);
  const [freeShipThreshold, setFreeShipThreshold] = useState(0);
  const [codAllowed, setCodAllowed] = useState(true);
  const [pincodeServiceable, setPincodeServiceable] = useState(true);

  // Coupon
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, id }
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]); // [{ id, code, description, type, value, minPurchase, maxDiscount, endDate }]
  const [offersOpen, setOffersOpen] = useState(false); // collapsed "Available offers" dropdown
  const offersRef = useRef(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [paymentFailed, setPaymentFailed] = useState(null);
  // Two-step checkout: 1 = review cart, 2 = delivery + payment.
  const [coStep, setCoStep] = useState(1);
  // Address validation popup: { errors:[], warnings:[] } while shown, else null.
  const [addrIssues, setAddrIssues] = useState(null);

  // Cross-sell "You may also like" — fetched from the homepage bestsellers
  // service when the drawer opens; excludes items already in the cart.
  const [suggestions, setSuggestions] = useState([]);

  // Pair/pack progress stepper — the real admin-set bundle tiers for the
  // primary (loose) cart line. null when the product has no tiers (then the
  // stepper renders nothing). Display-only: it reads getBundleTiers for the
  // labels, the server still prices the pack group by its total quantity.
  const [packState, setPackState] = useState(null); // { productId, tiers:[{pairs,price,label,badge}] }
  // The primary cart line's FULL product (all variations) so "Buy More, Save
  // More" can offer its OTHER in-stock colours/sizes not yet in the cart.
  const [bmsProduct, setBmsProduct] = useState(null);

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
        setFreeShipThreshold(Number(data?.freeShippingThreshold) || 0);
        setSelectedFee((prev) => prev || fees.find((f) => f.orderType === 'prepaid') || fees[0] || null);
      })
      .catch(() => { setShippingFees(FALLBACK_SHIPPING_FEES); setSelectedFee(FALLBACK_SHIPPING_FEES[0]); setFreeShipThreshold(0); });
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
  // Close the address-issues popup on Escape (capture phase so it wins over the
  // drawer's own Escape-to-close).
  useEffect(() => {
    if (!addrIssues) return;
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setAddrIssues(null); } };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [addrIssues]);

  /* totals */
  const cartTotal = items.reduce((s, i) => s + getPrice(i) * i.qty, 0);
  const totalQty = items.reduce((s, i) => s + (i.qty || 1), 0);
  const isCod = selectedFee?.orderType === 'cod';
  const isPrepaid = selectedFee?.orderType === 'prepaid';

  /* ── Bundle-tier DISPLAY repricing, by PACK GROUP (server-authoritative) ──
     "Buy More, Save More" groups the primary line and any added variations
     under one pack_id. The backend prices a pack group by its TOTAL pairs (the
     cart / checkout / order controllers sum quantity across the shared pack_id
     and apply the bundle tier where pairs == groupTotal). So the stepper and the
     shown total must reflect the GROUP total, not one line. A logged-in grouped
     cart is already repriced server-side (each line ≈ tier/N); a guest cart
     keeps single-pair prices until placement — so we correct only the DISPLAY
     here, using the exact tier total, and never double-discount or alter the
     payload. */
  const packProdLines = packState ? items.filter((i) => String(i.id) === String(packState.productId)) : [];
  const packGroupPackId = packProdLines.find((i) => i.packId)?.packId || null;
  // The group the server prices together: the shared-pack_id lines, else the
  // loose line(s) of this product (the not-yet-bundled primary).
  const packGroupLines = packGroupPackId
    ? packProdLines.filter((i) => i.packId === packGroupPackId)
    : packProdLines.filter((i) => !i.packId);
  const packGroupQty = packGroupLines.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  // Line whose quantity a milestone tap nudges (the largest, so the group total
  // lands on the tapped tier).
  const packAnchor = packGroupLines.length
    ? packGroupLines.reduce((a, b) => ((Number(b.qty) || 0) > (Number(a.qty) || 0) ? b : a))
    : null;
  // Single-pair base price for the savings labels (the product's canonical
  // price, falling back to a group line's price before any repricing).
  const packBaseUnit = Number(bmsProduct?.price) || (packGroupLines[0] ? getPrice(packGroupLines[0]) : 0) || 0;
  // Tier the GROUP total currently matches (exact pairs == groupTotal).
  const packMatchedTier = (packState && packGroupQty > 0)
    ? (packState.tiers.find((t) => t.pairs === packGroupQty) || null)
    : null;
  // Show the exact tier total when the group hits a tier but its lines are NOT
  // yet repriced to the pack per-unit (guest carts). A group already repriced
  // (every line ≈ tier/groupTotal — the logged-in case) is left untouched → no
  // double discount.
  let displaySubtotal = cartTotal;
  if (packState && packMatchedTier && packGroupLines.length) {
    const groupContribution = packGroupLines.reduce((s, i) => s + getPrice(i) * (Number(i.qty) || 0), 0);
    const perUnitTier = Number(packMatchedTier.price) / packGroupQty;
    const allRepriced = packGroupLines.every((i) => Math.abs(getPrice(i) - perUnitTier) < 0.5);
    if (!allRepriced) displaySubtotal = cartTotal - groupContribution + Number(packMatchedTier.price);
  }
  displaySubtotal = Math.max(0, displaySubtotal);

  /* Free shipping: same base as the server — items after pack pricing, before
     coupons (displaySubtotal). */
  const freeShipQualifies = freeShipThreshold > 0 && displaySubtotal >= freeShipThreshold;
  /* Waive the COD fee in the displayed total once the free-shipping threshold is
     met (prepaid is already free). Mirrors the server-side enforcement. */
  const shippingFee = (isCod && freeShipQualifies) ? 0 : Number(selectedFee?.fee || 0);

  // Set the whole pack group's total to P pairs by nudging the anchor line (via
  // the existing qty path → the server reprices the group). Used by the
  // tappable stepper milestones.
  const setGroupPairs = (P) => {
    if (!packAnchor) return;
    const others = packGroupQty - (Number(packAnchor.qty) || 0);
    updateQty(lineKey(packAnchor), Math.max(1, P - others));
  };

  // Shiprocket Checkout (when switched on for Gripzus) replaces the drawer's
  // checkout step (and its coupon box — Shiprocket applies its own coupons).
  // Carts with a pack stay on our own checkout: Shiprocket prices each pair
  // from the catalog and can't apply pack prices.
  const [srOn, setSrOn] = useState(false);
  const [srBusy, setSrBusy] = useState(false);
  useEffect(() => { let live = true; shiprocketEnabled().then((on) => { if (live) setSrOn(on); }); return () => { live = false; }; }, []);

  const useShiprocket = srOn && items.length > 0 && items.every((i) => i.variationId != null && !i.packId);
  // Shiprocket Checkout applies its own coupons, so ours isn't counted then.
  const effectiveCouponDiscount = useShiprocket ? 0 : couponDiscount;

  const finalTotal = Math.round(Math.max(0, displaySubtotal + shippingFee - effectiveCouponDiscount));

  /* Auto-remove a payment-mode-restricted coupon when the shopper switches
     payment mode after applying it (e.g. a Prepaid-only coupon applied while
     Prepaid was selected, then switched to COD). The apply handler blocks
     applying under the wrong mode; this guards the switch-after-apply case. */
  useEffect(() => {
    if (!appliedCoupon) return;
    const restriction = appliedCoupon.paymentModeRestriction;
    if (!restriction || restriction === 'all') return;
    const mode = isCod ? 'cod' : 'prepaid';
    if (restriction !== mode) {
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setCouponInput('');
      const modeText = restriction === 'cod' ? 'Cash on Delivery' : 'Prepaid';
      setCouponError(`Coupon removed — it's valid only for ${modeText} orders.`);
    }
  }, [isCod, appliedCoupon]);

  const sortedFees = useMemo(() => {
    const arr = [...shippingFees];
    arr.sort((a, b) => (a.orderType === 'cod' ? -1 : b.orderType === 'cod' ? 1 : 0));
    return arr;
  }, [shippingFees]);

  /* On open: reset to the cart step and fire view_cart (the drawer opens on the
     cart review). InitiateCheckout is NOT fired here — it moves to the moment the
     shopper taps "Proceed to checkout" (goToCheckout), i.e. the step-1→step-2
     transition, so the funnel event is tied to checkout intent, not merely
     opening the drawer. */
  useEffect(() => {
    if (!open) return;
    cartPageView();
    setCoStep(1);
    if (items.length === 0) return;
    viewCart({
      contents: items.map((i) => ({ id: String(i.id), quantity: i.qty || 1 })),
      value: items.reduce((s, i) => s + getPrice(i) * i.qty, 0),
      currency: 'INR',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* Reset back to the cart step once the cart empties (e.g. last item removed),
     so re-opening or re-filling the cart always starts on step 1. */
  useEffect(() => { if (items.length === 0) setCoStep(1); }, [items.length]);

  /* Advance to the checkout step. Fires Meta InitiateCheckout here — tied to the
     intent to check out (the step-1→step-2 transition), not to opening the drawer.
     With Shiprocket Checkout on, it opens Shiprocket with the whole cart instead. */
  const goToCheckout = async (e) => {
    if (items.length === 0 || srBusy) return;
    fbTrack('InitiateCheckout', {
      content_ids: items.map((i) => String(i.id)),
      content_type: 'product',
      contents: items.map((i) => ({ id: String(i.id), quantity: i.qty || 1 })),
      num_items: items.reduce((s, i) => s + (i.qty || 1), 0),
      value: items.reduce((s, i) => s + getPrice(i) * i.qty, 0),
      currency: 'INR',
    });
    if (useShiprocket) {
      setSrBusy(true);
      try {
        await openShiprocketCheckout(e, items.map((i) => ({ variationId: i.variationId, quantity: i.qty || 1 })), 'cart');
        return;
      } catch {
        // Shiprocket couldn't start: carry on with our own checkout.
      } finally {
        setSrBusy(false);
      }
    }
    setCoStep(2);
    requestAnimationFrame(() => { const b = document.querySelector('.cd-body'); if (b) b.scrollTop = 0; });
  };

  /* Abandoned-cart capture: once the shopper is on the checkout step (coStep 2)
     with a valid 10-digit phone + items, record it so the backend can send a
     WhatsApp recovery if they don't complete (guest or signed-in). Fires once
     per phone (capturedPhoneRef guard) and is best-effort / non-blocking. */
  useEffect(() => {
    if (coStep !== 2 || items.length === 0) return;
    const rawPhone = isAuthenticated
      ? (selectedAddress?.phone_number || selectedAddress?.phoneNumber || addressForm.phoneNumber || '')
      : (guestInfo.phone || '');
    const digits = String(rawPhone).replace(/\D/g, '');
    if (digits.length !== 10 || capturedPhoneRef.current === digits) return;
    capturedPhoneRef.current = digits;
    const first = items[0];
    const summary = `${first?.name || 'your items'}${items.length > 1 ? ` (+${items.length - 1} more)` : ''}`;
    const name = isAuthenticated
      ? (selectedAddress?.full_name || selectedAddress?.fullName || addressForm.fullName || '')
      : (guestInfo.fullName || '');
    captureAbandonedCart({
      phone: digits, name, cartSummary: summary.slice(0, 250), itemCount: totalQty, cartValue: cartTotal,
      // Line items so the WhatsApp recovery link can rebuild this cart on any device.
      items: toRecoveryItems(items, (it) => ({
        productId: it.id, variationId: it.variationId, quantity: it.qty,
        size: it.size, color: it.color, packId: it.packId, packSize: it.packSize,
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coStep, items, guestInfo.phone, guestInfo.fullName, selectedAddress, addressForm.phoneNumber, isAuthenticated]);

  /* Available offers — fetch the brand's public coupons once when the drawer
     opens with items in the cart, so shoppers can tap one to auto-apply. */
  useEffect(() => {
    if (!open || items.length === 0 || availableCoupons.length > 0) return;
    let alive = true;
    getPublicCoupons()
      .then((res) => {
        if (!alive) return;
        setAvailableCoupons(res?.success && Array.isArray(res.coupons) ? res.coupons : []);
      })
      .catch(() => { if (alive) setAvailableCoupons([]); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items.length]);

  /* Reset the offers dropdown whenever the drawer closes. */
  useEffect(() => { if (!open) setOffersOpen(false); }, [open]);

  /* Cross-sell suggestions — reuse the bestsellers service (same one the
     homepage row uses). Fetch once when the drawer opens with items; on
     failure leave the list empty so the strip simply doesn't render. */
  useEffect(() => {
    if (!open || items.length === 0) return;
    let alive = true;
    _xsFetch()
      .then((list) => { if (alive) setSuggestions(Array.isArray(list) ? list : []); })
      .catch(() => { if (alive) setSuggestions([]); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* Products not already in the cart (match on product id), deduped by id,
     capped at 4 for a compact strip. */
  const crossSell = useMemo(() => {
    const inCart = new Set(items.map((i) => String(i.id)));
    const seen = new Set();
    const out = [];
    for (const p of suggestions) {
      const id = String(p.id);
      if (inCart.has(id) || seen.has(id)) continue;
      seen.add(id);
      out.push(p);
      if (out.length >= 4) break;
    }
    return out;
  }, [suggestions, items]);

  const handleAddSuggestion = (p) => {
    const color = p.colorParam || p.colors?.[0]?.name || '';
    const size = (p.sizes || [])[0] || '';
    addItem({
      id: p.id,
      name: p.name,
      slug: p.slug,
      image: (p.images && p.images[0]) || p.image,
      price: Number(p.price ?? 0),
      salePrice: p.salePrice != null ? Number(p.salePrice) : undefined,
      collection: p.collection,
      size,
      color,
      qty: 1,
      variationId: resolveVariationId(p, color, size),
    }, { openDrawer: false });
  };

  /* The primary cart line that drives the pair/pack stepper: prefer a loose
     (non-pack) line, else the first item. Its product id drives the tier +
     full-product fetches below. */
  const primaryPackPid = (() => {
    const p = items.find((i) => !i.packId) || items[0];
    return p ? (p.id ?? null) : null;
  })();

  /* Load the primary product's admin-set bundle tiers so the stepper can show
     the "pair concept" progress. Display-only — it never prices or posts
     anything; the existing qty path + shared pack_id drive server repricing.
     Renders nothing when the product has no tiers. */
  useEffect(() => {
    if (!open || primaryPackPid == null) { setPackState(null); return; }
    let alive = true;
    getBundleTiers(primaryPackPid)
      .then((tiers) => {
        if (!alive) return;
        const list = (Array.isArray(tiers) ? tiers : [])
          .map((t) => ({ pairs: Number(t.pairs), price: Number(t.price), label: t.label || `${Number(t.pairs)} Pairs`, badge: t.badge || null }))
          .filter((t) => Number.isFinite(t.pairs) && t.pairs > 1 && Number.isFinite(t.price) && t.price > 0)
          .sort((a, b) => a.pairs - b.pairs);
        setPackState(list.length ? { productId: primaryPackPid, tiers: list } : null);
      })
      .catch(() => { if (alive) setPackState(null); });
    return () => { alive = false; };
  }, [open, primaryPackPid]);

  /* Load the primary line's FULL product (all variations) so "Buy More, Save
     More" can offer its other colours/sizes. The cart item only carries the
     one chosen variation, so we fetch the product the way the PDP does. */
  useEffect(() => {
    const primary = items.find((i) => !i.packId) || items[0];
    if (!open || !primary || primaryPackPid == null) { setBmsProduct(null); return; }
    const slug = primary.slug || String(primaryPackPid);
    let alive = true;
    getProductBySlug(slug)
      .then((p) => { if (alive) setBmsProduct(p && p.id ? p : null); })
      .catch(() => { if (alive) setBmsProduct(null); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, primaryPackPid]);

  /* "Buy More, Save More": add a variation of the primary product so it BUILDS
     A BUNDLE with the primary line. Both join one shared pack_id; the backend
     prices the whole group by its TOTAL pairs (cart/checkout/order controllers
     sum quantity across the shared pack_id and apply the bundle tier), so a
     2-pair group is charged the 2-pair tier. Reuses the existing addItem/pack
     path the PDP per-pair-colour packs use — no client price is the source of
     truth; the variation id is posted and the server reprices. */
  const buildBundleWith = async (v) => {
    const prod = bmsProduct;
    if (!prod?.id) return;
    const prodLines = items.filter((i) => String(i.id) === String(prod.id));
    const existingPackId = prodLines.find((i) => i.packId)?.packId || null;
    const groupId = existingPackId || ('pk-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
    const looseLines = prodLines.filter((i) => !i.packId);
    // pack_size is metadata only (the server prices by summed quantity); set it
    // to the group's projected pair count.
    const packSize = prodLines.reduce((s, i) => s + (Number(i.qty) || 0), 0) + 1;
    const prodImage = (prod.images && prod.images[0]) || null;
    const lineFor = (src, qty, variationId) => ({
      id: prod.id,
      name: prod.name,
      slug: prod.slug,
      image: src.image || prodImage || null,
      price: Number(src.price) || Number(prod.price) || 0,
      collection: prod.collection,
      size: src.size || '',
      color: src.color || null,
      qty,
      variationId: variationId ?? null,
      packId: groupId,
      packSize,
    });
    try {
      // First bundle add: move the loose primary line(s) into the pack group
      // (pack_id is part of the line key, so remove + re-add with the pack_id).
      for (const ll of looseLines) {
        await removeItem(lineKey(ll));
        await addItem(lineFor(ll, Number(ll.qty) || 1, ll.variationId ?? null), { openDrawer: false, toast: false });
      }
      // Add the chosen variation into the same group.
      await addItem(lineFor(v, 1, v.variationId ?? null), { openDrawer: false, toast: false });
    } catch {
      showError('Could not update the bundle. Please try again.');
    }
  };

  /* Close the offers dropdown on outside click / Escape. */
  useEffect(() => {
    if (!offersOpen) return;
    const onDown = (e) => { if (offersRef.current && !offersRef.current.contains(e.target)) setOffersOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOffersOpen(false); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [offersOpen]);

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
      // Auto-fill city/state from the serviceability lookup — only when the
      // field is empty, never overwrite a value the user already typed.
      const city = r?.city || '';
      const state = r?.state || '';
      if (city || state) {
        setAddressForm((p) => ({
          ...p,
          city: String(p.city || '').trim() ? p.city : (city || p.city),
          state: String(p.state || '').trim() ? p.state : (state || p.state),
        }));
      }
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
    if (errs.length) { setAddrIssues({ errors: errs, warnings: [] }); return; }

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

  /* Auto-save the address once every field is valid — debounced, so the
     user never has to press a button. Mirrors handleSaveAddress's field
     resolution (guest name/phone come from guestInfo). */
  useEffect(() => {
    if (!showAddressForm || addressSaving) return;
    const fd = isAuthenticated
      ? addressForm
      : { ...addressForm, fullName: guestInfo.fullName.trim() || addressForm.fullName, phoneNumber: guestInfo.phone || addressForm.phoneNumber };
    const errs = validateAddress({
      full_name: fd.fullName, address: fd.address, city: fd.city, state: fd.state,
      postal_code: fd.postalCode, phone_number: isAuthenticated ? fd.phoneNumber : guestInfo.phone,
    });
    if (errs.length) return;
    const sig = JSON.stringify({
      fullName: fd.fullName, phoneNumber: isAuthenticated ? fd.phoneNumber : guestInfo.phone,
      address: fd.address, city: fd.city, state: fd.state, postalCode: fd.postalCode,
      country: fd.country, editingAddressId,
    });
    if (sig === lastAutoSaveSig.current) return;
    const t = setTimeout(() => {
      lastAutoSaveSig.current = sig;
      handleSaveAddress({ preventDefault: () => {} });
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddressForm, addressSaving, isAuthenticated, addressForm, guestInfo, editingAddressId]);

  /* ── coupon ───────────────────────────────────────────────────── */
  /* Short one-line blurb for an available offer, e.g. "10% off, min ₹499". */
  const couponBlurb = (c) => {
    const value = Number(c.value) || 0;
    const min = Number(c.minPurchase) || 0;
    let core;
    if (c.type === 'percentage') core = `${value}% off`;
    else if (c.type === 'fixed') core = `₹${value} off`;
    else core = (c.description && String(c.description).replace(/<[^>]*>/g, '').trim()) || 'Special offer';
    return min > 0 ? `${core}, min ₹${min}` : core;
  };

  /* ── Best-offer preview ────────────────────────────────────────── */
  /* Client-side ESTIMATE only; the real discount comes from server-side
     validation on apply. "basis" is the cart subtotal the coupon section
     sends to validateCoupon (cartTotal). */
  const offerCoupons = useMemo(
    () => availableCoupons.filter((c) => String(c.code).toUpperCase() !== String(appliedCoupon?.code || '').toUpperCase()),
    [availableCoupons, appliedCoupon]
  );
  const estOfferDiscount = (c) => {
    const value = Number(c.value) || 0;
    const cap = Number(c.maxDiscount) || 0;
    let disc = 0;
    if (c.type === 'percentage') { disc = (cartTotal * value) / 100; if (cap > 0) disc = Math.min(disc, cap); }
    else if (c.type === 'fixed') { disc = value; }
    return Math.round(Math.min(Math.max(0, disc), cartTotal));
  };
  // "save ₹X" is only meaningful when type + value are clearly present.
  const offerHasSave = (c) => (c.type === 'percentage' || c.type === 'fixed') && Number(c.value) > 0;
  const bestOffer = useMemo(() => {
    if (offerCoupons.length === 0) return null;
    const applicable = offerCoupons.filter((c) => cartTotal >= (Number(c.minPurchase) || 0));
    if (applicable.length > 0) {
      let best = applicable[0], bestDisc = estOfferDiscount(best);
      for (const c of applicable) { const d = estOfferDiscount(c); if (d > bestDisc) { best = c; bestDisc = d; } }
      return { coupon: best, discount: bestDisc, applicable: true, need: 0 };
    }
    // None applicable — surface the one needing the least extra spend.
    let pick = offerCoupons[0], pickNeed = (Number(pick.minPurchase) || 0) - cartTotal;
    for (const c of offerCoupons) { const need = (Number(c.minPurchase) || 0) - cartTotal; if (need < pickNeed) { pick = c; pickNeed = need; } }
    return { coupon: pick, discount: 0, applicable: false, need: Math.max(0, Math.round(pickNeed)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerCoupons, cartTotal]);
  const bestOfferKey = bestOffer ? (bestOffer.coupon.id || bestOffer.coupon.code) : null;
  const remainingOffers = useMemo(
    () => offerCoupons.filter((c) => (c.id || c.code) !== bestOfferKey),
    [offerCoupons, bestOfferKey]
  );

  const handleApplyCoupon = async (codeArg) => {
    const code = String(codeArg ?? couponInput).trim().toUpperCase();
    if (!code) return;
    setCouponError('');
    setCouponLoading(true);
    try {
      const paymentMode = selectedFee?.orderType === 'cod' ? 'cod' : 'prepaid';
      const data = await validateCoupon({ code, cartTotal, paymentMode, cartItems: items });
      if (data?.success && data?.coupon) {
        setAppliedCoupon({ code: data.coupon.code || code, id: data.coupon.id, paymentModeRestriction: data.coupon.paymentModeRestriction });
        setCouponDiscount(Number(data.discountAmount) || 0);
        setCouponInput('');
        setOffersOpen(false);
      } else {
        setCouponError(data?.message || 'Invalid coupon code.');
      }
    } catch (err) {
      setCouponError(err?.message || 'Failed to validate coupon. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponError('');
    setCouponInput('');
  };

  /* ── Abandoned-cart recovery (?recover=1[&coupon=CODE][&cart=TOKEN]) ──
     When a shopper returns via the WhatsApp "Complete Order" link, reopen the
     cart drawer and (best-effort) auto-apply the coupon from the link. The
     link usually opens in WhatsApp's in-app browser, which has no
     localStorage cart, so an empty cart is rebuilt from the server copy
     behind the token (second effect). The remembered code is applied once the
     cart total is known, so minimum-cart rules pass. All best-effort /
     guarded so a bad URL never breaks the page. */
  const recoverCouponRef = useRef(null);
  const [recoverToken, setRecoverToken] = useState(null);

  useEffect(() => {
    try {
      const rec = readCartRecovery();
      if (!rec) return;
      openCart();
      if (rec.coupon) {
        recoverCouponRef.current = rec.coupon;
        // Pre-fill the input immediately so the code is visible even if the
        // auto-apply can't run (empty cart / min-cart rule not met yet).
        setCouponInput(rec.coupon);
      }
      if (rec.cartToken) setRecoverToken(rec.cartToken);
      // Strip the recovery params so a refresh / reshare doesn't re-trigger it.
      clearCartRecoveryParams();
    } catch { /* best-effort — never break the page */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once the local cart has loaded: if it is empty, restore the recovered one.
  // A cart that's still here (same browser) is left exactly as it is.
  useEffect(() => {
    if (!recoverToken || !hydrated) return;
    const token = recoverToken;
    setRecoverToken(null);
    if (items.length) return;
    fetchRecoveredCart(token).then((lines) => { if (lines.length) restoreCart(lines); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoverToken, hydrated]);

  /* Auto-apply the remembered recovery coupon once the cart total is known
     (so minimum-cart rules pass) and nothing is applied yet. Routes through
     the same validate-and-apply path as the manual Apply button. Runs once —
     the ref is cleared on the attempt, so handleApplyCoupon owns the result
     (applied discount or its own couponError). */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!recoverCouponRef.current) return;
    if (appliedCoupon || couponLoading) return;
    if (cartTotal <= 0) return;
    const code = recoverCouponRef.current;
    recoverCouponRef.current = null;
    try { handleApplyCoupon(code); } catch { /* best-effort */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartTotal, appliedCoupon, couponLoading]);

  /* ── order placement ──────────────────────────────────────────── */
  const itemsPayload = () => items
    .filter((it) => it.id != null && !isNaN(Number(it.id)))
    .map((it) => ({
      product_id: Number(it.id),
      variation_id: it.variationId ? Number(it.variationId) : null,
      quantity: Number(it.qty) || 1,
      // Pack group identifiers (null for loose lines). Lines sharing a pack_id
      // are repriced server-side by the group's total quantity (bundle tier).
      pack_id: it.packId || null,
      pack_size: it.packSize || null,
    }));

  /* Meta Purchase custom_data — captured from the cart BEFORE it is cleared. */
  const buildPurchaseData = (orderNumber, value) => ({
    content_ids: items.map((i) => String(i.id)),
    content_type: 'product',
    contents: items.map((i) => ({ id: String(i.id), quantity: i.qty || 1 })),
    num_items: items.reduce((s, i) => s + (i.qty || 1), 0),
    value: Number(value) || 0,
    currency: 'INR',
    order_id: orderNumber,
  });

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

  // GA4 funnel: shipping + payment chosen — fired at order placement (after
  // validation, before the order API call) so GA4 records them ahead of
  // purchase. GA4-only; same item shape as view_cart/InitiateCheckout.
  const fireCheckoutFunnel = (mode, value) => {
    const contents = items.map((i) => ({ id: String(i.id), quantity: i.qty || 1 }));
    addShippingInfo({ contents, value, currency: 'INR', shipping_tier: mode });
    addPaymentInfo({ contents, value, currency: 'INR', payment_type: mode });
  };

  /* After an order: the thank-you page fires the Meta Purchase (deterministic
     eventID, deduped with the backend server event). Without an order number
     the drawer's own success view stays. */
  const showThankYou = (orderNumber, purchaseData) => {
    if (orderNumber && orderNumber !== '—') {
      savePurchaseForThankYou(orderNumber, purchaseData);
      closeCart();
      router.push(`/order-confirmation?order=${encodeURIComponent(orderNumber)}`);
      return;
    }
    setOrderSuccess({ orderNumber: '—' });
  };

  const placeCod = async () => {
    setIsProcessing(true);
    fireCheckoutFunnel('cod', finalTotal);
    try {
      const base = {
        items: itemsPayload(), payment_type: 'cod', notes: '',
        discount_amount: effectiveCouponDiscount, coupon_id: useShiprocket ? null : (appliedCoupon?.id || null), idempotency_key: idemKey(),
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
      const orderNumber = result.order.order_number;
      const purchaseData = buildPurchaseData(orderNumber, finalTotal);
      clearCart();
      toastOrderPlaced(orderNumber);
      showThankYou(orderNumber, purchaseData);
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
          const orderNumber = result.order?.order_number;
          const purchaseData = buildPurchaseData(orderNumber, finalTotal);
          clearCart();
          setPaymentFailed(null);
          toastOrderPlaced(orderNumber);
          showThankYou(orderNumber || '—', purchaseData);
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
    fireCheckoutFunnel('razorpay', finalTotal);
    try {
      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) { showError('Could not load the payment SDK.'); setIsProcessing(false); return; }
      const base = {
        items: itemsPayload(), payment_type: 'razorpay', notes: '',
        discount_amount: effectiveCouponDiscount, coupon_id: useShiprocket ? null : (appliedCoupon?.id || null), idempotency_key: idemKey(),
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
    if (errs.length) { setAddrIssues({ errors: errs, warnings: [] }); return; }
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

        {/* Header — mirrors the two-step flow: "Your Cart" (step 1) vs
            "Checkout" + a "Step 2 of 2" subline (step 2), with a back chevron
            on step 2 that returns to the cart. */}
        <div className="cd-header">
          <div className="cd-header-left">
            {!orderSuccess && items.length > 0 && coStep === 2 ? (
              <button
                type="button"
                className="cd-header-icon"
                onClick={() => setCoStep(1)}
                aria-label="Back to cart"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
            ) : (
              <span className="cd-header-icon"><IconBag /></span>
            )}
            <div>
              <span className="cd-header-title">{orderSuccess ? 'Order Confirmed' : coStep === 2 ? 'Checkout' : 'Your Cart'}</span>
              {!orderSuccess && (coStep === 2
                ? <span style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: '#666', lineHeight: 1.3, marginTop: 2 }}>Step 2 of 2 · delivery &amp; payment</span>
                : <span className="cd-header-count">{totalQty}</span>)}
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

              {/* ── STEP 1 (Your cart): pair/pack stepper, items, bundle builder ── */}
              {/* Pair/pack progress stepper — reflects the admin-set bundle tiers
                  for the primary product's PACK GROUP (the "pair concept"). qty is
                  the COMBINED pairs across every line sharing the group's pack_id,
                  so adding a variation via "Buy More, Save More" moves the stepper
                  and unlocks a pack. Tapping a milestone sets the group's pairs,
                  and the backend applies the pack price. Server-authoritative:
                  getBundleTiers drives the labels, the group's live qty drives the
                  fill, and the server prices the group by its total pairs. Styled
                  in Gripzus's own square, monochrome tokens (no bars, no colour). */}
              {coStep === 1 && packState && packGroupLines.length > 0 && (() => {
                const tiers = packState.tiers;
                const qty = packGroupQty;
                const baseUnit = packBaseUnit;
                const canTap = !!packAnchor;
                const milestones = [
                  { pairs: 1, total: baseUnit, label: '1 Pair' },
                  ...tiers.map((t) => ({ pairs: t.pairs, total: t.price, label: t.label })),
                ];
                const n = milestones.length;
                const maxPairs = milestones[n - 1].pairs;
                const savedFor = (pairs, total) => Math.max(0, Math.round(baseUnit * pairs - total));
                // Fill measured along the evenly-spaced dots (by index, not pair
                // value) so it lands on the dots even when tiers aren't consecutive.
                let reachedIdx = 0;
                for (let k = 0; k < n; k++) { if (qty >= milestones[k].pairs) reachedIdx = k; }
                let frac = reachedIdx;
                if (reachedIdx < n - 1) {
                  const cur = milestones[reachedIdx].pairs, nxt = milestones[reachedIdx + 1].pairs;
                  if (nxt > cur) frac += Math.min(1, (qty - cur) / (nxt - cur));
                }
                const fillPct = n > 1 ? (frac / (n - 1)) * 100 : 0;
                const nextTier = tiers.find((t) => t.pairs > qty) || null;
                let msg;
                if (nextTier) {
                  const need = nextTier.pairs - qty;
                  const saved = savedFor(nextTier.pairs, nextTier.price);
                  msg = <>Add <b style={{ color: 'var(--ink)' }}>{need} pair{need > 1 ? 's' : ''}</b> → {nextTier.pairs}-pair pack{saved > 0 ? <>, save ₹{saved}</> : ''}</>;
                } else {
                  msg = <span style={{ fontWeight: 700, color: 'var(--ink)' }}>Best value — {maxPairs}-pair pack applied</span>;
                }
                return (
                  <div className="cd-sv-section">
                    <div className="cd-section-title">Pack savings</div>
                    <div style={{ padding: '13px 14px', background: 'var(--paper-warm, #ECE9E1)', border: '1px solid var(--line, #E2DDD2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 7, fontSize: 12.5, color: 'var(--ink-soft, #575552)', lineHeight: 1.35 }}>
                        <span style={{ minWidth: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg}</span>
                      </div>
                      <div style={{ position: 'relative', height: 48, marginTop: 14 }}>
                        {/* hairline track + ink fill (6%..94% so the ends sit under the edge marks) */}
                        <div style={{ position: 'absolute', left: '6%', right: '6%', top: 6, height: 2, background: 'var(--line-ink, #D5CFC3)' }} />
                        <div style={{ position: 'absolute', left: '6%', top: 6, height: 2, background: 'var(--ink, #121212)', width: `calc(88% * ${fillPct / 100})`, transition: 'width .35s ease' }} />
                        {milestones.map((m, i) => {
                          const pct = n > 1 ? 6 + (i / (n - 1)) * 88 : 50;
                          const reached = qty >= m.pairs;
                          const selected = qty === m.pairs;
                          const saved = m.pairs > 1 ? savedFor(m.pairs, m.total) : 0;
                          return (
                            <button
                              type="button"
                              key={i}
                              onClick={canTap ? () => setGroupPairs(m.pairs) : undefined}
                              disabled={!canTap}
                              aria-label={`Set ${m.pairs} pair${m.pairs > 1 ? 's' : ''}`}
                              aria-pressed={selected}
                              style={{ position: 'absolute', left: `${pct}%`, top: 0, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', width: 70, background: 'none', border: 0, padding: 0, font: 'inherit', cursor: canTap ? 'pointer' : 'default' }}
                            >
                              {/* Square selection mark — ink-filled when reached (the
                                  site is all-square by design; no round dots). */}
                              <span aria-hidden="true" style={{ width: 14, height: 14, display: 'grid', placeItems: 'center', background: reached ? 'var(--ink, #121212)' : 'var(--paper, #F4F2EC)', border: `1px solid ${reached ? 'var(--ink, #121212)' : 'var(--line-ink, #D5CFC3)'}`, color: 'var(--paper, #F4F2EC)', boxShadow: selected ? '0 0 0 2px var(--paper-warm, #ECE9E1), 0 0 0 3px var(--ink, #121212)' : 'none' }}>
                                {reached ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : null}
                              </span>
                              <span style={{ fontSize: 10.5, fontWeight: 700, marginTop: 6, color: reached ? 'var(--ink, #121212)' : 'var(--ink-muted, #9A968F)', whiteSpace: 'nowrap' }}>{m.pairs} Pair{m.pairs > 1 ? 's' : ''}</span>
                              {saved > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-soft, #575552)', marginTop: 1, whiteSpace: 'nowrap' }}>save ₹{saved}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Items */}
              {coStep === 1 && (
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
                          {it.image ? <GzImage src={it.image} alt={it.name} w={200} /> : <div className="cd-item-img-placeholder" />}
                        </div>
                        <div className="cd-item-info">
                          <p className="cd-item-name">{it.name}</p>
                          {it.color && <p className="cd-item-meta">Colour: {it.color}</p>}
                          {it.size  && <p className="cd-item-meta">Size: {it.size}</p>}
                          {it.packId && <p className="cd-item-meta">Pack of {it.packSize || it.qty} · priced per pair</p>}
                          <div className="cd-item-row">
                            <div className="cd-item-prices">
                              <span className="cd-item-price">₹{(price * it.qty).toFixed(0)}</span>
                              {mrp > price && <span className="cd-item-original-price">₹{(mrp * it.qty).toFixed(0)}</span>}
                            </div>
                            {it.packId ? (
                              /* Pack pairs are priced as a group, so their quantity
                                 is locked (editing one line would desync the tier). */
                              <div className="cd-qty" aria-label="Pack quantity" title="Part of a pack">
                                <span className="cd-qty-val">×{it.qty}</span>
                              </div>
                            ) : (
                              <div className="cd-qty">
                                <button className="cd-qty-btn" onClick={() => updateQty(key, it.qty - 1)} disabled={it.qty <= 1} aria-label="Decrease">−</button>
                                <span className="cd-qty-val">{it.qty}</span>
                                <button className="cd-qty-btn" onClick={() => updateQty(key, it.qty + 1)} aria-label="Increase">+</button>
                              </div>
                            )}
                          </div>
                        </div>
                        <button className="cd-item-remove" onClick={() => removeItem(key)} aria-label="Remove"><IconTrash /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {/* Coupon — part of step 1 (the cart review), like Morbix. Hidden
                  with Shiprocket Checkout, which applies its own coupons. */}
              {coStep === 1 && !useShiprocket && (
              <div className="cd-sv-section">
                <div className="cd-section-title">Coupon</div>
                {appliedCoupon ? (
                  <div className="cd-coupon-applied">
                    <span>{appliedCoupon.code} — −₹{couponDiscount.toFixed(0)}</span>
                    <button type="button" className="cd-coupon-remove" onClick={handleRemoveCoupon} aria-label="Remove coupon">✕</button>
                  </div>
                ) : (
                  <>
                    <div className="cd-coupon-wrap">
                      <input
                        className="cd-coupon-input"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
                        placeholder="Enter coupon code"
                        aria-label="Coupon code"
                      />
                      <button
                        type="button"
                        className="cd-coupon-btn"
                        onClick={() => handleApplyCoupon()}
                        disabled={couponLoading || !couponInput.trim()}
                      >
                        {couponLoading ? '…' : 'Apply'}
                      </button>
                    </div>
                    {couponError && <p className="cd-coupon-error" role="alert">{couponError}</p>}

                    {/* Best offer — a banner for the single best applicable
                        coupon, with a "See all N offers" toggle revealing the
                        remaining coupons below it. */}
                    {bestOffer && (
                      <div className="cd-bestoffer" ref={offersRef}>
                        <div className="cd-bestoffer-banner">
                          <span className="cd-bestoffer-mark" aria-hidden="true"><IconMoney /></span>
                          <div className="cd-bestoffer-main">
                            <p className="cd-bestoffer-headline">
                              {bestOffer.applicable ? (
                                offerHasSave(bestOffer.coupon) ? (
                                  <>Apply <strong>{bestOffer.coupon.code}</strong> — save ₹{bestOffer.discount}</>
                                ) : (
                                  <>Apply <strong>{bestOffer.coupon.code}</strong> — {couponBlurb(bestOffer.coupon)}</>
                                )
                              ) : (
                                <>Add ₹{bestOffer.need} more to use <strong>{bestOffer.coupon.code}</strong></>
                              )}
                            </p>
                            <p className="cd-bestoffer-sub">{bestOffer.applicable ? 'Best offer for your cart' : 'Almost there — unlock this offer'}</p>
                          </div>
                          {bestOffer.applicable && (
                            <button
                              type="button"
                              className="cd-bestoffer-apply"
                              onClick={() => { handleApplyCoupon(bestOffer.coupon.code); }}
                              disabled={couponLoading}
                              aria-label={`Apply coupon ${bestOffer.coupon.code}`}
                            >
                              {couponLoading ? '…' : 'Apply'}
                            </button>
                          )}
                        </div>

                        {remainingOffers.length > 0 && (
                          <>
                            <button
                              type="button"
                              className="cd-seeall-toggle"
                              onClick={() => setOffersOpen((v) => !v)}
                              aria-expanded={offersOpen}
                            >
                              <span>See all {offerCoupons.length} offers</span>
                              <span className={`cd-seeall-chevron ${offersOpen ? 'open' : ''}`} aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                              </span>
                            </button>
                            {offersOpen && (
                              <div className="cd-seeall-list" role="list">
                                {remainingOffers.map((c) => (
                                  <div className="cd-seeall-row" key={c.id || c.code}>
                                    <div className="cd-seeall-info">
                                      <span className="cd-offer-code">{c.code}</span>
                                      <span className="cd-offer-desc">{couponBlurb(c)}</span>
                                    </div>
                                    <button
                                      type="button"
                                      className="cd-seeall-apply"
                                      onClick={() => handleApplyCoupon(c.code)}
                                      disabled={couponLoading}
                                      aria-label={`Apply coupon ${c.code}`}
                                    >
                                      Apply
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              )}

              {/* Buy More, Save More — offers the CART product's OTHER in-stock
                  variations (colours/sizes not yet in the cart) so the shopper
                  can build toward a bundle-pack tier. Adding one JOINS a shared
                  pack_id group with the primary line (buildBundleWith) so the
                  combined pairs build the bundle and the stepper counts the group
                  total. Falls back to the bestsellers cross-sell feed when the
                  product has no other variations. Server stays price-authoritative:
                  each "+ Add" posts the real variation via the shared add path —
                  no client price is the source of truth. RTL horizontal scroll
                  (container dir=rtl, cards dir=ltr). Styled in Gripzus's own
                  square, monochrome tokens. */}
              {coStep === 1 && (() => {
                // Primary line's product variations not already in the cart.
                const variantRows = (() => {
                  const prod = bmsProduct;
                  if (!prod || !Array.isArray(prod.variations) || prod.variations.length === 0) return [];
                  const attrsOf = (v) => { try { return typeof v.attributes === 'string' ? JSON.parse(v.attributes) : (v.attributes || {}); } catch { return {}; } };
                  const arr = (x) => (Array.isArray(x) ? x : (x == null || x === '' ? [] : [x]));
                  const colorImg = {};
                  (prod.colors || []).forEach((c) => { if (c && c.name) colorImg[String(c.name).toLowerCase()] = (c.images || []).filter(Boolean)[0] || null; });
                  const mine = items.filter((i) => String(i.id) === String(prod.id));
                  const inCartVarIds = new Set(mine.map((i) => i.variationId).filter((x) => x != null).map(String));
                  const inCartKeys = new Set(mine.map((i) => `${String(i.color || '').toLowerCase()}|${String(i.size || '').toLowerCase()}`));
                  const seen = new Set();
                  const rows = [];
                  for (const v of prod.variations) {
                    if (!v || v.id == null) continue;
                    if ((Number(v.stock) || 0) <= 0) continue; // only addable variations
                    const a = attrsOf(v);
                    const colors = arr(a.color).map((c) => String(c).trim()).filter(Boolean);
                    if (colors.length !== 1) continue; // skip multi-colour pack rows
                    const color = colors[0];
                    const size = arr(a.size).map((s) => String(s).trim()).filter(Boolean)[0] || '';
                    const vid = String(v.id);
                    if (seen.has(vid)) continue;
                    const key = `${color.toLowerCase()}|${size.toLowerCase()}`;
                    if (inCartVarIds.has(vid) || inCartKeys.has(key)) continue;
                    seen.add(vid);
                    const image = colorImg[color.toLowerCase()] || (prod.images && prod.images[0]) || null;
                    const price = Number(v.price) || Number(prod.price) || 0;
                    const cmp = Number(v.comparePrice);
                    const mrp = Number.isFinite(cmp) && cmp > price ? cmp : (Number(prod.compareAtPrice) > price ? Number(prod.compareAtPrice) : 0);
                    const label = [color, size ? `Size ${size}` : null].filter(Boolean).join(' · ') || prod.name;
                    rows.push({ key: `v-${vid}`, image, name: prod.name, label, price, mrp, onAdd: () => buildBundleWith({ variationId: v.id, color, size, price, image }) });
                    if (rows.length >= 8) break;
                  }
                  return rows;
                })();

                // Fall back to the bestsellers feed so the section is never empty.
                const rows = variantRows.length > 0 ? variantRows : crossSell.map((p) => {
                  const img = (p.images && p.images[0]) || p.image;
                  const price = Number(p.salePrice ?? p.price ?? 0);
                  const mrp = Number(p.compareAtPrice) > price ? Number(p.compareAtPrice) : 0;
                  const sz = Array.isArray(p.sizes) ? (p.sizes[0] || '') : '';
                  const variant = p.colorParam || (Array.isArray(p.colors) ? p.colors[0]?.name : null) || null;
                  return { key: `s-${p.uid ?? p.id}`, image: img, name: p.name, label: [variant, sz ? `Size ${sz}` : null].filter(Boolean).join(' · '), price, mrp, onAdd: () => handleAddSuggestion(p) };
                });

                if (rows.length === 0) return null;
                const isVariants = variantRows.length > 0;

                return (
                  <div className="cd-sv-section">
                    <style>{`.cd-bms-scroll::-webkit-scrollbar{width:0;height:0;display:none}`}</style>
                    <div className="cd-section-title">Buy More, Save More</div>
                    <div style={{ background: 'var(--paper-warm, #ECE9E1)', border: '1px solid var(--line, #E2DDD2)', padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.02em', color: 'var(--ink, #121212)', marginBottom: 10, textAlign: 'center' }}>
                        {isVariants ? 'Add one more & save — bundle prices unlocked' : 'You may also like'}
                      </div>
                      <div className="cd-bms-scroll" dir="rtl" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                        {rows.map((r) => {
                          const save = r.mrp > r.price ? Math.round(r.mrp - r.price) : 0;
                          return (
                            <div key={r.key} dir="ltr" style={{ flex: '0 0 auto', width: 232, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--paper, #F4F2EC)', border: '1px solid var(--line, #E2DDD2)', padding: 8 }}>
                              <div style={{ width: 46, height: 46, overflow: 'hidden', background: 'var(--paper-deep, #E3DFD5)', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
                                {r.image
                                  ? <GzImage src={r.image} alt={r.name} w={200} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  : null}
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink, #121212)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                                {r.label && <div style={{ fontSize: 10.5, color: 'var(--ink-muted, #9A968F)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{r.label}</div>}
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink, #121212)' }}>₹{r.price.toFixed(0)}</span>
                                  {r.mrp > r.price && <span style={{ fontSize: 11, color: 'var(--ink-muted, #9A968F)', textDecoration: 'line-through' }}>₹{r.mrp.toFixed(0)}</span>}
                                  {save > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink, #121212)', background: 'var(--paper, #F4F2EC)', border: '1px solid var(--line-ink, #D5CFC3)', padding: '1px 6px' }}>Save ₹{save}</span>}
                                </div>
                              </div>
                              <button type="button" onClick={r.onAdd} aria-label={`Add ${r.name} to cart`} style={{ flexShrink: 0, border: '1px solid var(--ink, #121212)', background: 'transparent', color: 'var(--ink, #121212)', fontSize: 11.5, fontWeight: 600, padding: '6px 11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Order Summary */}
              <div className="cd-sv-section">
                <div className="cd-section-title">Order Summary</div>
                <div className="cd-summary">
                  <div className="cd-summary-row"><span>Subtotal</span><span>₹{displaySubtotal.toFixed(0)}</span></div>
                  <div className="cd-summary-row">
                    <span>Shipping</span>
                    <span style={shippingFee === 0 ? { color: '#16a34a', fontWeight: 700 } : {}}>{shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}</span>
                  </div>
                  {effectiveCouponDiscount > 0 && (
                    <div className="cd-summary-row cd-summary-discount">
                      <span>Discount{appliedCoupon ? ` (${appliedCoupon.code})` : ''}</span>
                      <span>−₹{effectiveCouponDiscount.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="cd-summary-row cd-summary-total"><span>Total</span><span>₹{finalTotal.toFixed(0)}</span></div>
                </div>
              </div>

              {/* ── STEP 2 (Checkout): delivery & payment ── */}
              {/* Delivery details */}
              {coStep === 2 && (
              <div className="cd-sv-section">
                <div className="cd-section-title">{isAuthenticated ? 'Delivery Address' : 'Delivery Details'}</div>
                {addressLoading ? (
                  // Saved-address cards in their real frame while they load.
                  <SkBusy label="Loading addresses…" className="cd-loading" style={{ display: 'grid', gap: 10 }}>
                    {[0, 1].map((i) => (
                      <div key={i} className="cd-address-card" aria-hidden="true">
                        <div style={{ flex: 1, display: 'grid', gap: 8 }}><Sk className="h-3.5 w-2/5" /><Sk className="h-3 w-11/12" /><Sk className="h-3 w-1/3" /></div>
                      </div>
                    ))}
                  </SkBusy>
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
                          <p className="cd-autosave-hint" style={{ fontSize: 13, color: '#6b7280', margin: 0, flex: 1 }}>{addressSaving ? 'Saving your address…' : 'Your address saves automatically once all details are filled.'}</p>
                          {(selectedAddress || isAuthenticated) && (
                            <button type="button" className="cd-btn-ghost" onClick={() => { setShowAddressForm(false); setEditingAddressId(null); }}>Cancel</button>
                          )}
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>
              )}

              {/* Payment method */}
              {coStep === 2 && sortedFees.length > 0 && (
                <div className="cd-sv-section">
                  <div className="cd-section-title">How would you like to pay?</div>
                  <div className="cd-delivery-list">
                    {sortedFees.map((fee) => {
                      const blocked = fee.orderType === 'cod' && !codAllowed;
                      const sel = selectedFee?.id === fee.id;
                      const free = Number(fee.fee || 0) === 0 || (fee.orderType === 'cod' && freeShipQualifies);
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
            {coStep === 1 ? (
              /* Step 1 CTA — advance to the checkout step (fires InitiateCheckout),
                 or Shiprocket's BUY NOW button when Shiprocket Checkout is on. */
              useShiprocket ? (
                <ShiprocketButton label="BUY NOW" onClick={goToCheckout} busy={srBusy} disabled={isProcessing} />
              ) : (
              <button className="cd-btn-primary cd-btn-full" onClick={goToCheckout} disabled={isProcessing}>
                Proceed to checkout · ₹{finalTotal.toFixed(0)}
              </button>
              )
            ) : (
              <>
                {!pincodeServiceable && (
                  <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 0, padding: '10px 12px', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
                    We don’t deliver to this PIN code yet — please try a different delivery address.
                  </div>
                )}
                <button className="cd-btn-primary cd-btn-full" onClick={handlePlaceOrder} disabled={isProcessing || !pincodeServiceable}>
                  {isProcessing ? 'Processing…' : `${isPrepaid ? 'Pay Now' : 'Place Order'} — ₹${finalTotal.toFixed(0)}`}
                </button>
              </>
            )}
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

// redeploy: coupon dropdown rollout
