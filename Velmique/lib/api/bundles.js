/* Public "Build Your Pack" tiers — store-wide mix bundle discounts.
   GET /api/public/pack-tiers → [{ id, pairs, discount_percent, label, badge }]
   `pairs` is the item-count threshold; the highest tier whose pairs <= count
   applies. Returns [] when the brand hasn't configured any, so the builder
   simply shows no discount. Brand is scoped by the X-Brand-Name header. */

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique';

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
