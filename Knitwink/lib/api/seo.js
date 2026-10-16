/* SEO — brand-scoped metadata from the shared backend.
   Backend resolves the row using X-Brand-Name → brand_id, with a
   fallback to brand_id=null and finally any row, so newly-added
   dashboard entries propagate even if a Knitwink-specific row is
   missing. */

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'knitwink';

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

/* Per-brand Organization structured data (schema.org/Organization) resolved by
   the shared backend from the X-Brand-Name header. Best-effort: returns the
   parsed JSON payload ({ success, organization, ogImage, description }) or null
   on any failure, so the page still renders if the backend is down. Cached at
   the edge for 5 minutes via Next's `revalidate`. */
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

/* First non-empty value among the candidates — a value counts only when it is
   neither null/undefined nor a blank/whitespace string. Returns `undefined`
   when every candidate is empty, so callers can omit the field entirely rather
   than blanking it out. */
function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v != null && String(v).trim() !== '') return v;
  }
  return undefined;
}

/* Build a Next.js Metadata object for a static page by overlaying the
   dashboard-controlled backend SEO (via getSeoByPageName) ON TOP OF the page's
   existing hardcoded metadata (`fallback`). Backend wins per-field, but only
   when its value is non-empty — otherwise the page keeps its current value, so
   a missing dashboard entry never blanks out good defaults. Empty fields are
   omitted. Errors are swallowed (getSeoByPageName already returns null on any
   failure; the extra guard keeps the page rendering even on an unexpected
   throw) so a backend hiccup degrades to the fallback instead of breaking the
   render. */
export async function buildMetadata(pageName, fallback = {}) {
  let seo = null;
  try {
    seo = await getSeoByPageName(pageName);
  } catch {
    seo = null;
  }
  seo = seo || {};

  const metadata = {};

  const title = firstNonEmpty(seo.meta_title, fallback.title);
  if (title !== undefined) metadata.title = title;

  const description = firstNonEmpty(seo.meta_description, fallback.description);
  if (description !== undefined) metadata.description = description;

  const keywords = firstNonEmpty(seo.meta_keywords, fallback.keywords);
  if (keywords !== undefined) metadata.keywords = keywords;

  const canonical = firstNonEmpty(seo.canonical_url, fallback?.alternates?.canonical);
  if (canonical !== undefined) metadata.alternates = { canonical };

  const robots = firstNonEmpty(seo.robots, fallback.robots);
  if (robots !== undefined) metadata.robots = robots;

  // Preserve the fallback's openGraph block as-is, updating only its title and
  // description from the backend when those are provided.
  if (fallback.openGraph) {
    const openGraph = { ...fallback.openGraph };

    const ogTitle = firstNonEmpty(seo.og_title, seo.meta_title, fallback.openGraph.title);
    if (ogTitle !== undefined) openGraph.title = ogTitle;

    const ogDescription = firstNonEmpty(seo.og_description, seo.meta_description, fallback.openGraph.description);
    if (ogDescription !== undefined) openGraph.description = ogDescription;

    metadata.openGraph = openGraph;
  }

  return metadata;
}