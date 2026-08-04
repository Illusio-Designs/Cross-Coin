const crypto = require('crypto');
const { Op } = require('sequelize');
const loyaltyService = require('../services/loyaltyService');
const settingsHelper = require('../services/settingsHelper');
const { LoyaltyTransaction } = require('../model/loyaltyTransactionModel');
const { User } = require('../model/userModel');

function toPositiveInt(value, fallback = null) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

module.exports.getBalance = async (req, res) => {
  try {
    const data = await loyaltyService.getBalance(req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch loyalty balance',
      error: error.message,
    });
  }
};

module.exports.getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const data = await loyaltyService.getHistory(req.user.id, page, limit);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch loyalty history',
      error: error.message,
    });
  }
};

module.exports.redeemPoints = async (req, res) => {
  try {
    const brandId = req.brandId || 1;
    const points = toPositiveInt(req.body.points);
    const orderTotal = Number(req.body.orderTotal || 0);

    if (!points || !Number.isFinite(orderTotal) || orderTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid points and orderTotal are required',
      });
    }

    const redeemRate = toPositiveInt(
      await settingsHelper.getSetting(brandId, 'LOYALTY_REDEEM_RATE', '1'),
      1
    );
    const maxRedeemPercent = toPositiveInt(
      await settingsHelper.getSetting(brandId, 'LOYALTY_MAX_REDEEM_PERCENT', '20'),
      20
    );

    const maxDiscount = Math.floor((orderTotal * maxRedeemPercent) / 100);
    const maxPointsAllowed = maxDiscount * redeemRate;

    if (points > maxPointsAllowed) {
      return res.status(400).json({
        success: false,
        message: `Requested points exceed max redeemable limit (${maxPointsAllowed}) for this order`,
      });
    }

    // Reserve points by debiting them now; order flow can later link/settle by order_id.
    await loyaltyService.debitPoints(req.user.id, null, points, brandId);

    const discountAmount = points / redeemRate;
    const redemptionToken = crypto.randomUUID();

    return res.json({
      success: true,
      data: {
        redemptionToken,
        pointsReserved: points,
        discountAmount,
      },
    });
  } catch (error) {
    const status = /insufficient/i.test(error.message) ? 400 : 500;
    return res.status(status).json({
      success: false,
      message: 'Failed to redeem points',
      error: error.message,
    });
  }
};

module.exports.adminAdjustPoints = async (req, res) => {
  try {
    const { userId, points, description } = req.body;
    const brandId = req.brandId || toPositiveInt(req.body.brandId, 1) || 1;

    if (!userId || points === undefined || points === null) {
      return res.status(400).json({
        success: false,
        message: 'userId and points are required',
      });
    }

    const transaction = await loyaltyService.adjustPoints(
      userId,
      points,
      description,
      req.user.id,
      brandId
    );

    return res.json({
      success: true,
      message: 'Loyalty points adjusted successfully',
      data: transaction,
    });
  } catch (error) {
    const status = /insufficient/i.test(error.message) ? 400 : 500;
    return res.status(status).json({
      success: false,
      message: 'Failed to adjust loyalty points',
      error: error.message,
    });
  }
};

module.exports.adminGetTransactions = async (req, res) => {
  try {
    const page = toPositiveInt(req.query.page, 1) || 1;
    const limit = Math.min(toPositiveInt(req.query.limit, 20) || 20, 100);
    const offset = (page - 1) * limit;

    const where = {};
    const scopedBrandId = req.brandId || toPositiveInt(req.query.brandId);
    if (scopedBrandId) where.brand_id = scopedBrandId;

    if (req.query.userId) {
      where.user_id = toPositiveInt(req.query.userId);
    }
    if (req.query.type) {
      where.type = req.query.type;
    }
    if (req.query.orderId) {
      where.order_id = toPositiveInt(req.query.orderId);
    }

    if (req.query.startDate || req.query.endDate) {
      where.created_at = {};
      if (req.query.startDate) where.created_at[Op.gte] = new Date(req.query.startDate);
      if (req.query.endDate) where.created_at[Op.lte] = new Date(req.query.endDate);
    }

    const { count, rows } = await LoyaltyTransaction.findAndCountAll({
      where,
      include: [{ model: User, as: 'User', attributes: ['id', 'email', 'username'] }],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return res.json({
      success: true,
      data: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        transactions: rows,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch loyalty transactions',
      error: error.message,
    });
  }
};

