// Physical pairs inside one saleable pack; unrelated to bundle-tier quantities.
function attributes(record) {
  const value = record?.attributes;
  if (typeof value === 'string') {
    try { return JSON.parse(value) || {}; } catch { return {}; }
  }
  return value && typeof value === 'object' ? value : {};
}
function count(value) {
  if (Array.isArray(value)) return value.length === 1 ? count(value[0]) : null;
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d+)$/) || text.match(/^(?:pack\s*of\s*|)(\d+)\s*(?:pairs?|pack)?$/i);
  const number = match ? Number(match[1]) : 0;
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}
export function packPairCount(product, variationId) {
  const variation = (product?.variations || []).find((item) => String(item.id) === String(variationId));
  for (const record of [variation, product]) {
    const attrs = attributes(record);
    for (const [key, value] of Object.entries(attrs)) {
      if (/^(pack|pack size|pairs|pairs per pack|pair count|number of pairs)$/i.test(key.replace(/[_-]/g, ' '))) {
        const result = count(value);
        if (result) return result;
      }
    }
  }
  // Legacy products can state pack contents directly in the product title.
  const match = String(product?.name || '').match(/\bpack\s+of\s+(\d+)\b|\b(\d+)\s+pairs?\b/i);
  return match ? count(match[1] || match[2]) : null;
}
