const { randomUUID } = require('node:crypto');
const store = require('./prepaidRecoveryStore.js');
const { razorpayPaymentReferences, razorpayOrderReferences, verifyShiprocketRecovery } = require('../utils/shiprocketPaymentRecovery.js');
const { logger } = require('../config/logging.js');
const { getSharedPayment } = require('./sharedRazorpayPayments.js');

const retryMinutes = [2, 5, 15, 30, 60, 180];
const message = (text, status = 409, retryable = false) => Object.assign(new Error(text), { status, retryable });

function referencesOf(order) {
  const entries = Array.isArray(order.payments) ? order.payments.filter(Boolean) : [];
  const successful = entries.filter((entry) => ['captured', 'success', 'successful', 'paid', 'completed']
    .includes(String(entry.status || entry.payment_status || '').toLowerCase()));
  const candidates = successful.length === 1 ? successful : entries.length <= 1 ? entries : [];
  const payIds = new Set([order, ...candidates].flatMap(razorpayPaymentReferences));
  const orderIds = new Set([order, ...candidates].flatMap(razorpayOrderReferences));
  return {
    paymentId: payIds.size === 1 ? payIds.values().next().value : null,
    gatewayOrderId: orderIds.size === 1 ? orderIds.values().next().value : null,
  };
}

async function discoverCheckout(payment, hint) {
  const { fetchProviderOrder } = require('../controller/customCheckoutController.js');
  const checkout = require('./customCheckoutService.js');
  const candidates = new Map();
  function add(brandId, ref) {
    if (Number.isSafeInteger(Number(brandId)) && Number(brandId) > 0 && store.validCheckoutRef(ref)) {
      candidates.set(`${Number(brandId)}:${ref}`, { brandId: Number(brandId), ref });
    }
  }
  if (hint) add(hint.brandId, hint.ref);
  for (const row of await store.readCheckouts(payment)) add(row.brand_id, row.checkout_ref);
  const matches = new Map();
  let rejected;
  let unavailable = false;
  const providerStatuses = new Set();
  const checked = new Set();
  async function checkCandidates() {
    const results = await Promise.allSettled([...candidates].filter(([key]) => !checked.has(key)).map(async ([key, candidate]) => {
      checked.add(key);
      const details = hint?.details && Number(hint.brandId) === candidate.brandId && hint.ref === candidate.ref
        ? hint.details : await fetchProviderOrder(candidate.brandId, candidate.ref);
      return { ...candidate, details };
    }));
    for (const result of results) {
      if (result.status === 'rejected') {
        unavailable = true;
        if (Number.isInteger(result.reason?.providerStatus)) providerStatuses.add(result.reason.providerStatus);
        continue;
      }
      const { details, ...candidate } = result.value;
      try {
        verifyShiprocketRecovery(details, candidate.ref, payment);
        if (checkout.isCodOrder(details) || (Array.isArray(details.payments) && details.payments.some((entry) => checkout.isCodOrder(details, entry)))) {
          throw message('The referenced checkout is cash on delivery.');
        }
        const attrs = checkout.parseAttrs(details.cart_data?.custom_attributes);
        const stamped = String(attrs.store || checkout.parseAttrs(details.custom_attributes).store || candidate.brandId);
        matches.set(`${stamped}:${candidate.ref}`, { ...candidate, details });
      } catch (error) {
        rejected = error;
        if (String(details.payment_status || '').toLowerCase() !== 'success') unavailable = true;
      }
    }
  }
  await checkCandidates();
  if (!matches.size) {
    const fromNotes = (notes) => [notes?.shiprocket_order_id, notes?.platform_order_id, notes?.checkout_order_id].find(store.validCheckoutRef);
    let ref = fromNotes(payment.notes);
    if (!ref && payment.order_id) {
      try {
        const gateway = await require('./razorpayService.js').getOrder(payment.order_id);
        if (gateway?.id === payment.order_id) ref = fromNotes(gateway.notes);
      } catch (error) {
        logger.warn(`[prepaid-recovery] Razorpay order metadata unavailable for ${payment.order_id}: ${error.message}`);
        if (!candidates.size) throw message('Razorpay confirmed the payment, but its order details could not be loaded. Retry or enter the Shiprocket checkout reference.', 502, true);
      }
    }
    if (ref) {
      const brands = await store.enabledBrands();
      brands.forEach((brand) => add(brand.id, ref));
    }
    await checkCandidates();
  }
  if (!candidates.size) throw message('No Shiprocket checkout reference was found for this payment.', 409, true);
  if (matches.size > 1) throw message('Multiple Shiprocket checkouts match the captured payment.');
  if (matches.size === 1) return matches.values().next().value;
  if (unavailable) {
    const codes = [...providerStatuses].join(', ');
    throw message(codes ? `Shiprocket could not verify the checkout details (HTTP ${codes}). Check the store and checkout reference.`
      : 'Waiting for verifiable Shiprocket checkout details for this Razorpay capture.', 502, true);
  }
  throw rejected || message('The Shiprocket checkout could not be matched to this payment.');
}

function requireOriginalCheckout(details) {
  const address = details.shipping_address;
  const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
  const phone = String(details.phone || address?.phone || '').replace(/\D/g, '');
  if (!address || !hasText(address.first_name) || !hasText(address.line1) || !hasText(address.city) ||
      !hasText(address.state) || !/^\d{6}$/.test(String(address.pincode || '').trim()) ||
      !/^(?:91)?[0-9]{10}$/.test(phone)) {
    throw message('The verified checkout is missing the original customer name, phone, or shipping address.', 422, true);
  }
  const items = details.cart_data?.items;
  if (!Array.isArray(items) || !items.length || items.some((item) => !/^\d+$/.test(String(item?.variant_id || '')) ||
      !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) < 1)) {
    throw message('The verified checkout is missing an original product variant or quantity.', 422, true);
  }
}

async function verifyPayment(paymentId, { date, sourceAt } = {}) {
  const truth = await getSharedPayment(paymentId, { date, sourceAt });
  if (truth?.id !== paymentId || !store.isCapture(truth)) throw message('Razorpay does not show a captured INR payment with zero refunds.');
  return truth;
}

async function resolvePayment(payment, hint) {
  const { findRazorpayOrderMatches } = require('./razorpayOrderMatching.js');
  const match = (await findRazorpayOrderMatches([payment])).get(payment.id);
  if (match.issue) throw message(match.issue);
  if (match.linked) return { existing: {
    id: match.linked.linked_order_id, order_number: match.linked.order_number, brand_id: match.linked.order_brand_id,
  } };
  if (match.pending || (payment.order_id && await require('./stockReservationService.js').getReservationByRazorpayOrder(payment.order_id))) {
    throw message('This payment belongs to a saved native checkout. Review it in payment reconciliation.');
  }
  const candidate = await discoverCheckout(payment, hint);
  requireOriginalCheckout(candidate.details);
  const checkout = require('./customCheckoutService.js');
  const stamp = checkout.parseAttrs(candidate.details.cart_data?.custom_attributes).store ||
    checkout.parseAttrs(candidate.details.custom_attributes).store;
  let orderBrandId = candidate.brandId;
  if (stamp) {
    const Brand = require('../model/brandModel.js');
    const brand = await Brand.findOne({ where: { slug: String(stamp).trim().toLowerCase() }, attributes: ['id'] });
    if (!brand) throw message('The original Shiprocket store could not be identified.');
    orderBrandId = brand.id;
  }
  await checkout.verifyRecoveryPrices(orderBrandId, candidate.details, payment);
  return { candidate: { ...candidate, orderBrandId } };
}

async function recover(row, { hint, actorId = null, verified } = {}) {
  let state;
  let reason = null;
  let checkoutRef = hint?.ref || row.checkout_ref || null;
  let brandId = hint?.brandId || row.brand_id || null;
  let order;
  const attempt = Number(row.attempts) + 1;
  try {
    const payment = verified || await verifyPayment(row.payment_id, { sourceAt: row.source_at });
    if (Number(payment.amount) !== Number(row.amount_paise) || (row.gateway_order_id && row.gateway_order_id !== payment.order_id)) {
      throw message('The captured amount or gateway order differs from the recorded payment.');
    }
    const { existing, candidate } = await resolvePayment(payment, hint || (checkoutRef && brandId ? { ref: checkoutRef, brandId } : null));
    if (existing) {
      order = existing;
      state = row.state === 'recovered' && Number(row.order_id) === Number(existing.id) ? 'recovered' : 'matched';
    } else {
      checkoutRef = candidate.ref;
      brandId = candidate.brandId;
      const result = await require('../controller/customCheckoutController.js')
        .ingestVerifiedOrder(brandId, checkoutRef, candidate.details, payment, { prepaidOnly: true, recovery: true });
      if (!result.order_number) throw message('The verified checkout is not ready to import.', 409, true);
      const { Order } = require('../model/orderModel.js');
      order = await Order.findOne({ where: { order_number: result.order_number }, attributes: ['id', 'brand_id', 'order_number', 'payment_status'] });
      if (!order) throw message('The order was saved but the response could not be confirmed. Retry the lookup.', 502, true);
      state = result.created ? 'recovered' : 'matched';
    }
  } catch (error) {
    const retryable = error.retryable ?? (!error.status || error.status >= 500);
    reason = error.status ? error.message.slice(0, 600) : 'A provider or database request failed. See System Health for details.';
    if (!error.status) logger.warn(`[prepaid-recovery] ${row.payment_id}: ${error.message}`);
    state = retryable && attempt <= retryMinutes.length ? 'pending' : 'needs_manual_review';
  }
  const next = retryMinutes[Math.min(attempt - 1, retryMinutes.length - 1)];
  const { sequelize } = require('../config/db.js');
  await sequelize.transaction(async (transaction) => {
    const [current] = await store.rows('SELECT lease FROM prepaid_recovery WHERE payment_id = :id FOR UPDATE', { id: row.payment_id }, { transaction });
    if (current?.lease !== row.lease) throw message('Recovery lease expired. Check the order again.');
    const changes = { id: row.payment_id, gateway: row.gateway_order_id, checkoutRef, brandId, orderId: order?.id || null,
      state, reason, attempt, actorId };
    await store.query(`UPDATE prepaid_recovery SET state = :state, attempts = :attempt, checkout_ref = :checkoutRef,
      brand_id = :brandId, order_id = :orderId, reason = :reason, next_at = TIMESTAMPADD(MINUTE, ${next}, UTC_TIMESTAMP()),
      lease = NULL, lease_until = NULL WHERE payment_id = :id`, changes, { transaction });
    await store.query(`INSERT INTO prepaid_recovery_attempts (payment_id, gateway_order_id, checkout_ref, order_id, actor_id, state, reason)
      VALUES (:id, :gateway, :checkoutRef, :orderId, :actorId, :state, :reason)`, changes, { transaction });
  });
  if (state === 'needs_manual_review' && row.state !== 'needs_manual_review') {
    await require('./errorReporter.js').notify('Prepaid order needs review', [row.payment_id, row.gateway_order_id, reason],
      { dedupeKey: `prepaid-recovery:${row.payment_id}` });
  }
  return { state, reason, order };
}

async function claimPayment(id, { liveOnly = false } = {}) {
  const lease = randomUUID();
  const pending = "historical = FALSE AND state = 'pending'";
  const filter = !id ? `${pending} AND next_at <= UTC_TIMESTAMP()`
    : liveOnly ? `payment_id = :id AND ${pending}`
      : "payment_id = :id AND state IN ('pending','needs_manual_review','recovered','matched')";
  await store.query(`UPDATE prepaid_recovery SET lease = :lease, lease_until = UTC_TIMESTAMP() + INTERVAL 10 MINUTE
    WHERE ${filter} AND (lease_until IS NULL OR lease_until <= UTC_TIMESTAMP())
    ORDER BY historical ASC, next_at, payment_id LIMIT 1`, { lease, id });
  const [row] = await store.rows('SELECT * FROM prepaid_recovery WHERE lease = :lease LIMIT 1', { lease });
  return row;
}

// Called only after the Razorpay webhook signature was checked. Persist the
// capture before attempting the import so provider and database errors can retry.
async function handleCapture(payment) {
  if (!store.isCapture(payment)) return;
  await store.queueCaptures([payment]);
  const row = await claimPayment(payment.id, { liveOnly: true });
  if (row) return recover(row);
}

async function resumeCaptureForCheckout(brandId, ref, details, references) {
  const paymentId = await store.findPendingCapture(references);
  if (!paymentId) return;
  const row = await claimPayment(paymentId, { liveOnly: true });
  if (row) return recover(row, { hint: { ref, brandId, details } });
  return { state: 'pending' };
}

async function manual(paymentId, { hint, actorId, verifyOnly = false, date } = {}) {
  const payment = await verifyPayment(paymentId, { date });
  if (verifyOnly) {
    const { existing, candidate } = await resolvePayment(payment, hint);
    return { existing, checkoutRef: candidate?.ref, brandId: candidate?.brandId,
      orderBrandId: candidate?.orderBrandId,
      itemCount: candidate?.details.cart_data.items.reduce((count, item) => count + Number(item.quantity), 0) };
  }
  await store.queueCaptures([payment], { historical: true });
  const row = await claimPayment(paymentId);
  if (!row) throw message('This payment is already being processed. Check it again shortly.');
  return recover(row, { hint, actorId, verified: payment });
}

async function refreshInbox() {
  const [entry] = await store.rows(`SELECT brand_id, checkout_ref, attempts FROM prepaid_checkout_inbox
    WHERE resolved = FALSE AND next_at <= UTC_TIMESTAMP() AND attempts < 7
    ORDER BY next_at LIMIT 1`);
  if (!entry) return;
  const { fetchProviderOrder } = require('../controller/customCheckoutController.js');
  const svc = require('./customCheckoutService.js');
  try {
    const details = await fetchProviderOrder(entry.brand_id, entry.checkout_ref);
    if (String(details.platform_order_id || details.order_id || '') === entry.checkout_ref) {
      const refs = referencesOf(details);
      await store.rememberCheckout(entry.brand_id, entry.checkout_ref, refs,
        svc.isCodOrder(details) || !!(refs.paymentId || refs.gatewayOrderId));
    }
  } catch (error) {
    logger.warn(`[prepaid-recovery] checkout details unavailable for ${entry.checkout_ref}: ${error.message}`);
  }
  const delay = retryMinutes[Math.min(Number(entry.attempts), retryMinutes.length - 1)];
  await store.query(`UPDATE prepaid_checkout_inbox SET attempts = attempts + 1,
    next_at = TIMESTAMPADD(MINUTE, ${delay}, UTC_TIMESTAMP()) WHERE brand_id = :brand_id AND checkout_ref = :checkout_ref`, entry);
}

async function ensureSchedule() {
  await store.ensureSchema();
  await store.query('INSERT IGNORE INTO prepaid_recovery_schedule (id, next_at) VALUES (1, UTC_TIMESTAMP())');
}

async function scanRecentCaptures(now) {
  const { scanRazorpayCaptures } = require('./paymentsAdminService.js');
  await store.query('INSERT IGNORE INTO prepaid_capture_cursor (id, completed_through) VALUES (1, :baseline)', { baseline: now });
  const [cursor] = await store.rows('SELECT * FROM prepaid_capture_cursor WHERE id = 1');
  const completed = Number(cursor.completed_through);
  const until = Number(cursor.window_until) || Math.min(now, completed + 3600);
  const from = Math.max(1, completed - 3600);
  let offset = Number(cursor.next_offset);
  await store.query('UPDATE prepaid_capture_cursor SET window_until = :until WHERE id = 1', { until });
  for (let page = 0; page < 3 && offset != null; page++) {
    const batch = await scanRazorpayCaptures({ from, until, offset });
    await store.queueCaptures(batch.missing);
    offset = batch.nextOffset;
    if (offset == null) {
      await store.query('UPDATE prepaid_capture_cursor SET completed_through = :until, window_until = NULL, next_offset = 0 WHERE id = 1', { until });
    } else {
      await store.query('UPDATE prepaid_capture_cursor SET next_offset = :offset WHERE id = 1', { offset });
    }
  }
  return offset == null && until >= now;
}

async function run() {
  await ensureSchedule();
  const lease = randomUUID();
  await store.query(`UPDATE prepaid_recovery_schedule SET lease = :lease, lease_until = UTC_TIMESTAMP() + INTERVAL 10 MINUTE,
    next_at = UTC_TIMESTAMP() + INTERVAL 60 SECOND WHERE id = 1 AND next_at <= UTC_TIMESTAMP()
    AND (lease_until IS NULL OR lease_until <= UTC_TIMESTAMP())`, { lease });
  const [scan] = await store.rows(`SELECT *, (recent_due_at IS NULL OR recent_due_at <= UTC_TIMESTAMP()) AS recent_due
    FROM prepaid_recovery_schedule WHERE id = 1 AND lease = :lease`, { lease });
  if (!scan) return { status: 'skipped', summary: 'Recovery is not due' };
  const errors = [];
  try {
    // Keep the window and its next page across outages and high-volume ticks.
    const now = Math.floor(Date.now() / 1000);
    if (Number(scan.recent_due)) {
      try {
        if (await scanRecentCaptures(now)) {
          await store.query(`UPDATE prepaid_recovery_schedule SET recent_due_at = UTC_TIMESTAMP() + INTERVAL 5 MINUTE
            WHERE id = 1 AND lease = :lease`, { lease });
        }
      } catch (error) { errors.push(`Recent Razorpay scan: ${error.message}`); }
    }
    try { await refreshInbox(); } catch (error) { errors.push(`Checkout inbox: ${error.message}`); }
    const row = await claimPayment();
    const result = row ? await recover(row) : null;
    return { status: errors.length ? 'partial' : 'ok',
      summary: result ? `${row.payment_id}: ${result.state}` : 'No payment recovery due',
      error: errors.join('\n') || null };
  } finally {
    await store.query('UPDATE prepaid_recovery_schedule SET lease = NULL, lease_until = NULL WHERE id = 1 AND lease = :lease', { lease });
  }
}

module.exports = { manual, run, handleCapture, resumeCaptureForCheckout, requireOriginalCheckout, referencesOf };
