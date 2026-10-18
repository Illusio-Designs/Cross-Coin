// Match backend pricing: highest qualifying item-count tier, rounded per unit.
export function packPercent(count, tiers = []) {
  return [...tiers].filter(t => count >= t.pairs).sort((a, b) => b.pairs - a.pairs)[0]?.off || 0;
}
export function pricePackCart(items, tiers = []) {
  const counts = new Map();
  for (const item of items) if (item.packGroup) counts.set(item.packGroup, (counts.get(item.packGroup) || 0) + Number(item.quantity || 0));
  return items.map(item => {
    if (!item.packGroup) return item;
    const basePrice = Number(item.basePrice ?? item.price ?? 0);
    const packDiscount = packPercent(counts.get(item.packGroup), tiers);
    return { ...item, basePrice, packDiscount, price: Math.round(basePrice * (1 - packDiscount / 100) * 100) / 100 };
  });
}
