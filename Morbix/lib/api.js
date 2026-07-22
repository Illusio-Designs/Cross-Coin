/* Morbix data layer.
 *
 * The Morbix storefront shares the same backend API as the other brands,
 * scoped by the `X-Brand-Name: morbix` header. It fetches LIVE data only —
 * there is no mock/sample fallback. When a request fails or returns nothing,
 * these functions return an empty value ([] / null) and the UI renders a real
 * empty state.
 */
import { heroFeatures, technologies } from './content';

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
    if (Array.isArray(list) && list.length) return list.map(mapProduct);
    // Nothing flagged as a best-seller yet — fall back to the live catalog so
    // the home page still shows real products (same behaviour as Knitwink).
    return getAllProducts();
  } catch { return getAllProducts(); }
}

export async function getAllProducts() {
  try {
    const data = await brandFetch('/api/products/catalog?limit=48');
    const list = data?.data?.products || data?.products || data?.data || [];
    return Array.isArray(list) ? list.map(mapProduct) : [];
  } catch { return []; }
}

export async function getProductBySlug(slug) {
  try {
    const data = await brandFetch(`/api/products/by-slug/${slug}`, 120);
    const p = data?.data || data;
    if (p?.id) return mapProduct(p);
  } catch { /* fall through to id lookup */ }
  // A product with no slug resolves by its numeric id instead.
  if (/^\d+$/.test(String(slug))) {
    try {
      const data = await brandFetch(`/api/products/${slug}`, 120);
      const p = data?.data || data;
      if (p?.id) return mapProduct(p);
    } catch { /* not found */ }
  }
  return null;
}

// Products in a given category (by slug/handle) — used by /collections/[handle].
export async function getProductsByCategory(handle) {
  try {
    const data = await brandFetch(`/api/products/catalog?category=${encodeURIComponent(handle)}&limit=48`);
    const list = data?.data?.products || data?.products || data?.data || [];
    const mapped = Array.isArray(list) ? list.map(mapProduct) : [];
    // Fallback: some backends ignore the category filter — filter client-side.
    const filtered = mapped.filter((p) => p.categorySlug === handle || p.category?.toLowerCase() === handle);
    return filtered.length ? filtered : mapped;
  } catch { return []; }
}

// Lightweight product search — used by /search.
export async function searchProducts(query) {
  const q = String(query || '').trim();
  if (!q) return [];
  try {
    const data = await brandFetch(`/api/products/catalog?search=${encodeURIComponent(q)}&limit=48`);
    const list = data?.data?.products || data?.products || data?.data || [];
    const mapped = Array.isArray(list) ? list.map(mapProduct) : [];
    const lower = q.toLowerCase();
    const filtered = mapped.filter((p) =>
      p.name?.toLowerCase().includes(lower) || p.category?.toLowerCase().includes(lower)
    );
    return filtered.length ? filtered : mapped;
  } catch { return []; }
}

// ---- Sliders --------------------------------------------------------------

export async function getSliders() {
  try {
    const data = await brandFetch('/api/sliders/listing', 300);
    return data?.sliders || data?.data || (Array.isArray(data) ? data : []);
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
// brand-wide public reviews used on the home page.
export async function getProductReviews(productId) {
  try {
    const path = productId ? `/api/reviews/product/${productId}` : '/api/reviews/all';
    const data = await brandFetch(path, 300);
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

export async function getPolicy(name) {
  try {
    const data = await brandFetch(`/api/policies/name/${name}`, 300);
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

function mapProduct(p) {
  const variations = p.ProductVariations || p.variations || [];
  const images = p.ProductImages || p.images || [];
  const firstVar = variations[0] || {};
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category?.name || p.Category?.name || 'Socks',
    categorySlug: p.category?.slug || p.Category?.slug || 'all',
    price: Number(firstVar.price || p.price || 0),
    oldPrice: firstVar.comparePrice ? Number(firstVar.comparePrice) : undefined,
    rating: Number(p.avg_rating || 0),
    reviews: Number(p.review_count || 0),
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['#202c6e', '#2fa39b'],
    badge: p.badge || null,
    description: p.description || '',
    image: images[0]?.large || images[0]?.image_url || images[0]?.url || null,
    sku: p.sku || `MRB-${String(p.id).padStart(4, '0')}`,
    material: p.material || '78% cotton · 18% polyester · 4% elastane',
    care: p.care || 'Machine wash cold · Tumble dry low',
    fit: p.fit || 'True to size',
    cushioning: p.cushioning || 'Medium',
    origin: p.origin || 'Ethically made',
    features: p.features || [],
  };
}

function mapCategoryChip(c) {
  return {
    label: c.name || c.label || '',
    slug: c.slug || String(c.id || ''),
    icon: 'Sparkles',
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
    author: r.name || r.user_name || r.customer_name || r.author || 'Verified Buyer',
    rating: Number(r.rating || 0),
    date: fmtDate(r.createdAt || r.created_at || r.date),
    title: r.title || r.heading || '',
    text: r.comment || r.review || r.text || r.body || '',
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

function mapBlog(p) {
  const sections = parseSections(p.sections);
  const firstContent = sections[0]?.content || p.excerpt || '';
  const plain = String(firstContent).replace(/<[^>]+>/g, '').trim();
  const excerpt = plain ? plain.substring(0, 160) + (plain.length > 160 ? '…' : '') : (p.title || '');
  return {
    slug: p.slug,
    category: p.BlogCategory?.name || p.category?.name || p.category || '',
    date: fmtDate(p.published_at || p.publishedAt || p.created_at || p.createdAt),
    title: p.title,
    excerpt,
    // Full article body: each section's heading + sanitised HTML content.
    sections: sections.map((s) => ({
      heading: s.heading || s.title || '',
      content: basicSanitize(s.content || s.body || ''),
    })),
  };
}
