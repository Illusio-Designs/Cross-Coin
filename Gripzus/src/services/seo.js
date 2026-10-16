/* SEO — brand-scoped metadata fetched from the shared backend.
   The backend uses the X-Brand-Name header to return the row that
   belongs to this brand (composite unique on page_name + brand_id),
   falling back to brand-null defaults. */

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'gripzus';

export async function getSeoByPageName(pageName) {
  if (!pageName) return null;
  try {
    const res = await fetch(
      `${API_URL}/api/seo?page_name=${encodeURIComponent(pageName)}`,
      { headers: { 'X-Brand-Name': BRAND_NAME } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success ? json.data : json;
  } catch {
    return null;
  }
}

/* Brand-scoped Organization structured data (schema.org/Organization).
   Best-effort: returns the parsed payload, or null if the backend is down
   or returns nothing, so first paint still degrades gracefully. */
export async function getSeoOrg() {
  try {
    const res = await fetch(`${API_URL}/api/public/seo-org`, {
      headers: { 'X-Brand-Name': BRAND_NAME },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json || null;
  } catch {
    return null;
  }
}
