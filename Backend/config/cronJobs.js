const cron = require('node-cron');

/**
 * Scheduled jobs — the registry (JOBS) and their wiring (initializeCronJobs).
 *
 * Each entry: key, plain-English name and schedule (shown on the dashboard's
 * System health page), the cron expression + time zone, how it runs, and
 * run() — the job itself, which returns a one-line plain-English summary
 * (or { summary, status }) that services/jobRunService.js records per run.
 *
 * How a job runs:
 *   mode 'inline' — node-cron runs it right on the tick (light jobs).
 *   mode 'queue'  — the tick only enqueues a Bull message `cron:<key>`; the
 *                   queue worker runs it one-at-a-time (concurrency 1) and it
 *                   can move to a dedicated worker with zero code change.
 *                   queue: 'once' — attempts:1, NO retry (these jobs send
 *                   customer WhatsApp messages; a retry could re-send) and a
 *                   jobId per minute-slot, so with several app instances
 *                   firing the same tick Bull keeps ONE job for that slot.
 *                   queue: 'retry' — Bull's default retries (5 attempts,
 *                   exponential backoff); also enqueued by the HTTP cron
 *                   trigger (/api/cron/run, see routes/routesManager.js).
 * Falls back to inline execution when Redis is unavailable (see
 * services/integrationQueue.js).
 *
 * tz: 'Asia/Kolkata' pins a job to IST; tz: null follows the server clock
 * (left as it was — the System health page shows the real next run).
 *
 * Every run (scheduled or "Run now") goes through runLogged(): one run of a
 * job at a time, timed, and recorded in job_runs.
 */

const IST = 'Asia/Kolkata';

// ── Summary helpers ────────────────────────────────────────────────────────
// "9 sent · 2 skipped (no number) · 1 failed" — zero counts are left out.
function countLine(head, parts) {
  return [head, ...parts.filter(([n]) => n > 0).map(([n, label]) => `${n} ${label}`)].join(' · ');
}
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// Some sends failed → partial; all of them failed → failed.
const statusFor = (done, failed) => (failed > 0 ? (done > 0 ? 'partial' : 'failed') : 'ok');

// Cart-rule gate reasons (services/cartRecoveryService.js) → summary labels.
const GATE_LABEL = {
  below_min: 'skipped (below minimum value)',
  quiet_hours: 'waiting (quiet hours)',
  too_soon: 'waiting',
  messaged_recently: 'skipped (messaged recently)',
  ordered: 'skipped (already ordered)',
  no_number: 'skipped (no number)',
  check_failed: 'skipped (check failed)',
};
function gateParts(gateSkips) {
  return Object.entries(gateSkips).map(([reason, n]) => [n, GATE_LABEL[reason] || `skipped (${reason})`]);
}

// ── Job bodies ─────────────────────────────────────────────────────────────

// Courier status refresh (moved here from integrationQueueWorkers.js).
async function shippingStatusRefresh() {
  const orderShippingController = require('../controller/orderShippingController.js');
  const mockReq = {
    user: { id: 'system', username: 'cron_job' },
    query: {
      limit: 100,
      status: 'confirmed,processing,booked,pickup initiated,manifested,in transit,shipped,out for delivery,undelivered,rto,exception',
    },
  };
  let result = null;
  let failure = null;
  const mockRes = {
    json: (data) => { result = data; },
    status: (code) => ({ json: (body) => { failure = { code, body }; } }),
  };
  await orderShippingController.bulkRefreshShippingStatus(mockReq, mockRes);
  if (failure) {
    const why = failure.body?.error || failure.body?.message || `error ${failure.code}`;
    return { status: 'failed', summary: `Couldn't refresh: ${why}`.slice(0, 200), error: JSON.stringify(failure.body || {}).slice(0, 2000) };
  }
  const r = result?.data || {};
  if (!r.total) return 'No shipments to check';
  const ok = (r.updated || 0) + (r.unchanged || 0);
  const errs = (r.errors || 0) + (r.validation_failed || 0);
  return {
    status: statusFor(ok, errs),
    summary: countLine(`${plural(r.total, 'shipment', 'shipments')} checked · ${r.updated || 0} updated`, [[errs, "couldn't be checked"]]),
    error: errs ? (r.errors_list || []).slice(0, 5).map((e) => `${e.order_number}: ${e.error}`).join('\n') || null : null,
  };
}

// Daily booking batch. iThink orders are NOT booked on payment; each is queued
// with pickup_hold_until (the date of its batch). This run books every order
// whose batch date has arrived. Booking at 11:00 IST (past the courier's
// same-day cut-off) makes iThink schedule the pickup for the NEXT day — so
// orders placed before 11:00 book today and are picked up tomorrow; a batch
// held through a closed day books once the pickup lands on an allowed day.
// The queue worker re-checks the schedule: it books, or re-holds to the next
// allowed day.
async function releaseHeldPickups() {
  const { Order } = require('../model/orderModel.js');
  const { Op } = require('sequelize');
  const todayIst = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  const due = await Order.findAll({
    where: {
      pickup_hold_until: { [Op.ne]: null, [Op.lte]: todayIst },
      shipping_waybill: null,
      status: { [Op.notIn]: ['cancelled', 'delivered', 'returned', 'rto', 'refunded'] },
    },
    attributes: ['id', 'order_number'],
    limit: 500,
  });
  if (!due.length) return 'No orders waiting to be booked';
  const { enqueue } = require('../services/integrationQueue.js');
  let queued = 0;
  for (const o of due) {
    try { await enqueue('shipping:sync-order', { orderId: o.id, attempt: 1 }); queued++; } catch (_) {}
  }
  const failed = due.length - queued;
  return {
    status: statusFor(queued, failed),
    summary: countLine(`${plural(queued, 'held order', 'held orders')} sent for booking`, [[failed, "couldn't be queued"]]),
  };
}

// Leaked stock-reservation cleanup. Abandoned checkouts let their reservation
// session expire, but the stock:reserved counter has no TTL, so without this
// sweep popular items drift into phantom "out of stock" while the DB still
// has inventory.
async function reservationCleanup() {
  const { cleanupLeakedReservations } = require('../services/stockReservationService.js');
  const { corrected } = await cleanupLeakedReservations();
  return corrected > 0 ? `${plural(corrected, 'stuck stock hold', 'stuck stock holds')} released` : 'Nothing to fix';
}

// Keeps time-based badges (new arrival) and stock badges current without
// anyone editing a product.
async function badgeRefresh() {
  const { checked, changed } = await require('../services/badgeService.js').refreshAllBadges();
  return `${changed} of ${plural(checked, 'product badge', 'product badges')} updated`;
}

// Loyalty points expiry (moved here from integrationQueueWorkers.js).
async function loyaltyExpiry() {
  const result = await require('../services/loyaltyService.js').expirePoints();
  const n = result?.expiredCount || 0;
  return n ? `${plural(n, 'batch', 'batches')} of points expired` : 'No points due to expire';
}

// For every Razorpay payment marked pending/failed in the last 48h, ask
// Razorpay what really happened and reconcile our local row. Catches dropped
// webhooks and signature-rejection races.
async function paymentReconciliation() {
  const { reconcileRecentPayments } = require('../services/paymentReconciliationService.js');
  // Queue mode if Bull is wired; falls back to inline if Redis is down.
  // RECON_USE_QUEUE=false lets an operator force inline if needed.
  const useQueue = process.env.RECON_USE_QUEUE !== 'false';
  const s = await reconcileRecentPayments({ sinceHours: 48, limit: 500, useQueue });
  if (s.mode === 'queue') {
    if (!s.total) return 'No unpaid online payments to check';
    return {
      status: statusFor(s.enqueued, s.total - s.enqueued),
      summary: countLine(`${plural(s.enqueued, 'unpaid online payment', 'unpaid online payments')} sent for checking with Razorpay`, [[s.total - s.enqueued, "couldn't be queued"]]),
    };
  }
  if (!s.checked) return 'No unpaid online payments to check';
  return {
    status: statusFor(s.checked - s.errors, s.errors),
    summary: countLine(`${plural(s.checked, 'payment', 'payments')} checked · ${s.corrected} fixed (paid at Razorpay)`, [[s.errors, "couldn't be checked"]]),
  };
}

// DPDP data retention sweep. Drops stale analytics / leads / contact /
// abandoned-guest rows per the configured windows. Order & invoice data is
// never touched. A handful of bounded DELETEs.
async function dataRetention() {
  const { runRetention } = require('../services/dataRetentionService.js');
  const s = await runRetention();
  const LABEL = { funnel_events: 'visit events', utm_tracking: 'ad-click records', lead_captures: 'leads', contact_messages: 'contact messages', guest_users: 'guest accounts' };
  const removed = Object.entries(s).filter(([, v]) => typeof v === 'number' && v > 0).map(([k, v]) => `${v} ${LABEL[k] || k}`);
  const errored = Object.entries(s).filter(([, v]) => v === 'error').map(([k]) => LABEL[k] || k);
  const head = removed.length ? `Removed ${removed.join(' · ')}` : 'Nothing old enough to remove';
  if (!errored.length) return head;
  return { status: 'partial', summary: `${head} · couldn't clean ${errored.join(', ')}` };
}

// ── Abandoned Cart Recovery (logged-in carts) ─────────────────────────────
// Finds carts with items that haven't converted to an order in 1 hour.
async function abandonedCart() {
  // Load via associations to ensure all relationships are registered
  const { Cart, CartItem, User, Order, Product } = require('../model/associations.js');
  const { Op } = require('sequelize');
  const whatsappService = require('../services/whatsappService.js');

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo  = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Find active carts updated between 1h and 24h ago (not too old, not too fresh)
  const abandonedCarts = await Cart.findAll({
    where: { status: 'active', updatedAt: { [Op.between]: [oneDayAgo, oneHourAgo] } },
    include: [
      { model: CartItem, as: 'CartItems', required: true, include: [{ model: Product }] },
      { model: User, attributes: ['id', 'username', 'phone', 'email'] },
    ],
  });
  if (!abandonedCarts.length) return 'No abandoned carts';

  let sent = 0; let noPhone = 0; let ordered = 0; let optedOut = 0; let switchedOff = 0; let failed = 0;
  const gateSkips = {};
  for (const cart of abandonedCarts) {
    const user = cart.User;
    if (!user?.phone) { noPhone++; continue; }

    // Skip if user placed an order after cart was last updated
    const recentOrder = await Order.findOne({ where: { user_id: user.id, createdAt: { [Op.gte]: cart.updatedAt } } });
    if (recentOrder) { ordered++; continue; }

    // The cart has no brand of its own — derive it from the products in it
    // (products are brand-scoped) so recovery stays multi-brand instead of
    // always messaging as brand 1.
    const firstItem = cart.CartItems[0];
    const brandId = firstItem?.Product?.brand_id || 1;

    // Cart total (price/qty) — needed by the cart rules (minimum value).
    const cartTotal = cart.CartItems.reduce((sum, it) => {
      const price = Number(it.price ?? it.Product?.price ?? 0);
      return sum + price * Number(it.quantity || 1);
    }, 0);

    // STOP is per phone on the shared number (not per brand).
    if (await whatsappService.isPhoneOptedOut(user.phone)) { optedOut++; continue; }
    // Carts-page rules (wait, quiet hours, minimum value, coupon) + no
    // double message with the checkout-capture flow.
    const gate = await require('../services/cartRecoveryService.js').shouldSendServerCart({ phone: user.phone, brandId, value: cartTotal, leftAt: cart.updatedAt });
    if (!gate.ok) { gateSkips[gate.reason] = (gateSkips[gate.reason] || 0) + 1; continue; }

    const productName = firstItem?.Product?.name || 'your items';
    const extra = cart.CartItems.length > 1 ? ` (+${cart.CartItems.length - 1} more)` : '';
    let productImage = null;
    try {
      const { ProductImage } = require('../model/associations.js');
      if (firstItem?.Product?.id && ProductImage) {
        const img = await ProductImage.findOne({ where: { product_id: firstItem.Product.id }, order: [['id', 'ASC']] });
        if (img?.image_url) productImage = /^https?:\/\//.test(img.image_url) ? img.image_url : `https://api.crosscoin.in/api/uploads/${String(img.image_url).replace(/^\/+/, '').replace(/^api\/uploads\//, '').replace(/^uploads\//, '')}`;
      }
    } catch (_) { /* image is optional — header falls back to the brand logo */ }

    try {
      // Recovery token so the "Complete Order" link rebuilds this server
      // cart on any device (the shopper isn't logged in inside WhatsApp's
      // in-app browser). Null on failure → link still opens the store.
      const recoverToken = await require('../services/cartRecoveryService.js').tokenForServerCart({
        phone: user.phone, name: user.username, brandId, userId: user.id,
        cartItems: cart.CartItems, summary: productName + extra, value: cartTotal,
      });
      const r = await whatsappService.sendAbandonedCart(user.phone, {
        customerName: user.username,
        itemsSummary: productName + extra,
        total: cartTotal ? cartTotal.toFixed(0) : undefined,
        productImage,
        couponCode: gate.coupon,
        recoverToken,
      }, brandId);
      if (r && r.skipped) { switchedOff++; continue; } // switched off — leave the cart as is
      // Mark the cart abandoned so the hourly cron never re-messages it.
      // (Previously nothing marked it, so the same cart was messaged every
      // hour for up to ~23 hours.) It re-arms to 'active' when the shopper
      // adds to the cart again — see cartController.addToCart.
      await cart.update({ status: 'abandoned' });
      sent++;
    } catch (e) { failed++; console.warn('Abandoned cart WA failed:', e.message); }
  }
  return {
    status: statusFor(sent, failed),
    summary: countLine(`${sent} sent`, [
      [noPhone, 'skipped (no number)'], [ordered, 'skipped (already ordered)'], [optedOut, 'skipped (opted out)'],
      ...gateParts(gateSkips), [switchedOff, 'skipped (message switched off)'], [failed, 'failed'],
    ]),
  };
}

// ── Abandoned Checkout Recovery (captured carts) ──────────────────────────
// Covers EVERY drop-off that reached checkout with a phone — guest OR
// logged-in, COD OR prepaid — via the abandoned_carts capture table. Sends one
// recovery WhatsApp per row once it's older than the Carts-page wait and still
// 'pending' (not converted). Opt-out is honoured per phone.
async function abandonedCheckout() {
  const { AbandonedCart } = require('../model/abandonedCartModel.js');
  const { Op } = require('sequelize');
  const whatsappService = require('../services/whatsappService.js');

  // Wait / quiet-hours / minimum-value rules come from the Carts page
  // (whatsapp_settings, see services/cartRecoveryService.js).
  const rec = require('../services/cartRecoveryService.js');
  const { from: dayAgo, to: cutoff } = rec.cronWindow(await rec.getCartRules());

  const rows = await AbandonedCart.findAll({
    where: { status: 'pending', waSent: false, updatedAt: { [Op.between]: [dayAgo, cutoff] } },
    limit: 200,
  });
  if (!rows.length) return 'No checkout drop-offs to message';

  let sent = 0; let noPhone = 0; let optedOut = 0; let switchedOff = 0; let failed = 0;
  const gateSkips = {};
  for (const row of rows) {
    const phone = row.phone; // decrypted via model getter
    const last10 = String(phone || '').replace(/\D/g, '').slice(-10);
    if (last10.length !== 10) { noPhone++; continue; }
    const brandId = row.brandId || 1;

    // Respect WhatsApp marketing opt-out (per phone — one shared number).
    if (await whatsappService.isPhoneOptedOut(last10)) { await row.update({ status: 'messaged', waSent: true }); optedOut++; continue; }
    const gate = await rec.checkBeforeSend(row);
    if (!gate.ok) { gateSkips[gate.reason] = (gateSkips[gate.reason] || 0) + 1; continue; }

    try {
      const r = await whatsappService.sendAbandonedCart(phone, {
        customerName: row.customerName,
        itemsSummary: row.cartSummary || 'your items',
        total: row.cartValue != null ? Number(row.cartValue).toFixed(0) : undefined,
        // No per-item image in the capture table — header falls back to logo.
        couponCode: gate.coupon,
        // Unguessable token → the "Complete Order" link rebuilds the cart on
        // any device (rows captured before tokens existed get one now).
        recoverToken: await rec.ensureToken(row),
      }, brandId);
      // Switched off on the Automations page → not sent, leave the row.
      if (r && r.skipped) { switchedOff++; continue; }
      await rec.markMessaged(row);
      sent++;
    } catch (e) { failed++; console.warn('Abandoned checkout WA failed:', e.message); }
  }
  return {
    status: statusFor(sent, failed),
    summary: countLine(`${sent} sent`, [
      [noPhone, 'skipped (no number)'], [optedOut, 'skipped (opted out)'],
      ...gateParts(gateSkips), [switchedOff, 'skipped (message switched off)'], [failed, 'failed'],
    ]),
  };
}

// ── Review Request ────────────────────────────────────────────────────────
// Asks for a review 3 days after delivery — registered AND guest orders.
// "Delivered" time = the latest 'delivered' row in order_status_history
// (orders have no delivered_at column); orders.updated_at only stands in for
// orders that never got a history row. updated_at moves on any edit, so it is
// only a pre-filter (it is always >= the delivered time).
async function reviewRequest() {
  const { sequelize: reviewDb } = require('../config/db.js');
  const { Order } = require('../model/orderModel.js');
  const { OrderItem } = require('../model/orderItemModel.js');
  const { Product } = require('../model/productModel.js');
  const { User } = require('../model/userModel.js');
  const { GuestUser } = require('../model/associations.js');
  const { ShippingAddress } = require('../model/shippingAddressModel.js');
  const { Review } = require('../model/reviewModel.js');
  const { Op, QueryTypes } = require('sequelize');
  const whatsappService = require('../services/whatsappService.js');

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const fourDaysAgo  = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);

  const due = await reviewDb.query(
    `SELECT o.id,
            COALESCE((SELECT MAX(h.created_at) FROM order_status_history h
                       WHERE h.order_id = o.id AND h.status = 'delivered'), o.updated_at) AS delivered_at
       FROM orders o
      WHERE o.status = 'delivered'
        AND o.review_requested_at IS NULL
        AND (o.user_id IS NOT NULL OR o.guest_user_id IS NOT NULL)
        AND o.updated_at >= :from
     HAVING delivered_at BETWEEN :from AND :to
      LIMIT 500`,
    // Never ask twice for the same order: review_requested_at is stamped below.
    { replacements: { from: fourDaysAgo, to: threeDaysAgo }, type: QueryTypes.SELECT },
  );
  if (!due.length) return 'No delivered orders to ask';

  const deliveredOrders = await Order.findAll({
    where: { id: { [Op.in]: due.map((r) => r.id) } },
    include: [
      { model: User, attributes: ['id', 'username', 'phone', 'email'] },
      { model: GuestUser, as: 'GuestUser', attributes: ['id', 'firstName', 'phone', 'email'], required: false },
      { model: ShippingAddress, as: 'ShippingAddress', attributes: ['phone'] },
      { model: OrderItem, as: 'OrderItems', include: [{ model: Product, as: 'Product', attributes: ['id', 'name', 'slug'] }] },
    ],
  });

  let sent = 0; let noPhone = 0; let optedOut = 0; let reviewed = 0; let switchedOff = 0; let failed = 0;
  for (const order of deliveredOrders) {
    const phone = order.User?.phone || order.GuestUser?.phone || order.ShippingAddress?.phone;
    if (!phone) { noPhone++; continue; }

    // Check opted out (per phone)
    if (await whatsappService.isPhoneOptedOut(phone)) { optedOut++; continue; }

    // Already reviewed any product in this order? Storefront reviews are saved
    // without userId (name + email only), so match the account id OR either
    // email on the order (the reviews collation is case-insensitive).
    const productIds = order.OrderItems.map(i => i.product_id);
    const emails = [...new Set([order.User?.email, order.GuestUser?.email]
      .map((e) => String(e || '').trim()).filter((e) => e.includes('@')))];
    const who = [];
    if (order.user_id) who.push({ userId: order.user_id });
    if (emails.length) who.push({ guestEmail: { [Op.in]: emails } });
    const existingReview = who.length
      ? await Review.findOne({ where: { productId: { [Op.in]: productIds }, [Op.or]: who }, attributes: ['id'] })
      : null;
    if (existingReview) { reviewed++; continue; }

    const firstProduct = order.OrderItems[0]?.Product;
    if (!firstProduct) continue;

    try {
      const r = await whatsappService.sendReviewRequest(phone, {
        customerName: order.User?.username || order.GuestUser?.firstName,
        productName: firstProduct.name,
        productSlug: firstProduct.slug,
      }, order.brand_id || 1);
      await reviewDb.query('UPDATE orders SET review_requested_at = ? WHERE id = ?', { replacements: [new Date(), order.id] });
      if (r && r.skipped) switchedOff++; else sent++;
    } catch (e) { failed++; console.warn('Review request WA failed:', e.message); }
  }
  return {
    status: statusFor(sent, failed),
    summary: countLine(`${sent} sent`, [
      [noPhone, 'skipped (no number)'], [optedOut, 'skipped (opted out)'], [reviewed, 'skipped (already reviewed)'],
      [switchedOff, 'skipped (message switched off)'], [failed, 'failed'],
    ]),
  };
}

// ── Win-back Campaign ─────────────────────────────────────────────────────
// One message per customer per brand: those whose LAST non-cancelled order
// with that brand was placed 30–31 days ago (the daily window slides, so each
// customer is picked up exactly once). The coupon is the brand's
// WINBACK_COUPON_CODE setting (falls back to CART10) and is only offered when
// that coupon exists and is active for the brand — otherwise the brand is
// skipped, so customers never receive a code that fails at checkout.
async function winback() {
  const { Op } = require('sequelize');
  const { sequelize: db } = require('../config/db.js');
  const { User } = require('../model/userModel.js');
  const { Coupon } = require('../model/couponModel.js');
  const settingsHelper = require('../services/settingsHelper.js');
  const whatsappService = require('../services/whatsappService.js');

  // orders is underscored → created_at (MAX(createdAt) threw every run).
  // Window bounds computed in JS (stored times are UTC; NOW() is server TZ).
  const [rows] = await db.query(
    `SELECT user_id, brand_id, MAX(created_at) AS last_at
       FROM orders
      WHERE user_id IS NOT NULL
        AND status NOT IN ('cancelled', 'order cancelled')
      GROUP BY user_id, brand_id
     HAVING last_at >= :from AND last_at < :to`,
    { replacements: { from: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), to: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
  );
  if (!rows.length) return 'No customers due for a win-back message';

  const couponByBrand = new Map();
  const blockedBrands = new Map(); // brandId -> coupon code that isn't active
  const couponFor = async (brandId) => {
    if (couponByBrand.has(brandId)) return couponByBrand.get(brandId);
    const code = String(await settingsHelper.getSetting(brandId, 'WINBACK_COUPON_CODE', 'CART10', { brandOnly: true }) || 'CART10').trim();
    const now = new Date();
    const coupon = await Coupon.findOne({
      where: {
        code, brand_id: brandId, status: 'active',
        [Op.and]: [
          { [Op.or]: [{ startDate: null }, { startDate: { [Op.lte]: now } }] },
          { [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: now } }] },
        ],
      },
    });
    const usable = coupon ? code : null;
    if (!usable) { console.warn(`⚠️ [CRON] Win-back: brand ${brandId} has no active coupon "${code}" — skipping its customers`); blockedBrands.set(brandId, code); }
    couponByBrand.set(brandId, usable);
    return usable;
  };

  let sent = 0; let noCoupon = 0; let noPhone = 0; let optedOut = 0; let switchedOff = 0; let failed = 0;
  for (const row of rows) {
    const brandId = row.brand_id || 1;
    const couponCode = await couponFor(brandId);
    if (!couponCode) { noCoupon++; continue; }
    const user = await User.findByPk(row.user_id, { attributes: ['id', 'username', 'phone', 'deleted_at'] });
    if (!user?.phone || user.deleted_at) { noPhone++; continue; }
    if (await whatsappService.isPhoneOptedOut(user.phone)) { optedOut++; continue; }
    try {
      const r = await whatsappService.sendWinBack(user.phone, { customerName: user.username, couponCode }, brandId);
      if (r && r.skipped) switchedOff++; else sent++;
    } catch (e) { failed++; console.warn('Win-back WA failed:', e.message); }
  }

  // Name the brands skipped for a missing coupon — the one thing staff must fix.
  let blockedNote = '';
  if (blockedBrands.size) {
    const Brand = require('../model/brandModel.js');
    const names = [];
    for (const [id, code] of blockedBrands) {
      const b = await Brand.findByPk(id, { attributes: ['name', 'display_name'] }).catch(() => null);
      names.push(`${b?.display_name || b?.name || `brand ${id}`} — coupon ${code} not active`);
    }
    blockedNote = `Skipped ${names.join('; ')}`;
  }
  const summary = [countLine(`${sent} sent of ${rows.length} due`, [
    [noPhone, 'skipped (no number)'], [optedOut, 'skipped (opted out)'], [switchedOff, 'skipped (message switched off)'], [failed, 'failed'],
  ]), blockedNote].filter(Boolean).join(' · ');
  let status = statusFor(sent, failed);
  if (noCoupon) status = sent > 0 || rows.length > noCoupon ? 'partial' : 'failed';
  return { status, summary };
}

// ── Post-purchase Upsell ──────────────────────────────────────────────────
// Targets orders delivered exactly 1 day ago.
async function upsell() {
  const { sequelize: upsellDb } = require('../config/db.js');
  const { Order } = require('../model/orderModel.js');
  const { OrderItem } = require('../model/orderItemModel.js');
  const { Product } = require('../model/productModel.js');
  const { User } = require('../model/userModel.js');
  const { Op } = require('sequelize');
  const whatsappService = require('../services/whatsappService.js');

  const oneDayAgo  = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const deliveredOrders = await Order.findAll({
    where: {
      status: 'delivered', updatedAt: { [Op.between]: [twoDaysAgo, oneDayAgo] }, user_id: { [Op.ne]: null },
      [Op.and]: [upsellDb.literal('`Order`.`upsell_sent_at` IS NULL')],
    },
    include: [
      { model: User, attributes: ['id', 'username', 'phone'] },
      { model: OrderItem, as: 'OrderItems', include: [{ model: Product, as: 'Product', attributes: ['id', 'name', 'slug'] }] },
    ],
  });
  if (!deliveredOrders.length) return 'No delivered orders to follow up';

  let sent = 0; let noPhone = 0; let optedOut = 0; let nothingToSuggest = 0; let switchedOff = 0; let failed = 0;
  for (const order of deliveredOrders) {
    const phone = order.User?.phone;
    if (!phone) { noPhone++; continue; }

    if (await whatsappService.isPhoneOptedOut(phone)) { optedOut++; continue; }

    const purchasedProduct = order.OrderItems[0]?.Product;
    if (!purchasedProduct) continue;

    // Suggest the newest active product of the SAME brand that isn't in
    // this order (the link is built on that brand's domain).
    const boughtIds = order.OrderItems.map((i) => i.Product?.id).filter(Boolean);
    const suggestedProduct = await Product.findOne({
      where: { id: { [Op.notIn]: boughtIds }, status: 'active', brand_id: order.brand_id || 1 },
      order: [['createdAt', 'DESC']],
    });
    if (!suggestedProduct) { nothingToSuggest++; continue; }

    try {
      const r = await whatsappService.sendPostPurchaseUpsell(phone, {
        customerName: order.User?.username,
        purchasedProduct: purchasedProduct.name,
        suggestedProduct: suggestedProduct.name,
        suggestedSlug: suggestedProduct.slug,
      }, order.brand_id || 1);
      await upsellDb.query('UPDATE orders SET upsell_sent_at = ? WHERE id = ?', { replacements: [new Date(), order.id] });
      if (r && r.skipped) switchedOff++; else sent++;
    } catch (e) { failed++; console.warn('Upsell WA failed:', e.message); }
  }
  return {
    status: statusFor(sent, failed),
    summary: countLine(`${sent} sent`, [
      [noPhone, 'skipped (no number)'], [optedOut, 'skipped (opted out)'], [nothingToSuggest, 'skipped (nothing to suggest)'],
      [switchedOff, 'skipped (message switched off)'], [failed, 'failed'],
    ]),
  };
}

// Starts scheduled broadcasts when due and resumes ones paused at 20:00 IST
// (they only send 10:00–20:00 IST). The runner claims each broadcast
// atomically, so the API's "send now" kick and this tick never double-send.
async function waBroadcasts() {
  const r = await require('../services/whatsappService.js').runDueBroadcasts();
  return r.ran ? `${plural(r.ran, 'broadcast', 'broadcasts')} started or resumed` : 'No broadcasts due';
}

// WhatsApp customers who wishlisted a product or still have it in their cart
// when it comes back in stock or drops in price. Changes made at night are
// picked up by the first run of the morning, so nobody is messaged while
// asleep. See services/productAlertService.js.
async function productAlerts() {
  const { runProductAlerts } = require('../services/productAlertService.js');
  const r = await runProductAlerts();
  if (!r.events) return 'No stock or price changes';
  return `${plural(r.sent, 'alert', 'alerts')} sent · ${plural(r.events, 'change', 'changes')} found`;
}

// Cancels prepaid orders where payment_status is still 'pending' or 'failed'
// after 30 minutes (customer abandoned or payment failed).
async function staleCleanup() {
  const { Order, OrderItem, ProductVariation } = require('../model/associations.js');
  const { OrderStatusHistory } = require('../model/orderStatusHistoryModel.js');
  const { Op } = require('sequelize');
  const { sequelize } = require('../config/db.js');

  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

  // Find prepaid orders older than 30 min that are still pending/failed
  const staleOrders = await Order.findAll({
    where: {
      payment_type: { [Op.notIn]: ['cod'] },
      payment_status: { [Op.in]: ['pending', 'failed'] },
      status: { [Op.notIn]: ['cancelled', 'order cancelled'] },
      createdAt: { [Op.lt]: thirtyMinAgo },
    },
    include: [
      { model: OrderItem, as: 'OrderItems', attributes: ['id', 'product_id', 'variation_id', 'quantity'] },
    ],
  });

  if (staleOrders.length === 0) return 'No unpaid orders to cancel';

  let cancelled = 0;
  const errors = [];
  for (const order of staleOrders) {
    const transaction = await sequelize.transaction();
    try {
      // Cancel the order
      await order.update({
        status: 'cancelled',
        payment_status: order.payment_status === 'failed' ? 'failed' : 'cancelled',
      }, { transaction });

      // Restore stock for each item
      for (const item of order.OrderItems) {
        if (item.variation_id) {
          await ProductVariation.increment('stock', {
            by: item.quantity,
            where: { id: item.variation_id },
            transaction,
          });
        }
      }

      // Give the coupon use back — only if a usage row existed, never below zero.
      await require('../services/couponRulesService.js').releaseCouponUse(order, transaction);

      // Log status change
      await OrderStatusHistory.create({
        order_id: order.id,
        status: 'cancelled',
        updated_by: null,
        notes: 'Auto-cancelled: prepaid payment not completed within 30 minutes',
      }, { transaction });

      await transaction.commit();
      cancelled++;
      console.log(`  ✓ Cancelled stale order #${order.order_number} (id=${order.id})`);
    } catch (err) {
      await transaction.rollback();
      errors.push(`#${order.order_number}: ${err.message}`);
      console.error(`  ✗ Failed to cancel order ${order.id}:`, err.message);
    }
  }
  return {
    status: statusFor(cancelled, errors.length),
    summary: countLine(`${plural(cancelled, 'unpaid order', 'unpaid orders')} cancelled`, [[errors.length, "couldn't be cancelled"]]),
    error: errors.length ? errors.slice(0, 10).join('\n') : null,
  };
}

// ── Registry ───────────────────────────────────────────────────────────────
// messagesCustomers: "Run now" warns that it sends WhatsApp messages.
// oncePerDay: "Run now" is refused once it already ran today (IST) — a second
// run the same day would message the same customers twice.
const JOBS = [
  { key: 'shipping-status-refresh', name: 'Courier status refresh', schedule: '6 am & 6 pm',
    cron: '0 6,18 * * *', tz: IST, mode: 'queue', queue: 'retry', lockMinutes: 60, run: shippingStatusRefresh },
  { key: 'pickup-batch', name: 'Courier booking batch', schedule: '11 am, retry 3 pm',
    cron: '0 11,15 * * *', tz: IST, mode: 'inline', run: releaseHeldPickups },
  { key: 'abandoned-cart', name: 'Abandoned cart messages', schedule: 'Every hour at :15', messagesCustomers: true,
    cron: '15 * * * *', tz: null, mode: 'queue', queue: 'once', run: abandonedCart },
  { key: 'abandoned-checkout', name: 'Checkout drop-off messages', schedule: 'Every 5 min', messagesCustomers: true,
    cron: '*/5 * * * *', tz: null, mode: 'queue', queue: 'once', run: abandonedCheckout },
  { key: 'payment-reconciliation', name: 'Payment reconciliation', schedule: 'Daily 3 am',
    cron: '0 3 * * *', tz: IST, mode: 'inline', run: paymentReconciliation },
  { key: 'stale-cleanup', name: 'Unpaid online order cleanup', schedule: 'Every 30 min (:10 and :40)',
    cron: '10,40 * * * *', tz: null, mode: 'queue', queue: 'once', run: staleCleanup },
  { key: 'product-alerts', name: 'Back in stock / price drop', schedule: 'Every 30 min, 9 am–9 pm', messagesCustomers: true,
    cron: '20,50 9-20 * * *', tz: IST, mode: 'queue', queue: 'once', run: productAlerts },
  { key: 'wa-broadcasts', name: 'WhatsApp broadcasts', schedule: 'Every 5 min', messagesCustomers: true,
    cron: '*/5 * * * *', tz: IST, mode: 'queue', queue: 'once', run: waBroadcasts },
  { key: 'winback', name: 'Win-back offers', schedule: 'Daily 11 am', messagesCustomers: true, oncePerDay: true,
    cron: '0 11 * * *', tz: IST, mode: 'queue', queue: 'once', run: winback },
  { key: 'review-request', name: 'Review requests', schedule: 'Daily 10 am', messagesCustomers: true,
    cron: '0 10 * * *', tz: IST, mode: 'queue', queue: 'once', run: reviewRequest },
  { key: 'upsell', name: 'After-delivery suggestions', schedule: 'Daily 3 pm', messagesCustomers: true,
    cron: '0 15 * * *', tz: IST, mode: 'queue', queue: 'once', run: upsell },
  { key: 'loyalty-expiry', name: 'Loyalty points expiry', schedule: 'Daily 2 am',
    cron: '0 2 * * *', tz: IST, mode: 'queue', queue: 'retry', run: loyaltyExpiry },
  { key: 'badge-refresh', name: 'Product badges refresh', schedule: 'Daily 2:30 am',
    cron: '30 2 * * *', tz: IST, mode: 'inline', run: badgeRefresh },
  { key: 'reservation-cleanup', name: 'Stuck stock-hold cleanup', schedule: 'Every 5 min',
    cron: '*/5 * * * *', tz: null, mode: 'inline', run: reservationCleanup },
  { key: 'data-retention', name: 'Old data cleanup (privacy)', schedule: 'Daily 4 am',
    cron: '0 4 * * *', tz: IST, mode: 'inline', run: dataRetention },
];

const getJob = (key) => JOBS.find((j) => j.key === key) || null;
const queueName = (job) => `cron:${job.key}`;

/** Run a job now, logged, with its lock (used by the cron tick and "Run now"). */
function runJobLogged(job, opts = {}) {
  const { runLogged } = require('../services/jobRunService.js');
  return runLogged(job.key, job.run, { lockMinutes: job.lockMinutes || 30, ...opts });
}

/**
 * Initialize all cron jobs.
 */
function initializeCronJobs() {
  console.log('🕐 Initializing cron jobs (Bull-backed)...');

  const { enqueue, registerProcessor } = require('../services/integrationQueue.js');

  for (const job of JOBS) {
    const opts = job.tz ? { timezone: job.tz } : undefined;

    if (job.mode === 'inline') {
      cron.schedule(job.cron, () => { runJobLogged(job).catch(() => {}); }, opts);
      continue;
    }

    // Queue job: the worker runs it, logged. 'retry' jobs re-throw so Bull
    // keeps retrying a failed run (each attempt is logged).
    const retry = job.queue === 'retry';
    registerProcessor(queueName(job), 1, async () => { await runJobLogged(job, { rethrow: retry }); });
    cron.schedule(job.cron, () => {
      const enqueueOpts = retry ? {} : {
        attempts: 1,
        // jobId per minute-slot: with several app instances each firing the same
        // cron tick, Bull keeps ONE job for that slot (no duplicate customer sends).
        jobId: `${queueName(job)}:${Math.floor(Date.now() / 60000)}`,
        removeOnComplete: true,
      };
      enqueue(queueName(job), {}, enqueueOpts)
        .then(() => console.log(`✅ [CRON] enqueued ${queueName(job)}`))
        .catch((e) => console.error(`❌ [CRON] enqueue ${queueName(job)} failed:`, e.message));
    }, opts);
  }

  console.log(`✅ Cron jobs initialized: ${JOBS.length} jobs (see the dashboard's System health page)`);
}

module.exports = { initializeCronJobs, JOBS, getJob, runJobLogged };
