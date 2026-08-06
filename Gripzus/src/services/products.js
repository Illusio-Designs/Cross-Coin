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

  const urlOf = (img) => ikFull(
    typeof img === 'string' ? cleanUrl(img) : cleanUrl(img.large || img.image_url || img.medium || img.url || ''),
    1100,
  );

  // Full gallery (every image) — general display fallback.
  const images = rawImages.map(urlOf).filter(Boolean);

  // Group images by the variation (colour) they belong to, and collect the
  // "general" images that aren't tied to any variation. This lets each colour
  // show ONLY its own photos instead of the whole mixed-colour gallery.
  const imagesByVar = {};
  const generalImages = [];
  rawImages.forEach((img) => {
    const u = urlOf(img);
    if (!u) return;
    const vid = (typeof img === 'object' && img) ? img.product_variation_id : null;
    if (vid != null) (imagesByVar[vid] = imagesByVar[vid] || []).push(u);
    else generalImages.push(u);
  });

  const firstVar = variations[0];
  const price = Number(firstVar?.price ?? p.price ?? 0);
  const cmpRaw = firstVar?.comparePrice ?? p.comparePrice ?? p.compareAtPrice;
  const compareAtPrice = cmpRaw && Number(cmpRaw) > price ? Number(cmpRaw) : undefined;

  // A colour usually spans several size-variations (Baby Pink / S, M, L …),
  // and photos may be tagged to any of them. Aggregate a colour's images across
  // ALL variations that share it, so selecting Baby Pink shows every Baby Pink
  // photo — not just the first variation's.
  const colorMap = new Map(); // key → { name, hex, packColors?, varIds:Set, imgs:[] }
  const sizes = [];
  const sizeSeen = new Set();
  let totalStock = 0;

  variations.forEach((v) => {
    totalStock += Number(v.stock || 0);
    const attrs = safeParse(v.attributes);
    const vImages = (v.VariationImages || v.variationImages || v.images || [])
      .map(urlOf)
      .filter(Boolean);
    const colorArr = toArr(attrs.color).map((c) => String(c).trim()).filter(Boolean);

    toArr(attrs.size).forEach((s) => {
      const key = String(s).trim();
      if (key && !sizeSeen.has(key)) { sizeSeen.add(key); sizes.push(key); }
    });

    if (!colorArr.length) return;
    const isPack = colorArr.length > 1; // multi-colour pack → one swatch group
    const key = isPack ? colorArr.join(' + ') : colorArr[0];
    if (!colorMap.has(key)) {
      colorMap.set(key, {
        name: key,
        hex: getColorHex(colorArr[0]),
        packColors: isPack ? colorArr.map((c) => ({ name: c, hex: getColorHex(c) })) : undefined,
        varIds: new Set(),
        imgs: [],
      });
    }
    const entry = colorMap.get(key);
    entry.varIds.add(v.id);
    entry.imgs.push(...vImages);
  });

  // Resolve each colour's full image set: every image tagged to any of its
  // variations ∪ its VariationImages; falls back to shared images (never other
  // colours') then the primary image.
  const colors = [...colorMap.values()].map((e) => {
    const tagged = [...e.varIds].flatMap((id) => imagesByVar[id] || []);
    let own = [...new Set([...tagged, ...e.imgs])];
    if (!own.length) own = generalImages.length ? generalImages : images.slice(0, 1);
    return { name: e.name, hex: e.hex, ...(e.packColors ? { packColors: e.packColors } : {}), images: own };
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
    // Total real stock across variations (null when unknown) — powers the
    // honest low-stock indicator on the product page.
    stock:         variations.length ? totalStock : null,
    description:   p.description || '',
    sku:           firstVar?.sku || p.sku || '',
    variations,
  };
}

/* Resolve the exact variation id for a selected colour (+ size) from a mapped
   product's raw `variations`. Passing this to the cart is what makes the cart
   store the CHOSEN colour — the other brands already send a variationId; Gripzus
   was sending none, so the backend defaulted every add to the first variation. */
export function resolveVariationId(product, colorName, sizeName) {
  const vars = product?.variations || [];
  if (!vars.length) return null;
  const norm = (s) => String(s || '').trim().toLowerCase();
  const wc = norm(colorName), ws = norm(sizeName);
  const attrsOf = (v) => { try { return typeof v.attributes === 'string' ? JSON.parse(v.attributes) : (v.attributes || {}); } catch { return {}; } };
  const colorsOf = (a) => (Array.isArray(a.color) ? a.color : (a.color ? [a.color] : []));
  const sizesOf  = (a) => (Array.isArray(a.size)  ? a.size  : (a.size  ? [a.size]  : []));
  const match = vars.find((v) => {
    const a = attrsOf(v);
    return (!wc || colorsOf(a).some((c) => norm(c) === wc)) && (!ws || !sizesOf(a).length || sizesOf(a).some((s) => norm(s) === ws));
  }) || vars.find((v) => colorsOf(attrsOf(v)).some((c) => norm(c) === wc));
  return match?.id ?? null;
}

/* Show EVERY colour as its own product card — explode a product that has more
   than one colour into one card per colour, each with that colour's own photos,
   a single colour swatch, and a ?color= link to preselect it on the PDP. The
   name is suffixed with the colour so the cards read as distinct. Single-colour
   products pass through unchanged. Mirrors the Morbix / Soxbae behaviour. */
export function explodeColorVariants(products) {
  if (!Array.isArray(products)) return [];
  const out = [];
  for (const p of products) {
    const colors = Array.isArray(p.colors) ? p.colors : [];
    if (colors.length <= 1) { out.push(p); continue; }
    colors.forEach((c, i) => {
      const label = c.packColors ? `Pack of ${c.packColors.length}` : c.name;
      const imgs = (Array.isArray(c.images) && c.images.length) ? c.images : p.images;
      out.push({
        ...p,
        uid:        `${p.id}:${i}`,
        name:       `${p.name} — ${label}`,
        colors:     [c],
        images:     imgs,
        colorParam: c.name,
      });
    });
  }
  return out;
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
    return explodeColorVariants((Array.isArray(products) ? products : []).map(mapProduct).filter(Boolean));
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
      return explodeColorVariants(products.map(mapProduct).filter(Boolean));
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
    return explodeColorVariants((Array.isArray(raw) ? raw : []).map(mapProduct).filter(Boolean));
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
    // Explode each colour into its own card (same as the catalogue / listing
    // pages) so a product with 14 colours shows 14 cards — each with its OWN
    // photo now that the search API returns the variation-tagged images.
    return explodeColorVariants((Array.isArray(products) ? products : []).map(mapProduct).filter(Boolean));
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
