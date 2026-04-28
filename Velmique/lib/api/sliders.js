/* Public Sliders API — same shape as Knitwink/Crosscoin.
   Backend: GET ${API_URL}/api/sliders/listing
   Header:  X-Brand-Name: <brand>
   Response: { sliders: [{ id, title, description, buttonText, image, categoryName, ... }] }
*/

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique';

// Some uploaded image URLs come back doubled (e.g. "https://.../https://...").
// Trim to the last real https:// occurrence.
function cleanUrl(url) {
  if (!url) return '';
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    return url.substring(url.lastIndexOf('https://'));
  }
  return url;
}

// Map a backend slide → the shape <HeroBanner /> expects.
function normalize(s) {
  if (!s) return null;
  const ctaHref = s.categoryName
    ? `/shop?category=${encodeURIComponent(s.categoryName)}`
    : (s.ctaHref || '/shop');
  return {
    id: s.id ?? s._id ?? s.slug ?? s.title,
    title: s.title || '',
    description: s.description || '',
    buttonText: s.buttonText || s.cta || 'Shop Now',
    image: cleanUrl(s.image) || s.image || '',
    ctaHref,
    categoryName: s.categoryName || null,
  };
}

export async function getPublicSliders() {
  try {
    const res = await fetch(`${API_URL}/api/sliders/listing`, {
      headers: { 'X-Brand-Name': BRAND_NAME },
      // Always fetch fresh in dev; cache in prod for 5 min.
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const slides = data.sliders || data.data || data || [];
    return Array.isArray(slides) ? slides.map(normalize).filter(Boolean) : [];
  } catch {
    return [];
  }
}
