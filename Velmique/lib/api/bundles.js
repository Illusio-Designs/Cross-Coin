/* Public "Build Your Pack" tiers — store-wide mix bundle discounts.
   GET /api/public/pack-tiers → [{ id, pairs, discount_percent, label, badge }]
   `pairs` is the item-count threshold; the highest tier whose pairs <= count
   applies. Returns [] when the brand hasn't configured any, so the builder
   simply shows no discount. Brand is scoped by the X-Brand-Name header. */

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique';

/* Per-product packs (exact totals): GET /api/public/bundle-tiers?product_id=X
   → [{ pairs, price, label, badge }]. These power the PDP "Select Pack" cards
   (Pack of 2 / Pack of 3 …); checkout re-prices a qty-N line of the product
   server-side via bundlePerUnit, so the client price is display-only. */
export async function getBundleTiers(productId) {
  if (!productId) return [];
  try {
    const res = await fetch(`${API_URL}/api/public/bundle-tiers?product_id=${encodeURIComponent(productId)}`, {
      headers: { 'X-Brand-Name': BRAND_NAME },
      next: { revalidate: 120 },
    });
    if (!res.ok) throw new Error('Failed to fetch bundle tiers');
    const data = await res.json();
    return (Array.isArray(data?.tiers) ? data.tiers : [])
      .map((t) => ({
        pairs: Number(t.pairs),
        price: Number(t.price),
        label: t.label || `Pack of ${t.pairs}`,
        badge: t.badge || '',
      }))
      .filter((t) => t.pairs >= 2 && t.price > 0)
      .sort((a, b) => a.pairs - b.pairs);
  } catch {
    return [];
  }
}

export async function getPackTiers() {
  try {
    const res = await fetch(`${API_URL}/api/public/pack-tiers`, {
      headers: { 'X-Brand-Name': BRAND_NAME },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error('Failed to fetch pack tiers');
    const data = await res.json();
    return (Array.isArray(data?.tiers) ? data.tiers : [])
      .map((t) => ({
        pairs: Number(t.pairs),
        off: Number(t.discount_percent) || 0,
        label: t.label || `Any ${t.pairs}`,
        badge: t.badge || '',
      }))
      .filter((t) => t.pairs >= 2 && t.off > 0)
      .sort((a, b) => a.pairs - b.pairs);
  } catch {
    return [];
  }
}
