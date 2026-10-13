const { BundleTier } = require('../model/bundleTierModel.js');
const { logger } = require('../config/logging.js');

// Fallback tiers when a brand hasn't configured any, so packs work out of the
// box: 1 pair (no discount), 2 pairs (15% off), 3 pairs (25% off).
const DEFAULT_TIERS = [
  { id: null, pairs: 1, discount_percent: 0,  label: '1 Pair',  badge: null,            display_order: 0 },
  { id: null, pairs: 2, discount_percent: 15, label: '2 Pairs', badge: 'Most Popular',  display_order: 1 },
  { id: null, pairs: 3, discount_percent: 25, label: '3 Pairs', badge: 'Best Value',    display_order: 2 },
];

const clampPct = (v) => Math.max(0, Math.min(90, parseFloat(v) || 0));

// ── Public ────────────────────────────────────────────────────────────────
// GET /api/public/bundle-tiers   (brand from X-Brand-Name header)
module.exports.getPublicBundleTiers = async (req, res) => {
  try {
    const brandId = req.brandId || parseInt(req.query.brand_id, 10) || 1;
    const rows = await BundleTier.findAll({
      where: { brand_id: brandId, is_active: true },
      order: [['display_order', 'ASC'], ['pairs', 'ASC']],
      attributes: ['id', 'pairs', 'discount_percent', 'label', 'badge', 'display_order'],
    });
    res.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=600');
    return res.json({ success: true, tiers: rows.length ? rows : DEFAULT_TIERS, defaulted: rows.length === 0 });
  } catch (err) {
    logger.error('getPublicBundleTiers failed:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin ─────────────────────────────────────────────────────────────────
module.exports.listBundleTiers = async (req, res) => {
  try {
    const brandId = parseInt(req.query.brand_id, 10) || req.brandId || 1;
    const rows = await BundleTier.findAll({
      where: { brand_id: brandId },
      order: [['display_order', 'ASC'], ['pairs', 'ASC']],
    });
    return res.json({ success: true, tiers: rows });
  } catch (err) {
    logger.error('listBundleTiers failed:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports.createBundleTier = async (req, res) => {
  try {
    const brandId = parseInt(req.body.brand_id, 10) || req.brandId || 1;
    const pairs = parseInt(req.body.pairs, 10);
    if (!Number.isFinite(pairs) || pairs < 1) {
      return res.status(400).json({ success: false, message: 'pairs must be a positive integer' });
    }
    const row = await BundleTier.create({
      brand_id: brandId,
      pairs,
      discount_percent: clampPct(req.body.discount_percent),
      label: (req.body.label || `${pairs} Pair${pairs > 1 ? 's' : ''}`).toString().slice(0, 80),
      badge: req.body.badge ? req.body.badge.toString().slice(0, 40) : null,
      display_order: parseInt(req.body.display_order, 10) || 0,
      is_active: req.body.is_active !== false && req.body.is_active !== 'false',
    });
    return res.status(201).json({ success: true, tier: row });
  } catch (err) {
    logger.error('createBundleTier failed:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports.updateBundleTier = async (req, res) => {
  try {
    const row = await BundleTier.findByPk(parseInt(req.params.id, 10));
    if (!row) return res.status(404).json({ success: false, message: 'Tier not found' });
    const patch = {};
    if (req.body.pairs != null) { const p = parseInt(req.body.pairs, 10); if (Number.isFinite(p) && p >= 1) patch.pairs = p; }
    if (req.body.discount_percent != null) patch.discount_percent = clampPct(req.body.discount_percent);
    if (typeof req.body.label === 'string') patch.label = req.body.label.slice(0, 80);
    if ('badge' in req.body) patch.badge = req.body.badge ? req.body.badge.toString().slice(0, 40) : null;
    if (req.body.display_order != null) patch.display_order = parseInt(req.body.display_order, 10) || 0;
    if (req.body.is_active != null) patch.is_active = req.body.is_active !== false && req.body.is_active !== 'false';
    await row.update(patch);
    return res.json({ success: true, tier: row });
  } catch (err) {
    logger.error('updateBundleTier failed:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports.deleteBundleTier = async (req, res) => {
  try {
    const row = await BundleTier.findByPk(parseInt(req.params.id, 10));
    if (!row) return res.status(404).json({ success: false, message: 'Tier not found' });
    await row.destroy();
    return res.json({ success: true });
  } catch (err) {
    logger.error('deleteBundleTier failed:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Shared helper for the cart: the active tier for a given pair count (or null).
// Used server-side so add-to-cart prices the pack authoritatively.
module.exports.resolveTier = async (brandId, pairs) => {
  const p = parseInt(pairs, 10);
  if (!Number.isFinite(p) || p < 1) return null;
  const row = await BundleTier.findOne({ where: { brand_id: brandId || 1, pairs: p, is_active: true } });
  if (row) return { pairs: row.pairs, discount_percent: Number(row.discount_percent) };
  const def = DEFAULT_TIERS.find((t) => t.pairs === p);
  return def ? { pairs: def.pairs, discount_percent: def.discount_percent } : null;
};

module.exports.DEFAULT_TIERS = DEFAULT_TIERS;
