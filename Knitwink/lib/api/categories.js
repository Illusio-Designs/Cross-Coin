const API_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:4000';
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
    const res = await fetch(`${API_URL}/api/categories/listing`, {
      headers: { 'X-Brand-Name': BRAND_NAME },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const cats = Array.isArray(data) ? data : data.categories ?? [];
    // Clean any double-encoded image URLs
    return cats.map((c) => ({ ...c, image: cleanImageUrl(c.image) }));
  } catch {
    return [];
  }
}