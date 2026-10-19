const loyaltyService = require('../services/loyaltyService');

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

// ── Admin (Dashboard → Loyalty points) — services/loyaltyAdminService.js ────
const loyaltyAdmin = require('../services/loyaltyAdminService');
const adminFail = (res, error, what) => {
  const { logger } = require('../config/logging');
  logger.error(`Loyalty admin: ${what} failed: ${error.message}`);
  return res.status(500).json({ success: false, message: `Couldn’t load ${what} — please try again.` });
};

// POST /api/admin/loyalty/adjust { userId, points (+give / −take), description (shown in the customer's history), brandId? }
module.exports.adminAdjustPoints = async (req, res) => {
  try {
    const { userId, description } = req.body;
    const points = Number(req.body.points);
    const reason = String(description || '').trim();
    if (!toPositiveInt(userId) || !Number.isInteger(points) || points === 0) {
      return res.status(400).json({ success: false, message: 'Pick a customer and enter whole points — use a minus sign to take points away.' });
    }
    if (Math.abs(points) > 100000) {
      return res.status(400).json({ success: false, message: 'That is more than 1,00,000 points — please check the number.' });
    }
    if (reason.length < 3) {
      return res.status(400).json({ success: false, message: 'Write a short reason — it is saved in the customer’s points history.' });
    }
    const card = await loyaltyAdmin.customerCard(userId);
    if (!card) return res.status(404).json({ success: false, message: 'That customer account no longer exists.' });
    if (points < 0 && card.points < -points) {
      return res.status(400).json({ success: false, message: `${card.name || 'This customer'} only has ${card.points.toLocaleString('en-IN')} points.` });
    }
    const brandId = req.brandId || toPositiveInt(req.body.brandId) || card.brandId || 1;
    const transaction = await loyaltyService.adjustPoints(card.id, points, reason.slice(0, 250), req.user.id, brandId);
    return res.json({
      success: true,
      message: `${points > 0 ? 'Gave' : 'Took'} ${Math.abs(points).toLocaleString('en-IN')} points ${points > 0 ? 'to' : 'from'} ${card.name || 'the customer'}. New balance: ${Number(transaction.balance_after).toLocaleString('en-IN')}.`,
      data: { id: transaction.id, balance: transaction.balance_after },
    });
  } catch (error) {
    const status = /insufficient/i.test(error.message) ? 400 : 500;
    return res.status(status).json({
      success: false,
      message: status === 400 ? 'The customer doesn’t have that many points.' : 'Couldn’t change the points — nothing was saved.',
    });
  }
};

// GET /api/admin/loyalty/transactions?tab=all|earned|spent|staff|expired&q=&brandId=&page=&limit=
// (also accepts userId / type / orderId / startDate / endDate)
module.exports.adminGetTransactions = async (req, res) => {
  try {
    const data = await loyaltyAdmin.listTransactions({ ...req.query, brandId: req.brandId || req.query.brandId });
    return res.json({ success: true, data });
  } catch (error) { return adminFail(res, error, 'points history'); }
};

// GET /api/admin/loyalty/summary?brandId=
module.exports.adminSummary = async (req, res) => {
  try {
    return res.json({ success: true, data: await loyaltyAdmin.summary({ brandId: req.brandId || req.query.brandId }) });
  } catch (error) { return adminFail(res, error, 'points totals'); }
};

// GET /api/admin/loyalty/customer/:userId
module.exports.adminCustomerCard = async (req, res) => {
  try {
    const card = await loyaltyAdmin.customerCard(req.params.userId);
    if (!card) return res.status(404).json({ success: false, message: 'Customer not found.' });
    return res.json({ success: true, data: card });
  } catch (error) { return adminFail(res, error, 'the customer'); }
};

// PUT /api/admin/loyalty/rules { brandId? (absent = every brand), earnRate, redeemRate, maxRedeemPercent, expiryDays }
module.exports.adminSetRules = async (req, res) => {
  try {
    const brandId = toPositiveInt(req.body.brandId);
    const r = await loyaltyAdmin.setRules(brandId, req.body || {}, req.user.id);
    if (!r.ok) return res.status(400).json({ success: false, message: r.message });
    return res.json({ success: true, message: `Rules saved for ${brandId ? 'this brand' : `all ${r.brands} brands`}.`, data: await loyaltyAdmin.getRules(brandId) });
  } catch (error) {
    const { logger } = require('../config/logging');
    logger.error(`Loyalty admin: save rules failed: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Couldn’t save the rules — nothing was changed.' });
  }
};
