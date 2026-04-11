
import { getColorHex } from '@/lib/colorMap';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'knitwink';

function cleanUrl(url) {
  if (!url) return '';
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

// Map backend product to Knitwink Product type
function mapProduct(p) {
  const variations = p.ProductVariations || p.variations || [];
  const images = p.ProductImages || p.images || [];

  // Get price from first variation
  const firstVar = variations[0];
  const price = Number(firstVar?.price || p.price || 0);
  const compareAtPrice = firstVar?.comparePrice ? Number(firstVar.comparePrice) : undefined;

  // Map images — backend uses image_url field, prefer large for quality
  const productImages = images.map((img) => ({
    url: cleanUrl(img.large || img.image_url || img.medium || img.url || '') || '',
    alt: img.alt_text || p.name,
    variationId: img.product_variation_id ?? null
  }));

  // Extract colors from variation attributes, track variation id per color
  const colors = [];
  const seen = new Set();
  const varIdToColor = {};
  variations.forEach((v) => {
    const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes || '{}') : v.attributes || {};
    const colorArr = Array.isArray(attrs.color) ? attrs.color : attrs.color ? [attrs.color] : [];
    // For multi-color packs, store all colors together as a group
    if (colorArr.length > 1) {
      const key = colorArr.join(' + ')
      varIdToColor[v.id] = key
      if (!seen.has(key)) {
        seen.add(key)
        colors.push({
          name: key,
          hex: getColorHex(colorArr[0]),
          imageIndex: 0,
          packColors: colorArr.map((c) => ({ name: c, hex: getColorHex(c) })),
        })
      }
    } else {
      colorArr.forEach((c) => {
        varIdToColor[v.id] = c;
        if (!seen.has(c)) {
          seen.add(c);
          colors.push({ name: c, hex: getColorHex(c), imageIndex: 0 });
        }
      });
    }
  });

  // Group images by color name using variationId linkage
  const colorImages = {};
  const unlinkedImages = [];
  productImages.forEach((img) => {
    const colorName = img.variationId != null ? varIdToColor[img.variationId] : undefined;
    if (colorName) {
      if (!colorImages[colorName]) colorImages[colorName] = [];
      colorImages[colorName].push({ url: img.url, alt: img.alt });
    } else {
      unlinkedImages.push({ url: img.url, alt: img.alt });
    }
  });

  // For colors with no linked images, fall back to unlinked images
  colors.forEach((c) => {
    if (!colorImages[c.name] || colorImages[c.name].length === 0) {
      colorImages[c.name] = unlinkedImages;
    }
  });

  // Badge from product badge field
  const badgeMap = {
    new_arrival: 'New',
    hot_selling: 'Bestseller',
    low_stock: 'Sale'
  };

  return {
    id: String(p.id),
    handle: p.slug || String(p.id),
    name: p.name,
    sku: variations[0]?.sku || p.sku || undefined,
    collectionName: p.category?.name || p.Category?.name || '',
    price,
    compareAtPrice,
    images: productImages.length > 0 ? productImages.map((i) => ({ url: i.url, alt: i.alt })) : [{ url: '', alt: p.name }],
    colorImages: Object.keys(colorImages).length > 0 ? colorImages : undefined,
    variants: variations.map((v) => ({
      id: String(v.id),
      size: '',
      color: '',
      stock: Number(v.stock || 0),
      sku: v.sku || ''
    })),
    colors: colors.length > 0 ? colors : [{ name: '', hex: '#d1d5db', imageIndex: 0 }],
    features: [],
    description: p.description || '',
    carbonFootprint: 0,
    badge: badgeMap[p.badge],
    materials: []
  };
}

export async function getPublicProducts(limit = 20) {
  try {
    const data = await brandFetch(
      `/api/products/catalog?limit=${limit}`,
      60
    );
    const products = data?.data?.products || data?.data || data?.products || [];
    return Array.isArray(products) ? products.map(mapProduct) : [];
  } catch {
    return [];
  }
}

export async function getBestsellers() {
  try {
    const data = await brandFetch(`/api/products/best-sellers?limit=10`, 60);
    const products = data?.data?.products || data?.data || data?.products || [];
    if (!Array.isArray(products) || products.length === 0) return getPublicProducts(10);
    return products.map(mapProduct);
  } catch {
    return getPublicProducts(10);
  }
}

export async function getFeaturedCollections() {
  return [];
}

export const getProduct = async (handle) => {
  const data = await brandFetch(`/api/products/by-slug/${handle}`, 120);
  return mapProduct(data?.data || data);
};

export const getProducts = async () => getPublicProducts();

export const getCollection = async (_handle) => ({});

export const getMaterials = async () => [];

export const searchProducts = async (query) => {
  try {
    const data = await brandFetch(`/api/products/search?q=${encodeURIComponent(query)}&limit=20`, 0);
    const products = data?.data || data?.products || [];
    return Array.isArray(products) ? products.map(mapProduct) : [];
  } catch {
    return [];
  }
};

export const getQuizRecommendations = async (_answers) => [];