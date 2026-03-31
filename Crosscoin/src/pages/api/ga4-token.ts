/**
 * /api/ga4-token?brandId=1
 *
 * Fetches GA4_SA_EMAIL and GA4_SA_PRIVATE_KEY from the backend
 * Brand Settings, then mints a short-lived Google OAuth2 access token.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { SignJWT, importPKCS8 } from "jose";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const brandId = req.query.brandId || "1";
  const authHeader = req.headers.authorization || "";

  try {
    // Fetch GA4 credentials from backend Brand Settings
    const settingsRes = await fetch(
      `${BACKEND}/api/admin/brand-settings?brandId=${brandId}&category=analytics`,
      { headers: { Authorization: authHeader, "Content-Type": "application/json" } }
    );

    if (!settingsRes.ok) {
      return res.status(500).json({ error: "Could not fetch brand settings" });
    }

    const settingsData = await settingsRes.json();
    const list: { key: string; value: string }[] = settingsData.data || settingsData || [];

    const email  = list.find(s => s.key === "GA4_SA_EMAIL")?.value;
    const rawKey = list.find(s => s.key === "GA4_SA_PRIVATE_KEY")?.value?.replace(/\\n/g, "\n");

    if (!email || !rawKey) {
      return res.status(400).json({
        error: "GA4_SA_EMAIL and GA4_SA_PRIVATE_KEY not found in Brand Settings → Analytics"
      });
    }

    // Mint a Google OAuth2 access token via JWT assertion
    const privateKey = await importPKCS8(rawKey, "RS256");
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

    if (!tokenRes.ok) {
      return res.status(500).json({
        error: tokenData.error_description ?? "Google token exchange failed"
      });
    }

    return res.status(200).json({
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in, // 3600 seconds
    });

  } catch (err: any) {
    console.error("[ga4-token]", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}
