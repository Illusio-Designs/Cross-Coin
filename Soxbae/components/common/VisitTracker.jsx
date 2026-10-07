'use client';

import { useEffect } from 'react';
import { getConsent, CONSENT_EVENT } from '@/lib/consent';
import { API_URL, BRAND } from '@/lib/api/client';

/**
 * Fires a single first-party VISIT ping per browser session so the backend can
 * build a brand-wise traffic report. Guarded by sessionStorage so it runs once
 * per session; the backend dedupes per session and derives source/medium from
 * the referrer when no UTM params are present. Renders nothing.
 */
export default function VisitTracker() {
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
      .then((res) => {
        if (!res.ok) return;
        try {
          sessionStorage.setItem('visit_tracked', '1');
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* swallow — tracking must never surface to the user */
      });
    };
    fire();
    window.addEventListener(CONSENT_EVENT, fire);
    return () => window.removeEventListener(CONSENT_EVENT, fire);
  }, []);

  return null;
}
