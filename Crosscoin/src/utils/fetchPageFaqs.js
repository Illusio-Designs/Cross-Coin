/**
 * Server-side helper for fetching FAQs attached to a specific static
 * page (Home, About, Contact, etc.) plus the global FAQ list.
 *
 * Returns { pageFaqs, globalFaqs } so the page can pass both into
 * <ProductFaqSection productFaqs={pageFaqs} globalFaqs={globalFaqs} />.
 *
 * Why this exists: the backend has supported `attached_to_type: 'page'`
 * for a while, but no static page actually called the endpoint — so
 * page FAQs you authored in the admin never appeared on the storefront.
 *
 * Returns empty arrays (not exceptions) on failure so a flaky FAQ API
 * never breaks a page render.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(url, { headers: { 'X-Brand-Name': 'crosscoin' }, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.faqs)) return payload.faqs;
  return [];
}

export async function fetchPageFaqs(pageSlug, ctx = null) {
  const [page, global] = await Promise.all([
    pageSlug
      ? fetchJson(`${API_URL}/api/public/faqs?type=page&slug=${encodeURIComponent(pageSlug)}`)
      : Promise.resolve(null),
    fetchJson(`${API_URL}/api/public/faqs?type=global`),
  ]);

  // Edge cache: FAQs don't change often, 5-min CDN window matches our
  // SEO fetch cadence.
  if (ctx?.res?.setHeader) {
    ctx.res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  }

  return {
    pageFaqs: normalizeList(page),
    globalFaqs: normalizeList(global),
  };
}
