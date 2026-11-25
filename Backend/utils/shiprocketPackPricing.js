const crypto = require('crypto');

const PACK_QUOTE_ATTRIBUTE = 'cc_pack_quote';
const pricingError = (message) => Object.assign(new Error(message), { status: 409, code: 'CHECKOUT_PACK_DISCOUNT_UNAVAILABLE' });

function packGroupId(value) {
  return typeof value === 'string' && /^[\w:-]{1,100}$/.test(value) ? value : null;
}

async function pricePackItems(lines, variants, getBundleUnit, getMixPercent) {
  const groups = new Map();
  const stockUnits = new Map();
  const prepared = lines.map((line) => {
    const variant = variants.get(line.variant_id);
    if (!variant || !Number.isFinite(variant.price) || variant.price <= 0) throw pricingError('A pack item is unavailable.');
    const units = (stockUnits.get(line.variant_id) || 0) + line.quantity;
    stockUnits.set(line.variant_id, units);
    if (units > variant.stock) throw pricingError(`${variant.name} does not have enough stock for this pack.`);
    const key = line.pack_group ? `mix:${line.pack_group}`
      : line.pack_id ? `fixed:${variant.productId}:${line.pack_id}` : null;
    if (key) groups.set(key, (groups.get(key) || 0) + line.quantity);
    return { line, variant, key };
  });
  const byVariant = new Map();
  const bundleUnitsSeen = new Map();
  for (const { line, variant, key } of prepared) {
    const quantity = groups.get(key) || line.quantity;
    const percent = line.pack_group ? await getMixPercent(quantity) : 0;
    const bundleUnit = line.pack_id ? await getBundleUnit(variant.productId, quantity) : null;
    if (line.pack_id && bundleUnit == null) throw pricingError('This bundle quantity no longer has a pack price. Update your selection.');
    const paise = Math.round((percent ? variant.price * (1 - percent / 100) : variant.price) * 100);
    let lineTotal = paise * line.quantity;
    if (bundleUnit != null) {
      const previous = bundleUnitsSeen.get(key) || 0;
      const through = previous + line.quantity;
      lineTotal = Math.round(bundleUnit * 100 * through) - Math.round(bundleUnit * 100 * previous);
      bundleUnitsSeen.set(key, through);
    }
    const entry = byVariant.get(line.variant_id) || { variant, quantity: 0, totalPaise: 0, discounted: false };
    entry.quantity += line.quantity;
    entry.totalPaise += lineTotal;
    entry.discounted ||= bundleUnit != null || percent > 0;
    byVariant.set(line.variant_id, entry);
  }
  const entries = [...byVariant];
  let remainder = 0;
  for (const [, entry] of entries) {
    // A synced variant can only have one unit price in the hosted checkout.
    entry.unitPaise = Math.floor(entry.totalPaise / entry.quantity);
    remainder += entry.totalPaise % entry.quantity;
  }
  for (const [, entry] of entries) {
    if (remainder === 0) break;
    if (!entry.discounted || entry.quantity > remainder) continue;
    entry.unitPaise++;
    remainder -= entry.quantity;
  }
  return entries.map(([variant_id, { variant, quantity, totalPaise, unitPaise }]) => {
    // Keep more precision in the unit price when two-decimal prices cannot
    // represent the pack subtotal, e.g. three of one variant at ₹499 total.
    const price = remainder > 0 ? totalPaise / (quantity * 100) : unitPaise / 100;
    if (!variant.image || price <= 0) throw pricingError('A pack item is missing checkout pricing or an image.');
    return { variant_id, quantity, catalog_data: { name: variant.name, price, image_url: variant.image } };
  });
}

function signPackQuote(items, brandId, secret) {
  const quote = JSON.stringify(items.map(({ variant_id, quantity, catalog_data }) => {
    const unitPaise = Math.round(catalog_data.price * 100);
    const subtotalPaise = Math.round(catalog_data.price * quantity * 100);
    const line = [String(variant_id), quantity, unitPaise];
    // Preserve the older quote shape for amounts that already divide evenly.
    if (subtotalPaise !== unitPaise * quantity) line.push(subtotalPaise);
    return line;
  }));
  const signature = crypto.createHmac('sha256', secret).update(`cc-pack-v1:${brandId}:${quote}`).digest('base64url');
  return `${signature}.${quote}`;
}

function readPackQuote(raw, items, brandId, secret) {
  const boundary = typeof raw === 'string' ? raw.indexOf('.') : -1;
  if (boundary < 0) throw pricingError('Missing pack quote signature.');
  const quote = raw.slice(boundary + 1);
  const signature = Buffer.from(raw.slice(0, boundary));
  const expected = Buffer.from(crypto.createHmac('sha256', secret).update(`cc-pack-v1:${brandId}:${quote}`).digest('base64url'));
  if (signature.length !== expected.length || !crypto.timingSafeEqual(signature, expected)) throw pricingError('Invalid pack quote signature.');
  const lines = new Map(JSON.parse(quote).map(([id, quantity, paise, subtotalPaise]) =>
    [id, { quantity, paise, ...(subtotalPaise == null ? {} : { subtotalPaise }) }]));
  const purchased = new Map();
  for (const item of items) {
    const id = String(item.variant_id);
    purchased.set(id, (purchased.get(id) || 0) + Number(item.quantity));
  }
  if (purchased.size !== lines.size || [...purchased].some(([id, count]) => lines.get(id)?.quantity !== count)) {
    throw pricingError('Shiprocket changed the quantities from the original pack quote.');
  }
  return lines;
}

module.exports = { PACK_QUOTE_ATTRIBUTE, packGroupId, pricePackItems, pricingError, signPackQuote, readPackQuote };
