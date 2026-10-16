/* SEO — brand-scoped page metadata from the shared backend.
   The dashboard lets admins edit per-brand page SEO; the backend resolves
   the row using the X-Brand-Name header. We MERGE those values OVER each
   page's hardcoded fallback: backend wins per-field only when non-empty,
   otherwise the existing value is kept (never blanked). getSeoByPageName
   swallows all errors and returns null so pages still render on a hiccup. */

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'morbix';

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

/* Build a Next Metadata object by overlaying backend fields on `fallback`.
   Backend wins per-field only when the value is a non-empty string; the
   existing fallback value is kept otherwise — nothing is ever blanked out. */
export async function buildMetadata(pageName, fallback = {}) {
  const seo = (await getSeoByPageName(pageName)) || {};

  const pick = (backendVal, fallbackVal) =>
    typeof backendVal === 'string' && backendVal.trim() !== '' ? backendVal : fallbackVal;

  const title       = pick(seo.meta_title, fallback.title);
  const description = pick(seo.meta_description, fallback.description);
  const keywords    = pick(seo.meta_keywords, fallback.keywords);

  const meta = { ...fallback };
  if (title !== undefined) meta.title = title;
  if (description !== undefined) meta.description = description;
  if (keywords !== undefined) meta.keywords = keywords;

  const canonical = pick(seo.canonical_url, fallback?.alternates?.canonical);
  if (canonical !== undefined && canonical !== null) {
    meta.alternates = { ...fallback.alternates, canonical };
  }

  const robots = pick(seo.robots, fallback.robots);
  if (robots !== undefined && robots !== null) {
    meta.robots = robots;
  }

  // Preserve any openGraph from the fallback, updating its title/description
  // to the resolved values.
  if (fallback.openGraph) {
    meta.openGraph = {
      ...fallback.openGraph,
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
    };
  }

  return meta;
}
