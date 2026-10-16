/* SEO — brand-scoped metadata from the shared backend.
   Backend resolves the row using X-Brand-Name → brand_id, with a
   fallback to brand_id=null and finally any row, so newly-added
   dashboard entries propagate even if a Velmique-specific row is
   missing. */

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique';

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

/* Build a Next.js Metadata object for a static page by overlaying the
   dashboard-controlled backend SEO OVER the page's own hardcoded values.
   The backend wins per-field, but only when it provides a non-empty value;
   otherwise the page's existing fallback is kept — we never blank a field
   out. On any backend hiccup getSeoByPageName returns null, so the page
   still renders with its fallback metadata intact.

   `fallback` mirrors a Next Metadata object (title/description/keywords/
   alternates.canonical/robots/openGraph). Returns an object suitable for
   `export async function generateMetadata()`. */
export async function buildMetadata(pageName, fallback = {}) {
  const seo = (await getSeoByPageName(pageName)) || {};

  // Prefer a non-empty backend string, else keep the page's own fallback.
  const pick = (backendVal, fallbackVal) => {
    const v = typeof backendVal === 'string' ? backendVal.trim() : backendVal;
    return v ? backendVal : fallbackVal;
  };

  const title       = pick(seo.meta_title,       fallback.title);
  const description = pick(seo.meta_description,  fallback.description);
  const keywords    = pick(seo.meta_keywords,     fallback.keywords);
  const canonical   = pick(seo.canonical_url,     fallback?.alternates?.canonical);
  const robots      = pick(seo.robots,            fallback.robots);

  const metadata = {};
  if (title)       metadata.title = title;
  if (description) metadata.description = description;
  if (keywords)    metadata.keywords = keywords;
  if (canonical)   metadata.alternates = { canonical };
  if (robots)      metadata.robots = robots;

  // Preserve the page's own Open Graph block, but let the resolved
  // title/description flow into it so social cards track the dashboard too.
  if (fallback.openGraph) {
    metadata.openGraph = {
      ...fallback.openGraph,
      ...(title       ? { title }       : {}),
      ...(description ? { description } : {}),
    };
  }

  return metadata;
}