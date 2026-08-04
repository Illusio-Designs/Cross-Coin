/* Delivery serviceability — GET /api/serviceability/:pincode (brand-scoped).
 * Returns { serviceable, cod_available, estimated_delivery_days, ... } from the
 * same Cross-Coin backend the other brands use. Client-side only (used by the
 * product page's pincode checker). */
import { API_URL, authHeaders } from './client';

export async function checkServiceability(pincode) {
  const res = await fetch(`${API_URL}/api/serviceability/${encodeURIComponent(pincode)}`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Unable to check this pincode.');
  return data;
}
