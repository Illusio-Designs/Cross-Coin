// Real-data layer for the /test preview — pulls actual Crosscoin catalogue from
// the live public API and normalises each product into the shape the Mint UI
// uses (real name, price, compare-at, images, variation colours & sizes).
import axios from 'axios';
import { getAllPublicProducts, getPublicCategories, getPublicProductBySlug, getAllPublicReviews, getPublicCoupons, getPublicBlogs, getPublicProductReviews, getPublicSliders, searchProducts, getPublicPolicyByName, getPublicBlogBySlug, trackOrderByOrderNumber, trackOrderByAWB, checkPincodeServiceability, getShippingFees, createPublicReview } from '../../services/publicApi';
import { API_URL, addBrandHeader } from '../../services/api/config';
import { selectProductImage, selectProductImages } from '../../utils/productImageSelector';
import { getImageUrl } from '../../utils/imageHandler';
import { getDirectImageUrl, ikTransform } from '../../utils/imageUtils';

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

  // Material + gender from variation attributes (same source the live /Products
  // facet sidebar uses). Deduped, first-seen order.
  const materials = [];
  const genders = [];
  vars.forEach((v) => {
    const a = attrsOf(v);
    listVals(a.material).forEach((m) => { const s = String(m).trim(); if (s && !materials.includes(s)) materials.push(s); });
    listVals(a.gender).forEach((g) => { const s = String(g).trim(); if (s && !genders.includes(s)) genders.push(s); });
  });

  // Buyable variants (how Crosscoin models single pair vs multi-pair packs: a
  // variation whose colour attribute has >1 colour IS a "Pack of N"). Each
  // variant carries its own price, compare-at, image, colours and sizes.
  const variants = vars.map((v) => {
    const a = attrsOf(v);
    const vcolors = listVals(a.color).filter(Boolean);
    const vsizes = listVals(a.size).filter(Boolean).map(String);
    const vprice = parseFloat(v.price ?? p.price ?? 0) || 0;
    const vcompare = parseFloat(v.comparePrice ?? v.compare_price ?? 0) || 0;
    const pairs = vcolors.length || 1;
    const isPack = pairs > 1;
    return {
      id: v.id,
      colors: vcolors,
      sizes: vsizes,
      size: vsizes[0] || '',
      price: vprice,
      comparePrice: vcompare,
      off: vcompare > vprice && vcompare > 0 ? Math.round((1 - vprice / vcompare) * 100) : 0,
      img: imgOf(selectProductImage(p, v)),
      pairs, isPack,
      label: isPack ? `Pack of ${pairs}` : (vcolors[0] || 'Single'),
      swatch: colorToCss(vcolors[0] || ''),
    };
  }).filter((v) => v.price > 0 || v.colors.length);

  let images = [];
  try { images = (selectProductImages(p, v0, 5) || []).map(getImageUrl).filter(Boolean); } catch (_) {}
  const mainImg = imgOf(selectProductImage(p, v0)) || images[0] || '';

  const rating = p.avgRating != null ? p.avgRating : (p.avg_rating != null ? parseFloat(p.avg_rating) : null);
  const brand = (p.brandName || p.brand_name || p.brand || 'CROSSCOIN');

  return {
    id: p.id, slug: p.slug, name: p.name,
    brand: String(brand).toUpperCase(),
    cat: p.category?.name || p.categoryName || p.category_name || '',
    catId: p.categoryId ?? p.category_id ?? p.category?.id ?? null,
    badge: (() => { const b = (p.badge || p.tag || '').toString().trim(); return b.toLowerCase() === 'none' ? '' : b; })(),
    now, was, off,
    img: mainImg, images,
    rating: rating != null ? Number(rating).toFixed(1) : null,
    revs: p.reviewCount ?? p.review_count ?? 0,
    colors, sizes, materials, genders, variants,
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
  return unwrapCats(r).map((c) => {
    const raw = c.image || c.imageUrl || c.image_url || c.thumbnail || c.banner || c.coverImage || '';
    let img = '';
    try { img = raw ? (ikTransform(getDirectImageUrl({ image_url: raw }) || raw, 800)) : ''; } catch (_) { img = ''; }
    return { id: c.id, name: c.name, count: c.productCount ?? c.product_count ?? c.count ?? null, img };
  });
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
      // Backend returns the reviewer name as `reviewerName` (= User.username or
      // guestName); fall back through the raw fields before the generic label.
      name: v.reviewerName || v.guestName || v.User?.username || v.name || v.customerName || v.customer_name || v.user?.name || 'Verified buyer',
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

// Submit a product review to the real store (goes to moderation, like the live
// site's review form). Returns { ok, message }.
export async function submitProductReview({ productId, rating, comment, name, email }) {
  try {
    const fd = new FormData();
    fd.append('productId', productId);
    fd.append('rating', String(rating));
    fd.append('comment', comment);
    fd.append('name', name);
    fd.append('email', email);
    const res = await createPublicReview(fd);
    return { ok: res?.success !== false, message: res?.message || 'Thanks! Your review is in for moderation.' };
  } catch (e) {
    return { ok: false, message: (e && e.message) || 'Could not submit your review. Please try again.' };
  }
}

// Live shipping fees + free-shipping threshold (same source as the real cart).
// Returns { threshold, codFee, prepaidFee } with safe fallbacks.
export async function fetchShippingFees() {
  try {
    const data = await getShippingFees();
    const raw = Array.isArray(data) ? data : (data?.shippingFees || data?.fees || []);
    const feeOf = (type) => {
      const f = raw.find((x) => (x.orderType || x.order_type) === type);
      return f ? Number(f.fee) || 0 : null;
    };
    return {
      threshold: Number(data?.freeShippingThreshold ?? data?.free_shipping_threshold) || 0,
      codFee: feeOf('cod'),
      prepaidFee: feeOf('prepaid'),
    };
  } catch (_) { return { threshold: 0, codFee: null, prepaidFee: null }; }
}

// Real global FAQs (admin-managed) → [question, answer] pairs.
export async function fetchFaqs() {
  try {
    const { data } = await axios.get(`${API_URL}/api/public/faqs?type=global`, addBrandHeader());
    const list = Array.isArray(data?.faqs) ? data.faqs : [];
    return list.map((f) => [f.question || f.q || '', f.answer || f.a || '']).filter((x) => x[0] && x[1]);
  } catch (_) { return []; }
}

// Real journal / blog posts for the home "ledger" section.
export async function fetchBlogs(limit = 3) {
  try {
    const r = await getPublicBlogs({ limit });
    const list = r?.data?.posts || r?.data?.blogs || r?.posts || r?.blogs || (Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []));
    return list.map((b) => {
      const raw = b.thumbnail_image || b.hero_image || b.coverImage || b.cover_image || b.image || b.thumbnail || b.featuredImage || b.featured_image || b.banner || b.bannerImage || '';
      let img = '';
      try { img = raw ? ikTransform(getDirectImageUrl({ image_url: raw }) || raw, 800) : ''; } catch (_) { img = ''; }
      if (!img) { try { img = imgOf(raw); } catch (_) { img = ''; } }
      return {
        title: b.title || b.name || '',
        slug: b.slug || '',
        tag: (b.category?.name || b.category || b.tag || 'Journal'),
        img,
      };
    }).filter((b) => b.title).slice(0, limit);
  } catch (_) { return []; }
}

// Real reviews for one product → list + average + count.
export async function fetchProductReviews(productId, limit = 8) {
  if (!productId) return { items: [], avg: null, count: 0 };
  try {
    const r = await getPublicProductReviews(productId, { limit });
    const list = r?.reviews || r?.data?.reviews || (Array.isArray(r) ? r : []);
    const items = list.map((v) => ({
      // Backend returns the reviewer name as `reviewerName` (= User.username or
      // guestName); fall back through the raw fields before the generic label.
      name: v.reviewerName || v.guestName || v.User?.username || v.name || v.customerName || v.customer_name || v.user?.name || 'Verified buyer',
      rating: Number(v.rating) || 5,
      text: v.comment || v.review || v.message || v.body || '',
      date: v.createdAt || v.created_at || '',
    })).filter((v) => v.text);
    const count = r?.total ?? r?.count ?? r?.data?.total ?? items.length;
    const avg = items.length ? items.reduce((s, x) => s + x.rating, 0) / items.length : null;
    return { items, avg, count };
  } catch (_) { return { items: [], avg: null, count: 0 }; }
}

// Real FAQs attached to one product.
export async function fetchProductFaqs(productId) {
  if (!productId) return [];
  try {
    const { data } = await axios.get(`${API_URL}/api/public/faqs?type=product&id=${encodeURIComponent(productId)}`, addBrandHeader());
    const list = Array.isArray(data?.faqs) ? data.faqs : [];
    return list.map((f) => [f.question || f.q || '', f.answer || f.a || '']).filter((x) => x[0] && x[1]);
  } catch (_) { return []; }
}

// Real homepage sliders/banners → hero. Returns the real banner image (ImageKit,
// width-optimised), title, description and CTA target.
export async function fetchSliders() {
  try {
    const r = await getPublicSliders();
    const list = Array.isArray(r) ? r : (r?.sliders || r?.data?.sliders || r?.data || []);
    return list.map((s) => {
      const raw = s.image || s.imageUrl || s.image_url || '';
      let img = '';
      try { img = ikTransform(getDirectImageUrl({ image_url: raw }) || raw, 1600); } catch (_) { img = raw; }
      const slug = s.categorySlug || s.category_slug || s.category?.slug || '';
      return {
        img,
        title: s.title || '',
        description: s.description || s.subtitle || '',
        cta: s.buttonText || s.button_text || s.cta || '',
        catSlug: slug,
        catName: s.categoryName || s.category_name || s.category?.name || '',
      };
    }).filter((s) => s.img);
  } catch (_) { return []; }
}

// Real product search (live search endpoint) → normalised products for the grid.
export async function fetchSearch(q, params = {}) {
  if (!q || !q.trim()) return [];
  try {
    const r = await searchProducts(q.trim(), { page: 1, limit: 60, ...params });
    const list = r?.data?.products || r?.products || (Array.isArray(r) ? r : []);
    return list.map(normalizeProduct).filter(Boolean);
  } catch (_) { return []; }
}

// Real policy page content (privacy, terms, shipping, cancellation). The live
// endpoint matches by name = lowercased+hyphenated title. Returns { title, html }.
export async function fetchPolicy(slug) {
  if (!slug) return null;
  try {
    const d = await getPublicPolicyByName(slug);
    const p = d?.data || d?.policy || d || null;
    if (!p) return null;
    return { title: p.title || p.name || '', html: p.content || p.body || p.html || '' };
  } catch (_) { return null; }
}

// Real blog post by slug → { title, img, cat, author, date, sections:[{heading,html}] }.
export async function fetchBlog(slug) {
  if (!slug) return null;
  try {
    const r = await getPublicBlogBySlug(slug);
    const post = r?.data || r?.post || r || null;
    if (!post) return null;
    let secs = [];
    if (Array.isArray(post.sections)) secs = post.sections;
    else if (typeof post.sections === 'string') { try { secs = JSON.parse(post.sections); } catch (_) { secs = []; } }
    const raw = post.hero_image || post.coverImage || post.cover_image || post.image || '';
    let img = '';
    try { img = raw ? ikTransform(getDirectImageUrl({ image_url: raw }) || raw, 1600) : ''; } catch (_) { img = ''; }
    return {
      title: post.title || '',
      img,
      cat: post.BlogCategory?.name || post.category?.name || post.category || 'Journal',
      author: post.author_name || post.author || '',
      date: post.published_at || post.publishedAt || post.createdAt || '',
      content: post.content || post.body || '',
      sections: secs.map((s) => ({ heading: s.heading || s.title || '', html: s.content || s.body || s.html || '' })).filter((s) => s.heading || s.html),
    };
  } catch (_) { return null; }
}

// Real order tracking by order number → the live tracking payload (or null).
export async function trackOrder(orderNo) {
  if (!orderNo || !orderNo.trim()) return null;
  try {
    const r = await trackOrderByOrderNumber(orderNo.trim());
    return r?.data || r?.order || r || null;
  } catch (_) { return null; }
}

// Track by AWB / tracking number (live /api/orders/track/awb).
export async function trackByAwb(awb) {
  if (!awb || !awb.trim()) return null;
  try {
    const r = await trackOrderByAWB(awb.trim());
    return r?.data || r?.order || r || null;
  } catch (_) { return null; }
}

// Real pincode serviceability check (live /api/serviceability). Returns a
// friendly { ok, text } for the PDP delivery-details box.
export async function checkPincode(pin) {
  if (!pin || !/^\d{6}$/.test(String(pin))) return { ok: false, text: 'Enter a valid 6-digit pincode.' };
  try {
    const r = await checkPincodeServiceability(pin);
    const d = r?.data || r || {};
    const serviceable = (d.serviceable ?? d.is_serviceable ?? d.available ?? (r?.success !== false)) !== false;
    if (!serviceable) return { ok: false, text: `Sorry, we don't deliver to ${pin} yet.` };
    const eta = d.etd || d.eta || d.estimated_delivery_days || d.delivery_days || d.days || null;
    const place = [d.city, d.state].filter(Boolean).join(', ');
    return { ok: true, text: `Delivers to ${place || pin}${eta ? ` · ~${eta} day${String(eta) === '1' ? '' : 's'}` : ' · ships in 24h'}` };
  } catch (_) { return { ok: false, text: `Sorry, we don't deliver to ${pin} yet.` }; }
}

// Validate a coupon against the live rules (real discount amount).
export async function validateCouponReal(code, cartTotal, paymentMode) {
  const { validateCoupon } = await import('../../services/publicApi');
  const data = await validateCoupon(code, cartTotal, paymentMode || null, null);
  if (data?.success && data?.coupon) return { ok: true, id: data.coupon.id, code: data.coupon.code, amount: parseFloat(data.discountAmount) || 0 };
  return { ok: false, message: data?.message || 'Invalid or expired code' };
}
