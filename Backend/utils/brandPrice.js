function validOverride(value) {
  if (value == null || String(value).trim() === '') return null;
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : null;
}
function applyBrandPrice(product, brandId) {
  if (!brandId) return product;
  const brand = (product.Brands || product.brands || []).find((entry) => Number(entry.id) === Number(brandId));
  const price = validOverride(brand?.ProductBrand?.price_override ?? brand?.price_override);
  if (price == null) return product;
  return { ...product, price, brandPriceOverride: price,
    variations: (product.variations || []).map((variation) => ({ ...variation, price })) };
}
// Resolve from trusted database metadata, never a client-supplied price.
function createBrandPriceResolver(brandId) {
  const pending = new Map();
  return async (productId, variationPrice) => {
    if (!brandId) return Number(variationPrice);
    if (!pending.has(productId)) {
      const { ProductBrand } = require('../model/productBrandModel.js');
      pending.set(productId, ProductBrand.findOne({ where: { product_id: productId, brand_id: brandId, status: 'active' }, attributes: ['price_override'] }));
    }
    const row = await pending.get(productId);
    return validOverride(row?.price_override) ?? Number(variationPrice);
  };
}
module.exports = { validOverride, applyBrandPrice, createBrandPriceResolver };
