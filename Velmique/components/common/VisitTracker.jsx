'use client';

import { useEffect } from 'react';
import { getConsent, CONSENT_EVENT } from '@/lib/consent';

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique';

/**
 * First-party VISIT tracker.
 *
 * Fires once per browser session so the backend can build a brand-wise
 * traffic report. Reads UTM params off the current URL, POSTs them to the
 * UTM endpoint, then marks the session as tracked. The backend dedupes per
 * session and derives source/medium from the referrer when no UTM is present,
 * so a single fire per session is all that's needed. Renders nothing.
 */
export default function VisitTracker() {
  useEffect(() => {
    // First-party analytics — only fire with analytics consent (DPDP). If the
    // visitor opts in later in the session, the consent event re-triggers it.
    const fire = () => {
      if (!getConsent().analytics) return;
      try {
        if (sessionStorage.getItem('visit_tracked')) return;
      } catch {
        return; // sessionStorage unavailable (private mode / blocked)
      }

      const params = new URLSearchParams(window.location.search);

      fetch(`${API_URL}/api/utm/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Brand-Name': BRAND_NAME,
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
        .then((res) => {
          if (!res.ok) return;
          try { sessionStorage.setItem('visit_tracked', '1'); } catch { /* ignore */ }
        })
        .catch(() => { /* swallow — tracking is best-effort */ });
    };

    fire();
    window.addEventListener(CONSENT_EVENT, fire);
    return () => window.removeEventListener(CONSENT_EVENT, fire);
  }, []);

  return null;
}
