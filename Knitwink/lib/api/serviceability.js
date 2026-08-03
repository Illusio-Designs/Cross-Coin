/* Delivery serviceability — GET /api/serviceability/:pincode (brand-scoped).
 * Returns { serviceable, cod_available, estimated_delivery_days, ... }. Used by
 * the product page's pincode checker (client-side only). silentError keeps the
 * global error toast from firing — the checker shows its own inline result. */
import { apiClient } from './client';

export async function checkServiceability(pincode) {
  return apiClient.get(`/api/serviceability/${encodeURIComponent(pincode)}`, { silentError: true });
}
