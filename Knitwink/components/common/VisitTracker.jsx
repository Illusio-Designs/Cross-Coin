'use client';

import { useEffect } from 'react';
import { getConsent, CONSENT_EVENT } from '@/lib/consent';

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
  // Start every fresh page load at the top. The browser's default scroll
  // restoration re-applies the previous scroll position on reload; in an SPA
  // the content renders after that, which could drop the user at the page
  // bottom. Disable auto-restoration and reset to top (unless deep-linking to
  // an in-page #anchor). Runs once on initial mount; client-side route changes
  // are handled by the router.
  useEffect(() => {
    try {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      if (!window.location.hash) window.scrollTo(0, 0);
    } catch { /* non-browser / unavailable — ignore */ }
  }, []);

  useEffect(() => {
    const fire = () => {
      if (!getConsent().analytics) return;
    if (typeof window === 'undefined') return;

    try {
      if (sessionStorage.getItem('visit_tracked')) return;
    } catch (_) { /* sessionStorage blocked — fall through and still try once */ }

    const params = new URLSearchParams(window.location.search);
    // Capture the Meta click id so the order can send _fbc for attribution.
    const _fbclid = params.get('fbclid');
    if (_fbclid) { try { localStorage.setItem('fbclid', _fbclid); } catch { /* ignore */ } }

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
      .then((res) => res.json().catch(() => null))
      .then((json) => {
        try {
          sessionStorage.setItem('visit_tracked', '1');
          const sid = json && json.data && json.data.session_id;
          if (sid) localStorage.setItem('utm_session_id', sid);
        } catch (_) { /* ignore */ }
      })
      .catch(() => { /* never break the storefront */ });
    };
    fire();
    window.addEventListener(CONSENT_EVENT, fire);
    return () => window.removeEventListener(CONSENT_EVENT, fire);
  }, []);

  return null;
}
