/* SEO Organization — brand-scoped schema.org/Organization JSON-LD from the
   shared backend. Mirrors lib/api/seo.js's API_URL + X-Brand-Name convention.
   Backend resolves the Organization using X-Brand-Name → brand. */

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique';

/* Best-effort fetch of the dashboard-controlled Organization JSON-LD plus
   optional ogImage/description fallbacks. Returns the parsed JSON
   (`{ success, organization, ogImage, description }`) or null on any hiccup,
   so callers can treat a null/empty `organization` as "render without it". */
export async function getSeoOrg() {
  try {
    const res = await fetch(
      `${API_URL}/api/public/seo-org`,
      { headers: { 'X-Brand-Name': BRAND_NAME }, next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
