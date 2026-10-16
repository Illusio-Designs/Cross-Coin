// Real-data layer for the /test preview — pulls actual Crosscoin catalogue from
// the live public API and normalises each product into the shape the Mint UI
// uses (real name, price, compare-at, images, variation colours & sizes).
import { getAllPublicProducts, getPublicCategories, getPublicProductBySlug } from '../../services/publicApi';
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
