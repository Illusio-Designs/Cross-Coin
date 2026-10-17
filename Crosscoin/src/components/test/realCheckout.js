// Real checkout for the /test preview — places GENUINE guest orders against the
// live Crosscoin order/payment APIs (COD + Razorpay), exactly like the real
// CartDrawer does. Every order is tagged in `notes` so test-preview orders are
// easy to spot and cancel in admin. PREVIEW ONLY.
import {
  createGuestOrder,
  initiateGuestCheckout,
  updateOrderPayment,
} from '../../services/publicApi';

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
const TEST_NOTE = 'TEST PREVIEW ORDER (placed from /test design preview)';

function uid() {
  try { return (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.random().toString(16).slice(2); }
  catch (_) { return String(Date.now()) + Math.random().toString(16).slice(2); }
}

function guestSessionId() {
  try {
    let s = localStorage.getItem('cc_test_guest_session');
    if (!s) { s = 'ccpv_' + uid(); localStorage.setItem('cc_test_guest_session', s); }
    return s;
  } catch (_) { return 'ccpv_' + uid(); }
}

export function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || parts[0] || '' };
}

// Cart lines → the order items payload. Each line carries the real product id
// and the real variation id (vid) picked on the PDP / quick-add.
export function buildItems(cart) {
  return cart.map((i) => ({
    product_id: i.id,
    variation_id: i.vid || null,
    quantity: i.qty,
    // Bundle-pack lines carry pack_id + pack_size so the backend reprices the
    // whole group at the matching tier (same contract as the live cart).
    ...(i.packId ? { pack_id: i.packId, pack_size: i.packSize || null } : {}),
  }));
}

function buildGuestInfo(form) {
  const { firstName, lastName } = splitName(form.name);
  return { email: form.email, firstName, lastName, phone: form.phone };
}
function buildShippingAddress(form) {
  return {
    fullName: form.name,
    address: form.addr,
    city: form.city,
    state: form.state || '',
    pincode: form.pin,
    phone: form.phone,
  };
}

// COD — creates the order directly. Returns the live order number.
export async function placeCodGuest({ cart, form, couponId, discount }) {
  const body = {
    items: buildItems(cart),
    payment_type: 'cod',
    notes: TEST_NOTE,
    discount_amount: discount || 0,
    coupon_id: couponId || null,
    idempotency_key: uid(),
    guest_info: buildGuestInfo(form),
    shipping_address: buildShippingAddress(form),
    session_id: guestSessionId(),
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };
  const res = await createGuestOrder(body);
  const orderNo = res?.order?.order_number || res?.data?.order?.order_number || '';
  return { ok: !!orderNo, orderNo, raw: res };
}

function loadRazorpay() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// Prepaid — reserves stock + a Razorpay order, opens real Razorpay, then verifies
// (the order is created server-side on successful verify). REAL payment.
export async function placePrepaidGuest({ cart, form, couponId, discount, onSuccess, onFail, onDismiss }) {
  const { firstName, lastName } = splitName(form.name);
  const init = await initiateGuestCheckout({
    items: buildItems(cart),
    payment_type: 'razorpay',
    notes: TEST_NOTE,
    discount_amount: discount || 0,
    coupon_id: couponId || null,
    idempotency_key: uid(),
    // The backend guest schema (validateBody(guestInitiateSchema)) REQUIRES the
    // nested guest_info object; without it the request is rejected before the
    // controller runs with { path:'guest_info', code:'invalid_type',
    // message:'Required' } and the prepaid (Razorpay) flow can't start. Flat
    // fields are kept for the controller's backward-compat path (the COD path
    // here already sends guest_info via buildGuestInfo).
    guest_info: buildGuestInfo(form),
    phone: form.phone,
    email: form.email,
    firstName,
    lastName,
    shipping_address: buildShippingAddress(form),
  });
  if (!init?.success || !init?.razorpay_order?.id) {
    onFail && onFail(init?.message || 'Could not start payment. Try again.');
    return;
  }
  const ok = await loadRazorpay();
  if (!ok || !window.Razorpay) { onFail && onFail('Payment library failed to load.'); return; }
  const rzp = init.razorpay_order;
  const reservationId = init.reservation_id;
  const options = {
    key: RAZORPAY_KEY,
    amount: rzp.amount,
    currency: rzp.currency || 'INR',
    name: 'Cross Coin',
    description: 'Payment for Cross Coin Order (test preview)',
    order_id: rzp.id,
    prefill: { name: form.name, email: form.email, contact: form.phone },
    theme: { color: '#CE1E36' },
    handler: async (response) => {
      try {
        const result = await updateOrderPayment({
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          razorpaySignature: response.razorpay_signature,
          reservation_id: reservationId,
        });
        const orderNo = result?.order?.order_number || result?.data?.order?.order_number || '';
        if (orderNo) onSuccess && onSuccess(orderNo);
        else onFail && onFail(result?.message || 'Payment verification failed.');
      } catch (e) {
        onFail && onFail('Payment verification failed.');
      }
    },
    modal: { ondismiss: () => { onDismiss && onDismiss(); } },
  };
  new window.Razorpay(options).open();
}
