// What happened to an order after it was placed, sent to Meta (Conversions
// API) on the store's own pixel: OrderDelivered, OrderCancelled and
// OrderReturned (RTO) — and, for cancelled / returned orders, a full GA4
// refund on the store's Google Analytics. Most of our orders are cash on delivery, and a placed
// order isn't a paid one — with these Meta can build audiences and custom
// conversions on orders that were actually delivered, and leave out the ones
// that were refused or cancelled.
//
// Every status change goes through the Order model, so one hook covers the
// courier webhooks, the Dashboard, WhatsApp confirmations and returns alike.
// Each event fires once per order (event id <Event>_<order number>), only when
// the order first enters that state.
//
// To match the same shopper as the order's Purchase, the browser ids that
// Purchase carried (ad click id, browser id, device, visitor id) are kept in
// meta_order_tracking when the Purchase is sent (saveTracking).

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { Order } = require('../model/orderModel.js');
const { logger } = require('../config/logging.js');

const OUTCOMES = [
  { event: 'OrderDelivered', statuses: ['delivered'] },
  { event: 'OrderCancelled', statuses: ['cancelled', 'order cancelled'] },
  { event: 'OrderReturned', statuses: ['rto', 'rto delivered', 'returned_rto'] },
];
const outcomeOf = (status) => OUTCOMES.find((o) => o.statuses.includes(String(status || '').toLowerCase()));

let tableReady = null;
function ensureTable() {
  if (!tableReady) {
    tableReady = sequelize.query(
      `CREATE TABLE IF NOT EXISTS meta_order_tracking (
         brand_id INT NOT NULL,
         order_number VARCHAR(64) NOT NULL,
         fbp VARCHAR(255) NULL,
         fbc VARCHAR(512) NULL,
         visitor_id VARCHAR(64) NULL,
         ip_address VARCHAR(64) NULL,
         user_agent VARCHAR(400) NULL,
         ga_client_id VARCHAR(100) NULL,
         ga_session_id VARCHAR(32) NULL,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         PRIMARY KEY (brand_id, order_number)
       ) ENGINE=InnoDB`
    )
      // The Google ids came a day later: add them to a table created before.
      .then(() => Promise.all(['ga_client_id VARCHAR(100) NULL', 'ga_session_id VARCHAR(32) NULL'].map((col) =>
        sequelize.query(`ALTER TABLE meta_order_tracking ADD COLUMN ${col}`)
          .catch((e) => { if (!/duplicate column/i.test(e.message)) throw e; }))))
      .catch((e) => { tableReady = null; throw e; });
  }
  return tableReady;
}

// Called with the Purchase payload when it is sent to Meta.
async function saveTracking(brandId, order) {
  if (!brandId || !order?.order_number) return;
  const row = {
    brand_id: brandId,
    order_number: String(order.order_number).slice(0, 64),
    fbp: order.fbp ? String(order.fbp).slice(0, 255) : null,
    fbc: order.fbc ? String(order.fbc).slice(0, 512) : null,
    visitor_id: order.visitor_id ? String(order.visitor_id).slice(0, 64) : null,
    ip_address: order.ip_address ? String(order.ip_address).slice(0, 64) : null,
    user_agent: order.user_agent ? String(order.user_agent).slice(0, 400) : null,
    ga_client_id: order.ga_client_id ? String(order.ga_client_id).slice(0, 100) : null,
    ga_session_id: order.ga_session_id ? String(order.ga_session_id).slice(0, 32) : null,
  };
  if (!row.fbp && !row.fbc && !row.visitor_id && !row.user_agent && !row.ga_client_id) return;
  await ensureTable();
  // A later Purchase copy (thank-you page) fills in what an earlier one
  // (webhook) didn't know, never erasing a value.
  await sequelize.query(
    `INSERT INTO meta_order_tracking (brand_id, order_number, fbp, fbc, visitor_id, ip_address, user_agent, ga_client_id, ga_session_id)
     VALUES (:brand_id, :order_number, :fbp, :fbc, :visitor_id, :ip_address, :user_agent, :ga_client_id, :ga_session_id)
     ON DUPLICATE KEY UPDATE
       fbp = COALESCE(VALUES(fbp), fbp), fbc = COALESCE(VALUES(fbc), fbc),
       visitor_id = COALESCE(VALUES(visitor_id), visitor_id),
       ip_address = COALESCE(VALUES(ip_address), ip_address),
       user_agent = COALESCE(VALUES(user_agent), user_agent),
       ga_client_id = COALESCE(VALUES(ga_client_id), ga_client_id),
       ga_session_id = COALESCE(VALUES(ga_session_id), ga_session_id)`,
    { replacements: row, type: QueryTypes.INSERT }
  );
}

async function trackingFor(brandId, orderNumber) {
  try {
    await ensureTable();
    const [row] = await sequelize.query(
      'SELECT fbp, fbc, visitor_id, ip_address, user_agent, ga_client_id, ga_session_id FROM meta_order_tracking WHERE brand_id = :b AND order_number = :n LIMIT 1',
      { replacements: { b: brandId, n: orderNumber }, type: QueryTypes.SELECT }
    );
    return row || {};
  } catch (_) {
    return {};
  }
}

async function sendOutcome(order, event) {
  if (!order?.brand_id || !order.order_number) return;
  const { purchasePayload } = require('./customCheckoutService.js');
  const base = await purchasePayload(order.brand_id, order.order_number);
  if (!base) return;
  const t = await trackingFor(order.brand_id, order.order_number);
  const payload = { ...base, ...Object.fromEntries(Object.entries(t).filter(([, v]) => v)) };
  const { sendFacebookEvent } = require('../integration/facebookPixel.js');
  // A website event must carry the shopper's browser; orders placed before
  // their Purchase details were kept have none, so those go as system events.
  const r = await sendFacebookEvent(event, payload, { action_source: payload.user_agent ? 'website' : 'system_generated' });
  if (r?.error) logger.warn(`[meta] ${event} ${order.order_number}: ${JSON.stringify(r.error).slice(0, 300)}`);
  // Google Analytics: a cancelled or returned order is refunded in full, so
  // GA4 revenue counts only what was actually sold (same transaction id as
  // the purchase).
  if (event === 'OrderCancelled' || event === 'OrderReturned') {
    const { sendGAEvent } = require('../integration/googleAnalytics.js');
    await sendGAEvent('refund', payload);
  }
}

Order.addHook('afterUpdate', 'metaOrderOutcomes', (order, options) => {
  try {
    if (!order.changed || !order.changed('status')) return;
    const now = outcomeOf(order.status);
    if (!now) return;
    const before = outcomeOf(order.previous('status'));
    if (before && before.event === now.event) return; // already sent (e.g. rto → rto delivered)
    const snapshot = { brand_id: order.brand_id, order_number: order.order_number };
    const fire = () => setImmediate(() => { sendOutcome(snapshot, now.event).catch((e) => logger.warn(`[meta] ${now.event} failed: ${e.message}`)); });
    // Inside a transaction, only once it is committed (a rolled-back change
    // never happened).
    if (options?.transaction?.afterCommit) options.transaction.afterCommit(fire);
    else fire();
  } catch (_) { /* never break an order update */ }
});

module.exports = { saveTracking, sendOutcome, outcomeOf };
