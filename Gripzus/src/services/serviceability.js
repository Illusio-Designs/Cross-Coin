/* Delivery serviceability — GET /api/serviceability/:pincode (brand-scoped).
   Returns { serviceable, cod_available, estimated_delivery_days, ... } from the
   same Cross-Coin backend. Client-side only (product page pincode checker). */
const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'gripzus';

export async function checkServiceability(pincode) {
  const res = await fetch(`${API_URL}/api/serviceability/${encodeURIComponent(pincode)}`, {
    headers: { 'X-Brand-Name': BRAND_NAME },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Unable to check this pincode.');
  return data;
}
