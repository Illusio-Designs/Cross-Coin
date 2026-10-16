/* SEO — brand-scoped page metadata from the shared backend.
   Admins edit these per-brand in the dashboard; the backend resolves
   the row using the X-Brand-Name header. Pages MERGE backend SEO over
   their hardcoded fallback: a backend field wins only when non-empty,
   otherwise the existing value is kept (we never blank anything out). */

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME  ?? 'soxbae';

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
    // Swallow errors so a backend hiccup never breaks page rendering.
    return null;
  }
}

/* Build a Next.js metadata object by overlaying backend SEO on top of the
   page's hardcoded `fallback`. Each field uses the backend value only when
   non-empty; otherwise the fallback value is preserved. Fields that resolve
   to nothing are omitted entirely. */
export async function buildMetadata(pageName, fallback = {}) {
  const seo = (await getSeoByPageName(pageName)) || {};

  const title       = seo.meta_title       || fallback.title;
  const description = seo.meta_description  || fallback.description;
  const keywords    = seo.meta_keywords     || fallback.keywords;
  const canonical   = seo.canonical_url     || fallback?.alternates?.canonical;
  const robots      = seo.robots            || fallback.robots;

  const meta = {};
  if (title       != null && title       !== '') meta.title = title;
  if (description != null && description !== '') meta.description = description;
  if (keywords    != null && keywords    !== '') meta.keywords = keywords;
  if (canonical   != null && canonical   !== '') meta.alternates = { ...(fallback.alternates || {}), canonical };
  if (robots      != null && robots      !== '') meta.robots = robots;

  // Preserve fallback.openGraph, but keep its title/description in sync with
  // the resolved values above.
  if (fallback.openGraph) {
    meta.openGraph = { ...fallback.openGraph };
    if (title       != null && title       !== '') meta.openGraph.title = title;
    if (description != null && description !== '') meta.openGraph.description = description;
  }

  return meta;
}
