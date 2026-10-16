/* SEO — brand-scoped page metadata from the shared backend.
   Backend resolves the row using X-Brand-Name → brand_id and serves
   per-page SEO at GET {API_URL}/api/seo?page_name=<name>. Dashboard
   edits propagate here (revalidated every 5 min). */

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velquira';

export async function getSeoByPageName(pageName) {
  if (!pageName) return null;
  try {
    const res = await fetch(
      `${API_URL}/api/seo?page_name=${encodeURIComponent(pageName)}`,
      { headers: { 'X-Brand-Name': BRAND_NAME }, next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success ? json.data : json;
  } catch {
    return null;
  }
}

/* Merge dashboard-controlled SEO OVER a page's hardcoded fallback.
   Backend wins per-field only when it returns a non-empty value;
   otherwise the fallback value is kept — never blanked out. Fetch
   errors return null from getSeoByPageName, so pages still render
   with their original fallback metadata. */
export async function buildMetadata(pageName, fallback = {}) {
  const seo = await getSeoByPageName(pageName);
  const meta = { ...fallback };

  const title       = seo?.meta_title       || fallback.title;
  const description = seo?.meta_description  || fallback.description;
  const keywords    = seo?.meta_keywords     || fallback.keywords;
  const canonical   = seo?.canonical_url      || fallback?.alternates?.canonical;
  const robots      = seo?.robots             || fallback.robots;

  if (title       != null && title       !== '') meta.title = title;
  if (description != null && description !== '') meta.description = description;
  if (keywords    != null && keywords    !== '') meta.keywords = keywords;
  if (robots      != null && robots      !== '') meta.robots = robots;

  if (canonical != null && canonical !== '') {
    meta.alternates = { ...(fallback.alternates || {}), canonical };
  }

  // Preserve the fallback's openGraph block but reflect any updated
  // title/description into it so social cards stay in sync.
  if (fallback.openGraph) {
    meta.openGraph = { ...fallback.openGraph };
    if (title       != null && title       !== '') meta.openGraph.title = title;
    if (description != null && description !== '') meta.openGraph.description = description;
  }

  return meta;
}
