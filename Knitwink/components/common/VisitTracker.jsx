'use client';

import { useEffect } from 'react';

/**
 * First-party VISIT tracker — fires once per browser session.
 *
 * On mount it POSTs a lightweight visit event to the UTM endpoint so the
 * backend can build a brand-wise traffic report. A sessionStorage guard
 * ('visit_tracked') keeps it to a single ping per session; the backend
 * also dedupes to one row per session and derives source/medium from the
 * referrer when no UTM params are present.
 *
 * Fire-and-forget: every failure path is swallowed so it can never break
 * the storefront. Resolves API_URL / BRAND the same way lib/api/client.js
 * does.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'knitwink';

export default function VisitTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (sessionStorage.getItem('visit_tracked')) return;
    } catch (_) { /* sessionStorage blocked — fall through and still try once */ }

    const params = new URLSearchParams(window.location.search);

    fetch(`${API_URL}/api/utm/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Brand-Name': BRAND,
      },
      credentials: 'include',
      body: JSON.stringify({
        utm_source: params.get('utm_source'),
        utm_medium: params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
        utm_term: params.get('utm_term'),
        utm_content: params.get('utm_content'),
        landing_page: window.location.href,
        referrer: document.referrer,
      }),
    })
      .then(() => {
        try { sessionStorage.setItem('visit_tracked', '1'); } catch (_) { /* ignore */ }
      })
      .catch(() => { /* never break the storefront */ });
  }, []);

  return null;
}
