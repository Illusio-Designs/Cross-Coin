const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { logger } = require('../config/logging.js');

/**
 * Failed deliveries (courier NDR = non-delivery report).
 *
 * 1. The courier webhook reports "undelivered" → a case is opened (one open
 *    case per order; a repeat failure bumps `attempts`) and the customer gets
 *    a WhatsApp with three buttons: Deliver Again / Change Address / Cancel.
 * 2. The customer's tap (and, for Change Address, their next message) is
 *    stored on the case.
 * 3. "Deliver Again" is sent to iThink's NDR API automatically. If iThink
 *    rejects it — or for an address change / cancel — the case waits in
 *    Dashboard → Failed Deliveries for staff to act (API button, or do it in
 *    the iThink panel and press Mark done).
 * 4. Delivered / RTO / cancelled closes the case automatically.
 */

const OPEN = ['awaiting_customer', 'reattempt_requested', 'address_updated', 'cancel_requested', 'needs_action'];
const CLOSING_STATUSES = ['delivered', 'rto', 'rto delivered', 'returned_rto', 'cancelled', 'order cancelled'];

async function ensureTable() {
  await sequelize.query(`CREATE TABLE IF NOT EXISTS ndr_cases (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    brand_id INT NULL,
    awb VARCHAR(64) NULL,
    reason VARCHAR(255) NULL,
    attempts INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'awaiting_customer',
    customer_action VARCHAR(20) NULL,
    new_address TEXT NULL,
    reattempt_date DATE NULL,
    courier_response TEXT NULL,
    sent_to_courier_at DATETIME NULL,
    resolved_at DATETIME NULL,
    resolved_note VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_ndr_order (order_id),
    KEY idx_ndr_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

async function openCaseFor(orderId) {
  const [row] = await sequelize.query(
    `SELECT * FROM ndr_cases WHERE order_id = ? AND status IN (:open) ORDER BY id DESC LIMIT 1`.replace(':open', OPEN.map(() => '?').join(',')),
    { replacements: [orderId, ...OPEN], type: QueryTypes.SELECT }
  );
  return row || null;
}

// Called by the courier webhook on every real status change.
async function onStatus(order, status, reason) {
  const st = String(status || '').toLowerCase();
  if (st === 'undelivered') {
    const existing = await openCaseFor(order.id);
    if (existing) {
      await sequelize.query(
        `UPDATE ndr_cases SET attempts = attempts + 1, reason = ?, status = 'awaiting_customer',
                customer_action = NULL, reattempt_date = NULL, courier_response = NULL, sent_to_courier_at = NULL
          WHERE id = ?`,
        { replacements: [reason ? String(reason).slice(0, 255) : existing.reason, existing.id] }
      );
    } else {
      await sequelize.query(
        `INSERT INTO ndr_cases (order_id, brand_id, awb, reason) VALUES (?, ?, ?, ?)`,
        { replacements: [order.id, order.brand_id || 1, order.shipping_waybill || order.tracking_number || null, reason ? String(reason).slice(0, 255) : null] }
      );
    }
    return;
  }
  if (CLOSING_STATUSES.includes(st)) {
    await sequelize.query(
      `UPDATE ndr_cases SET status = 'closed', resolved_at = NOW(), resolved_note = ? WHERE order_id = ? AND status <> 'closed'`,
      { replacements: [`Order ${st}`, order.id] }
    );
  }
}

// Tomorrow's date in IST (YYYY-MM-DD).
function tomorrowIST() {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000 + 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

// Push a reattempt / RTO instruction to the courier (iThink NDR API).
async function sendToCourier(caseRow, action, extra = {}) {
  const factory = require('./shippingProviderFactory.js');
  const provider = await factory.getShippingProvider(caseRow.brand_id || 1);
  if (!provider || typeof provider.ndrAction !== 'function') {
    throw new Error('The courier integration has no NDR API — update it in the courier panel.');
  }
  if (!caseRow.awb) throw new Error('No AWB on this order.');
  const resp = await provider.ndrAction(caseRow.awb, action, extra);
  const ok = resp && (String(resp.status).toLowerCase() === 'success' || Number(resp.status_code) === 200);
  const text = JSON.stringify(resp || {}).slice(0, 1000);
  if (!ok) throw new Error(`Courier did not accept it: ${text}`);
  await sequelize.query(
    `UPDATE ndr_cases SET status = 'closed', courier_response = ?, sent_to_courier_at = NOW(), resolved_at = NOW(),
            resolved_note = ? WHERE id = ?`,
    { replacements: [text, action === 'rto' ? 'RTO requested at courier' : 'Reattempt requested at courier', caseRow.id] }
  );
  return resp;
}

// Customer tapped a button on the failed-delivery message.
async function onCustomerChoice(orderNumber, choice, phone, brandId) {
  const { Order } = require('../model/orderModel.js');
  const { WhatsappConversation } = require('../model/whatsappConversationModel.js');
  const whatsappService = require('./whatsappService.js');
  const order = await Order.findOne({ where: { order_number: orderNumber } });
  if (!order) return;
  const c = await openCaseFor(order.id);
  if (!c) return;

  if (choice === 'retry') {
    const date = tomorrowIST();
    await sequelize.query(
      `UPDATE ndr_cases SET customer_action = 'reattempt', reattempt_date = ?, status = 'reattempt_requested' WHERE id = ?`,
      { replacements: [date, c.id] }
    );
    let sent = false;
    try {
      await sendToCourier({ ...c, reattempt_date: date }, 'reattempt', { reattempt_date: date });
      sent = true;
    } catch (e) {
      await sequelize.query(`UPDATE ndr_cases SET status = 'needs_action', courier_response = ? WHERE id = ?`,
        { replacements: [String(e.message).slice(0, 1000), c.id] });
      logger.warn(`[NDR] auto reattempt for ${orderNumber} not accepted: ${e.message}`);
    }
    await whatsappService.sendTextMessage(phone, sent
      ? `Done ✅ We've asked the courier to deliver order *#${orderNumber}* again. Please keep your phone reachable.`
      : `Thanks! We've noted that you'd like order *#${orderNumber}* delivered again — our team is arranging it with the courier.`, brandId).catch(() => {});
  } else if (choice === 'address') {
    await sequelize.query(`UPDATE ndr_cases SET customer_action = 'new_address' WHERE id = ?`, { replacements: [c.id] });
    await WhatsappConversation.update({ awaiting_address_for: `ndr:${orderNumber}` }, { where: { customer_phone: phone } });
    await whatsappService.sendTextMessage(phone,
      `Please reply with the full delivery address for order *#${orderNumber}* — house/flat, street, landmark, city and 6-digit PIN code. Add a different phone number too if the courier should call someone else.`, brandId).catch(() => {});
  } else if (choice === 'cancel') {
    await sequelize.query(`UPDATE ndr_cases SET customer_action = 'cancel', status = 'cancel_requested' WHERE id = ?`, { replacements: [c.id] });
    await whatsappService.sendTextMessage(phone,
      `Understood — we've noted that you no longer want order *#${orderNumber}*. Our team will cancel the delivery with the courier.`, brandId).catch(() => {});
  }
}

// The customer's next message after "Change Address".
async function onNewAddress(orderNumber, text, phone, brandId) {
  const { Order } = require('../model/orderModel.js');
  const { ShippingAddress } = require('../model/shippingAddressModel.js');
  const { WhatsappConversation } = require('../model/whatsappConversationModel.js');
  const whatsappService = require('./whatsappService.js');
  await WhatsappConversation.update({ awaiting_address_for: null }, { where: { customer_phone: phone } });
  const order = await Order.findOne({ where: { order_number: orderNumber } });
  if (!order) return;
  const c = await openCaseFor(order.id);
  if (!c) return;
  const clean = String(text || '').trim().slice(0, 1000);
  await sequelize.query(
    `UPDATE ndr_cases SET new_address = ?, status = 'address_updated' WHERE id = ?`,
    { replacements: [clean, c.id] }
  );
  // Keep our own record of where the parcel should go.
  const addr = order.shipping_address_id ? await ShippingAddress.findByPk(order.shipping_address_id) : null;
  if (addr) {
    const pin = (clean.match(/\b(\d{6})\b/) || [])[1];
    await addr.update({ address: clean, ...(pin ? { pincode: pin } : {}) }).catch(() => {});
  }
  await whatsappService.sendTextMessage(phone,
    `Thank you! We've received the new address for order *#${orderNumber}* and will share it with the courier for the next delivery attempt.`, brandId).catch(() => {});
}

async function listCases({ status = 'open', limit = 100 } = {}) {
  const where = status === 'open' ? `c.status <> 'closed'` : '1=1';
  const rows = await sequelize.query(
    `SELECT c.*, o.order_number, o.status AS order_status, o.payment_type, o.final_amount, o.courier_name,
            o.shipping_address_id
       FROM ndr_cases c
       JOIN orders o ON o.id = c.order_id
      WHERE ${where}
      ORDER BY c.updated_at DESC
      LIMIT ${Math.min(parseInt(limit, 10) || 100, 300)}`,
    { type: QueryTypes.SELECT }
  );
  // Addresses through the model: phone is encrypted at rest.
  const { ShippingAddress } = require('../model/shippingAddressModel.js');
  const ids = [...new Set(rows.map((r) => r.shipping_address_id).filter(Boolean))];
  const addrs = ids.length ? await ShippingAddress.findAll({ where: { id: ids } }) : [];
  const byId = new Map(addrs.map((a) => [a.id, a]));
  return rows.map((r) => {
    const a = byId.get(r.shipping_address_id);
    return {
      ...r,
      customer_name: a?.full_name || null,
      customer_phone: a?.phone || null,
      address: a ? [a.address, a.city, a.state, a.pincode].filter(Boolean).join(', ') : null,
    };
  });
}

async function getCase(id) {
  const [row] = await sequelize.query(`SELECT * FROM ndr_cases WHERE id = ?`, { replacements: [id], type: QueryTypes.SELECT });
  return row || null;
}

async function resolveManually(id, note) {
  await sequelize.query(
    `UPDATE ndr_cases SET status = 'closed', resolved_at = NOW(), resolved_note = ? WHERE id = ?`,
    { replacements: [String(note || 'Handled in courier panel').slice(0, 255), id] }
  );
}

module.exports = { ensureTable, onStatus, onCustomerChoice, onNewAddress, sendToCourier, listCases, getCase, resolveManually, OPEN };
