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

export async function getPolicyByName(name) {
  if (!name) return null;
  try {
    const res = await fetch(`${API_URL}/api/policies/name/${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    const data = await res.json();
    // Backend may wrap as { policy: {...} } or return the policy directly.
    return data?.policy || data || null;
  } catch {
    return null;
  }
}
