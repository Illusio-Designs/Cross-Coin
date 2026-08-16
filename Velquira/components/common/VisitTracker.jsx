'use client';

import { useEffect } from 'react';
import { API_URL, BRAND } from '@/lib/api/client';

/**
 * Fires a single first-party VISIT ping per browser session so the backend
 * can build a brand-wise traffic report. Reads utm_* from the URL, POSTs to
 * the UTM track endpoint, and guards against duplicate pings via
 * sessionStorage. Renders nothing.
 */
export default function VisitTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem('visit_tracked')) return;
    } catch {
      /* sessionStorage unavailable — skip */
    }

    const params = new URLSearchParams(window.location.search);
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
      .then(() => {
        try {
          sessionStorage.setItem('visit_tracked', '1');
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* swallow — tracking is best-effort */
      });
  }, []);

  return null;
}
