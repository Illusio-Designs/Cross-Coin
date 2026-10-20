// Shared helpers for the report services in this folder.
const { parseRange } = require('../../controller/reportsController.js');
const { hasAnyRole } = require('../../middleware/authMiddleware.js');

// Cost price, margin and stock value are admin-only (same as Revenue & Profit).
const canSeeCost = (user) => !!user && hasAnyRole(user, ['admin']);

// ?brandId= → positive int or null (all brands).
const brandOf = (q) => {
  const n = Number.parseInt(q.brandId, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Orders that count as "placed": everything except cancelled.
const PLACED_SQL = "(o.status IS NULL OR LOWER(o.status) NOT IN ('cancelled','order cancelled'))";

module.exports = { parseRange, canSeeCost, brandOf, PLACED_SQL };
