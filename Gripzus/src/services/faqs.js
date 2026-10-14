/* FAQs — admin-managed, brand-filtered. Mirrors the pattern used by the
   reviews service: plain fetch with the X-Brand-Name header.

   GET /api/public/faqs?type=global   → the site-wide FAQ set
   GET /api/public/faqs?type=product&id=:id → a product's own FAQs

   Returns [] on any error so the FaqSection just renders nothing. */

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'gripzus';

const headers = { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND_NAME };

export async function getFaqs(type = 'global', id) {
  try {
    const q = id ? `&id=${encodeURIComponent(id)}` : '';
    const res = await fetch(`${API_URL}/api/public/faqs?type=${type}${q}`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.faqs) ? data.faqs : (Array.isArray(data) ? data : []);
  } catch {
    return [];
  }
}
