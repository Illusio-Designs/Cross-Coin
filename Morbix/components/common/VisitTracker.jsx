'use client';

import { useEffect } from 'react';
import { API_URL, BRAND } from '@/lib/api/client';

/**
 * VisitTracker — fires a single first-party VISIT ping per browser session so
 * the Cross-Coin backend can build a brand-wise traffic report.
 *
 * POSTs to /api/utm/track with the UTM params from the URL (null when absent),
 * the landing page and referrer, scoped to this brand via X-Brand-Name. The
 * backend dedupes per session and derives source/medium from the referrer when
 * no UTM is present, so we only need to fire once per session — guarded by a
 * sessionStorage flag. Every failure path is swallowed: tracking must never
 * break the storefront.
 */
export default function VisitTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem('visit_tracked')) return;
    } catch {
      /* sessionStorage unavailable — skip tracking */
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const utm = (key) => params.get(key) || null;

    fetch(`${API_URL}/api/utm/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
      credentials: 'include',
      body: JSON.stringify({
        utm_source: utm('utm_source'),
        utm_medium: utm('utm_medium'),
        utm_campaign: utm('utm_campaign'),
        utm_term: utm('utm_term'),
        utm_content: utm('utm_content'),
        landing_page: window.location.href,
        referrer: document.referrer,
      }),
    })
      .then(() => {
        try {
          sessionStorage.setItem('visit_tracked', '1');
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* tracking failure — storefront unaffected */
      });
  }, []);

  return null;
}
