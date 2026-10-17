/* Public FAQs API — same backend as Morbix/Crosscoin.

   GET /api/public/faqs?type=global
   GET /api/public/faqs?type=product&id=42   (also returns brand-wide
       "all products" FAQs the admin marked for every product)

   Admin-managed in the dashboard; each answer is sanitized HTML. Brand is
   scoped by the X-Brand-Name header. Returns [] on any failure so the PDP
   simply hides the section when there are no FAQs.
*/

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique';

export async function getFaqs(type = 'global', id) {
  try {
    const q = id ? `&id=${encodeURIComponent(id)}` : '';
    const res = await fetch(`${API_URL}/api/public/faqs?type=${type}${q}`, {
      headers: { 'X-Brand-Name': BRAND_NAME },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error('Failed to fetch FAQs');
    const data = await res.json();
    return Array.isArray(data?.faqs) ? data.faqs : [];
  } catch {
    return [];
  }
}
