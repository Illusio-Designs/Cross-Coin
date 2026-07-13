/* Morbix data layer.
 *
 * The Morbix storefront shares the same backend API as the other brands,
 * scoped by the `X-Brand-Name: morbix` header. For now we render frontend
 * MOCK data (USE_MOCK), so the site works before the backend has Morbix
 * products/sliders seeded. When the catalog is ready, set
 * NEXT_PUBLIC_USE_MOCK="false" (or remove it) and these functions fetch live.
 *
 * The brandFetch() below is already wired for that switch — same pattern the
 * Knitwink/Velmique storefronts use (server-cached via next.revalidate).
 */
import {
  products, bestsellers, categoryChips, categoryBanners,
  heroFeatures, technologies, clubPerks, reviews, blogPosts,
} from './mockData';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'morbix';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false';

export async function brandFetch(path, revalidate = 300) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'X-Brand-Name': BRAND },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return res.json();
}

// ---- Public reads (mock now, live later) ----------------------------------

export async function getBestsellers() {
  if (USE_MOCK) return bestsellers;
  try {
    const data = await brandFetch('/api/products/best-sellers?limit=10');
    const list = data?.data?.products || data?.products || [];
    return list.map(mapProduct);
  } catch { return bestsellers; }
}

export async function getAllProducts() {
  if (USE_MOCK) return products;
  try {
    const data = await brandFetch('/api/products/catalog?limit=48');
    const list = data?.data?.products || data?.products || [];
    return list.map(mapProduct);
  } catch { return products; }
}

export async function getProductBySlug(slug) {
  if (USE_MOCK) return products.find((p) => p.slug === slug) || null;
  try {
    const data = await brandFetch(`/api/products/by-slug/${slug}`);
    return mapProduct(data?.data || data);
  } catch { return products.find((p) => p.slug === slug) || null; }
}

export async function getSliders() {
  if (USE_MOCK) return [];
  try {
    const data = await brandFetch('/api/sliders/listing');
    return data?.sliders || [];
  } catch { return []; }
}

export async function getCategories() {
  if (USE_MOCK) return categoryChips;
  try {
    const data = await brandFetch('/api/categories/listing');
    return Array.isArray(data) ? data : (data?.categories || []);
  } catch { return categoryChips; }
}

export async function getProductReviews(/* slug */) {
  // Mock pool for now; wire to /api/products/:id/reviews when USE_MOCK is off.
  return reviews;
}

export async function getBlogPosts() {
  return blogPosts;
}

// Static content — always frontend-defined for now
export const getHeroFeatures = () => heroFeatures;
export const getCategoryBanners = () => categoryBanners;
export const getTechnologies = () => technologies;
export const getClubPerks = () => clubPerks;

// ---- Backend → Morbix product shape (used once USE_MOCK is off) ------------
function mapProduct(p) {
  const variations = p.ProductVariations || p.variations || [];
  const images = p.ProductImages || p.images || [];
  const firstVar = variations[0] || {};
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category?.name || 'Socks',
    categorySlug: p.category?.slug || 'all',
    price: Number(firstVar.price || p.price || 0),
    oldPrice: firstVar.comparePrice ? Number(firstVar.comparePrice) : undefined,
    rating: Number(p.avg_rating || 0),
    reviews: Number(p.review_count || 0),
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['#202c6e', '#2fa39b'],
    badge: p.badge || null,
    description: p.description || '',
    image: images[0]?.large || images[0]?.image_url || null,
    // Spec/detail fields — fall back sensibly if the backend doesn't provide them
    sku: p.sku || `MRB-${String(p.id).padStart(4, '0')}`,
    material: p.material || '78% cotton · 18% polyester · 4% elastane',
    care: p.care || 'Machine wash cold · Tumble dry low',
    fit: p.fit || 'True to size',
    cushioning: p.cushioning || 'Medium',
    origin: p.origin || 'Ethically made',
    features: p.features || [],
  };
}
