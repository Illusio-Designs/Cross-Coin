const { Op } = require('sequelize');
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

async function expirePoints(options = {}) {
  const now = new Date();
  let expiredCount = 0;
  const BATCH_SIZE = 100;
  let offset = 0;

  try {
    // Process in batches with separate transactions to avoid long-held locks
    while (true) {
      const batch = await LoyaltyTransaction.findAll({
        where: {
          type: 'earned',
          points: { [Op.gt]: 0 },
          expires_at: { [Op.lte]: now },
        },
        order: [['id', 'ASC']],
        limit: BATCH_SIZE,
        offset,
      });

      if (batch.length === 0) break;

      // Process each batch in its own transaction
      const tx = await sequelize.transaction();
      try {
        for (const earned of batch) {
          const marker = `Expired from loyalty txn #${earned.id}`;
          const alreadyExpired = await LoyaltyTransaction.findOne({
            where: { user_id: earned.user_id, type: 'expired', description: marker },
            transaction: tx,
          });
          if (alreadyExpired) continue;

          const user = await User.findByPk(earned.user_id, { transaction: tx, lock: tx.LOCK.UPDATE });
          if (!user) continue;

          const pointsToExpire = Math.min(earned.points, Math.max(user.loyalty_points || 0, 0));
          if (pointsToExpire <= 0) continue;

          const balanceAfter = user.loyalty_points - pointsToExpire;
          await LoyaltyTransaction.create({
            user_id: earned.user_id,
            order_id: earned.order_id || null,
            type: 'expired',
            points: -pointsToExpire,
            balance_after: balanceAfter,
            description: marker,
            expires_at: null,
            brand_id: earned.brand_id || 1,
          }, { transaction: tx });

          await user.update({ loyalty_points: balanceAfter }, { transaction: tx });
          expiredCount += 1;
        }
        await tx.commit();
      } catch (batchError) {
        await tx.rollback();
        logger.error('Error in expirePoints batch:', batchError);
      }

      offset += BATCH_SIZE;
    }

    return { expiredCount };
  } catch (error) {
    logger.error('Error expiring loyalty points:', error);
    throw error;
  }
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
  creditPoints,
  debitPoints,
  refundPoints,
  expirePoints,
  getBalance,
  getHistory,
  adjustPoints,
};

