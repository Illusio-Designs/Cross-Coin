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
    // Use brand header — backend filters by brand. ISR-cached (5 min); no abort
    // signal, since a signalled fetch isn't cached by Next and would force the
    // homepage dynamic. Dropped the old ?nocache=1 — the backend now invalidates
    // its category cache on every admin write, so bypassing it is unnecessary.
    const res = await fetch(`${API_URL}/api/categories/listing`, {
      headers: { 'X-Brand-Name': BRAND_NAME },
      next: { revalidate: 300 },
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