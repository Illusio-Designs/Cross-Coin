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
import { bestsellers, categoryChips, categoryBanners, heroFeatures, technologies, clubPerks } from './mockData';

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
  } catch {
    return bestsellers;
  }
}

export async function getSliders() {
  if (USE_MOCK) return []; // hero uses the static mock hero for now
  try {
    const data = await brandFetch('/api/sliders/listing');
    return data?.sliders || [];
  } catch {
    return [];
  }
}

export async function getCategories() {
  if (USE_MOCK) return categoryChips;
  try {
    const data = await brandFetch('/api/categories/listing');
    return Array.isArray(data) ? data : (data?.categories || []);
  } catch {
    return categoryChips;
  }
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
    name: p.name,
    category: p.category?.name || 'Socks',
    price: Number(firstVar.price || p.price || 0),
    oldPrice: firstVar.comparePrice ? Number(firstVar.comparePrice) : undefined,
    rating: Number(p.avg_rating || 0),
    sizes: '',
    badge: p.badge || null,
    image: images[0]?.large || images[0]?.image_url || null,
  };
}
