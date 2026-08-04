/* Public Categories (used as Velmique "Collections") API.
   Endpoint: GET /api/categories/listing?nocache=1
   Header:   X-Brand-Name: <brand>
*/

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique';

function cleanUrl(url) {
  if (!url) return '';
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    return url.substring(url.lastIndexOf('https://'));
  }
  return url;
}

/* Map backend category → the shape the existing collections UI uses
   (matches lib/data.js `collections` array). */
function mapCategory(c) {
  return {
    id:           String(c.id),
    name:         c.name,
    slug:         c.slug,
    tagline:      c.tagline || '',
    description:  c.description || '',
    image:        cleanUrl(c.image),
    productCount: c.productCount ?? c.product_count ?? 0,
    parentId:     c.parentId,
  };
}

export async function getPublicCategories() {
  try {
    const res = await fetch(`${API_URL}/api/categories/listing?nocache=1`, {
      headers: { 'X-Brand-Name': BRAND_NAME },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const cats = Array.isArray(data) ? data : data.categories ?? data.value ?? [];
    return cats
      .filter(c => c.status !== 'inactive')
      .map(mapCategory);
  } catch {
    return [];
  }
}

/* Fetch by slug — falls back to scanning the listing if backend doesn't
   support it directly (categories listing is small enough to scan). */
export async function getCategoryBySlug(slug) {
  if (!slug) return null;
  const all = await getPublicCategories();
  return all.find(c => c.slug === slug) || null;
}

/* Fetch a single category WITH its products embedded.
   Endpoint: GET /api/categories/by-name/:name (URL-encoded)
   Returns:  { id, name, slug, image, products: [...] }
   This is the same endpoint CrossCoin uses for collection-detail pages. */
export async function getCategoryByName(name) {
  if (!name) return null;
  try {
    const res = await fetch(
      `${API_URL}/api/categories/by-name/${encodeURIComponent(name)}`,
      { headers: { 'X-Brand-Name': BRAND_NAME } }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
