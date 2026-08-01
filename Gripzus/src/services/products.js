/* Products — brand-filtered, same endpoints as Knitwink.
   Calls the live backend directly and maps every product to the shape
   the Gripzus ProductCard / detail page expects (images as string URLs,
   greyscale colour swatches, price + compareAtPrice). */

import { getColorHex } from '../utils/colorMap';
import { ikFull } from '../utils/imagekit';

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'gripzus';

function cleanUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    return url.substring(url.lastIndexOf('https://'));
  }
  return url;
}

async function brandFetch(path) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'X-Brand-Name': BRAND_NAME },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return res.json();
}

function safeParse(s) {
  try { return typeof s === 'string' ? JSON.parse(s || '{}') : (s || {}); }
  catch { return {}; }
}
function toArr(v) {
  return Array.isArray(v) ? v : (v == null || v === '' ? [] : [v]);
}

/* Backend badge enum → readable label. Unknown values pass through
   as-is so a custom badge string is shown exactly as set. */
const BADGE = {
  new_arrival:  'New Arrival',
  hot_selling:  'Hot Selling',
  low_stock:    'Low Stock',
  out_of_stock: 'Out of Stock',
};

/* Backend product → Gripzus product shape. */
export function mapProduct(p) {
  if (!p) return null;
  const variations = p.ProductVariations || p.variations || [];
  const rawImages  = p.ProductImages || p.images || [];

  const images = rawImages
    .map((img) => (typeof img === 'string' ? cleanUrl(img) : cleanUrl(img.large || img.image_url || img.medium || img.url || '')))
    .filter(Boolean)
    .map((u) => ikFull(u, 1100)); // full aspect, no square crop

  const firstVar = variations[0];
  const price = Number(firstVar?.price ?? p.price ?? 0);
  const cmpRaw = firstVar?.comparePrice ?? p.comparePrice ?? p.compareAtPrice;
  const compareAtPrice = cmpRaw && Number(cmpRaw) > price ? Number(cmpRaw) : undefined;

  const colors = [];
  const colorSeen = new Set();
  const sizes = [];
  const sizeSeen = new Set();
  let totalStock = 0;

  variations.forEach((v) => {
    totalStock += Number(v.stock || 0);
    const attrs = safeParse(v.attributes);
    // This variation's own images (so the UI can show only the selected
    // variation's photos instead of every image mixed together).
    const vImages = (v.VariationImages || v.variationImages || v.images || [])
      .map((img) => (typeof img === 'string' ? cleanUrl(img) : cleanUrl(img.large || img.image_url || img.medium || img.url || '')))
      .filter(Boolean)
      .map((u) => ikFull(u, 1100)); // full aspect, no square crop
    const colorArr = toArr(attrs.color).map((c) => String(c).trim()).filter(Boolean);
    if (colorArr.length > 1) {
      // Multi-colour pack — keep every colour together as one swatch group
      // so the detail page can show all of them inside a single box.
      const key = colorArr.join(' + ');
      if (!colorSeen.has(key)) {
        colorSeen.add(key);
        colors.push({
          name: key,
          hex: getColorHex(colorArr[0]),
          packColors: colorArr.map((c) => ({ name: c, hex: getColorHex(c) })),
          images: vImages,
        });
      }
    } else {
      colorArr.forEach((c) => {
        if (!colorSeen.has(c)) { colorSeen.add(c); colors.push({ name: c, hex: getColorHex(c), images: vImages }); }
      });
    }
    toArr(attrs.size).forEach((s) => {
      const key = String(s).trim();
      if (key && !sizeSeen.has(key)) { sizeSeen.add(key); sizes.push(key); }
    });
  });

  const inStock = variations.length ? totalStock > 0 : p.badge !== 'out_of_stock';

  return {
    id:            String(p.id),
    name:          p.name || 'Gripzus Pair',
    slug:          p.slug || String(p.id),
    collection:    p.category?.name || p.Category?.name || p.collectionName || 'Gripzus',
    price,
    compareAtPrice,
    images:        images.length ? images : ['/assets/Gripzus.JPG.jpeg'],
    colors,
    sizes,
    badge:         BADGE[p.badge] || p.badge || undefined,
    inStock,
    description:   p.description || '',
    sku:           firstVar?.sku || p.sku || '',
    variations,
  };
}

/* Catalogue list — GET /api/products/catalog (category / search / sort / paging) */
export async function getPublicProducts(params = {}) {
  try {
    const qp = new URLSearchParams();
    if (params.category) qp.append('category', params.category);
    if (params.search)   qp.append('search', params.search);
    if (params.sort)     qp.append('sort', params.sort);
    if (params.page)     qp.append('page', params.page);
    qp.append('limit', params.limit ?? 100);

    const data = await brandFetch(`/api/products/catalog?${qp.toString()}`);
    const products = data?.data?.products || data?.data || data?.products || [];
    return (Array.isArray(products) ? products : []).map(mapProduct).filter(Boolean);
  } catch {
    return [];
  }
}

/* Bestsellers row — GET /api/products/best-sellers, catalogue fallback. */
export async function getBestsellers(limit = 8) {
  try {
    const data = await brandFetch(`/api/products/best-sellers?limit=${limit}`);
    const products = data?.data?.products || data?.data || data?.products || [];
    if (Array.isArray(products) && products.length) {
      return products.map(mapProduct).filter(Boolean);
    }
  } catch { /* fall through */ }
  return getPublicProducts({ limit });
}

/* Products belonging to one collection — uses the category endpoint
   which returns the category with its products embedded. */
export async function getProductsByCategory(name) {
  if (!name) return [];
  try {
    const { getCategoryByName } = await import('./categories');
    const cat = await getCategoryByName(name);
    const raw = cat?.products || cat?.Products || cat?.data?.products || [];
    return (Array.isArray(raw) ? raw : []).map(mapProduct).filter(Boolean);
  } catch {
    return [];
  }
}

/* Product search — GET /api/products/search?q= */
export async function searchProducts(query) {
  const q = (query || '').trim();
  if (!q) return [];
  try {
    const data = await brandFetch(`/api/products/search?q=${encodeURIComponent(q)}&limit=24`);
    const products = data?.data?.products || data?.products || data?.data || [];
    return (Array.isArray(products) ? products : []).map(mapProduct).filter(Boolean);
  } catch {
    return [];
  }
}

/* Single product by slug — GET /api/products/by-slug/:slug */
export async function getProductBySlug(slug) {
  if (!slug) return null;
  try {
    const data = await brandFetch(`/api/products/by-slug/${encodeURIComponent(slug)}`);
    return mapProduct(data?.data || data);
  } catch {
    return null;
  }
}
