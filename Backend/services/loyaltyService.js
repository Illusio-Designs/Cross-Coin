const { sequelize } = require('../config/db');
const { User } = require('../model/userModel');
const { LoyaltyTransaction } = require('../model/loyaltyTransactionModel');
const settingsHelper = require('./settingsHelper');
const { logger } = require('../config/logging');

function parsePositiveInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function getEarnRate(brandId) {
  const configured = await settingsHelper.getSetting(brandId, 'LOYALTY_EARN_RATE', '10');
  return parsePositiveInt(configured, 10);
}

async function getPointsExpiryDays(brandId) {
  const configured = await settingsHelper.getSetting(brandId, 'LOYALTY_POINTS_EXPIRY_DAYS', '365');
  return parsePositiveInt(configured, 365);
}

function computeEarnedPoints(orderAmount, earnRate) {
  const total = Number(orderAmount || 0);
  if (!Number.isFinite(total) || total <= 0) return 0;
  // LOYALTY_EARN_RATE means "currency units per point" (default: 10 => 1 point per 10).
  return Math.floor(total / earnRate);
}

async function creditPoints(userId, orderId, orderAmount, brandId = 1, options = {}) {
  const tx = options.transaction || (await sequelize.transaction());
  const ownTx = !options.transaction;

  try {
    const user = await User.findByPk(userId, { transaction: tx, lock: tx.LOCK.UPDATE });
    if (!user) throw new Error(`User ${userId} not found`);

    if (orderId) {
      const existing = await LoyaltyTransaction.findOne({
        where: { user_id: userId, order_id: orderId, type: 'earned' },
        transaction: tx,
      });
      if (existing) {
        if (ownTx) await tx.commit();
        return existing;
      }
    }

    const earnRate = await getEarnRate(brandId);
    const points = computeEarnedPoints(orderAmount, earnRate);
    if (points <= 0) {
      if (ownTx) await tx.commit();
      return null;
    }

    const expiryDays = await getPointsExpiryDays(brandId);
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    const balanceAfter = (user.loyalty_points || 0) + points;

    const transaction = await LoyaltyTransaction.create(
      {
        user_id: userId,
        order_id: orderId || null,
        type: 'earned',
        points,
        balance_after: balanceAfter,
        description: orderId
          ? `Points earned for order #${orderId}`
          : 'Points earned',
        expires_at: expiresAt,
        brand_id: brandId,
      },
      { transaction: tx }
    );

    await user.update({ loyalty_points: balanceAfter }, { transaction: tx });

    if (ownTx) await tx.commit();

    // Fire WhatsApp loyalty notification (non-blocking)
    setImmediate(async () => {
      try {
        if (user.phone) {
          const whatsappService = require('./whatsappService.js');
          await whatsappService.sendLoyaltyNotification(user.phone, {
            customerName: user.username,
            points,
            balance: balanceAfter,
          }, brandId);
        }
      } catch (e) { logger.warn('WhatsApp loyalty notification failed:', e.message); }
    });

    return transaction;
  } catch (error) {
    if (ownTx) await tx.rollback();
    logger.error('Error crediting loyalty points:', error);
    throw error;
  }
}

async function debitPoints(userId, orderId, points, brandId = 1, options = {}) {
  const tx = options.transaction || (await sequelize.transaction());
  const ownTx = !options.transaction;

  try {
    const debitPointsValue = parseInt(points, 10);
    if (!Number.isFinite(debitPointsValue) || debitPointsValue <= 0) {
      throw new Error('Points to redeem must be a positive integer');
    }

    const user = await User.findByPk(userId, { transaction: tx, lock: tx.LOCK.UPDATE });
    if (!user) throw new Error(`User ${userId} not found`);
    if ((user.loyalty_points || 0) < debitPointsValue) {
      throw new Error('Insufficient loyalty points');
    }

    const balanceAfter = user.loyalty_points - debitPointsValue;
    const transaction = await LoyaltyTransaction.create(
      {
        user_id: userId,
        order_id: orderId || null,
        type: 'redeemed',
        points: -debitPointsValue,
        balance_after: balanceAfter,
        description: orderId
          ? `Points redeemed for order #${orderId}`
          : 'Points redeemed',
        expires_at: null,
        brand_id: brandId,
      },
      { transaction: tx }
    );

    await user.update({ loyalty_points: balanceAfter }, { transaction: tx });

    if (ownTx) await tx.commit();
    return transaction;
  } catch (error) {
    if (ownTx) await tx.rollback();
    logger.error('Error debiting loyalty points:', error);
    throw error;
  }
}

async function refundPoints(userId, orderId, brandId = 1, options = {}) {
  const tx = options.transaction || (await sequelize.transaction());
  const ownTx = !options.transaction;

  try {
    const user = await User.findByPk(userId, { transaction: tx, lock: tx.LOCK.UPDATE });
    if (!user) throw new Error(`User ${userId} not found`);

    const redeemed = await LoyaltyTransaction.findOne({
      where: {
        user_id: userId,
        order_id: orderId,
        type: 'redeemed',
      },
      order: [['created_at', 'DESC']],
      transaction: tx,
    });

    if (!redeemed) {
      if (ownTx) await tx.commit();
      return null;
    }

    const existingRefund = await LoyaltyTransaction.findOne({
      where: {
        user_id: userId,
        order_id: orderId,
        type: 'refunded',
      },
      transaction: tx,
    });
    if (existingRefund) {
      if (ownTx) await tx.commit();
      return existingRefund;
    }

    const refundedPoints = Math.abs(redeemed.points);
    const balanceAfter = (user.loyalty_points || 0) + refundedPoints;

    const transaction = await LoyaltyTransaction.create(
      {
        user_id: userId,
        order_id: orderId,
        type: 'refunded',
        points: refundedPoints,
        balance_after: balanceAfter,
        description: `Points refunded for cancelled order #${orderId}`,
        expires_at: null,
        brand_id: brandId,
      },
      { transaction: tx }
    );

    await user.update({ loyalty_points: balanceAfter }, { transaction: tx });

    if (ownTx) await tx.commit();
    return transaction;
  } catch (error) {
    if (ownTx) await tx.rollback();
    logger.error('Error refunding loyalty points:', error);
    throw error;
  }
}

// ── Schema (lazy, once per process) ─────────────────────────────────────────
//   loyalty_transactions.type gains 'reversed' (points taken back when an
//   order is refunded / returned / RTO'd), created_by INT NULL (staff behind
//   an 'adjusted' row), INDEX idx_lt_created (created_at).
let schemaPromise = null;
function ensureSchema() {
  if (!schemaPromise) {
    const { QueryTypes } = require('sequelize');
    const q = (sql) => sequelize.query(sql, { type: QueryTypes.SELECT });
    schemaPromise = (async () => {
      const cols = await q(`SELECT LOWER(column_name) AS c, column_type AS t FROM information_schema.columns
                             WHERE table_schema = DATABASE() AND table_name = 'loyalty_transactions'`);
      const type = cols.find((r) => r.c === 'type');
      if (type && !/'reversed'/.test(type.t)) {
        await sequelize.query("ALTER TABLE loyalty_transactions MODIFY COLUMN type ENUM('earned','redeemed','expired','adjusted','refunded','reversed') NOT NULL");
      }
      if (!cols.some((r) => r.c === 'created_by')) {
        await sequelize.query('ALTER TABLE loyalty_transactions ADD COLUMN created_by INT NULL');
      }
      const idx = await q(`SELECT DISTINCT index_name AS i FROM information_schema.statistics
                            WHERE table_schema = DATABASE() AND table_name = 'loyalty_transactions'`);
      if (!idx.some((r) => r.i === 'idx_lt_created')) {
        await sequelize.query('ALTER TABLE loyalty_transactions ADD INDEX idx_lt_created (created_at)');
      }
    })().catch((e) => { schemaPromise = null; throw e; });
  }
  return schemaPromise;
}

// ── FIFO: which points are still unused ─────────────────────────────────────
const EXPIRY_MARKER = 'Expired from loyalty txn #';

/**
 * Walk one customer's ledger oldest-first. Every credit (earned, refunded,
 * positive adjustment) is a lot; every debit uses up the oldest lots first,
 * except an expiry row, which uses up the lot it names. Returns
 * Map(creditRowId → points still unused).
 */
function unusedByLot(rows) {
  const sorted = [...rows].sort((a, b) => (new Date(a.created_at) - new Date(b.created_at)) || (a.id - b.id));
  const lots = [];
  const byId = new Map();
  for (const r of sorted) {
    const pts = Number(r.points) || 0;
    if (pts > 0) {
      const lot = { id: r.id, left: pts };
      lots.push(lot); byId.set(r.id, lot);
      continue;
    }
    let need = -pts;
    if (r.type === 'expired' && String(r.description || '').startsWith(EXPIRY_MARKER)) {
      const lot = byId.get(parseInt(String(r.description).slice(EXPIRY_MARKER.length), 10));
      if (lot) { const take = Math.min(lot.left, need); lot.left -= take; need -= take; }
    }
    for (const lot of lots) {
      if (need <= 0) break;
      const take = Math.min(lot.left, need);
      lot.left -= take; need -= take;
    }
  }
  return new Map(lots.map((l) => [l.id, l.left]));
}

/**
 * Expire what is left of each earned lot past its expiry date (FIFO — points
 * already spent come out of the oldest lots, so newer points are never
 * expired in their place). One 'expired' row per lot, never twice.
 */
async function expirePoints() {
  const now = new Date();
  let expiredCount = 0; let points = 0; const customers = new Set();
  const due = await sequelize.query(
    `SELECT DISTINCT lt.user_id FROM loyalty_transactions lt
      WHERE lt.type = 'earned' AND lt.points > 0 AND lt.expires_at <= :now
        AND NOT EXISTS (SELECT 1 FROM loyalty_transactions x
                         WHERE x.user_id = lt.user_id AND x.type = 'expired' AND x.description = CONCAT('${EXPIRY_MARKER}', lt.id))`,
    { replacements: { now }, type: sequelize.QueryTypes.SELECT }
  );

  for (const { user_id: userId } of due) {
    const tx = await sequelize.transaction();
    try {
      const user = await User.findByPk(userId, { transaction: tx, lock: tx.LOCK.UPDATE });
      if (!user) { await tx.commit(); continue; }
      const rows = await LoyaltyTransaction.findAll({ where: { user_id: userId }, transaction: tx, raw: true });
      const left = unusedByLot(rows);
      const done = new Set(rows.filter((r) => r.type === 'expired' && String(r.description || '').startsWith(EXPIRY_MARKER))
        .map((r) => parseInt(String(r.description).slice(EXPIRY_MARKER.length), 10)));
      let balance = user.loyalty_points || 0;
      const lots = rows.filter((r) => r.type === 'earned' && Number(r.points) > 0 && r.expires_at && new Date(r.expires_at) <= now && !done.has(r.id))
        .sort((a, b) => a.id - b.id);
      for (const lot of lots) {
        const pts = Math.min(left.get(lot.id) || 0, Math.max(balance, 0));
        if (pts <= 0) continue;
        balance -= pts;
        await LoyaltyTransaction.create({
          user_id: userId, order_id: lot.order_id || null, type: 'expired', points: -pts, balance_after: balance,
          description: `${EXPIRY_MARKER}${lot.id}`, expires_at: null, brand_id: lot.brand_id || 1,
        }, { transaction: tx });
        expiredCount += 1; points += pts; customers.add(userId);
      }
      if (balance !== (user.loyalty_points || 0)) await user.update({ loyalty_points: balance }, { transaction: tx });
      await tx.commit();
    } catch (err) {
      await tx.rollback();
      logger.error(`Error expiring loyalty points for user ${userId}:`, err);
    }
  }
  return { expiredCount, points, customers: customers.size };
}

/**
 * Points that will expire between now and `until`, per customer (FIFO, capped
 * at the balance). Returns { points, customers }. brandId filters the lots.
 */
async function expiringBetween(until, brandId = null) {
  const now = new Date();
  const lots = await sequelize.query(
    `SELECT lt.id, lt.user_id FROM loyalty_transactions lt JOIN users u ON u.id = lt.user_id
      WHERE lt.type = 'earned' AND lt.points > 0 AND lt.expires_at > :now AND lt.expires_at <= :until
        AND u.loyalty_points > 0 ${brandId ? 'AND lt.brand_id = :brandId' : ''}`,
    { replacements: { now, until, brandId }, type: sequelize.QueryTypes.SELECT }
  );
  if (!lots.length) return { points: 0, customers: 0 };
  const userIds = [...new Set(lots.map((l) => l.user_id))];
  let points = 0; let customers = 0;
  for (let i = 0; i < userIds.length; i += 500) {
    const ids = userIds.slice(i, i + 500);
    const [rows, users] = await Promise.all([
      sequelize.query('SELECT id, user_id, type, points, description, created_at FROM loyalty_transactions WHERE user_id IN (:ids)',
        { replacements: { ids }, type: sequelize.QueryTypes.SELECT }),
      sequelize.query('SELECT id, loyalty_points FROM users WHERE id IN (:ids)', { replacements: { ids }, type: sequelize.QueryTypes.SELECT }),
    ]);
    for (const u of users) {
      const left = unusedByLot(rows.filter((r) => r.user_id === u.id));
      const sum = lots.filter((l) => l.user_id === u.id).reduce((t, l) => t + (left.get(l.id) || 0), 0);
      const pts = Math.min(sum, Math.max(u.loyalty_points || 0, 0));
      if (pts > 0) { points += pts; customers += 1; }
    }
  }
  return { points, customers };
}

/**
 * Take back the points an order earned when it is refunded, returned or
 * RTO'd. `amount` (rupees) prorates a partial refund; null = everything still
 * not taken back. `ref` (e.g. the refund id) makes a call idempotent; a full
 * reversal happens once per order. Never takes the balance below zero.
 */
async function reversePointsForOrder(orderId, { amount = null, ref = null, reason = 'order refunded' } = {}) {
  await ensureSchema();
  const { QueryTypes } = require('sequelize');
  const earned = await sequelize.query(
    `SELECT lt.user_id, SUM(lt.points) AS pts, MAX(lt.brand_id) AS brand_id, o.final_amount, o.order_number
       FROM loyalty_transactions lt JOIN orders o ON o.id = lt.order_id
      WHERE lt.order_id = :orderId AND lt.type = 'earned' GROUP BY lt.user_id, o.final_amount, o.order_number`,
    { replacements: { orderId }, type: QueryTypes.SELECT }
  );
  const e = earned[0];
  if (!e || !(Number(e.pts) > 0)) return null;

  const tx = await sequelize.transaction();
  try {
    const user = await User.findByPk(e.user_id, { transaction: tx, lock: tx.LOCK.UPDATE });
    if (!user) { await tx.commit(); return null; }
    const prior = await LoyaltyTransaction.findAll({ where: { order_id: orderId, type: 'reversed' }, transaction: tx, raw: true });
    const tag = ref ? ` [ref ${ref}]` : '';
    if (ref && prior.some((r) => String(r.description || '').includes(tag))) { await tx.commit(); return null; }
    if (amount == null && prior.some((r) => /\[full\]/.test(r.description || ''))) { await tx.commit(); return null; }
    const already = prior.reduce((t, r) => t + Math.abs(Number(r.points) || 0), 0);
    const earnedPts = Number(e.pts);
    const final = Number(e.final_amount) || 0;
    const target = amount == null || final <= 0 ? earnedPts : Math.round(earnedPts * Math.min(1, Number(amount) / final));
    const want = Math.max(0, Math.min(target, earnedPts - already));
    const take = Math.min(want, Math.max(user.loyalty_points || 0, 0));
    if (take <= 0) { await tx.commit(); return null; }
    const balanceAfter = (user.loyalty_points || 0) - take;
    const row = await LoyaltyTransaction.create({
      user_id: e.user_id, order_id: orderId, type: 'reversed', points: -take, balance_after: balanceAfter,
      description: `Points taken back — order ${e.order_number} ${reason}${amount == null ? ' [full]' : ''}${tag}`,
      expires_at: null, brand_id: e.brand_id || 1,
    }, { transaction: tx });
    await user.update({ loyalty_points: balanceAfter }, { transaction: tx });
    await tx.commit();
    logger.info(`[loyalty] took back ${take} point(s) from user ${e.user_id} — order ${e.order_number} ${reason}`);
    return row;
  } catch (err) {
    await tx.rollback();
    logger.warn(`[loyalty] reversal skipped for order ${orderId}: ${err.message}`);
    return null;
  }
}

/** Fire-and-forget wrapper for the refund / return / RTO paths. */
function reversePointsLater(orderId, opts) {
  setImmediate(() => { reversePointsForOrder(orderId, opts).catch(() => {}); });
}

async function getBalance(userId) {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'loyalty_points'],
  });
  if (!user) throw new Error(`User ${userId} not found`);
  return {
    points: user.loyalty_points || 0,
    pendingPoints: 0,
  };
}

async function getHistory(userId, page = 1, limit = 20) {
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const offset = (parsedPage - 1) * parsedLimit;

  const { count, rows } = await LoyaltyTransaction.findAndCountAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    limit: parsedLimit,
    offset,
  });

  return {
    total: count,
    page: parsedPage,
    limit: parsedLimit,
    totalPages: Math.ceil(count / parsedLimit),
    transactions: rows,
  };
}

async function adjustPoints(userId, points, description, adminId = null, brandId = 1, options = {}) {
  if (adminId) await ensureSchema();
  const tx = options.transaction || (await sequelize.transaction());
  const ownTx = !options.transaction;

  try {
    const adjustment = parseInt(points, 10);
    if (!Number.isFinite(adjustment) || adjustment === 0) {
      throw new Error('Adjustment points must be a non-zero integer');
    }

    const user = await User.findByPk(userId, { transaction: tx, lock: tx.LOCK.UPDATE });
    if (!user) throw new Error(`User ${userId} not found`);

    if (adjustment < 0 && (user.loyalty_points || 0) < Math.abs(adjustment)) {
      throw new Error('Insufficient loyalty points for debit adjustment');
    }

    const balanceAfter = (user.loyalty_points || 0) + adjustment;
    const transaction = await LoyaltyTransaction.create(
      {
        user_id: userId,
        order_id: null,
        type: 'adjusted',
        points: adjustment,
        balance_after: balanceAfter,
        description: description || `Manual adjustment by admin #${adminId || 'unknown'}`,
        expires_at: null,
        brand_id: brandId,
      },
      { transaction: tx }
    );

    if (adminId) {
      await sequelize.query('UPDATE loyalty_transactions SET created_by = ? WHERE id = ?', { replacements: [adminId, transaction.id], transaction: tx });
    }
    await user.update({ loyalty_points: balanceAfter }, { transaction: tx });

    if (ownTx) await tx.commit();
    return transaction;
  } catch (error) {
    if (ownTx) await tx.rollback();
    logger.error('Error adjusting loyalty points:', error);
    throw error;
  }
}

module.exports = {
  ensureSchema,
  creditPoints,
  debitPoints,
  refundPoints,
  expirePoints,
  expiringBetween,
  unusedByLot,
  reversePointsForOrder,
  reversePointsLater,
  getBalance,
  getHistory,
  adjustPoints,
};

