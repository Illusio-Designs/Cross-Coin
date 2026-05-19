/* Collections (categories) — brand-filtered, same endpoints as Knitwink.
   Calls the live backend directly. */

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'gripzus';

function cleanUrl(url) {
  if (!url) return '';
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    return url.substring(url.lastIndexOf('https://'));
  }
  return url;
}

/* All public collections — GET /api/categories/listing
   A per-request timestamp + no-store busts any URL-keyed cache layer. */
export async function getPublicCategories() {
  try {
    const res = await fetch(`${API_URL}/api/categories/listing?t=${Date.now()}`, {
      headers: { 'X-Brand-Name': BRAND_NAME },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    const cats = Array.isArray(data) ? data : (data.categories ?? data.value ?? data.data ?? []);
    return (Array.isArray(cats) ? cats : [])
      .filter((c) => c.status !== 'inactive')
      .map((c) => ({
        id:     c.id,
        name:   c.name || '',
        slug:   c.slug || String(c.id),
        image:  cleanUrl(c.image || c.imageUrl || ''),
        tagline: c.tagline || c.description || '',
      }));
  } catch {
    return [];
  }
}

/* One collection WITH its products embedded —
   GET /api/categories/by-name/:name  → { id, name, slug, products: [...] } */
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
