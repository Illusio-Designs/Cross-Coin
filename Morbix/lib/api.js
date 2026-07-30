/* Morbix data layer.
 *
 * The Morbix storefront shares the same backend API as the other brands,
 * scoped by the `X-Brand-Name: morbix` header. It fetches LIVE data only —
 * there is no mock/sample fallback. When a request fails or returns nothing,
 * these functions return an empty value ([] / null) and the UI renders a real
 * empty state.
 */
import { heroFeatures, technologies } from './content';
import { getColorHex } from './colorMap';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'morbix';

// Same pattern as Knitwink: only opt into Next's data cache when a numeric
// `revalidate` is passed (ISR). Calls without it are fetched fresh (dynamic) so
// newly-added products show immediately instead of serving a stale/empty cache.
// A cached (ISR) request must NOT carry an abort signal, or Next won't cache it.
export async function brandFetch(path, revalidate) {
  const cached = typeof revalidate === 'number';
  const controller = cached ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), 6000) : null;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'X-Brand-Name': BRAND },
      ...(controller ? { signal: controller.signal } : {}),
      ...(cached ? { next: { revalidate } } : { cache: 'no-store' }),
    });
    if (!res.ok) throw new Error(`Failed to fetch ${path}`);
    return res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ---- Products -------------------------------------------------------------

export async function getBestsellers() {
  try {
    const data = await brandFetch('/api/products/best-sellers?limit=10', 300);
    const list = data?.data?.products || data?.products || data?.data || [];
    if (Array.isArray(list) && list.length) return explodeColorVariants(list.map(mapProduct).filter(Boolean));
    // Nothing flagged as a best-seller yet — fall back to the live catalog so
    // the home page still shows real products (same behaviour as Knitwink).
    return getAllProducts();
  } catch { return getAllProducts(); }
}

export async function getAllProducts() {
  try {
    const data = await brandFetch('/api/products/catalog?limit=48');
    const list = data?.data?.products || data?.products || data?.data || [];
    return explodeColorVariants(Array.isArray(list) ? list.map(mapProduct).filter(Boolean) : []);
  } catch { return []; }
}

export async function getProductBySlug(slug) {
  // Fetched fresh (no revalidate → cache: 'no-store') so a newly-added or
  // just-edited product is never hidden behind a stale server cache.
  try {
    const data = await brandFetch(`/api/products/by-slug/${slug}`);
    const p = data?.data || data;
    if (p?.id) return mapProduct(p);
  } catch { /* fall through to id lookup */ }
  // A product with no slug resolves by its numeric id instead.
  if (/^\d+$/.test(String(slug))) {
    try {
      const data = await brandFetch(`/api/products/${slug}`);
      const p = data?.data || data;
      if (p?.id) return mapProduct(p);
    } catch { /* not found */ }
  }
  return null;
}

// A single collection/category WITH its products embedded — the SAME endpoint
// Knitwink / Crosscoin / Velmique use for collection-detail pages.
// GET /api/categories/by-name/:name -> { id, name, slug, image, products: [...] }
export async function getCategoryByName(handle) {
  if (!handle) return null;
  // Fetched fresh so collection product lists reflect the live catalog.
  try {
    const data = await brandFetch(`/api/categories/by-name/${encodeURIComponent(handle)}`);
    const cat = data?.data || data;
    if (cat && (cat.id || cat.products || cat.name)) return cat;
  } catch { /* fall through to by-slug */ }
  try {
    const data = await brandFetch(`/api/categories/by-slug/${encodeURIComponent(handle)}`);
    return data?.data || data || null;
  } catch { return null; }
}

// Products in a given collection (by slug/name) — used by /collections/[handle].
// Uses the SAME full catalog data as the main /products listing so the cards
// are identical (price, colours, image). Falls back to the category-embedded
// products only if the catalog filter finds nothing.
export async function getProductsByCategory(handle) {
  if (!handle) return [];
  const h = String(handle).trim().toLowerCase();
  const slugify = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, '-');
  const all = await getAllProducts();
  const filtered = all.filter((p) =>
    String(p.categorySlug).toLowerCase() === h ||
    slugify(p.category) === h ||
    String(p.category).toLowerCase() === h
  );
  if (filtered.length) return filtered;
  // Fallback: products embedded in the category record.
  const cat = await getCategoryByName(handle);
  const list = cat?.products || cat?.data?.products || [];
  return explodeColorVariants(Array.isArray(list) ? list.map(mapProduct).filter(Boolean) : []);
}

// Lightweight product search — used by /search.
export async function searchProducts(query) {
  const q = String(query || '').trim();
  if (!q) return [];
  try {
    const data = await brandFetch(`/api/products/catalog?search=${encodeURIComponent(q)}&limit=48`);
    const list = data?.data?.products || data?.products || data?.data || [];
    const mapped = Array.isArray(list) ? list.map(mapProduct).filter(Boolean) : [];
    const lower = q.toLowerCase();
    const filtered = mapped.filter((p) =>
      p.name?.toLowerCase().includes(lower) || p.category?.toLowerCase().includes(lower)
    );
    return explodeColorVariants(filtered.length ? filtered : mapped);
  } catch { return []; }
}

// ---- Sliders --------------------------------------------------------------

export async function getSliders() {
  try {
    const data = await brandFetch('/api/sliders/listing', 300);
    const list = data?.sliders || data?.data || (Array.isArray(data) ? data : []);
    return (Array.isArray(list) ? list : [])
      .map((s) => ({
        image: imgUrl(s.image || s.image_url || s.desktop_image || s.banner || s.large || ''),
        mobileImage: imgUrl(s.mobile_image || s.image_mobile || s.mobile || ''),
        title: str(s.title || s.heading || ''),
        description: str(s.description || s.subtitle || s.subheading || s.text || ''),
        buttonText: str(s.buttonText || s.button_text || s.cta || s.button || ''),
        categorySlug: str(s.categorySlug || s.category_slug || s.category?.slug || ''),
        categoryName: str(s.categoryName || s.category_name || s.category?.name || ''),
        link: s.link || s.url || s.redirect_url || s.href || '',
      }))
      .filter((s) => s.image);
  } catch { return []; }
}

// ---- Categories -----------------------------------------------------------

export async function getCategories() {
  try {
    const data = await brandFetch('/api/categories/listing', 300);
    const list = Array.isArray(data) ? data : (data?.data || data?.categories || []);
    return Array.isArray(list) ? list.map(mapCategoryChip) : [];
  } catch { return []; }
}

// ---- Reviews --------------------------------------------------------------

// Pass a product id for that product's reviews; call with no id for the
// brand-wide public reviews used on the home page. A product's reviews are
// fetched FRESH (no cache) so a newly-approved review shows up immediately;
// the home feed stays cached (300s) so the home page can remain static.
export async function getProductReviews(productId, revalidate) {
  try {
    const path = productId ? `/api/reviews/product/${productId}` : '/api/reviews/all';
    const rev = revalidate ?? (productId ? undefined : 300);
    const data = await brandFetch(path, rev);
    const list = data?.data?.reviews || data?.reviews || data?.data || (Array.isArray(data) ? data : []);
    return Array.isArray(list) ? list.map(mapReview) : [];
  } catch { return []; }
}

// ---- Blog -----------------------------------------------------------------

export async function getBlogPosts() {
  try {
    const data = await brandFetch('/api/blogs/listing', 300);
    const list = data?.data?.posts || data?.posts || data?.data || (Array.isArray(data) ? data : []);
    return Array.isArray(list) ? list.map(mapBlog) : [];
  } catch { return []; }
}

export async function getBlogBySlug(slug) {
  try {
    const data = await brandFetch(`/api/blogs/by-slug/${slug}`, 300);
    const post = data?.data || data;
    return post?.slug ? mapBlog(post) : null;
  } catch { return null; }
}

// ---- Policies (privacy / terms / shipping / returns) ----------------------

// Policies are SHARED across all brands — they are NOT brand-scoped. So this
// fetch deliberately omits the X-Brand-Name header (matching how the other
// storefronts read shared policy content).
// Map short/legacy slugs to the real backend policy names (the endpoint
// matches by title, so "returns" must become "cancellation-and-refund").
const POLICY_ALIAS = {
  privacy: 'privacy-policy',
  terms: 'terms-and-conditions',
  shipping: 'shipping-policy',
  returns: 'cancellation-and-refund',
  refund: 'cancellation-and-refund',
};

export async function getPolicy(name) {
  const resolved = POLICY_ALIAS[name] || name;
  try {
    const res = await fetch(`${API_URL}/api/policies/name/${encodeURIComponent(resolved)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`Failed to fetch policy ${name}`);
    const data = await res.json();
    return data?.data || data || null;
  } catch { return null; }
}

// ---- Client-side commerce APIs (re-exported) ------------------------------
// The purchase/account flows (cart, checkout, payments, orders, addresses,
// wishlist, auth, reviews submit, contact) live in lib/api/* client modules
// so they can attach the logged-in user's bearer token. They are re-exported
// here so `@/lib/api` keeps working, and `@/lib/api/cart` etc. also resolve.
export * from './api/auth';
export * from './api/cart';
export * from './api/addresses';
export * from './api/orders';
export * from './api/wishlist';
export { submitReview } from './api/reviews';
export { sendMessage } from './api/contact';

// ---- Static, presentational site content ----------------------------------
export const getHeroFeatures = () => heroFeatures;
export const getTechnologies = () => technologies;

// ---- Backend → Morbix shape mappers ---------------------------------------

// Parse a variation's attributes (backend stores them as a JSON string or object).
function parseAttrs(v) {
  const a = v && v.attributes;
  if (!a) return {};
  if (typeof a === 'string') { try { return JSON.parse(a); } catch { return {}; } }
  return a;
}

// Some backend image URLs are accidentally doubled (…https://…https://…);
// keep only the last real URL. Same guard the other brands use.
function cleanUrl(url) {
  const u = String(url || '');
  if (u.indexOf('https://') !== u.lastIndexOf('https://')) return u.substring(u.lastIndexOf('https://'));
  return u;
}

// Drop an ImageKit resize transform (…?tr=w-900,h-900,q-82,f-auto) so the FULL
// original image is served instead of a square-cropped 900×900 version. Used for
// blog hero images, where the whole picture should show.
function fullImage(url) {
  return String(url || '').split(/[?&]tr=/)[0];
}

// Pull a usable URL string out of a backend image (string or object shape).
// Backends differ on the field name, so check every common one.
function imgUrl(img) {
  if (!img) return '';
  if (typeof img === 'string') return cleanUrl(img);
  return cleanUrl(
    img.large || img.image_url || img.medium || img.url || img.src ||
    img.path || img.image || img.thumbnail || img.small || ''
  );
}

// Collect the distinct real values of an attribute (e.g. size, color, material)
// across all of a product's variations.
function collectAttr(variations, key) {
  const out = [];
  const seen = new Set();
  variations.forEach((v) => {
    const val = parseAttrs(v)[key];
    const arr = Array.isArray(val) ? val : (val != null && val !== '' ? [val] : []);
    arr.forEach((x) => {
      const s = String(x).trim();
      const k = s.toLowerCase();
      if (s && !seen.has(k)) { seen.add(k); out.push(s); }
    });
  });
  return out;
}

// Coerce any backend value to a plain string safe to render as a React child.
// Objects/arrays (e.g. a rich-text description object, a localized-name object)
// must NEVER reach JSX directly — that throws "Objects are not valid as a React
// child" and 500s the server render. This is the guard that prevents that.
function str(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  // Common shapes the backend may use for rich/localized text.
  if (typeof v === 'object') {
    return str(v.value ?? v.text ?? v.name ?? v.title ?? v.label ?? v.en ?? '');
  }
  return '';
}

// Coerce to a finite number (never NaN — NaN.toFixed renders "NaN").
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Normalise a product's `features` into a strict [{ icon: string, text: string }]
// shape. The backend may send strings, or objects with varied keys — anything
// non-string as `text` would crash the PDP list.
function normalizeFeatures(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => {
      if (typeof f === 'string') return { icon: 'Sparkles', text: f };
      if (f && typeof f === 'object') {
        const text = str(f.text ?? f.title ?? f.label ?? f.name ?? f.value);
        const icon = typeof f.icon === 'string' ? f.icon : 'Sparkles';
        return { icon, text };
      }
      return { icon: 'Sparkles', text: str(f) };
    })
    .filter((f) => f.text);
}

// Backend product -> Morbix shape. REAL DATA ONLY: sizes/colors/material come
// from the actual variation attributes, sku from the variation/product; fields
// the backend doesn't provide are left empty (the PDP spec table hides empty
// rows) — no fabricated/placeholder values. Every rendered field is coerced to
// a primitive so a surprising backend shape can never 500 the page.
// Backend badge keys → display labels (mirrors the backend BADGE_DISPLAY config
// used by the other brands).
const BADGE_LABELS = {
  new_arrival: 'New Arrival',
  hot_selling: 'Hot Selling',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
};

function mapProduct(p) {
  if (!p || typeof p !== 'object') return null;
  const variations = Array.isArray(p.ProductVariations) ? p.ProductVariations
    : Array.isArray(p.variations) ? p.variations : [];
  const images = Array.isArray(p.ProductImages) ? p.ProductImages
    : Array.isArray(p.images) ? p.images : [];
  const firstVar = variations[0] || {};
  const sizes = collectAttr(variations, 'size');
  const colorNames = collectAttr(variations, 'color');
  const materials = collectAttr(variations, 'material');

  // Gather images from the product level AND from each variation — some backends
  // attach photos per-variation rather than (or as well as) at the top level.
  // Keep first-seen order and de-dupe by URL.
  const allUrls = [];
  const seenUrl = new Set();
  const pushUrl = (raw) => { const u = imgUrl(raw); if (u && !seenUrl.has(u)) { seenUrl.add(u); allUrls.push(u); } };

  // variation id -> its (lowercased) colour name.
  const varIdToColor = {};
  variations.forEach((v) => {
    const c = parseAttrs(v).color;
    const first = Array.isArray(c) ? c[0] : c;
    if (first != null && first !== '') varIdToColor[v.id] = String(first).trim().toLowerCase();
  });

  // colour name -> that colour's image URLs.
  const urlsByColor = {};
  const addColorUrl = (color, raw) => { const u = imgUrl(raw); if (color && u) (urlsByColor[color] ||= []).push(u); };

  // Product-level images (linked to a colour by product_variation_id when set).
  images.forEach((img) => {
    pushUrl(img);
    if (img && typeof img === 'object' && img.product_variation_id != null) {
      addColorUrl(varIdToColor[img.product_variation_id], img);
    }
  });
  // Variation-level images (belong to that coloured variation directly).
  variations.forEach((v) => {
    const vImgs = Array.isArray(v.ProductImages) ? v.ProductImages
      : Array.isArray(v.images) ? v.images : [];
    const color = varIdToColor[v.id];
    vImgs.forEach((img) => { pushUrl(img); addColorUrl(color, img); });
  });

  const image = allUrls[0] || null;

  // Parallel to `colors`: colorImages[i] = that colour's own photos (de-duped),
  // falling back to every image when the backend didn't link any to that colour.
  const colorImages = colorNames.map((cn) => {
    const arr = urlsByColor[String(cn).trim().toLowerCase()];
    const uniq = arr ? [...new Set(arr)] : [];
    return uniq.length ? uniq : allUrls;
  });

  // Full per-variation data so the PDP can reflect the EXACT selected combo
  // (price / SKU / stock) and add that precise variation to the cart.
  const variants = variations.map((v) => {
    const a = parseAttrs(v);
    const cV = Array.isArray(a.color) ? a.color[0] : a.color;
    const sV = Array.isArray(a.size) ? a.size[0] : a.size;
    const mV = Array.isArray(a.material) ? a.material[0] : a.material;
    return {
      id: v.id,
      color: str(cV),
      size: str(sV),
      material: str(mV),
      sku: str(v.sku || p.sku),
      price: num(v.price ?? p.price ?? 0),
      oldPrice: v.comparePrice ? num(v.comparePrice) : undefined,
      stock: num(v.stock),
    };
  });

  return {
    id: p.id,
    slug: str(p.slug),
    name: str(p.name),
    category: str(p.category?.name || p.Category?.name || p.category),
    categorySlug: str(p.category?.slug || p.Category?.slug || ''),
    price: num(firstVar.price || p.price || 0),
    oldPrice: firstVar.comparePrice ? num(firstVar.comparePrice) : undefined,
    rating: num(p.avg_rating),
    reviews: num(p.review_count),
    sizes: Array.isArray(sizes) ? sizes.map(str).filter(Boolean) : [],
    colors: Array.isArray(colorNames) ? colorNames.map((c) => getColorHex(str(c))) : [],
    colorNames: Array.isArray(colorNames) ? colorNames.map(str) : [],
    variants,
    // Badge straight from the backend badge field (labels mirror the backend
    // BADGE_DISPLAY config, same as the other brands). `badge` = display label,
    // `badgeKey` = raw key for styling.
    badgeKey: typeof p.badge === 'string' ? p.badge : null,
    badge: (typeof p.badge === 'string' && BADGE_LABELS[p.badge]) || null,
    description: str(p.description),
    image: typeof image === 'string' ? image : null,
    images: allUrls,
    colorImages,
    sku: str(firstVar.sku || p.sku),
    material: str(materials.join(', ') || p.material),
    care: str(p.care),
    fit: str(p.fit),
    cushioning: str(p.cushioning),
    origin: str(p.origin),
    features: normalizeFeatures(p.features),
  };
}

// Show EVERY colour as its own product card: explode a product that has more
// than one colour variation into one card per colour — each with that colour's
// own image, price and size set, and a name suffixed with the colour. Cards
// link to the product page with ?color= preselected. Single-colour products
// pass through unchanged.
export function explodeColorVariants(products) {
  if (!Array.isArray(products)) return [];
  const out = [];
  for (const p of products) {
    const names = (Array.isArray(p.colorNames) ? p.colorNames : []).map((c) => str(c).trim()).filter(Boolean);
    if (names.length <= 1) { out.push(p); continue; }
    const colorImages = Array.isArray(p.colorImages) ? p.colorImages : [];
    const variants = Array.isArray(p.variants) ? p.variants : [];
    names.forEach((cn, i) => {
      const imgs = colorImages[i];
      const image = (Array.isArray(imgs) && imgs[0]) || p.image;
      const cvars = variants.filter((v) => str(v.color).trim().toLowerCase() === cn.toLowerCase());
      const csizes = [...new Set(cvars.map((v) => v.size).filter(Boolean))];
      const prices = cvars.map((v) => num(v.price)).filter((n) => n > 0);
      const price = prices.length ? Math.min(...prices) : num(p.price);
      const cheap = cvars.find((v) => num(v.price) === price) || cvars[0] || null;
      const oldPrice = cheap && cheap.oldPrice != null ? num(cheap.oldPrice) : p.oldPrice;
      out.push({
        ...p,
        uid: `${p.id}:${i}`,
        name: `${p.name} — ${cn}`,
        colorNames: [cn],
        colors: [getColorHex(cn)],
        colorImages: [Array.isArray(imgs) ? imgs : []],
        image,
        images: (Array.isArray(imgs) && imgs.length) ? imgs : p.images,
        price,
        oldPrice: oldPrice || undefined,
        sizes: csizes.length ? csizes : p.sizes,
        variants: cvars.length ? cvars : p.variants,
        colorParam: cn,
      });
    });
  }
  return out;
}

function mapCategoryChip(c) {
  const count = Array.isArray(c.products) ? c.products.length
    : num(c.product_count ?? c.products_count ?? c.count);
  return {
    label: c.name || c.label || '',
    slug: c.slug || String(c.id || ''),
    icon: 'Sparkles',
    image: imgUrl(c.image || c.image_url || c.banner || c.thumbnail || ''),
    count,
  };
}

function fmtDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  } catch { return ''; }
}

function mapReview(r) {
  return {
    author: r.reviewerName || r.guestName || r.name || r.user_name || r.customer_name || r.author || 'Verified Buyer',
    rating: Number(r.rating || 0),
    date: fmtDate(r.createdAt || r.created_at || r.date),
    title: r.title || r.heading || '',
    text: r.review || r.comment || r.text || r.body || '',
  };
}

function parseSections(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

// Strip <script>/<style> and inline event handlers from backend HTML before
// it is rendered. Not a full sanitiser, but removes the dangerous vectors.
function basicSanitize(html) {
  return String(html || '')
    .replace(/<\/?(script|style)[^>]*>/gi, '')
    .replace(/ on\w+="[^"]*"/gi, '')
    .replace(/ on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

// Pull the first <img src> out of the section HTML as a last-resort cover.
function firstSectionImage(sections) {
  for (const s of sections) {
    const m = String(s?.content || s?.body || '').match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m) return cleanUrl(m[1]);
  }
  return '';
}

function mapBlog(p) {
  const sections = parseSections(p.sections);
  const firstContent = sections[0]?.content || p.excerpt || '';
  const plain = String(firstContent).replace(/<[^>]+>/g, '').trim();
  const excerpt = plain ? plain.substring(0, 160) + (plain.length > 160 ? '…' : '') : (p.title || '');
  // Cover image: backend stores it as `hero_image` (same as the other brands);
  // fall back to other common fields, then to the first image in the body.
  const image = fullImage(imgUrl(p.hero_image || p.image || p.image_url || p.featured_image
    || p.cover_image || p.thumbnail || p.banner || '') || firstSectionImage(sections));
  return {
    slug: p.slug,
    category: p.BlogCategory?.name || p.category?.name || p.category || '',
    date: fmtDate(p.published_at || p.publishedAt || p.created_at || p.createdAt),
    title: p.title,
    excerpt,
    image,
    // Full article body: each section's heading + sanitised HTML content.
    sections: sections.map((s) => ({
      heading: s.heading || s.title || '',
      content: basicSanitize(s.content || s.body || ''),
    })),
  };
}
