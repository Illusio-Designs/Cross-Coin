// Real-data layer for the /test preview — pulls actual Crosscoin catalogue from
// the live public API and normalises each product into the shape the Mint UI
// uses (real name, price, compare-at, images, variation colours & sizes).
import axios from 'axios';
import { getAllPublicProducts, getPublicCategories, getPublicProductBySlug, getAllPublicReviews, getPublicCoupons } from '../../services/publicApi';
import { API_URL, addBrandHeader } from '../../services/api/config';
import { selectProductImage, selectProductImages } from '../../utils/productImageSelector';
import { getImageUrl } from '../../utils/imageHandler';

const imgOf = (d) => { try { return getImageUrl(d) || ''; } catch (_) { return ''; } };

// Map a colour NAME to a CSS colour for the swatch dot (real products store
// colour names, not hexes). Falls back to a stable hashed hue.
const NAMED = {
  black: '#1b1b1b', white: '#efefef', ivory: '#f3ecdd', cream: '#efe7d6', navy: '#1e2a52',
  blue: '#1e40af', 'sky blue': '#38bdf8', red: '#ce1e36', crimson: '#ce1e36', maroon: '#7a1f32',
  green: '#166534', olive: '#4d5320', forest: '#134e4a', teal: '#0f766e', grey: '#8a8f93', gray: '#8a8f93',
  charcoal: '#3a3a3a', beige: '#d9c7a0', tan: '#c9a25a', brown: '#6b4b2a', pink: '#db2777', rose: '#e11d48',
  purple: '#6d28d9', lavender: '#a78bfa', yellow: '#d4a017', mustard: '#c9a227', orange: '#e36414', indigo: '#180d3e',
};
export function colorToCss(name) {
  const k = String(name || '').toLowerCase().trim();
  if (NAMED[k]) return NAMED[k];
  let h = 0; for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 360;
  return `hsl(${h} 42% 46%)`;
}

function attrsOf(v) {
  let a = v?.attributes;
  if (typeof a === 'string') { try { a = JSON.parse(a); } catch (_) { a = null; } }
  return a || {};
}
function listVals(x) { return Array.isArray(x) ? x : (x ? [x] : []); }

export function normalizeProduct(p) {
  if (!p) return null;
  const vars = Array.isArray(p.variations) ? p.variations : [];
  const v0 = vars[0];
  const now = parseFloat(v0?.price ?? p.price ?? 0) || 0;
  const was = parseFloat(v0?.comparePrice ?? p.comparePrice ?? 0) || 0;
  const off = was > now && was > 0 ? Math.round((1 - now / was) * 100) : 0;

  // Colours (with a representative image per colour when the variation has one).
  const colorMap = new Map();
  vars.forEach((v) => {
    listVals(attrsOf(v).color).forEach((c) => {
      if (c && !colorMap.has(c)) colorMap.set(c, { name: c, hex: colorToCss(c), img: imgOf(selectProductImage(p, v)) });
    });
  });
  const colors = [...colorMap.values()];

  // Sizes from variation attributes (dedup, keep first-seen order).
  const sizes = [];
  vars.forEach((v) => listVals(attrsOf(v).size).forEach((s) => { if (s && !sizes.includes(String(s))) sizes.push(String(s)); }));

  let images = [];
  try { images = (selectProductImages(p, v0, 5) || []).map(getImageUrl).filter(Boolean); } catch (_) {}
  const mainImg = imgOf(selectProductImage(p, v0)) || images[0] || '';

  const rating = p.avgRating != null ? p.avgRating : (p.avg_rating != null ? parseFloat(p.avg_rating) : null);
  const brand = (p.brandName || p.brand_name || p.brand || 'CROSSCOIN');

  return {
    id: p.id, slug: p.slug, name: p.name,
    brand: String(brand).toUpperCase(),
    cat: p.category?.name || p.categoryName || p.category_name || '',
    now, was, off,
    img: mainImg, images,
    rating: rating != null ? Number(rating).toFixed(1) : null,
    revs: p.reviewCount ?? p.review_count ?? 0,
    colors, sizes,
    raw: p,
  };
}

const unwrapList = (r) => r?.data?.products || r?.products || (Array.isArray(r) ? r : []);
const unwrapCats = (r) => (Array.isArray(r) ? r : (r?.categories || r?.data?.categories || []));
const unwrapProduct = (r) => r?.data?.product || r?.product || r?.data || r;

export async function fetchProducts(params = {}) {
  const r = await getAllPublicProducts(params);
  return unwrapList(r).map(normalizeProduct).filter(Boolean);
}
export async function fetchCategories() {
  const r = await getPublicCategories();
  return unwrapCats(r).map((c) => ({ id: c.id, name: c.name, count: c.productCount ?? c.product_count ?? c.count ?? null }));
}
export async function fetchProduct(slug) {
  const r = await getPublicProductBySlug(slug);
  const p = unwrapProduct(r);
  return p ? normalizeProduct(p) : null;
}

// Real admin-set bundle tiers (the "Buy More, Save More" deal ladder) for a
// product: [{ pairs, price, label, badge }] with absolute pack prices. Empty
// when the product has no tiers configured.
export async function fetchBundleTiers(productId) {
  if (!productId) return [];
  try {
    const { data } = await axios.get(`${API_URL}/api/public/bundle-tiers?product_id=${encodeURIComponent(productId)}`, addBrandHeader());
    const tiers = Array.isArray(data?.tiers) ? data.tiers : [];
    return tiers
      .map((t) => ({ pairs: Number(t.pairs), price: Number(t.price), label: t.label || `${Number(t.pairs)} Pairs`, badge: t.badge || null }))
      .filter((t) => Number.isFinite(t.pairs) && t.pairs > 1 && Number.isFinite(t.price) && t.price > 0)
      .sort((a, b) => a.pairs - b.pairs);
  } catch (_) { return []; }
}

// Real store reviews for the home "what shoppers say" section.
export async function fetchReviews(limit = 6) {
  try {
    const r = await getAllPublicReviews({ limit });
    const list = r?.reviews || r?.data?.reviews || (Array.isArray(r) ? r : []);
    return list.map((v) => ({
      name: v.name || v.customerName || v.customer_name || v.user?.name || 'Verified buyer',
      rating: Number(v.rating) || 5,
      text: v.comment || v.review || v.message || v.body || '',
      loc: (v.city || v.location || '').toString().toUpperCase(),
      product: v.productName || v.product_name || '',
    })).filter((v) => v.text);
  } catch (_) { return []; }
}

// Real live coupons → the deal ticker + promo hint.
export async function fetchCoupons() {
  try {
    const r = await getPublicCoupons();
    const list = r?.coupons || r?.data?.coupons || (Array.isArray(r) ? r : []);
    return list.map((c) => {
      const type = c.discountType || c.discount_type || c.type;
      const val = c.discountValue ?? c.discount_value ?? c.value;
      const label = type === 'percentage' || type === 'percent' ? `${val}% OFF` : (val ? `₹${val} OFF` : 'DEAL');
      return { code: c.code, label, min: c.minOrderValue ?? c.min_order_value ?? null };
    }).filter((c) => c.code);
  } catch (_) { return []; }
}

// Validate a coupon against the live rules (real discount amount).
export async function validateCouponReal(code, cartTotal, paymentMode) {
  const { validateCoupon } = await import('../../services/publicApi');
  const data = await validateCoupon(code, cartTotal, paymentMode || null, null);
  if (data?.success && data?.coupon) return { ok: true, code: data.coupon.code, amount: parseFloat(data.discountAmount) || 0 };
  return { ok: false, message: data?.message || 'Invalid or expired code' };
}
