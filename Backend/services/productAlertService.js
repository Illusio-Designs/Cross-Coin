const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { logger } = require('../config/logging.js');

/**
 * Product alerts — WhatsApp customers who saved a product (wishlist) or still
 * have it in their cart when that product:
 *   • comes BACK IN STOCK (all active variations were at 0, now some > 0), or
 *   • DROPS IN PRICE (lowest in-stock price fell by at least ₹1 and 2%) —
 *     this covers sales and discounts set on the product.
 *
 * Works by snapshot comparison (product_alert_state) instead of model hooks,
 * so every way stock or price changes — admin edit, bulk import, variation
 * re-create, RTO/return restock — is caught. The first time a product is
 * seen it only records a baseline, so deploying this never blasts anyone.
 *
 * Anti-spam: a customer gets at most one product alert per 24 h, and never
 * the same alert for the same product twice within 7 days. Opted-out
 * customers (replied STOP) are skipped.
 */

const MIN_DROP_RUPEES = 1;
const MIN_DROP_RATIO = 0.02;

async function ensureTables() {
  await sequelize.query(`CREATE TABLE IF NOT EXISTS product_alert_state (
    product_id INT NOT NULL PRIMARY KEY,
    in_stock TINYINT(1) NOT NULL DEFAULT 0,
    min_price DECIMAL(10,2) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await sequelize.query(`CREATE TABLE IF NOT EXISTS product_alert_log (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    type VARCHAR(20) NOT NULL,
    sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_pal_user_sent (user_id, sent_at),
    KEY idx_pal_user_product (user_id, product_id, type, sent_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

// Current stock + lowest in-stock price for every active product (or one).
async function currentProductState(productId = null) {
  return sequelize.query(
    `SELECT p.id, p.brand_id, p.name, p.slug,
            COALESCE(SUM(CASE WHEN v.status = 'active' THEN GREATEST(v.stock, 0) ELSE 0 END), 0) AS stock,
            MIN(CASE WHEN v.status = 'active' AND v.stock > 0 THEN v.price END) AS min_price
       FROM products p
       JOIN product_variations v ON v.productId = p.id
      WHERE p.status = 'active'${productId ? ' AND p.id = :pid' : ''}
      GROUP BY p.id, p.brand_id, p.name, p.slug`,
    { type: QueryTypes.SELECT, replacements: { pid: productId } }
  );
}

// Same window as the cron ('20,50 9-20 * * *' IST): nobody is messaged at night.
function inSendingHours(d = new Date()) {
  const h = new Date(d.getTime() + 330 * 60000).getUTCHours();
  return h >= 9 && h < 21;
}

// Customers to tell about a product: wishlist + active cart, with a phone,
// minus anyone alerted in the last 24 h or sent this same alert for this
// product in the last 7 days.
const AUDIENCE_SQL = `
  SELECT u.id, u.username, u.phone
    FROM users u
   WHERE u.deleted_at IS NULL AND u.phone IS NOT NULL AND u.phone <> ''
     AND u.id IN (
       SELECT w.userId FROM wishlists w WHERE w.productId = :pid AND w.userId IS NOT NULL
       UNION
       SELECT c.user_id FROM carts c JOIN cart_items ci ON ci.cart_id = c.id
        WHERE ci.product_id = :pid AND c.status = 'active' AND c.user_id IS NOT NULL
     )
     AND u.id NOT IN (SELECT l.user_id FROM product_alert_log l WHERE l.sent_at >= NOW() - INTERVAL 1 DAY)
     AND u.id NOT IN (SELECT l.user_id FROM product_alert_log l
                       WHERE l.product_id = :pid AND l.type = :type AND l.sent_at >= NOW() - INTERVAL 7 DAY)`;

// STOP is per phone on the shared WhatsApp number (one thread per phone), so
// the check is by phone only — never scoped to a brand.
async function optedOut(phone) {
  return require('./whatsappService.js').isPhoneOptedOut(phone);
}

async function notify(event) {
  const whatsappService = require('./whatsappService.js');
  const people = await sequelize.query(AUDIENCE_SQL, {
    replacements: { pid: event.product.id, type: event.type }, type: QueryTypes.SELECT,
  });
  let sent = 0;
  for (const u of people) {
    const brandId = event.product.brand_id || 1;
    if (await optedOut(u.phone)) continue;
    try {
      const data = { customerName: u.username, productName: event.product.name, productSlug: event.product.slug };
      if (event.type === 'back_in_stock') {
        await whatsappService.sendBackInStock(u.phone, data, brandId);
      } else {
        await whatsappService.sendPriceDrop(u.phone, { ...data, newPrice: event.newPrice, oldPrice: event.oldPrice }, brandId);
      }
      await sequelize.query(
        `INSERT INTO product_alert_log (user_id, product_id, type) VALUES (?, ?, ?)`,
        { replacements: [u.id, event.product.id, event.type] }
      );
      sent++;
    } catch (e) {
      logger.warn(`[ProductAlerts] ${event.type} to user ${u.id} failed: ${e.message}`);
    }
  }
  return sent;
}

// Compare products against their last snapshot, record the new snapshot and
// message the audience for each back-in-stock / price-drop change.
async function evaluate(products, productId = null) {
  const stateRows = await sequelize.query(
    `SELECT product_id, in_stock, min_price FROM product_alert_state${productId ? ' WHERE product_id = :pid' : ''}`,
    { type: QueryTypes.SELECT, replacements: { pid: productId } }
  );
  const prev = new Map(stateRows.map((r) => [r.product_id, r]));

  const events = [];
  for (const p of products) {
    const inStock = Number(p.stock) > 0;
    const price = p.min_price != null ? Number(p.min_price) : null;
    const before = prev.get(p.id);
    if (before) {
      const wasInStock = Number(before.in_stock) === 1;
      const oldPrice = before.min_price != null ? Number(before.min_price) : null;
      if (!wasInStock && inStock) {
        events.push({ type: 'back_in_stock', product: p });
      } else if (wasInStock && inStock && oldPrice != null && price != null
        && oldPrice - price >= MIN_DROP_RUPEES && (oldPrice - price) / oldPrice >= MIN_DROP_RATIO) {
        events.push({ type: 'price_drop', product: p, oldPrice, newPrice: price });
      }
    }
    // Out of stock keeps the last known price, so a restock at a lower price
    // is reported as back-in-stock (not twice).
    const keepPrice = inStock ? price : (before?.min_price ?? price);
    await sequelize.query(
      `INSERT INTO product_alert_state (product_id, in_stock, min_price) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE in_stock = VALUES(in_stock), min_price = VALUES(min_price)`,
      { replacements: [p.id, inStock ? 1 : 0, keepPrice] }
    );
  }

  let sent = 0;
  for (const ev of events) sent += await notify(ev);
  return { checked: products.length, events: events.length, sent };
}

async function runProductAlerts() {
  await ensureTables();
  return evaluate(await currentProductState());
}

/**
 * Run the same check for ONE product right away — used when staff edit stock
 * inline on the Products page, so a restock doesn't wait for the next cron
 * tick. Outside sending hours it does nothing (the snapshot is left as-is),
 * so the first morning run still sees the change and sends it then.
 */
async function checkProductNow(productId) {
  const pid = parseInt(productId, 10);
  if (!Number.isFinite(pid) || pid <= 0) return { checked: 0, events: 0, sent: 0 };
  if (!inSendingHours()) return { checked: 0, events: 0, sent: 0, deferred: true };
  await ensureTables();
  return evaluate(await currentProductState(pid), pid);
}

// Staff just restocked a product that had sold out. If the snapshot still
// says "in stock" (it sold out between two cron runs), correct it so the
// restock is seen as one. Products never snapshotted keep the baseline rule.
async function recordSoldOut(productId) {
  await ensureTables();
  await sequelize.query(`UPDATE product_alert_state SET in_stock = 0 WHERE product_id = ?`, { replacements: [productId] });
}

module.exports = { runProductAlerts, checkProductNow, recordSoldOut, inSendingHours, ensureTables };
