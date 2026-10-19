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
 *    stored on the case. A new address becomes a NEW shipping address row
 *    that the order points at (the customer's address book is never edited).
 * 3. "Deliver Again" is sent to iThink's NDR API automatically. If iThink
 *    rejects it — or for an address change / cancel — the case waits in
 *    Dashboard → Orders → Problems for staff to act.
 * 4. Once the courier accepts a reattempt / RTO the case stays open as
 *    "reattempt_requested" / "rto_requested" until the courier's next status:
 *    delivered / RTO / cancelled closes it, another failed attempt puts it
 *    back in front of staff ("needs_action").
 */

const OPEN = ['awaiting_customer', 'reattempt_requested', 'address_updated', 'cancel_requested', 'needs_action', 'rto_requested'];
const CLOSING_STATUSES = ['delivered', 'rto', 'rto delivered', 'returned_rto', 'cancelled', 'order cancelled'];
// Marker stored in courier_response when the reattempt we asked for failed.
const REATTEMPT_FAILED = 'The reattempt failed too';

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

// Lazy: exceptionsService owns the extra columns + the events table.
const ex = () => require('./exceptionsService.js');
const event = (caseRow, text, opts) => ex().logEvent('ndr', caseRow.id, caseRow.order_id, text, opts);

async function openCaseFor(orderId) {
  const [row] = await sequelize.query(
    `SELECT * FROM ndr_cases WHERE order_id = ? AND status IN (${OPEN.map(() => '?').join(',')}) ORDER BY id DESC LIMIT 1`,
    { replacements: [orderId, ...OPEN], type: QueryTypes.SELECT }
  );
  return row || null;
}

// Called by the courier webhook on every real status change.
async function onStatus(order, status, reason) {
  await ex().ensureSchema();
  const st = String(status || '').toLowerCase();
  const why = reason ? String(reason).slice(0, 255) : null;
  if (st === 'undelivered') {
    const existing = await openCaseFor(order.id);
    if (existing) {
      // A reattempt we asked for failed → straight back to staff.
      const retried = !!existing.sent_to_courier_at && existing.status === 'reattempt_requested';
      await sequelize.query(
        `UPDATE ndr_cases SET attempts = attempts + 1, reason = ?, status = ?,
                customer_action = NULL, reattempt_date = NULL, courier_response = ?, sent_to_courier_at = NULL
          WHERE id = ?`,
        { replacements: [why || existing.reason, retried ? 'needs_action' : 'awaiting_customer', retried ? REATTEMPT_FAILED : null, existing.id] }
      );
    } else {
      await sequelize.query(
        `INSERT INTO ndr_cases (order_id, brand_id, awb, reason) VALUES (?, ?, ?, ?)`,
        { replacements: [order.id, order.brand_id || 1, order.shipping_waybill || order.tracking_number || null, why] }
      );
    }
    return;
  }
  if (CLOSING_STATUSES.includes(st)) {
    await sequelize.query(
      `UPDATE ndr_cases
          SET status = 'closed', resolved_at = NOW(),
              resolved_note = IF(sent_to_courier_at IS NOT NULL AND ? = 'delivered', 'Delivered after the reattempt', ?)
        WHERE order_id = ? AND status <> 'closed'`,
      { replacements: [st, st === 'delivered' ? 'Delivered' : `Order ${st}`, order.id] }
    );
  }
}

// Tomorrow's date in IST (YYYY-MM-DD).
function tomorrowIST() {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000 + 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

// Push a reattempt / RTO instruction to the courier (iThink NDR API). The case
// stays open until the courier's next status update (see onStatus).
async function sendToCourier(caseRow, action, extra = {}, actorId = null) {
  await ex().ensureSchema();
  const factory = require('./shippingProviderFactory.js');
  const provider = await factory.getShippingProvider(caseRow.brand_id || 1);
  if (!provider || typeof provider.ndrAction !== 'function') {
    throw new Error('The courier integration has no NDR API — update it in the courier panel.');
  }
  if (!caseRow.awb) throw new Error('No AWB on this order.');
  let resp;
  try {
    resp = await provider.ndrAction(caseRow.awb, action, extra);
  } catch (e) {
    await noteRefusal(caseRow, e.message, actorId);
    throw e;
  }
  const ok = resp && (String(resp.status).toLowerCase() === 'success' || Number(resp.status_code) === 200);
  const text = JSON.stringify(resp || {}).slice(0, 1000);
  if (!ok) {
    await noteRefusal(caseRow, text, actorId);
    throw new Error(`Courier did not accept it: ${text}`);
  }
  await sequelize.query(
    `UPDATE ndr_cases SET status = ?, courier_response = ?, sent_to_courier_at = NOW(),
            reattempt_date = COALESCE(?, reattempt_date), resolved_at = NULL, resolved_note = NULL
      WHERE id = ?`,
    { replacements: [action === 'rto' ? 'rto_requested' : 'reattempt_requested', text, extra.reattempt_date || null, caseRow.id] }
  );
  await event(caseRow, action === 'rto'
    ? 'Asked the courier to return the parcel to us (RTO)'
    : `Asked the courier to deliver again${extra.reattempt_date ? ` on ${extra.reattempt_date}` : ''}`, { tone: 'info', actorId });
  return resp;
}

async function noteRefusal(caseRow, message, actorId) {
  await sequelize.query(`UPDATE ndr_cases SET courier_response = ? WHERE id = ?`,
    { replacements: [String(message || '').slice(0, 1000), caseRow.id] }).catch(() => {});
  await event(caseRow, 'The courier did not accept the request automatically', { tone: 'bad', actorId });
}

// Customer tapped a button on the failed-delivery message.
async function onCustomerChoice(orderNumber, choice, phone, brandId) {
  const { Order } = require('../model/orderModel.js');
  const { WhatsappConversation } = require('../model/whatsappConversationModel.js');
  const whatsappService = require('./whatsappService.js');
  await ex().ensureSchema();
  const order = await Order.findOne({ where: { order_number: orderNumber } });
  if (!order) return;
  const c = await openCaseFor(order.id);
  if (!c) return;

  if (choice === 'retry') {
    const date = tomorrowIST();
    await sequelize.query(
      `UPDATE ndr_cases SET customer_action = 'reattempt', reattempt_date = ?, status = 'reattempt_requested', sent_to_courier_at = NULL WHERE id = ?`,
      { replacements: [date, c.id] }
    );
    await event(c, 'Customer chose on WhatsApp: deliver again', { tone: 'good' });
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
    await event(c, 'Customer chose on WhatsApp: change the address', { tone: 'good' });
    await WhatsappConversation.update({ awaiting_address_for: `ndr:${orderNumber}` }, { where: { customer_phone: phone } });
    await whatsappService.sendTextMessage(phone,
      `Please reply with the full delivery address for order *#${orderNumber}* — house/flat, street, landmark, city and 6-digit PIN code. Add a different phone number too if the courier should call someone else.`, brandId).catch(() => {});
  } else if (choice === 'cancel') {
    await sequelize.query(`UPDATE ndr_cases SET customer_action = 'cancel', status = 'cancel_requested' WHERE id = ?`, { replacements: [c.id] });
    await event(c, 'Customer chose on WhatsApp: cancel the order', { tone: 'bad' });
    await whatsappService.sendTextMessage(phone,
      `Understood — we've noted that you no longer want order *#${orderNumber}*. Our team will cancel the delivery with the courier.`, brandId).catch(() => {});
  }
}

const fmtAddress = (a) => (a ? [a.address, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', ') : '');

// City / state for a PIN code from the brand's courier (iThink's pincode check
// returns them). Fail-soft with a short timeout: null when unknown.
async function lookupPin(pin, brandId) {
  try {
    const factory = require('./shippingProviderFactory.js');
    const provider = await factory.getShippingProvider(brandId || 1);
    if (!provider || typeof provider.checkServiceability !== 'function') return null;
    await Promise.race([
      provider.checkServiceability(null, pin),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000)),
    ]);
    const area = provider._lastPincodeRaw && provider._lastPincodeRaw.response;
    if (area && area.city_name) return { city: String(area.city_name).slice(0, 100), state: area.state_name ? String(area.state_name).slice(0, 100) : null };
  } catch (e) {
    logger.debug(`[NDR] PIN lookup for ${pin} skipped: ${e.message}`);
  }
  return null;
}

/**
 * Point an order at a NEW delivery address typed by the customer (WhatsApp)
 * or by staff. Never edits the existing shipping_addresses row — that row is
 * the customer's address book entry and other orders / invoices use it.
 *
 * Validates: at least 15 characters and a 6-digit PIN code. City/state come
 * from the courier's PIN lookup when the PIN changed; if that lookup isn't
 * available the old city/state are kept and `flag` says so. A 10-digit mobile
 * number in the text becomes the courier contact number.
 *
 * @returns {Promise<{ok:true, address, oldAddressId, flag} | {ok:false, reason, message}>}
 *   reason: 'too_short' | 'no_pin' | 'no_order' | 'no_contact'; message is
 *   customer-friendly (safe to send on WhatsApp).
 */
async function applyNewAddressToOrder(orderId, text, { actorId = null, source = 'whatsapp' } = {}) {
  const { Order } = require('../model/orderModel.js');
  const { ShippingAddress } = require('../model/shippingAddressModel.js');
  const { GuestUser } = require('../model/guestUserModel.js');
  const { OrderStatusHistory } = require('../model/orderStatusHistoryModel.js');
  const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 1000);
  if (clean.length < 15) {
    return { ok: false, reason: 'too_short', message: 'That address looks too short. Please send the full address — house/flat, street, landmark, city and 6-digit PIN code.' };
  }
  const mobile = (clean.match(/(?:\+?91[\s-]?)?\b([6-9]\d{9})\b/) || [])[1] || null;
  const pin = (clean.replace(/(?:\+?91[\s-]?)?\b[6-9]\d{9}\b/g, ' ').match(/\b([1-9]\d{5})\b/) || [])[1];
  if (!pin) {
    return { ok: false, reason: 'no_pin', message: 'Please include the 6-digit PIN code in the address.' };
  }
  const order = await Order.findByPk(orderId);
  if (!order) return { ok: false, reason: 'no_order', message: 'We could not find this order.' };

  const old = order.shipping_address_id ? await ShippingAddress.findByPk(order.shipping_address_id) : null;
  const guest = !old && order.guest_user_id ? await GuestUser.findByPk(order.guest_user_id).catch(() => null) : null;
  let user = null;
  if (!old && !guest && order.user_id) {
    const { User } = require('../model/userModel.js');
    user = await User.findByPk(order.user_id, { attributes: ['id', 'username', 'phone'] }).catch(() => null);
  }
  const phone = mobile || old?.phone || guest?.phone || user?.phone || null;
  if (!phone) return { ok: false, reason: 'no_contact', message: 'Please add a 10-digit mobile number for the courier.' };
  const fullName = old?.full_name
    || [guest?.firstName, guest?.lastName].filter(Boolean).join(' ')
    || user?.username || 'Customer';

  let city = old?.city || null;
  let state = old?.state || null;
  let flag = null;
  if (!old || String(old.pincode) !== pin) {
    const found = await lookupPin(pin, order.brand_id);
    if (found) { city = found.city; state = found.state || state; }
    else flag = old
      ? `PIN changed to ${pin} — city/state kept from the old address (${[old.city, old.state].filter(Boolean).join(', ') || 'unknown'}); check them before booking.`
      : `City/state for PIN ${pin} could not be checked — confirm them before booking.`;
  }
  if (!city || !state) {
    flag = flag || `City/state for PIN ${pin} could not be checked — confirm them before booking.`;
    city = city || 'Unknown';
    state = state || 'Unknown';
  }
  if (mobile && old && String(old.phone || '').replace(/\D/g, '').slice(-10) !== mobile) {
    flag = [flag, `The courier will call the new number ${mobile}.`].filter(Boolean).join(' ');
  }

  const created = await ShippingAddress.create({
    user_id: old ? old.user_id : (order.user_id || null),
    guest_user_id: old ? old.guest_user_id : (order.guest_user_id || null),
    full_name: fullName,
    phone,
    address: clean,
    landmark: null,
    city,
    state,
    pincode: pin,
    country: old?.country || 'India',
    is_default: false,
  });
  await order.update({ shipping_address_id: created.id });
  await OrderStatusHistory.create({
    order_id: order.id, status: order.status, updated_by: actorId,
    notes: `Delivery address changed (${source === 'staff' ? 'entered by staff' : 'sent by the customer on WhatsApp'}): ${clean} [PIN ${pin}]`.slice(0, 1000),
  }).catch((e) => logger.warn(`[NDR] address history note skipped: ${e.message}`));

  return {
    ok: true,
    oldAddressId: old ? old.id : null,
    flag,
    address: { id: created.id, full_name: created.full_name, address: created.address, city, state, pincode: pin, text: fmtAddress(created) },
  };
}

// Save a new address on the case + order (shared by WhatsApp and staff).
async function setCaseAddress(c, text, { actorId = null, source = 'whatsapp' } = {}) {
  await ex().ensureSchema();
  const r = await applyNewAddressToOrder(c.order_id, text, { actorId, source });
  if (!r.ok) return r;
  await sequelize.query(
    `UPDATE ndr_cases SET new_address = ?, status = 'address_updated', customer_action = 'new_address',
            old_shipping_address_id = COALESCE(old_shipping_address_id, ?), new_shipping_address_id = ?, address_note = ?
      WHERE id = ?`,
    { replacements: [r.address.address, r.oldAddressId, r.address.id, r.flag ? r.flag.slice(0, 255) : null, c.id] }
  );
  return r;
}

// The customer's next message after "Change Address".
async function onNewAddress(orderNumber, text, phone, brandId) {
  const { Order } = require('../model/orderModel.js');
  const { WhatsappConversation } = require('../model/whatsappConversationModel.js');
  const whatsappService = require('./whatsappService.js');
  await WhatsappConversation.update({ awaiting_address_for: null }, { where: { customer_phone: phone } });
  const order = await Order.findOne({ where: { order_number: orderNumber } });
  if (!order) return;
  const c = await openCaseFor(order.id);
  if (!c) return;
  const r = await setCaseAddress(c, text, { source: 'whatsapp' });
  if (!r.ok) {
    // Keep listening for a corrected address.
    if (r.reason === 'too_short' || r.reason === 'no_pin' || r.reason === 'no_contact') {
      await WhatsappConversation.update({ awaiting_address_for: `ndr:${orderNumber}` }, { where: { customer_phone: phone } });
    }
    await whatsappService.sendTextMessage(phone, r.message, brandId).catch(() => {});
    return;
  }
  await whatsappService.sendTextMessage(phone,
    `Thank you! We've received the new address for order *#${orderNumber}* and will share it with the courier for the next delivery attempt.`, brandId).catch(() => {});
}

async function listCases({ status = 'open', limit = 100, orderId = null, brandId = null } = {}) {
  const where = [status === 'open' ? `c.status <> 'closed'` : '1=1'];
  const repl = [];
  if (orderId) { where.push('c.order_id = ?'); repl.push(parseInt(orderId, 10) || 0); }
  if (brandId) { where.push('COALESCE(c.brand_id, o.brand_id) = ?'); repl.push(parseInt(brandId, 10) || 0); }
  repl.push(Math.min(parseInt(limit, 10) || 100, 300));
  const rows = await sequelize.query(
    `SELECT c.*, o.order_number, o.status AS order_status, o.payment_type, o.final_amount, o.courier_name,
            o.shipping_address_id
       FROM ndr_cases c
       JOIN orders o ON o.id = c.order_id
      WHERE ${where.join(' AND ')}
      ORDER BY c.updated_at DESC
      LIMIT ?`,
    { replacements: repl, type: QueryTypes.SELECT }
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

async function resolveManually(id, note, actorId = null) {
  await ex().ensureSchema();
  const text = String(note || 'Handled in courier panel').slice(0, 255);
  await sequelize.query(
    `UPDATE ndr_cases SET status = 'closed', resolved_at = NOW(), resolved_note = ? WHERE id = ?`,
    { replacements: [text, id] }
  );
  const c = await getCase(id);
  if (c) await event(c, `Marked done — ${text}`, { tone: 'good', actorId });
}

module.exports = {
  ensureTable, onStatus, onCustomerChoice, onNewAddress, sendToCourier, listCases, getCase, resolveManually,
  applyNewAddressToOrder, setCaseAddress, OPEN, REATTEMPT_FAILED,
};
