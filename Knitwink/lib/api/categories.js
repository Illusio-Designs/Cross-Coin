const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'knitwink';










function cleanImageUrl(url) {
  if (!url) return url;
  // Fix double-encoded ImageKit URLs: extract the last https:// occurrence
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    return url.substring(url.lastIndexOf('https://'));
  }
  return url;
}

export async function getPublicCategories() {
  try {
    // Use brand header — backend filters by brand
    // Add nocache to bypass Redis cache and get fresh data
    const res = await fetch(`${API_URL}/api/categories/listing?nocache=1`, {
      headers: { 'X-Brand-Name': BRAND_NAME },
    })
    if (!res.ok) return []
    const data = await res.json()
    const cats = Array.isArray(data) ? data : data.categories ?? data.value ?? []
    return cats
      .filter((c) => c.status !== 'inactive')
      .map((c) => ({ ...c, image: cleanImageUrl(c.image) }))
  } catch {
    return []
  }
}

/* Fetch a single category WITH its products embedded.
   Endpoint: GET /api/categories/by-name/:name (URL-encoded)
   Returns:  { id, name, slug, image, products: [...] }
   Same endpoint CrossCoin/Velmique use for collection-detail pages. */
export async function getCategoryByName(name) {
  if (!name) return null
  try {
    const res = await fetch(
      `${API_URL}/api/categories/by-name/${encodeURIComponent(name)}`,
      { headers: { 'X-Brand-Name': BRAND_NAME } }
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}