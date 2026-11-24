export function packDiscountPercent(tiers, count) {
  return tiers.reduce((best, tier) => (
    tier.pairs <= count && (!best || tier.pairs >= best.pairs) ? tier : best
  ), null)?.off ?? 0;
}

// Match checkout, which rounds each discounted unit to paise.
export function packUnitPrice(price, percent) {
  return Math.round(price * (1 - percent / 100) * 100) / 100;
}

export function packLineId(productId, variationId, group) {
  const suffix = group === 'byp' ? 'pack' : group;
  return `${productId}:${variationId || 'v'}:${suffix}`;
}
