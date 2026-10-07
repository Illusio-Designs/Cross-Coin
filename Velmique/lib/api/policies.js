/* Public Policies API — same as Knitwink/Crosscoin.
   Policies are GLOBAL (not per-brand) so no X-Brand-Name header.

   Backend: GET ${API_URL}/api/policies/name/{name}
   Response: { title, content, name, ... } where `content` is HTML.

   Known policy names from the dashboard:
   - 'privacy-policy'
   - 'terms-of-use'
   - 'shipping-policy'
   - 'cancellation-refund'
*/

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique';

export async function getPolicyByName(name) {
  if (!name) return null;
  try {
    // Send the brand so the backend can fill the {{BRAND}} token in the shared
    // global policy; the policy itself is still global (same content for all).
    const res = await fetch(`${API_URL}/api/policies/name/${encodeURIComponent(name)}`, { headers: { 'X-Brand-Name': BRAND } });
    if (!res.ok) return null;
    const data = await res.json();
    // Backend may wrap as { policy: {...} } or return the policy directly.
    return data?.policy || data || null;
  } catch {
    return null;
  }
}
