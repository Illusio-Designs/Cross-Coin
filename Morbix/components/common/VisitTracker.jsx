'use client';

import { useEffect } from 'react';
import { getConsent, CONSENT_EVENT } from '@/lib/consent';
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
      .then((res) => res.json().catch(() => null))
      .then((json) => {
        try {
          sessionStorage.setItem('visit_tracked', '1');
          // Persist the server session id in FIRST-PARTY localStorage so the
          // order call can forward it as utm_session_id and the backend can link
          // the order to this visit's traffic source. (The backend tracking
          // cookie is third-party and blocked cross-site, so it can't.)
          const sid = json && json.data && json.data.session_id;
          if (sid) localStorage.setItem('utm_session_id', sid);
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* tracking failure — storefront unaffected */
      });
    };
    fire();
    window.addEventListener(CONSENT_EVENT, fire);
    return () => window.removeEventListener(CONSENT_EVENT, fire);
  }, []);

  return null;
}
