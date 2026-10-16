import axios from "axios";

/**
 * Fetch the per-brand Organization JSON-LD from the public SEO endpoint.
 *
 * Mirrors the brand-header pattern used across services/api/* (axios +
 * X-Brand-Name). Unlike those functions it is BEST-EFFORT: it never throws
 * and returns `null` when the backend is down, slow, or returns no org, so
 * the homepage still renders (SeoWrapper falls back to its default JSON-LD).
 *
 * Backend: GET ${API_URL}/api/public/seo-org with header X-Brand-Name
 *   → { success, organization, ogImage, description }
 * where `organization` is a schema.org/Organization object or null.
 *
 * @returns {Promise<{ organization: object|null, ogImage: string|null, description: string|null } | null>}
 */
export async function getSeoOrg(brand = "crosscoin") {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";
  try {
    const response = await axios.get(`${API_URL}/api/public/seo-org`, {
      headers: { "X-Brand-Name": brand || "crosscoin" },
      // Cap SSR wait so a slow API never holds TTFB — matches the 3s abort
      // used by fetchPageSeo / the homepage fetchJson helper.
      timeout: 3000,
    });
    const data = response?.data;
    if (!data || !data.success) return null;
    return {
      organization: data.organization || null,
      ogImage: data.ogImage || null,
      description: data.description || null,
    };
  } catch {
    return null;
  }
}

export default getSeoOrg;
