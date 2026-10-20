const FunnelEvent = require('../model/funnelEventModel');
const { sequelize } = require('../config/db.js');
const { logger } = require('../config/logging.js');
const { isBotUserAgent } = require('../utils/botDetect');

// Funnel + engagement events we record. view/cart/checkout are the ordered
// funnel stages; wishlist/search are extra intent signals. Purchase/delivered
// come from the orders table, not here.
const ALLOWED = new Set(['view_item', 'add_to_cart', 'begin_checkout', 'add_to_wishlist', 'search']);

// Server visit ids are uuids; anything else in the body is ignored.
const SESSION_RE = /^[A-Za-z0-9-]+$/;
const INT_MAX = 2147483647;

// Production doesn't auto-sync models, so add funnel_events.product_id on first
// use (the boot migration in index.js does the same). Cached promise → the
// information_schema check runs once per process. Resolves true when the column
// is usable, false otherwise; never rejects. A failure is retried after a
// cooldown instead of on every event.
let productColumn = null;
let productColumnFailedAt = 0;
function ensureProductIdColumn() {
  if (productColumn) return productColumn;
  if (productColumnFailedAt && Date.now() - productColumnFailedAt < 10 * 60 * 1000) return Promise.resolve(false);
  const hasColumn = async () => {
    const [rows] = await sequelize.query(
      `SELECT 1 FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funnel_events' AND COLUMN_NAME = 'product_id'`
    );
    return rows.length > 0;
  };
  productColumn = (async () => {
    if (!(await hasColumn())) {
      try {
        await sequelize.query('ALTER TABLE funnel_events ADD COLUMN product_id INT NULL');
      } catch (e) {
        // A concurrent request (or the boot migration) may have just added it.
        if (!(await hasColumn())) throw e;
      }
    }
    try {
      const [idx] = await sequelize.query(
        `SELECT 1 FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'funnel_events' AND INDEX_NAME = 'idx_fe_product_event_created'`
      );
      if (!idx.length) {
        await sequelize.query('ALTER TABLE funnel_events ADD INDEX idx_fe_product_event_created (product_id, event, created_at)');
      }
    } catch (e) {
      logger.warn('[events] product_id index skipped: ' + e.message); // column still usable
    }
    return true;
  })().catch((e) => {
    logger.warn('[events] product_id column unavailable: ' + e.message);
    productColumn = null;
    productColumnFailedAt = Date.now();
    return false;
  });
  return productColumn;
}

function bodySessionId(raw) {
  return typeof raw === 'string' && raw.length > 0 && raw.length <= 64 && SESSION_RE.test(raw) ? raw : null;
}

function bodyProductId(raw) {
  const n = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : raw;
  return Number.isInteger(n) && n > 0 && n <= INT_MAX ? n : null;
}

// POST /api/i/e (and legacy /api/events/track)  { event, value?, session_id?, product_id? }
// Public. Session comes from the session_id cookie when the browser sends it;
// otherwise from the body (the storefront's first-party copy of the visit id,
// needed where the api cookie is third-party and blocked, e.g. Safari).
exports.trackEvent = async (req, res) => {
  // Respond immediately — analytics must never slow or block the storefront.
  res.status(202).json({ success: true });
  try {
    if (isBotUserAgent(req.headers['user-agent'])) return; // exclude bots
    const event = String(req.body?.event || '').toLowerCase();
    if (!ALLOWED.has(event)) return;
    const sessionId = req.cookies?.session_id || bodySessionId(req.body?.session_id);
    const brandId = req.brand?.id || null;
    const value = Number.isFinite(Number(req.body?.value)) ? Number(req.body.value) : null;
    const productId = bodyProductId(req.body?.product_id);
    const row = { brand_id: brandId, session_id: sessionId, event, value };
    const fields = ['brand_id', 'session_id', 'event', 'value'];
    if (productId && (await ensureProductIdColumn())) {
      row.product_id = productId;
      fields.push('product_id');
    }
    await FunnelEvent.create(row, { fields });
  } catch (e) {
    logger.warn('[events] track failed: ' + e.message);
  }
};

exports.ensureProductIdColumn = ensureProductIdColumn;
