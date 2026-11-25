const { randomUUID } = require('node:crypto');
const { Op, QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { Order } = require('../model/orderModel.js');
const { enabledBrands, orderPage, orderReference, PAGE_SIZE } = require('./shiprocketOrderReconciliation.js');
const { razorpayOrderReferences, verifyShiprocketRecovery } = require('../utils/shiprocketPaymentRecovery.js');

let schema;
function ensureSchema() {
  schema ||= sequelize.query(`CREATE TABLE IF NOT EXISTS shiprocket_order_backfill (
    id TINYINT PRIMARY KEY,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    progress TEXT,
    next_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lease VARCHAR(36),
    lease_until DATETIME
  ) ENGINE=InnoDB`).catch((error) => { schema = null; throw error; });
  return schema;
}

async function read() {
  const [row] = await sequelize.query('SELECT active, progress, lease FROM shiprocket_order_backfill WHERE id = 1', { type: QueryTypes.SELECT });
  return row;
}

async function status() {
  await ensureSchema();
  const row = await read();
  const progress = row?.progress ? JSON.parse(row.progress) : {};
  return {
    active: !!row?.active,
    startedAt: progress.startedAt || null,
    checked: progress.checked || 0,
    recovered: progress.recovered || 0,
    failed: progress.failed || 0,
    lastError: progress.lastError || null,
  };
}

async function start() {
  await ensureSchema();
  const brands = await enabledBrands();
  if (!brands.length) throw Object.assign(new Error('No active store has Shiprocket Checkout enabled.'), { status: 409 });
  const progress = {
    brands: brands.map(({ id, slug }) => ({ id, slug })), brandIndex: 0, page: 0, rowIndex: 0,
    startedAt: new Date().toISOString(), checked: 0, recovered: 0, failed: 0, retries: 0,
  };
  await sequelize.query(`INSERT IGNORE INTO shiprocket_order_backfill (id) VALUES (1)`);
  await sequelize.query(`UPDATE shiprocket_order_backfill SET active = TRUE, progress = :progress,
    next_at = UTC_TIMESTAMP(), lease = NULL, lease_until = NULL WHERE id = 1 AND active = FALSE`,
  { replacements: { progress: JSON.stringify(progress) } });
  return status();
}

function advancePage(progress) {
  progress.rowIndex = 0;
  if (progress.references.length < PAGE_SIZE) {
    progress.brandIndex++;
    progress.page = 0;
    progress.previousPage = null;
  } else {
    progress.page++;
  }
  progress.references = null;
}

async function recoverOrder(brandId, reference) {
  const { fetchProviderOrder, ingestVerifiedOrder } = require('../controller/customCheckoutController.js');
  const details = await fetchProviderOrder(brandId, reference);
  if (!orderReference(details) || String(details.payment_status || '').toLowerCase() !== 'success') return { skipped: 'not_confirmed_prepaid' };
  const entries = Array.isArray(details.payments) ? details.payments.filter(Boolean) : [];
  const successful = entries.filter((entry) => ['captured', 'success', 'successful', 'paid', 'completed']
    .includes(String(entry.status || entry.payment_status || '').toLowerCase()));
  const entry = successful.length === 1 ? successful[0] : entries.length <= 1 ? entries[0] || {} : null;
  let payment;
  if (entry) {
    const paymentId = [entry.razorpay_payment_id, entry.pg_transaction_id, entry.txn_id, details.razorpay_payment_id]
      .find((id) => /^pay_[a-zA-Z0-9]{6,64}$/.test(id || ''));
    const [orderId] = [...razorpayOrderReferences(entry), ...razorpayOrderReferences(details)];
    if (paymentId || orderId) {
      const razorpay = require('./razorpayService.js');
      if (paymentId) payment = await razorpay.getPayment(paymentId);
      else {
        const gateway = await razorpay.getInstance();
        const result = await gateway.orders.fetchPayments(orderId);
        const captures = result.items?.filter((item) => item.status === 'captured') || [];
        if (captures.length === 1) [payment] = captures;
      }
      if (!payment || payment.status !== 'captured' || payment.currency !== 'INR' || Number(payment.amount_refunded) > 0) {
        throw new Error('The Razorpay reference has no single unrefunded INR capture.');
      }
      verifyShiprocketRecovery(details, reference, payment);
      const { findRazorpayOrderMatches } = require('./razorpayOrderMatching.js');
      const match = (await findRazorpayOrderMatches([payment])).get(payment.id);
      if (match.issue || match.pending) throw new Error(match.issue || 'This payment already belongs to a saved checkout.');
      if (match.linked) return { skipped: 'already_matched' };
    }
  }
  return ingestVerifiedOrder(brandId, reference, details, payment, { prepaidOnly: true });
}

async function processNext(progress) {
  // Skip pages of existing orders in batches, but attempt only one import per tick.
  for (let pages = 0; pages < 3 && progress.brandIndex < progress.brands.length; pages++) {
    const brand = progress.brands[progress.brandIndex];
    if (!progress.references) {
      const rows = await orderPage(brand.id, progress.page);
      const signature = JSON.stringify(rows.map((row) => row?.platform_order_id || row?.order_id || null));
      if (rows.length === PAGE_SIZE && signature === progress.previousPage) {
        throw new Error(`Shiprocket returned a repeated history page for ${brand.slug}.`);
      }
      progress.previousPage = signature;
      progress.references = rows.map((row) => orderReference(row));
    }
    const ids = progress.references.slice(progress.rowIndex);
    const keys = ids.filter(Boolean).map((id) => `cco:${id}`);
    const existing = keys.length ? await Order.findAll({
      attributes: ['idempotency_key'], where: { idempotency_key: { [Op.in]: keys } },
    }) : [];
    const saved = new Set(existing.map((row) => row.idempotency_key));
    const next = ids.findIndex((id) => id && !saved.has(`cco:${id}`));
    if (next < 0) {
      advancePage(progress);
      continue;
    }
    progress.rowIndex += next;
    const reference = ids[next];
    try {
      const result = await recoverOrder(brand.id, reference);
      if (result.created) progress.recovered++;
      else if (result.skipped?.startsWith('status_')) throw new Error(`Shiprocket order status is ${result.skipped.slice(7)}.`);
    } catch (error) {
      progress.lastError = `${brand.slug} · ${reference} · ${error.message}`;
      if (++progress.retries < 3) return;
      progress.failed++;
    }
    progress.checked++;
    progress.retries = 0;
    progress.rowIndex++;
    if (progress.rowIndex >= progress.references.length) advancePage(progress);
    return;
  }
}

async function run() {
  await ensureSchema();
  const lease = randomUUID();
  // Persist both the lease and the next eligible time so concurrent workers,
  // HTTP wakes and process restarts share the same one-per-minute limit.
  await sequelize.query(`UPDATE shiprocket_order_backfill SET lease = :lease,
    lease_until = UTC_TIMESTAMP() + INTERVAL 10 MINUTE, next_at = UTC_TIMESTAMP() + INTERVAL 60 SECOND
    WHERE id = 1 AND active = TRUE AND next_at <= UTC_TIMESTAMP()
    AND (lease_until IS NULL OR lease_until <= UTC_TIMESTAMP())`, { replacements: { lease } });
  const row = await read();
  if (row?.lease !== lease) return { status: 'skipped', summary: 'No historical recovery due' };
  const progress = JSON.parse(row.progress);
  let failure;
  try { await processNext(progress); }
  catch (error) { progress.lastError = error.message; failure = error.message; }
  const active = progress.brandIndex < progress.brands.length;
  await sequelize.query(`UPDATE shiprocket_order_backfill SET active = :active, progress = :progress,
    lease = NULL, lease_until = NULL WHERE id = 1 AND lease = :lease`,
  { replacements: { active, progress: JSON.stringify(progress), lease } });
  return {
    status: failure || progress.failed || progress.retries ? 'partial' : 'ok',
    summary: `${progress.checked} checked · ${progress.recovered} recovered · ${progress.failed} need review`,
    error: failure || (progress.failed || progress.retries ? progress.lastError : null),
  };
}

module.exports = { start, status, run };
