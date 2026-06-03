/* SEO — brand-scoped metadata from the shared backend.
   Backend resolves the row using X-Brand-Name → brand_id, with a
   fallback to brand_id=null and finally any row, so newly-added
   dashboard entries propagate even if a Velquira-specific row is
   missing. */

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velquira';

export async function getSeoByPageName(pageName) {
  if (!pageName) return null;
  // Next 16's App Router `useParams()` returns dynamic segments still
  // percent-encoded (`%22spectrum-block%22…`), unlike Next 14 which gives
  // the decoded form. Without normalising, encodeURIComponent below would
  // double-encode the value — the backend then can't match the product
  // slug and the controller falls all the way through to generic defaults.
  // Decoding first makes the round-trip safe regardless of caller.
  let normalized = pageName;
  try { normalized = decodeURIComponent(pageName); } catch { /* not encoded — use as-is */ }
  try {
    const res = await fetch(
      `${API_URL}/api/seo?page_name=${encodeURIComponent(normalized)}`,
      { headers: { 'X-Brand-Name': BRAND_NAME } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success ? json.data : json;
  } catch {
    return null;
  }
}