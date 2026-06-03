/**
 * Order creation domain.
 *
 * Migration in progress — most functions still live in the monolith
 * `controller/orderController.js` and are re-exported below. As you
 * touch one, move its implementation HERE and delete the re-export
 * line. The shim file is the migration path.
 *
 * Already migrated to this file:
 *   - checkAddressQuality
 *
 * Still re-exported (move when you touch):
 *   - createOrder
 *   - createGuestOrder
 *   - adminCreateManualOrder
 */

const { logger } = require('../../config/logging.js');
const settingsHelper = require('../../services/settingsHelper.js');
const apiResponse = require('../../utils/apiResponse.js');
const { calculateAddressQuality } = require('../../services/addressQualityService.js');

/**
 * POST /api/orders/check-address-quality
 *
 * Public endpoint used by the checkout drawer to find out — BEFORE
 * the user picks a payment method — whether the address they typed
 * is COD-eligible. Dual-shape response (envelope + flat) for
 * backwards compatibility during the response-envelope migration.
 *
 * Body: { line1, line2?, landmark?, city?, state?, pincode, phone? }
 */
async function checkAddressQuality(req, res) {
  try {
    const { line1, line2 = '', landmark = '', city, state, pincode, phone } = req.body || {};
    if (!line1 || !pincode) {
      return apiResponse.badRequest(res, 'line1 and pincode are required');
    }
    const quality = await calculateAddressQuality({
      line1,
      line2: landmark || line2,
      landmark: landmark || line2,
      city,
      state,
      pincode,
      phone,
    });
    const minQuality = parseInt(
      await settingsHelper.getSetting(req.brand?.id || 1, 'COD_MIN_ADDRESS_QUALITY', '60'),
      10,
    );
    const payload = {
      score: quality.score,
      factors: quality.factors,
      recommendation: quality.recommendation,
      cod_allowed: Number.isFinite(minQuality) ? quality.score >= minQuality : true,
      cod_min_quality: minQuality,
    };
    // Dual-shape: envelope under .data PLUS flat keys for legacy callers.
    return res.json({ success: true, data: payload, ...payload, error: null });
  } catch (err) {
    logger.error('checkAddressQuality failed:', err.message);
    return apiResponse.serverError(res, err.message);
  }
}

// Pull the still-monolithic functions through so route consumers can
// import everything from this one shim until the migration is done.
const orderController = require('../orderController.js');

module.exports = {
  // Migrated — local implementation:
  checkAddressQuality,
  // Still in monolith — re-exported:
  createOrder: orderController.createOrder,
  createGuestOrder: orderController.createGuestOrder,
  adminCreateManualOrder: orderController.adminCreateManualOrder,
};
