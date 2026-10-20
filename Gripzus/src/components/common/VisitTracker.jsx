import { useEffect } from 'react'
import { CONSENT_EVENT } from '../../lib/consent'

/* First-party VISIT tracker — pings the UTM endpoint once per browser
   session so the backend can build a brand-wise traffic report. Backend
   dedupes per session and derives source/medium from the referrer when
   no UTM params are present, so we just fire once. */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'
const BRAND   = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'gripzus'

export default function VisitTracker() {
  useEffect(() => {
    // Capture the Facebook click id (fbclid) from the URL so checkout can
    // rebuild an _fbc value for the Conversions API when the cookie is absent.
    // Best-effort — never throw.
    try {
      const fbclid = new URLSearchParams(window.location.search).get('fbclid')
      if (fbclid) localStorage.setItem('fbclid', fbclid)
    } catch { /* localStorage/URL unavailable — swallow */ }

    const fire = () => {
      if (!window.__ccPv) { window.__ccPv = true; try { const _pv = new URLSearchParams(window.location.search); fetch(`${API_URL}/api/i/pv`, { method: 'POST', keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND }, body: JSON.stringify({ utm_source: _pv.get('utm_source'), utm_medium: _pv.get('utm_medium'), referrer: document.referrer, path: window.location.pathname }) }).catch(function(){}); } catch (e) {} }
      // First-party campaign attribution runs for EVERY visitor (minimal,
      // non-identifying: utm_* + fbclid) so paid traffic is attributable
      // regardless of cookie choice. GA4 / Pixel / Clarity stay consent-gated.
    try {
      if (sessionStorage.getItem('visit_tracked')) return

      const params = new URLSearchParams(window.location.search)
      const body = {
        utm_source:   params.get('utm_source'),
        utm_medium:   params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
        utm_term:     params.get('utm_term'),
        utm_content:  params.get('utm_content'),
        utm_creative: params.get('utm_creative') || [...params.keys()].find((k) => !params.get(k) && /^[A-Za-z0-9._-]{5,40}$/.test(k) && !/^utm_/i.test(k) && !['fbclid','gclid','gbraid','wbraid','sfnsn','mibextid','igshid','ttclid','twclid','msclkid','yclid','_ga','_gl'].includes(k.toLowerCase())) || null,
        landing_page: window.location.href,
        referrer:     document.referrer,
      }

      fetch(`${API_URL}/api/i/s`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
        credentials: 'include',
        body: JSON.stringify(body),
      })
        .then((res) => (res.ok ? res.json().catch(() => null) : Promise.resolve(null)).then((json) => {
          // First-party copy of the server visit id: the api cookie is
          // third-party here, so orders and funnel events forward this instead.
          // Stored before the flag, which the funnel relay waits on.
          try {
            const sid = json && json.data && json.data.session_id
            if (sid) localStorage.setItem('utm_session_id', sid)
          } catch { /* ignore */ }
          if (res.ok) sessionStorage.setItem('visit_tracked', '1')
        }))
        .catch(() => {})
    } catch {
      /* sessionStorage unavailable or other error — swallow */
    }
    };
    fire();
    window.addEventListener(CONSENT_EVENT, fire);
    return () => window.removeEventListener(CONSENT_EVENT, fire);
  }, [])

  return null
}
