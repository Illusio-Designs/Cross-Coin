// Resolve every mix-pack group once using the brand's server-owned tiers.
async function getMixPackDiscounts(items, brandId) {
  const quantities = new Map();
  for (const item of items) {
    if (!item.pack_group) continue;
    quantities.set(String(item.pack_group), (quantities.get(String(item.pack_group)) || 0) + Number(item.quantity || 0));
  }
  const discounts = new Map();
  const { packDiscountPercent } = require('../controller/bundleController.js');
  for (const [group, count] of quantities) discounts.set(group, await packDiscountPercent(brandId, count));
  return discounts;
}
function mixPackUnitPrice(price, item, discounts) {
  const percent = discounts.get(String(item.pack_group));
  return percent > 0 ? Math.round(Number(price) * (1 - percent / 100) * 100) / 100 : null;
}
module.exports = { getMixPackDiscounts, mixPackUnitPrice };
