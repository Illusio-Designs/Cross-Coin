/**
 * /api/ga4-proxy?brandId=1
 *
 * POST body: { type: 'report' | 'realtime', body: <GA4 Data API query> }
 *
 * Server-side proxy for the GA4 Data API. The browser cannot reliably hit
 * analyticsdata.googleapis.com directly because:
 *   - many privacy / ad-blocker extensions block the domain by default,
 *     producing a generic "Failed to fetch" TypeError, and
 *   - cross-origin requests can run into CORS preflight edge cases.
 *
 * Routing through this endpoint means the browser only talks to our own
 * origin. We mint a fresh GA4 access token here using the same JWT flow as
 * /api/ga4-token, then forward the query to Google.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { SignJWT, importPKCS8 } from "jose";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";

type GA4Type = "report" | "realtime";

async function loadGa4Credentials(brandId: string, authHeader: string) {
  const settingsRes = await fetch(
    `${BACKEND}/api/admin/brand-settings/category/analytics?brandId=${brandId}`,
    { headers: { Authorization: authHeader, "Content-Type": "application/json" } }
  );
  if (!settingsRes.ok) {
    throw new Error(`Could not fetch brand settings (${settingsRes.status})`);
  }
  const settingsData = await settingsRes.json();
  const list: { key: string; value: string }[] = settingsData.data || settingsData || [];

  const email      = list.find(s => s.key === "GA4_SA_EMAIL")?.value;
  const rawKey     = list.find(s => s.key === "GA4_SA_PRIVATE_KEY")?.value;
  const propertyId = list.find(s => s.key === "GA4_PROPERTY_ID")?.value;

  if (!email || !rawKey || !propertyId) {
    throw new Error("GA4_SA_EMAIL, GA4_SA_PRIVATE_KEY and GA4_PROPERTY_ID must all be set");
  }
  return { email, rawKey, propertyId };
}

async function mintAccessToken(email: string, rawKey: string): Promise<string> {
  const normalizedKey = rawKey.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
  if (!normalizedKey.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error("GA4_SA_PRIVATE_KEY must be a PEM private key");
  }
  const privateKey = await importPKCS8(normalizedKey, "RS256");
  const now = Math.floor(Date.now() / 1000);

  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/analytics.readonly",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

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

// In-process cache of access tokens keyed by brand. Tokens last 1h; refresh
// 5 minutes early so we never hand out an expired one. Keeps GA4 quota usage
// down across the 30s realtime poll.
type CachedToken = { token: string; expiresAt: number };
const tokenCache = new Map<string, CachedToken>();

async function getAccessTokenCached(brandId: string, authHeader: string): Promise<string> {
  const cached = tokenCache.get(brandId);
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  const { email, rawKey } = await loadGa4Credentials(brandId, authHeader);
  const token = await mintAccessToken(email, rawKey);
  tokenCache.set(brandId, { token, expiresAt: Date.now() + 55 * 60 * 1000 });
  return token;
}

function normaliseResource(propertyId: string): string {
  const trimmed = propertyId.trim().replace(/\/+$/, "");
  if (trimmed.startsWith("properties/")) return trimmed;
  return `properties/${trimmed}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const brandId = String(req.query.brandId || "1");
  const authHeader = req.headers.authorization || "";

  const { type, body } = (req.body || {}) as { type: GA4Type; body: unknown };
  if (type !== "report" && type !== "realtime") {
    return res.status(400).json({ error: "type must be 'report' or 'realtime'" });
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "body (GA4 query) is required" });
  }

  try {
    const { propertyId } = await loadGa4Credentials(brandId, authHeader);
    const token = await getAccessTokenCached(brandId, authHeader);
    const resource = normaliseResource(propertyId);
    const method = type === "realtime" ? "runRealtimeReport" : "runReport";
    const url = `https://analyticsdata.googleapis.com/v1beta/${resource}:${method}`;

    const gaRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const gaData = await gaRes.json().catch(() => ({}));

    if (!gaRes.ok) {
      // Bubble Google's error message up to the client.
      const message = (gaData as any)?.error?.message || `GA4 returned ${gaRes.status}`;
      return res.status(gaRes.status).json({ error: message, googleResponse: gaData });
    }
    return res.status(200).json(gaData);
  } catch (err: any) {
    console.error("[ga4-proxy]", err);
    return res.status(500).json({ error: err?.message || "Internal error" });
  }
}
