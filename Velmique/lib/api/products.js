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

  // Aggregate gender + season attributes across variations so the shop
  // page can offer them as multi-select filters without re-parsing.
  const genders = Array.from(new Set(
    variations.flatMap(v => v.attributes?.gender || [])
  )).filter(Boolean);
  const seasons = Array.from(new Set(
    variations.flatMap(v => v.attributes?.season || [])
  )).filter(Boolean);

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
    genders,                          // all distinct genders across variations
    seasons,                          // all distinct seasons across variations
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

/* ── Best sellers (curated row on the homepage) ─────────────────────
   The /best-sellers endpoint returns bare Product rows without the
   ProductImages / ProductVariations associations the catalog endpoint
   includes — that's why product cards rendered straight from it would
   show the placeholder image. To keep the homepage cards visually
   identical to the shop-page cards, we use /best-sellers ONLY as a
   ranking signal: pull the IDs and order from there, then hydrate
   the product data from /catalog (same endpoint the shop uses). */
export async function getBestsellers(limit = 6) {
  try {
    // 1. Get the bestseller order (IDs only) from the curated endpoint.
    let bestsellerIds = [];
    try {
      const data = await brandFetch(`/api/products/best-sellers?limit=${limit * 2}`);
      const rows = data?.data?.products || data?.data || data?.products || [];
      if (Array.isArray(rows) && rows.length) {
        bestsellerIds = rows.map(p => String(p.id));
      }
    } catch { /* ignore — falls through to plain catalog below */ }

    // 2. Pull catalog using the SAME limit the shop page uses (200) so
    //    we hit the same backend cache key. Different limits create
    //    separate cache entries, which is why the homepage was lagging
    //    behind the shop page after a product was updated.
    const catalog = await getPublicProducts({ limit: 200 });
    const all = catalog.products || [];
    if (!all.length) return [];

    // 3. Reorder catalog by the bestseller list. Top up with non-
    //    bestsellers if the curated list is short, so the row stays full.
    if (bestsellerIds.length) {
      const byId = new Map(all.map(p => [String(p.id), p]));
      const ordered = bestsellerIds.map(id => byId.get(id)).filter(Boolean);
      const seen = new Set(ordered.map(p => String(p.id)));
      const fillers = all.filter(p => !seen.has(String(p.id)));
      return [...ordered, ...fillers].slice(0, limit);
    }

    return all.slice(0, limit);
  } catch {
    return [];
  }
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
/* Search runs three lookups in parallel and merges them, deduped by id:
     1. Catalog text search (matches product name / description)
     2. Category-name match — if the query equals a category name, we
        fetch that category's products (the catalog text search only
        matches product fields, so typing "Velmique Signature Scents"
        would otherwise return nothing).
     3. Dedicated /search endpoint as a final fallback.
   Results from the catalog endpoint take priority because their data
   shape (images, variations, prices) matches the shop page exactly. */
export async function searchProducts(query, limit = 20) {
  if (!query) return [];
  const q = String(query).trim();
  if (!q) return [];

  const out = [];
  const seen = new Set();
  const push = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const p of arr) {
      if (!p || !p.id) continue;
      const id = String(p.id);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(p);
      if (out.length >= limit) break;
    }
  };

  // 1) Text search via catalog
  try {
    const r = await getPublicProducts({ search: q, limit });
    push(r.products);
  } catch { /* ignore */ }

  // 2) Category-name match → fetch by-name (this is how Velmique browses
  //    a collection; same endpoint /shop uses for a category filter).
  if (out.length < limit) {
    try {
      const { getPublicCategories, getCategoryByName } = await import('./categories');
      const cats = await getPublicCategories();
      const lc = q.toLowerCase();
      const matchedCat = (cats || []).find(c =>
        c.name && (
          c.name.toLowerCase() === lc ||
          c.name.toLowerCase().includes(lc) ||
          lc.includes(c.name.toLowerCase())
        )
      );
      if (matchedCat) {
        const cat = await getCategoryByName(matchedCat.name);
        const rows = cat?.products || cat?.data?.products || [];
        push(rows.map(mapProduct).filter(Boolean));
      }
    } catch { /* ignore */ }
  }

  // 3) Final fallback — dedicated /search endpoint (sparse data, but
  //    better than nothing if the catalog endpoint is unreachable).
  if (out.length === 0) {
    try {
      const data = await brandFetch(`/api/products/search?q=${encodeURIComponent(q)}&limit=${limit}`);
      const products = data?.data?.products || data?.products || [];
      push(Array.isArray(products) ? products.map(mapProduct).filter(Boolean) : []);
    } catch { /* ignore */ }
  }

  return out;
}
