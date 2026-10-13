const { BundleTier } = require('../model/bundleTierModel.js');
const { logger } = require('../config/logging.js');

// ── Public ────────────────────────────────────────────────────────────────
// GET /api/public/bundle-tiers?product_id=42   (brand from X-Brand-Name header)
// Returns that product's packs (pairs >= 2 with an exact price). 1 pair is
// implicit on the storefront (the product's own price).
module.exports.getPublicBundleTiers = async (req, res) => {
  try {
    const brandId = req.brandId || parseInt(req.query.brand_id, 10) || 1;
    const productId = parseInt(req.query.product_id, 10);
    if (!Number.isFinite(productId)) return res.json({ success: true, tiers: [] });
    const rows = await BundleTier.findAll({
      where: { brand_id: brandId, product_id: productId, is_active: true },
      order: [['display_order', 'ASC'], ['pairs', 'ASC']],
      attributes: ['id', 'pairs', 'price', 'label', 'badge', 'display_order'],
    });
    res.set('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=300');
    return res.json({ success: true, tiers: rows });
  } catch (err) {
    logger.error('getPublicBundleTiers failed:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin ─────────────────────────────────────────────────────────────────
module.exports.listBundleTiers = async (req, res) => {
  try {
    const brandId = parseInt(req.query.brand_id, 10) || req.brandId || 1;
    const where = { brand_id: brandId };
    const productId = parseInt(req.query.product_id, 10);
    if (Number.isFinite(productId)) where.product_id = productId;
    const rows = await BundleTier.findAll({
      where,
      order: [['product_id', 'ASC'], ['display_order', 'ASC'], ['pairs', 'ASC']],
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
    const productId = parseInt(req.body.product_id, 10);
    const pairs = parseInt(req.body.pairs, 10);
    const price = parseFloat(req.body.price);
    if (!Number.isFinite(productId)) return res.status(400).json({ success: false, message: 'product_id is required' });
    if (!Number.isFinite(pairs) || pairs < 1) return res.status(400).json({ success: false, message: 'pairs must be a positive integer' });
    if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ success: false, message: 'price must be greater than 0' });
    const row = await BundleTier.create({
      brand_id: brandId,
      product_id: productId,
      pairs,
      price,
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
    if (!row) return res.status(404).json({ success: false, message: 'Pack not found' });
    const patch = {};
    if (req.body.pairs != null) { const p = parseInt(req.body.pairs, 10); if (Number.isFinite(p) && p >= 1) patch.pairs = p; }
    if (req.body.price != null) { const pr = parseFloat(req.body.price); if (Number.isFinite(pr) && pr > 0) patch.price = pr; }
    if (req.body.product_id != null) { const pid = parseInt(req.body.product_id, 10); if (Number.isFinite(pid)) patch.product_id = pid; }
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
    if (!row) return res.status(404).json({ success: false, message: 'Pack not found' });
    await row.destroy();
    return res.json({ success: true });
  } catch (err) {
    logger.error('deleteBundleTier failed:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Server-authoritative pack pricing for cart + checkout: the EXACT per-unit
// price for a line of `qty` units of `productId`, from that product's pack
// whose pairs == qty. Returns null when no pack matches, so normal single-pair
// pricing applies (and it's inert for every product with no packs set). Short
// in-process cache so a multi-line order doesn't re-query per line.
let _packCache = { at: 0, byKey: new Map() };
module.exports.bundlePerUnit = async (brandId, productId, qty) => {
  const q = parseInt(qty, 10);
  const pid = parseInt(productId, 10);
  if (!Number.isFinite(q) || q < 1 || !Number.isFinite(pid)) return null;
  if (Date.now() - _packCache.at > 30000) _packCache = { at: Date.now(), byKey: new Map() };
  const key = `${brandId || 1}:${pid}:${q}`;
  if (_packCache.byKey.has(key)) return _packCache.byKey.get(key);
  const row = await BundleTier.findOne({
    where: { brand_id: brandId || 1, product_id: pid, pairs: q, is_active: true },
    attributes: ['price', 'pairs'],
  });
  let perUnit = null;
  if (row && row.price != null) {
    const total = Number(row.price);
    if (total > 0) perUnit = total / q;
  }
  _packCache.byKey.set(key, perUnit);
  return perUnit;
};
