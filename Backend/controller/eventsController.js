const FunnelEvent = require('../model/funnelEventModel');
const { logger } = require('../config/logging.js');

// Only these funnel stages are recorded; anything else is ignored so the table
// stays clean. Purchase/delivered come from the orders table, not here.
const ALLOWED = new Set(['view_item', 'add_to_cart', 'begin_checkout']);

// POST /api/events/track  { event, value? }  (public; session via cookie)
exports.trackEvent = async (req, res) => {
  // Respond immediately — analytics must never slow or block the storefront.
  res.status(202).json({ success: true });
  try {
    const event = String(req.body?.event || '').toLowerCase();
    if (!ALLOWED.has(event)) return;
    const sessionId = req.cookies?.session_id || req.body?.session_id || null;
    const brandId = req.brand?.id || null;
    const value = Number.isFinite(Number(req.body?.value)) ? Number(req.body.value) : null;
    await FunnelEvent.create({ brand_id: brandId, session_id: sessionId, event, value });
  } catch (e) {
    logger.warn('[events] track failed: ' + e.message);
  }
};
