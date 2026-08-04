// Resolve the effective brand id for a request: an explicit value wins, then
// req.brandId, then req.brand.id, defaulting to 1 (the reference brand).
module.exports = function resolveBrandId(req, explicitBrandId = null) {
  return explicitBrandId || req.brandId || (req.brand && req.brand.id) || 1;
};
