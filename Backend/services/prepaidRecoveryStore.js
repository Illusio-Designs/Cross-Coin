// Runtime schema setup follows the other payment/admin services. No customer
// details or payment credentials are retained in the recovery inbox.
const { Op, QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const query = (sql, replacements = {}, options = {}) => sequelize.query(sql, { replacements, ...options });
const rows = (sql, replacements, options) => query(sql, replacements, { ...options, type: QueryTypes.SELECT });
const validPaymentId = (value) => typeof value === 'string' && /^pay_[a-zA-Z0-9]{6,64}$/.test(value);
const validGatewayOrder = (value) => typeof value === 'string' && /^order_[a-zA-Z0-9]{6,64}$/.test(value);
const validCheckoutRef = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,96}$/.test(value) && !validPaymentId(value);
const graceMinutes = () => Math.min(60, Math.max(1, Number(process.env.PREPAID_RECOVERY_GRACE_MINUTES) || 5));
let schema;

function ensureSchema() {
  schema ||= (async () => {
    await query(`CREATE TABLE IF NOT EXISTS prepaid_recovery (
      payment_id VARCHAR(68) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
      gateway_order_id VARCHAR(70) CHARACTER SET ascii COLLATE ascii_bin,
      amount_paise BIGINT NOT NULL, source_at DATETIME, historical BOOLEAN NOT NULL DEFAULT FALSE,
      state VARCHAR(24) NOT NULL DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0,
      next_at DATETIME NOT NULL, lease VARCHAR(36), lease_until DATETIME,
      checkout_ref VARCHAR(96), brand_id INT, order_id INT, reason VARCHAR(600),
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_recovery_due (state, next_at), KEY idx_recovery_source (source_at), KEY idx_recovery_lease (lease)
    ) ENGINE=InnoDB`);
    await query(`CREATE TABLE IF NOT EXISTS prepaid_checkout_inbox (
      brand_id INT NOT NULL, checkout_ref VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      payment_id VARCHAR(68) CHARACTER SET ascii COLLATE ascii_bin,
      gateway_order_id VARCHAR(70) CHARACTER SET ascii COLLATE ascii_bin,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, next_at DATETIME NOT NULL,
      attempts INT NOT NULL DEFAULT 0, resolved BOOLEAN NOT NULL DEFAULT FALSE,
      PRIMARY KEY (brand_id, checkout_ref), KEY idx_inbox_payment (payment_id),
      KEY idx_inbox_gateway (gateway_order_id), KEY idx_inbox_due (resolved, next_at)
    ) ENGINE=InnoDB`);
    await query(`CREATE TABLE IF NOT EXISTS prepaid_recovery_attempts (
      id BIGINT AUTO_INCREMENT PRIMARY KEY, payment_id VARCHAR(68) NOT NULL,
      gateway_order_id VARCHAR(70), checkout_ref VARCHAR(96), order_id INT, actor_id INT,
      state VARCHAR(24) NOT NULL, reason VARCHAR(600), attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_recovery_attempts (payment_id, attempted_at)
    ) ENGINE=InnoDB`);
    await query(`CREATE TABLE IF NOT EXISTS prepaid_payment_claims (
      reference_id VARCHAR(70) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
      order_id INT
    ) ENGINE=InnoDB`);
    await query(`CREATE TABLE IF NOT EXISTS prepaid_recovery_schedule (
      id TINYINT PRIMARY KEY, next_at DATETIME NOT NULL, lease VARCHAR(36), lease_until DATETIME,
      recent_due_at DATETIME
    ) ENGINE=InnoDB`);
    await query(`CREATE TABLE IF NOT EXISTS prepaid_capture_cursor (
      id TINYINT PRIMARY KEY, completed_through BIGINT NOT NULL,
      window_until BIGINT, next_offset INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB`);
  })().catch((error) => { schema = null; throw error; });
  return schema;
}

function isCapture(payment) {
  return validPaymentId(payment?.id) && payment.status === 'captured' && payment.currency === 'INR'
    && Number.isSafeInteger(Number(payment.amount)) && Number(payment.amount) > 0 && Number(payment.amount_refunded || 0) === 0;
}

async function queueCaptures(payments, { historical = false } = {}) {
  const captures = payments.filter(isCapture);
  if (!captures.length) return;
  await ensureSchema();
  const replacements = [];
  const grace = Math.floor(graceMinutes());
  const values = captures.map((p) => {
    replacements.push(p.id, validGatewayOrder(p.order_id) ? p.order_id : null, Number(p.amount),
      Number.isSafeInteger(Number(p.created_at)) && Number(p.created_at) > 0 ? Number(p.created_at) : null);
    return `(?, ?, ?, TIMESTAMPADD(SECOND, ?, '1970-01-01'), ${historical ? 'TRUE' : 'FALSE'}, UTC_TIMESTAMP() + INTERVAL ${grace} MINUTE)`;
  });
  // Use the same grace for a batch and leave terminal rows untouched on replay.
  await query(`INSERT INTO prepaid_recovery (payment_id, gateway_order_id, amount_paise, source_at, historical, next_at)
    VALUES ${values.join(', ')}
    ON DUPLICATE KEY UPDATE gateway_order_id = COALESCE(prepaid_recovery.gateway_order_id, VALUES(gateway_order_id))`, replacements);
}

async function rememberCheckout(brandId, checkoutRef, references = {}, resolved = false) {
  if (!validCheckoutRef(checkoutRef)) return;
  await ensureSchema();
  const paymentId = validPaymentId(references.paymentId) ? references.paymentId : null;
  const gatewayOrderId = validGatewayOrder(references.gatewayOrderId) ? references.gatewayOrderId : null;
  await query(`INSERT INTO prepaid_checkout_inbox (brand_id, checkout_ref, payment_id, gateway_order_id, next_at, resolved)
    VALUES (:brandId, :checkoutRef, :pay, :gateway, UTC_TIMESTAMP() + INTERVAL 2 MINUTE, :resolved)
    ON DUPLICATE KEY UPDATE payment_id = COALESCE(VALUES(payment_id), prepaid_checkout_inbox.payment_id),
      gateway_order_id = COALESCE(VALUES(gateway_order_id), prepaid_checkout_inbox.gateway_order_id),
      resolved = GREATEST(prepaid_checkout_inbox.resolved, VALUES(resolved))`,
  { brandId, checkoutRef, pay: paymentId, gateway: gatewayOrderId, resolved });
  if (paymentId || gatewayOrderId) {
    // A previously unlinked capture may only become recoverable after the
    // provider supplies a reference. The stored reference prevents a replay
    // from repeatedly resetting the retry budget.
    await query(`UPDATE prepaid_recovery SET state = 'pending', checkout_ref = :checkoutRef,
      brand_id = :brandId, attempts = 0, reason = NULL, next_at = UTC_TIMESTAMP()
      WHERE historical = FALSE AND state = 'needs_manual_review' AND checkout_ref IS NULL AND lease IS NULL
      AND reason IN ('No Shiprocket checkout reference was found for this payment.', 'Waiting for the original Shiprocket checkout reference.')
      AND (payment_id = :paymentId OR gateway_order_id = :gatewayOrderId)`,
    { checkoutRef, brandId, paymentId, gatewayOrderId });
  }
}

async function enabledBrands() {
  const Brand = require('../model/brandModel.js');
  const settings = require('./settingsHelper.js');
  const brands = await Brand.findAll({ where: { status: 'active' }, attributes: ['id', 'slug'], order: [['id', 'ASC']] });
  const enabled = await Promise.all(brands.map((brand) => settings.getSetting(brand.id, 'SHIPROCKET_CHECKOUT_ENABLED', 'false')));
  return brands.filter((_, index) => String(enabled[index]).toLowerCase() === 'true');
}

async function readCheckouts(payment) {
  await ensureSchema();
  return rows(`SELECT brand_id, checkout_ref FROM prepaid_checkout_inbox
    WHERE payment_id = :pay OR gateway_order_id = :gateway`, { pay: payment.id, gateway: payment.order_id || null });
}

async function readRecoveries(ids) {
  if (!ids.length) return new Map();
  await ensureSchema();
  const records = await rows('SELECT * FROM prepaid_recovery WHERE payment_id IN (:ids)', { ids });
  return new Map(records.map((row) => [row.payment_id, row]));
}

async function findPendingCapture({ paymentId, gatewayOrderId }) {
  if (!paymentId && !gatewayOrderId) return null;
  await ensureSchema();
  const captures = await rows(`SELECT payment_id FROM prepaid_recovery
    WHERE historical = FALSE AND state = 'pending'
    AND (payment_id = :paymentId OR (:paymentId IS NULL AND gateway_order_id = :gatewayOrderId))
    LIMIT 2`, { paymentId: paymentId || null, gatewayOrderId: gatewayOrderId || null });
  return captures.length === 1 ? captures[0].payment_id : null;
}

async function claimOrder(references, transaction) {
  const refs = [...new Set(references.filter(Boolean))].sort();
  if (!refs.length) return { refs };
  // The primary key serializes two imports even when they use different
  // Shiprocket references. Always acquire keys in the same order.
  await query(`INSERT INTO prepaid_payment_claims (reference_id) VALUES ${refs.map(() => '(?)').join(', ')}
    ON DUPLICATE KEY UPDATE reference_id = prepaid_payment_claims.reference_id`, refs, { transaction });
  const claimed = await rows('SELECT order_id FROM prepaid_payment_claims WHERE reference_id IN (:refs) FOR UPDATE', { refs }, { transaction });
  const { Payment } = require('../model/paymentModel.js');
  const saved = await Payment.findAll({
    attributes: ['order_id', 'razorpay_payment_id', 'transaction_id'],
    where: { order_id: { [Op.ne]: null }, [Op.or]: [
      { razorpay_payment_id: { [Op.in]: refs } }, { razorpay_order_id: { [Op.in]: refs } }, { transaction_id: { [Op.in]: refs } },
    ] },
    transaction,
  });
  const orderIds = new Set([...claimed, ...saved].map((row) => Number(row.order_id)).filter(Boolean));
  const paymentId = refs.find(validPaymentId);
  const conflict = saved.some((row) => {
    const savedId = row.razorpay_payment_id || row.transaction_id;
    return paymentId && validPaymentId(savedId) && savedId !== paymentId;
  });
  if (conflict || orderIds.size > 1) throw Object.assign(new Error('Conflicting orders or payments already use this Razorpay reference.'), { status: 409 });
  return { refs, orderId: orderIds.values().next().value };
}

async function bindOrder(refs, orderId, transaction) {
  if (refs.length) await query('UPDATE prepaid_payment_claims SET order_id = :orderId WHERE reference_id IN (:refs)', { refs, orderId }, { transaction });
}

module.exports = { ensureSchema, query, rows, isCapture, validPaymentId, validGatewayOrder, validCheckoutRef,
  queueCaptures, rememberCheckout, enabledBrands, readCheckouts, readRecoveries, findPendingCapture, claimOrder, bindOrder };
