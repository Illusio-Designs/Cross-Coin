import { useEffect } from 'react'

/* First-party VISIT tracker — pings the UTM endpoint once per browser
   session so the backend can build a brand-wise traffic report. Backend
   dedupes per session and derives source/medium from the referrer when
   no UTM params are present, so we just fire once. */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'
const BRAND   = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'gripzus'

export default function VisitTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem('visit_tracked')) return

      const params = new URLSearchParams(window.location.search)
      const body = {
        utm_source:   params.get('utm_source'),
        utm_medium:   params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
        utm_term:     params.get('utm_term'),
        utm_content:  params.get('utm_content'),
        landing_page: window.location.href,
        referrer:     document.referrer,
      }

      fetch(`${API_URL}/api/utm/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
        credentials: 'include',
        body: JSON.stringify(body),
      })
        .then((res) => {
          if (res.ok) sessionStorage.setItem('visit_tracked', '1')
        })
        .catch(() => {})
    } catch {
      /* sessionStorage unavailable or other error — swallow */
    }
  }, [])

  return null
}
