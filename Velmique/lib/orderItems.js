/* Helpers for order line items as the orders / tracking APIs return them
   (Product / ProductVariation may arrive under either casing). */
const IK_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
  ?? process.env.NEXT_PUBLIC_IMAGEKIT_URL
  ?? 'https://ik.imagekit.io/wp2oatzmf';

/* Strip doubled https:// prefixes ("https://…https://…") and prefix relative
   paths with the ImageKit endpoint. */
export function resolveImageUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let url = raw;
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    url = url.substring(url.lastIndexOf('https://'));
  }
  if (/^https?:\/\//.test(url)) return url;
  return `${IK_ENDPOINT}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Best image for an order line, whichever relation the backend included. */
export function pickItemImage(it) {
  const p = it?.product || it?.Product || {};
  const v = it?.variation || it?.ProductVariation || {};
  return p.image
    || p.ProductImages?.[0]?.image_url
    || p.images?.[0]?.image_url
    || p.images?.[0]?.url
    || v.images?.[0]?.image_url
    || v.VariationImages?.[0]?.image_url
    || it?.image
    || '';
}

/** "50ml · Woody" from a variation attributes object / JSON string. */
export function fmtAttrs(attrs) {
  if (!attrs) return '';
  let a = attrs;
  if (typeof a === 'string') { try { a = JSON.parse(a); } catch { return ''; } }
  if (!a || typeof a !== 'object') return '';
  // Fragrance variations carry many descriptive attributes (notes, accords…);
  // on an order line only the purchasable choice matters.
  const pick = ['size', 'volume', 'color', 'colour', 'pack'].filter((k) => a[k] != null);
  return Object.entries(a)
    .filter(([k]) => !String(k).startsWith('_') && (!pick.length || pick.includes(String(k).toLowerCase())))
    .map(([, v]) => (Array.isArray(v) ? v.join(', ') : v))
    .filter((v) => v != null && String(v).trim() !== '')
    .slice(0, 3)
    .join(' · ');
}
