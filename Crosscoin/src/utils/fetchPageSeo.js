/**
 * Server-side helper for fetching a SeoMetadata row by page_name.
 *
 * Each storefront page exports a getServerSideProps that calls this
 * helper, then passes `seoData` as a prop to <SeoWrapper>. The wrapper
 * uses the SSR-provided data directly (no client refetch) so meta tags
 * and JSON-LD ship in the initial HTML — exactly what Google reads.
 *
 * Usage in a page file:
 *
 *   import { fetchPageSeo } from '@/utils/fetchPageSeo';
 *   export const getServerSideProps = async (ctx) => ({
 *     props: { seoData: await fetchPageSeo('about', ctx) },
 *   });
 *   export default function About({ seoData }) {
 *     return <SeoWrapper pageName="about" seoData={seoData}>…</SeoWrapper>;
 *   }
 *
 * Returns `null` (not an exception) when the row is missing so SeoWrapper
 * falls back to its built-in defaults.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

export async function fetchPageSeo(pageName, ctx = null) {
  if (!pageName) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(
      `${API_URL}/api/seo?page_name=${encodeURIComponent(pageName)}`,
      { headers: { 'X-Brand-Name': 'crosscoin' }, signal: controller.signal },
    );
    if (!res.ok) return null;
    const json = await res.json();
    // Edge cache; page SEO rarely changes so a 5-min CDN window is fine.
    if (ctx?.res?.setHeader) {
      ctx.res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    }
    return json?.data || json || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
