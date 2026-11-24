function parseCheckoutPackTiers(value) {
  if (typeof value !== 'string' || !value.trim()) return [];
  const tiers = new Map();
  for (const entry of value.trim().split(',')) {
    const match = entry.trim().match(/^(\d+)\s*:\s*(\d+(?:\.\d{1,2})?)$/);
    if (!match) return [];
    const count = Number(match[1]);
    const percent = Number(match[2]);
    if (!Number.isSafeInteger(count) || count < 2 || percent <= 0 || percent > 90 || tiers.has(count)) return [];
    tiers.set(count, percent);
  }
  return [...tiers].sort(([a], [b]) => a - b);
}

function matchingCheckoutPackTiers(checked, active) {
  const configured = parseCheckoutPackTiers(checked);
  const actual = active.map(({ pairs, discount_percent }) => [Number(pairs), Number(discount_percent)])
    .sort(([a], [b]) => a - b);
  return configured.length > 0 && JSON.stringify(configured) === JSON.stringify(actual) ? configured : [];
}

module.exports = { parseCheckoutPackTiers, matchingCheckoutPackTiers };
