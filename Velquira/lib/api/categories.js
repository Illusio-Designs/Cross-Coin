import { apiClient } from '@/lib/api/client'

function cleanImageUrl(url) {
  if (!url) return url
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    return url.substring(url.lastIndexOf('https://'))
  }
  return url
}

export async function getPublicCategories() {
  try {
    const data = await apiClient.get('/api/categories/listing?nocache=1', { suppressErrorToast: true })
    const cats = Array.isArray(data) ? data : data.categories ?? data.value ?? []
    return cats
      .filter((c) => c.status !== 'inactive')
      .map((c) => ({ ...c, image: cleanImageUrl(c.image) }))
  } catch { return [] }
}

/* Fetch a single category WITH its products embedded.
   Endpoint: GET /api/categories/by-name/:name (URL-encoded)
   Returns:  { id, name, slug, image, products: [...] }
   Same endpoint CrossCoin/Velmique use for collection-detail pages. */
export async function getCategoryByName(name) {
  if (!name) return null
  try { return await apiClient.get(`/api/categories/by-name/${encodeURIComponent(name)}`, { suppressErrorToast: true }) }
  catch { return null }
}
