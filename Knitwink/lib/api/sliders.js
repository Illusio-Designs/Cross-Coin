const API_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:4000';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'knitwink';












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
    const slides = data.sliders || data || [];
    return slides.map((s) => ({ ...s, image: cleanUrl(s.image) || s.image }));
  } catch {
    return [];
  }
}