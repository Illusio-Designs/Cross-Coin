/* Public hero sliders — same endpoint + behaviour as Knitwink.
   Calls the live backend directly. */

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'gripzus';

/* Some uploaded image URLs come back doubled ("https://…https://…").
   Trim to the last real https:// occurrence. */
function cleanUrl(url) {
  if (!url) return '';
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    return url.substring(url.lastIndexOf('https://'));
  }
  return url;
}

export async function getPublicSliders() {
  try {
    const res = await fetch(`${API_URL}/api/sliders/listing`, {
      headers: { 'X-Brand-Name': BRAND_NAME },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const raw = data.sliders || data.data || data || [];

    return (Array.isArray(raw) ? raw : [])
      .map((s) => ({
        id:          s.id,
        image:       cleanUrl(s.image) || s.image || '',
        title:       s.title || '',
        description: s.description || s.subtitle || '',
        buttonText:  s.buttonText || 'Shop the collection',
        buttonLink:  s.categorySlug
          ? `/products?category=${s.categorySlug}`
          : (s.buttonLink || '/products'),
      }))
      .filter((s) => s.image);
  } catch {
    return [];
  }
}
