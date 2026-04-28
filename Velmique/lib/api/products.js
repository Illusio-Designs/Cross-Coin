/* Public Products API — same backend as Knitwink/Crosscoin.

   Endpoints used:
   - GET /api/products/catalog?...   list + filter + sort + paginate
   - GET /api/products/best-sellers  homepage curated row
   - GET /api/products/by-slug/:slug single product detail
   - GET /api/products/search?q=...  search overlay

   All requests carry X-Brand-Name: <brand> so the backend returns only
   the active brand's products.
*/

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique';

// Some uploaded image URLs come back doubled (https://...https://...).
// Trim to the last real https:// occurrence.
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

const BADGE_MAP = {
  new_arrival:  'New',
  hot_selling:  'Bestseller',
  low_stock:    'Limited',
  out_of_stock: 'Sold Out',
};

function safeJson(s) { try { return JSON.parse(s || '{}'); } catch { return {}; } }

function pickImage(i) {
  return cleanUrl(i?.large || i?.image_url || i?.medium || i?.url || i?.thumbnail || '');
}

/* Normalise a single variation row from the API. Each variation has its
   own price/stock/sku/attributes/images. We parse `attributes` (sometimes
   a JSON string), turn it into a flat key→array map, and surface common
   fields like size + color so the UI doesn't have to re-parse. */
function mapVariation(v) {
  if (!v) return null;
  const attrs = typeof v.attributes === 'string' ? safeJson(v.attributes) : (v.attributes || {});
  const norm = {};
  Object.entries(attrs).forEach(([k, val]) => {
    norm[k] = Array.isArray(val) ? val : (val == null ? [] : [val]);
  });
  const images = (v.images || v.ProductImages || []).map(i => ({
    id: i.id,
    url: pickImage(i),
    thumb: cleanUrl(i.thumbnail || i.medium || i.image_url || ''),
    alt: i.alt_text || '',
    isPrimary: !!i.is_primary,
  })).filter(i => i.url);

  return {
    id:            String(v.id),
    sku:           v.sku || '',
    price:         Number(v.price ?? 0),
    comparePrice:  v.comparePrice != null ? Number(v.comparePrice) : undefined,
    stock:         Number(v.stock ?? 0),
    inStock:       Number(v.stock ?? 0) > 0,
    attributes:    norm,
    size:          norm.size?.[0] || '',
    sizes:         norm.size || [],
    colors:        norm.color || [],
    material:      norm.material?.[0] || '',
    pack:          norm.pack?.[0] || '',
    images,
  };
}

/* Map backend product → the shape the existing Velmique UI expects.
   Keeps top-level price/images/sizes pointing at the FIRST variation so
   product cards / search results render correctly with one click, and
   exposes the full `variations` array so the detail page can let the user
   pick a size or colour and swap to that variation's images. */
export function mapProduct(p) {
  if (!p) return null;
  const rawVariations = p.ProductVariations || p.variations || [];
  const variations = rawVariations.map(mapVariation).filter(Boolean);
  const productImages = (p.ProductImages || p.images || []).map(pickImage).filter(Boolean);

  // Default variation = the first one in stock, else the first one at all.
  const defaultVariation = variations.find(v => v.inStock) || variations[0] || null;

  // Top-level price / compare price come from the default variation, with
  // a graceful fallback to product-level fields for older payloads.
  const price = defaultVariation?.price ?? Number(p.price ?? 0);
  const originalPrice = defaultVariation?.comparePrice ?? (p.comparePrice ? Number(p.comparePrice) : undefined);

  // Build an aggregated image gallery: union of every variation's images
  // plus the bare ProductImages — de-duplicated by url. This is what shows
  // in the gallery before any specific variation is picked.
  const all = [];
  const seen = new Set();
  variations.forEach(v => v.images.forEach(img => {
    if (img.url && !seen.has(img.url)) { seen.add(img.url); all.push(img.url); }
  }));
  productImages.forEach(u => {
    if (u && !seen.has(u)) { seen.add(u); all.push(u); }
  });

  // Aggregate distinct sizes / colours across every variation for filter chips.
  const sizes = Array.from(new Set(variations.flatMap(v => v.sizes)));
  const colors = Array.from(new Set(variations.flatMap(v => v.colors)));

  // In-stock if ANY variation has stock, or product-level fallback.
  const inStock = variations.length
    ? variations.some(v => v.inStock)
    : (p.inStock !== false);

  // Build the rich Details list shown in the "Details" tab.
  const dims = p.dimensions || {};
  const details = [
    sizes.length     && `Available sizes: ${sizes.join(', ')}`,
    colors.length    && `Colours: ${colors.join(', ')}`,
    defaultVariation?.material && `Material: ${defaultVariation.material}`,
    defaultVariation?.pack     && `Pack: ${defaultVariation.pack}`,
    p.weight   && `Weight: ${p.weight}${p.weightUnit || 'g'}`,
    (dims.length || dims.width || dims.height) &&
      `Dimensions: ${dims.length || '—'}×${dims.width || '—'}×${dims.height || '—'} ${p.dimensionUnit || 'cm'}`,
    defaultVariation?.sku && `SKU: ${defaultVariation.sku}`,
  ].filter(Boolean);

  return {
    id:             String(p.id),
    slug:           p.slug,
    name:           p.name,
    description:    p.description || '',
    price,
    originalPrice,
    images:         all.length ? all : ['/perfumehero.png'],
    category:       p.Category?.name || p.category?.name || '',
    collection:     p.Category?.name || p.category?.name || '',
    collectionName: p.Category?.name || p.category?.name || '',
    gender:         defaultVariation?.attributes?.gender?.[0] || 'Unisex',
    sizes:          sizes.length ? sizes : ['One Size'],
    colors,
    rating:         p.avg_rating ? Number(p.avg_rating) : 0,
    reviews:        Number(p.review_count || 0),
    badge:          BADGE_MAP[p.badge] || (p.badge ? p.badge : null),
    inStock,
    details,
    variations,                       // full per-variation data for the detail page
    defaultVariationId: defaultVariation?.id || null,
    seo: p.seo,
    raw: p,
  };
}

/* ── List + filter + sort + paginate ───────────────────────────── */
export async function getPublicProducts(params = {}) {
  try {
    const qp = new URLSearchParams();
    if (params.category) qp.append('category', params.category);
    if (params.collection) qp.append('category', params.collection); // alias
    if (params.search)   qp.append('search', params.search);
    if (params.sort)     qp.append('sort', params.sort);
    if (params.page)     qp.append('page', params.page);
    qp.append('limit', params.limit ?? 100);
    if (params.minPrice != null) qp.append('minPrice', params.minPrice);
    if (params.maxPrice != null) qp.append('maxPrice', params.maxPrice);
    if (params.attributes) qp.append('attributes', JSON.stringify(params.attributes));

    const data = await brandFetch(`/api/products/catalog?${qp.toString()}`);
    const products = data?.data?.products || data?.data || data?.products || [];
    return {
      products:   Array.isArray(products) ? products.map(mapProduct).filter(Boolean) : [],
      total:      data?.data?.total      ?? products.length,
      totalPages: data?.data?.totalPages ?? 1,
      page:       Number(params.page) || 1,
    };
  } catch {
    return { products: [], total: 0, totalPages: 1, page: 1 };
  }
}

/* ── Best sellers (curated row on the homepage) ─────────────────── */
export async function getBestsellers(limit = 6) {
  try {
    const data = await brandFetch(`/api/products/best-sellers?limit=${limit}`);
    const products = data?.data?.products || data?.data || data?.products || [];
    if (Array.isArray(products) && products.length) {
      return products.map(mapProduct).filter(Boolean);
    }
  } catch { /* ignore */ }
  // Fallback: just the first N from catalog so the row is never empty.
  const r = await getPublicProducts({ limit });
  return r.products;
}

/* ── Products by category (dedicated endpoint) ──────────────────── */
export async function getProductsByCategory(categoryId, { page = 1, limit = 50 } = {}) {
  if (!categoryId) return { products: [], total: 0, page, totalPages: 0 };
  try {
    const data = await brandFetch(
      `/api/products/category/${categoryId}?page=${page}&limit=${limit}`
    );
    const rows = data?.data || data?.products || [];
    return {
      products: Array.isArray(rows) ? rows.map(mapProduct).filter(Boolean) : [],
      total: data?.pagination?.total ?? rows.length,
      page: data?.pagination?.page ?? page,
      totalPages: data?.pagination?.totalPages ?? 1,
    };
  } catch {
    return { products: [], total: 0, page, totalPages: 0 };
  }
}

/* ── Single product (detail page) ───────────────────────────────── */
export async function getProductBySlug(slug) {
  if (!slug) return null;
  try {
    const data = await brandFetch(`/api/products/by-slug/${encodeURIComponent(slug)}`);
    return mapProduct(data?.data || data);
  } catch {
    return null;
  }
}

/* ── Search (live overlay + /search page) ───────────────────────── */
export async function searchProducts(query, limit = 20) {
  if (!query) return [];
  try {
    const data = await brandFetch(`/api/products/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    const products = data?.data?.products || data?.products || [];
    return Array.isArray(products) ? products.map(mapProduct).filter(Boolean) : [];
  } catch {
    return [];
  }
}
