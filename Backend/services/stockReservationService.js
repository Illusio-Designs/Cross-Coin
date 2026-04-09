'use strict';

/**
 * Stock Reservation Service
 * 
 * Redis-based temporary stock reservation for prepaid checkout.
 * Reserves stock while user completes payment (10 min TTL).
 * Prevents overselling without touching DB until payment confirmed.
 *
 * Redis Keys:
 *   stock:reservation:{reservation_id}  → JSON session (10 min TTL)
 *   stock:reserved:{variation_id}       → total reserved qty (no TTL, managed by service)
 *   checkout:rzp:{razorpay_order_id}    → reservation_id (15 min TTL, for webhook recovery)
 */

const crypto = require('crypto');
const { logger } = require('../config/logging.js');

const RESERVATION_TTL = 600;       // 10 minutes
const RETRY_EXTEND_TTL = 300;      // 5 extra minutes on retry
const RZP_MAP_TTL = 900;           // 15 minutes for razorpay→reservation mapping

const KEY_RESERVATION = (id) => `stock:reservation:${id}`;
const KEY_RESERVED_QTY = (varId) => `stock:reserved:${varId}`;
const KEY_RZP_MAP = (rzpOrderId) => `checkout:rzp:${rzpOrderId}`;

function generateReservationId() {
  return `res_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Get Redis client (safe — returns null if Redis is down)
 */
function getRedis() {
  const redisService = require('./redisService.js');
  if (!redisService.isReady()) return null;
  return redisService;
}

/**
 * Get total reserved quantity for a variation across all active reservations.
 */
async function getReservedQty(variationId) {
  const redis = getRedis();
  if (!redis) return 0;
  const val = await redis.get(KEY_RESERVED_QTY(variationId));
  return parseInt(val) || 0;
}

/**
 * Get available stock = DB stock - reserved qty.
 */
async function getAvailableStock(variationId, dbStock) {
  const reserved = await getReservedQty(variationId);
  return Math.max(0, dbStock - reserved);
}

/**
 * Reserve stock for a checkout session.
 *
 * @param {number} userId
 * @param {Array} items - [{ variation_id, quantity, product_id, price, discount, subtotal }]
 * @param {object} sessionData - additional checkout data (address, totals, coupon, etc.)
 * @returns {{ reservationId, expiresIn }} or throws on insufficient stock
 */
async function reserveStock(userId, items, sessionData = {}) {
  const redis = getRedis();
  if (!redis) {
    throw new Error('Redis unavailable — cannot reserve stock. Please try again.');
  }

  const { ProductVariation } = require('../model/productVariationModel.js');
  const client = redis.getClient();

  const reservationId = generateReservationId();

  // Validate stock availability for all items BEFORE reserving any
  for (const item of items) {
    const variation = await ProductVariation.findByPk(item.variation_id, {
      attributes: ['id', 'stock'],
    });
    if (!variation) {
      throw new Error(`Variation ${item.variation_id} not found`);
    }

    const reserved = await getReservedQty(item.variation_id);
    const available = variation.stock - reserved;

    if (available < item.quantity) {
      throw new Error(
        `Insufficient stock for variation ${item.variation_id}. Available: ${available}, requested: ${item.quantity}`
      );
    }
  }

  // All stock checks passed — now atomically reserve using a Lua script
  // This prevents race conditions between check and increment
  const luaScript = `
    local items = cjson.decode(ARGV[1])
    for i, item in ipairs(items) do
      local key = "stock:reserved:" .. item.variation_id
      redis.call("INCRBY", key, item.quantity)
    end
    return 1
  `;

  const itemsForLua = items.map(i => ({
    variation_id: String(i.variation_id),
    quantity: i.quantity,
  }));

  await client.eval(luaScript, 0, JSON.stringify(itemsForLua));

  // Store full checkout session
  const session = {
    reservation_id: reservationId,
    user_id: userId,
    items: items.map(i => ({
      product_id: i.product_id,
      variation_id: i.variation_id,
      quantity: i.quantity,
      price: i.price,
      discount: i.discount || 0,
      subtotal: i.subtotal,
    })),
    ...sessionData,
    created_at: new Date().toISOString(),
  };

  await client.set(
    KEY_RESERVATION(reservationId),
    JSON.stringify(session),
    'EX',
    RESERVATION_TTL
  );

  logger.info(`[StockReservation] Reserved stock for user ${userId}, reservation: ${reservationId}`);

  return { reservationId, expiresIn: RESERVATION_TTL };
}

/**
 * Release a reservation — decrement reserved counters and delete session.
 */
async function releaseReservation(reservationId) {
  const redis = getRedis();
  if (!redis) return;

  const client = redis.getClient();
  const raw = await client.get(KEY_RESERVATION(reservationId));
  if (!raw) {
    logger.info(`[StockReservation] Reservation ${reservationId} already expired/released`);
    return;
  }

  const session = JSON.parse(raw);

  // Decrement reserved qty for each item
  for (const item of session.items) {
    await client.decrby(KEY_RESERVED_QTY(item.variation_id), item.quantity);
    // Floor at 0 — never go negative
    const current = parseInt(await client.get(KEY_RESERVED_QTY(item.variation_id))) || 0;
    if (current < 0) {
      await client.set(KEY_RESERVED_QTY(item.variation_id), '0');
    }
  }

  // Delete session key
  await client.del(KEY_RESERVATION(reservationId));

  // Clean up razorpay mapping if exists
  if (session.razorpay_order_id) {
    await client.del(KEY_RZP_MAP(session.razorpay_order_id));
  }

  logger.info(`[StockReservation] Released reservation ${reservationId}`);
}

/**
 * Get checkout session data for a reservation.
 * Returns null if expired.
 */
async function getReservation(reservationId) {
  const redis = getRedis();
  if (!redis) return null;

  const raw = await redis.get(KEY_RESERVATION(reservationId));
  if (!raw) return null;
  return JSON.parse(raw);
}

/**
 * Extend reservation TTL (used on payment retry).
 */
async function extendReservation(reservationId, extraSeconds = RETRY_EXTEND_TTL) {
  const redis = getRedis();
  if (!redis) return false;

  const client = redis.getClient();
  const exists = await client.exists(KEY_RESERVATION(reservationId));
  if (!exists) return false;

  const currentTTL = await client.ttl(KEY_RESERVATION(reservationId));
  const newTTL = Math.max(currentTTL, 0) + extraSeconds;
  await client.expire(KEY_RESERVATION(reservationId), newTTL);

  logger.info(`[StockReservation] Extended reservation ${reservationId} by ${extraSeconds}s (new TTL: ${newTTL}s)`);
  return true;
}

/**
 * Link a Razorpay order ID to a reservation (for webhook recovery).
 */
async function linkRazorpayOrder(razorpayOrderId, reservationId) {
  const redis = getRedis();
  if (!redis) return;

  const client = redis.getClient();
  await client.set(KEY_RZP_MAP(razorpayOrderId), reservationId, 'EX', RZP_MAP_TTL);

  // Also update the session with the razorpay order ID
  const raw = await client.get(KEY_RESERVATION(reservationId));
  if (raw) {
    const session = JSON.parse(raw);
    session.razorpay_order_id = razorpayOrderId;
    const ttl = await client.ttl(KEY_RESERVATION(reservationId));
    await client.set(KEY_RESERVATION(reservationId), JSON.stringify(session), 'EX', Math.max(ttl, 60));
  }
}

/**
 * Find reservation by Razorpay order ID (webhook recovery).
 */
async function getReservationByRazorpayOrder(razorpayOrderId) {
  const redis = getRedis();
  if (!redis) return null;

  const reservationId = await redis.get(KEY_RZP_MAP(razorpayOrderId));
  if (!reservationId) return null;

  return getReservation(reservationId);
}

/**
 * Cleanup: scan for leaked reserved counters.
 * Called by cron every 2 minutes.
 *
 * Approach: scan all stock:reserved:* keys, for each check if any
 * active reservation references that variation. If total from active
 * reservations < counter value, correct it.
 */
async function cleanupLeakedReservations() {
  const redis = getRedis();
  if (!redis) return { corrected: 0 };

  const client = redis.getClient();
  let corrected = 0;

  // Get all reserved qty keys
  const reservedKeys = [];
  let cursor = '0';
  do {
    const [newCursor, keys] = await client.scan(cursor, 'MATCH', 'stock:reserved:*', 'COUNT', 100);
    cursor = newCursor;
    reservedKeys.push(...keys);
  } while (cursor !== '0');

  if (reservedKeys.length === 0) return { corrected: 0 };

  // Get all active reservation sessions
  const reservationKeys = [];
  cursor = '0';
  do {
    const [newCursor, keys] = await client.scan(cursor, 'MATCH', 'stock:reservation:*', 'COUNT', 100);
    cursor = newCursor;
    reservationKeys.push(...keys);
  } while (cursor !== '0');

  // Build actual reserved qty per variation from active sessions
  const actualReserved = {};
  for (const key of reservationKeys) {
    const raw = await client.get(key);
    if (!raw) continue;
    try {
      const session = JSON.parse(raw);
      for (const item of session.items) {
        const varId = String(item.variation_id);
        actualReserved[varId] = (actualReserved[varId] || 0) + item.quantity;
      }
    } catch (e) {
      logger.warn(`[StockReservation] Corrupt session key: ${key}`);
    }
  }

  // Compare and correct
  for (const key of reservedKeys) {
    const varId = key.replace('stock:reserved:', '');
    const storedQty = parseInt(await client.get(key)) || 0;
    const actualQty = actualReserved[varId] || 0;

    if (storedQty !== actualQty) {
      if (actualQty === 0) {
        await client.del(key);
      } else {
        await client.set(key, String(actualQty));
      }
      corrected++;
      logger.info(`[StockReservation] Corrected reserved qty for variation ${varId}: ${storedQty} → ${actualQty}`);
    }
  }

  return { corrected, checked: reservedKeys.length };
}

module.exports = {
  reserveStock,
  releaseReservation,
  getReservation,
  extendReservation,
  getReservedQty,
  getAvailableStock,
  linkRazorpayOrder,
  getReservationByRazorpayOrder,
  cleanupLeakedReservations,
  RESERVATION_TTL,
  RETRY_EXTEND_TTL,
};
