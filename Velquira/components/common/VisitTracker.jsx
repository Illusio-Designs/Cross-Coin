'use client';

import { useEffect } from 'react';
import { CONSENT_EVENT } from '@/lib/consent';
import { API_URL, BRAND } from '@/lib/api/client';

/**
 * Fires a single first-party VISIT ping per browser session so the backend
 * can build a brand-wise traffic report. Reads utm_* from the URL, POSTs to
 * the UTM track endpoint, and guards against duplicate pings via
 * sessionStorage. Renders nothing.
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
      if (!window.__ccPv) { window.__ccPv = true; try { const _pv = new URLSearchParams(window.location.search); fetch(`${API_URL}/api/public/pageview`, { method: 'POST', keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND }, body: JSON.stringify({ utm_source: _pv.get('utm_source'), utm_medium: _pv.get('utm_medium'), referrer: document.referrer, path: window.location.pathname }) }).catch(function(){}); } catch (e) {} }
      // First-party campaign attribution runs for EVERY visitor (minimal,
      // non-identifying: utm_* + fbclid + a first-party session id) so paid
      // traffic is attributable regardless of cookie choice. GA4, Meta Pixel
      // and Clarity stay consent-gated where they are initialised.
    try {
      if (sessionStorage.getItem('visit_tracked')) return;
    } catch {
      /* sessionStorage unavailable — skip */
    }

    const params = new URLSearchParams(window.location.search);
    // Capture the Meta click id so the order can send _fbc for attribution.
    const _fbclid = params.get('fbclid');
    if (_fbclid) { try { localStorage.setItem('fbclid', _fbclid); } catch { /* ignore */ } }
    const body = {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_term: params.get('utm_term'),
      utm_content: params.get('utm_content'),
      landing_page: window.location.href,
      referrer: document.referrer,
    };

    fetch(`${API_URL}/api/utm/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Brand-Name': BRAND,
      },
      credentials: 'include',
      body: JSON.stringify(body),
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
        /* swallow — tracking is best-effort */
      });
    };
    fire();
    window.addEventListener(CONSENT_EVENT, fire);
    return () => window.removeEventListener(CONSENT_EVENT, fire);
  }, []);

  return null;
}
