/* Morbix data layer.
 *
 * The Morbix storefront shares the same backend API as the other brands,
 * scoped by the `X-Brand-Name: morbix` header. It now fetches LIVE data by
 * default (same as the Knitwink/Velmique storefronts). The bundled mock data
 * is only used as a fallback if a request errors, or if you explicitly set
 * NEXT_PUBLIC_USE_MOCK="true" (e.g. for local design work before the catalog
 * is seeded).
 */
import {
  products, bestsellers, categoryChips, categoryBanners,
  heroFeatures, technologies, clubPerks, reviews as mockReviews, blogPosts as mockBlogPosts,
} from './mockData';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'morbix';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export async function brandFetch(path, revalidate = 300) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'X-Brand-Name': BRAND },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return res.json();
}

// ---- Products -------------------------------------------------------------

export async function getBestsellers() {
  if (USE_MOCK) return bestsellers;
  try {
    const data = await brandFetch('/api/products/best-sellers?limit=10');
    const list = data?.data?.products || data?.products || data?.data || [];
    return Array.isArray(list) ? list.map(mapProduct) : bestsellers;
  } catch { return bestsellers; }
}

export async function getAllProducts() {
  if (USE_MOCK) return products;
  try {
    const data = await brandFetch('/api/products/catalog?limit=48');
    const list = data?.data?.products || data?.products || data?.data || [];
    return Array.isArray(list) ? list.map(mapProduct) : products;
  } catch { return products; }
}

export async function getProductBySlug(slug) {
  if (USE_MOCK) return products.find((p) => p.slug === slug) || null;
  try {
    const data = await brandFetch(`/api/products/by-slug/${slug}`);
    const p = data?.data || data;
    return p?.id ? mapProduct(p) : null;
  } catch { return products.find((p) => p.slug === slug) || null; }
}

// ---- Sliders --------------------------------------------------------------

export async function getSliders() {
  if (USE_MOCK) return [];
  try {
    const data = await brandFetch('/api/sliders/listing');
    return data?.sliders || data?.data || (Array.isArray(data) ? data : []);
  } catch { return []; }
}

// ---- Categories -----------------------------------------------------------

export async function getCategories() {
  if (USE_MOCK) return categoryChips;
  try {
    const data = await brandFetch('/api/categories/listing');
    const list = Array.isArray(data) ? data : (data?.data || data?.categories || []);
    return Array.isArray(list) && list.length ? list.map(mapCategoryChip) : categoryChips;
  } catch { return categoryChips; }
}

// ---- Reviews --------------------------------------------------------------

// Pass a product id for that product's reviews; call with no id for the
// brand-wide public reviews used on the home page.
export async function getProductReviews(productId) {
  if (USE_MOCK) return mockReviews;
  try {
    const path = productId ? `/api/reviews/product/${productId}` : '/api/reviews/all';
    const data = await brandFetch(path);
    const list = data?.data?.reviews || data?.reviews || data?.data || (Array.isArray(data) ? data : []);
    return Array.isArray(list) && list.length ? list.map(mapReview) : mockReviews;
  } catch { return mockReviews; }
}

// ---- Blog -----------------------------------------------------------------

export async function getBlogPosts() {
  if (USE_MOCK) return mockBlogPosts;
  try {
    const data = await brandFetch('/api/blogs/listing');
    const list = data?.data?.posts || data?.posts || data?.data || (Array.isArray(data) ? data : []);
    return Array.isArray(list) && list.length ? list.map(mapBlog) : mockBlogPosts;
  } catch { return mockBlogPosts; }
}

export async function getBlogBySlug(slug) {
  if (USE_MOCK) return mockBlogPosts.find((b) => b.slug === slug) || null;
  try {
    const data = await brandFetch(`/api/blogs/by-slug/${slug}`);
    const post = data?.data || data;
    return post?.slug ? mapBlog(post) : null;
  } catch { return mockBlogPosts.find((b) => b.slug === slug) || null; }
}

// ---- Policies (privacy / terms / shipping / returns) ----------------------

export async function getPolicy(name) {
  try {
    const data = await brandFetch(`/api/policies/name/${name}`);
    return data?.data || data || null;
  } catch { return null; }
}

// ---- Static, frontend-defined content -------------------------------------
export const getHeroFeatures = () => heroFeatures;
export const getCategoryBanners = () => categoryBanners;
export const getTechnologies = () => technologies;
export const getClubPerks = () => clubPerks;

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
  };
}
