const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
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
    // ISR-cached (5 min). No abort signal here — a signalled fetch is not cached
    // by Next and would force the homepage to render dynamically on every hit.
    const res = await fetch(`${API_URL}/api/sliders/listing`, {
      headers: { 'X-Brand-Name': BRAND_NAME },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const slides = data.sliders || data || [];
    return slides.map((s) => ({ ...s, image: cleanUrl(s.image) || s.image }));
  } catch {
    return [];
  }
}