/**
 * /api/gsc-proxy?brandId=1
 *
 * POST body: { type: 'sitemaps' | 'queries' | 'pages' | 'urlInspect', body?: <query> }
 *
 * Same architecture as /api/ga4-proxy — server-side proxy so:
 *   1. We never expose the GSC access token to the browser.
 *   2. Ad-blockers / privacy extensions that block googleapis.com from the
 *      page can't break the dashboard (request only goes to our own origin).
 *
 * Uses the same GA4_SA_EMAIL / GA4_SA_PRIVATE_KEY brand settings as
 * /api/ga4-proxy — the service account just needs to be added as a User
 * (Restricted is enough for read-only) on the Search Console property.
 *
 * Brand setting required:
 *   - GSC_SITE_URL = "https://crosscoin.in/" (must include trailing slash
 *     to match how GSC stores the property)
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { SignJWT, importPKCS8 } from "jose";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";

type GscType = "sitemaps" | "queries" | "pages" | "urlInspect";

async function loadCredentials(brandId: string, authHeader: string) {
  const settingsRes = await fetch(
    `${BACKEND}/api/admin/brand-settings/category/analytics?brandId=${brandId}`,
    { headers: { Authorization: authHeader, "Content-Type": "application/json" } }
  );
  if (!settingsRes.ok) throw new Error(`Could not fetch brand settings (${settingsRes.status})`);
  const settingsData = await settingsRes.json();
  const list: { key: string; value: string }[] = settingsData.data || settingsData || [];

  const email   = list.find((s) => s.key === "GA4_SA_EMAIL")?.value;
  const rawKey  = list.find((s) => s.key === "GA4_SA_PRIVATE_KEY")?.value;
  // GSC settings live in a different category. Fetch separately if missing here.
  let siteUrl   = list.find((s) => s.key === "GSC_SITE_URL")?.value;
  if (!siteUrl) {
    const seoRes = await fetch(
      `${BACKEND}/api/admin/brand-settings/category/seo?brandId=${brandId}`,
      { headers: { Authorization: authHeader, "Content-Type": "application/json" } }
    );
    if (seoRes.ok) {
      const seoData = await seoRes.json();
      const seoList: { key: string; value: string }[] = seoData.data || seoData || [];
      siteUrl = seoList.find((s) => s.key === "GSC_SITE_URL")?.value;
    }
  }

  if (!email || !rawKey || !siteUrl) {
    throw new Error("Missing setup. Required brand settings: GA4_SA_EMAIL, GA4_SA_PRIVATE_KEY, GSC_SITE_URL.");
  }
  return { email, rawKey, siteUrl };
}

async function mintToken(email: string, rawKey: string): Promise<string> {
  const normalized = rawKey.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
  if (!normalized.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error("GA4_SA_PRIVATE_KEY is not a valid PEM private key");
  }
  const pk = await importPKCS8(normalized, "RS256");
  const now = Math.floor(Date.now() / 1000);

  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(pk);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || "Google token exchange failed");
  }
  return tokenData.access_token as string;
}

type CachedToken = { token: string; expiresAt: number };
const tokenCache = new Map<string, CachedToken>();
async function getTokenCached(brandId: string, authHeader: string) {
  const cached = tokenCache.get(brandId);
  if (cached && cached.expiresAt > Date.now()) return { token: cached.token, siteUrl: cached.token /* not used */ };
  const { email, rawKey, siteUrl } = await loadCredentials(brandId, authHeader);
  const token = await mintToken(email, rawKey);
  tokenCache.set(brandId, { token, expiresAt: Date.now() + 55 * 60 * 1000 });
  return { token, siteUrl };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const brandId = String(req.query.brandId || "1");
  const authHeader = req.headers.authorization || "";
  const { type, body } = (req.body || {}) as { type: GscType; body?: any };

  if (!["sitemaps", "queries", "pages", "urlInspect"].includes(type)) {
    return res.status(400).json({ error: "type must be one of sitemaps, queries, pages, urlInspect" });
  }

  try {
    // Token cache keys off brandId but does NOT include the siteUrl, so we
    // always re-load settings to get the fresh siteUrl.
    const { email, rawKey, siteUrl } = await loadCredentials(brandId, authHeader);
    const cached = tokenCache.get(brandId);
    const token =
      cached && cached.expiresAt > Date.now()
        ? cached.token
        : await (async () => {
            const t = await mintToken(email, rawKey);
            tokenCache.set(brandId, { token: t, expiresAt: Date.now() + 55 * 60 * 1000 });
            return t;
          })();

    let url = "";
    let init: RequestInit = {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    };

    const enc = encodeURIComponent(siteUrl);

    if (type === "sitemaps") {
      url = `https://www.googleapis.com/webmasters/v3/sites/${enc}/sitemaps`;
    } else if (type === "queries" || type === "pages") {
      url = `https://www.googleapis.com/webmasters/v3/sites/${enc}/searchAnalytics/query`;
      init = {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          // Last 28 days is Google's recommended default window.
          startDate: isoDaysAgo(28),
          endDate: isoDaysAgo(2),                                     // Search Console has a ~2-day lag
          dimensions: [type === "queries" ? "query" : "page"],
          rowLimit: 25,
          ...(body || {}),
        }),
      };
    } else if (type === "urlInspect") {
      url = `https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`;
      init = {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          inspectionUrl: body?.inspectionUrl,
          siteUrl: siteUrl,
          ...(body || {}),
        }),
      };
    }

    const r = await fetch(url, init);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const message = (j as any)?.error?.message || `GSC API returned ${r.status}`;
      return res.status(r.status).json({ error: message, googleResponse: j });
    }
    return res.status(200).json(j);
  } catch (err: any) {
    console.error("[gsc-proxy]", err);
    return res.status(500).json({ error: err?.message || "Internal error" });
  }
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
