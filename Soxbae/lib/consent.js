'use client';
import { useEffect, useState } from 'react';

/* ─────────────────────────────────────────────────────────────
   Cookie / tracking consent (DPDP Act 2023).

   Three categories:
     • essential — always on (cart, login, security); never tracked here.
     • analytics — GA4, Microsoft Clarity, Vercel Speed Insights, first-party
       visit tracking. Off until the user opts in.
     • marketing — Meta Pixel and any ad/retargeting tag. Off until opt-in.

   Nothing in the analytics/marketing categories may run until getConsent()
   reports that category true. Choice is stored per-browser; changing it fires
   CONSENT_EVENT so live components (Analytics, VisitTracker) react at once.
   ───────────────────────────────────────────────────────────── */

export const CONSENT_KEY = 'vlm-consent-v1';
export const CONSENT_EVENT = 'vlm-consent-change';
export const OPEN_SETTINGS_EVENT = 'vlm-open-cookie-settings';
const POLICY_VERSION = 1;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || '';

// Fire-and-forget: record each consent decision on the server (DPDP S6). Never
// throws; a logging failure must not affect the storefront. credentials:'include'
// sends the shared session_id cookie so the record ties to the same session.
function postConsent(val, action, source) {
  if (typeof window === 'undefined') return;
  try {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/consent`, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(BRAND ? { 'X-Brand-Name': BRAND } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        analytics: !!val.analytics,
        marketing: !!val.marketing,
        action: action || 'update',
        source: source || 'banner',
        notice_version: String(POLICY_VERSION),
      }),
    }).catch(() => {});
  } catch {}
}

const DENIED = { essential: true, analytics: false, marketing: false, set: false };

export function getConsent() {
  if (typeof window === 'undefined') return { ...DENIED };
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return { ...DENIED };
    const p = JSON.parse(raw);
    return { essential: true, analytics: !!p.analytics, marketing: !!p.marketing, set: true };
  } catch {
    return { ...DENIED };
  }
}

export function setConsent({ analytics, marketing }, meta = {}) {
  const val = {
    essential: true,
    analytics: !!analytics,
    marketing: !!marketing,
    v: POLICY_VERSION,
    ts: new Date().toISOString(),
  };
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(val)); } catch {}
  try { window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: val })); } catch {}
  postConsent(val, meta.action || 'custom', meta.source || 'banner');
  return val;
}

export const acceptAll = () => setConsent({ analytics: true, marketing: true }, { action: 'accept_all' });
export const rejectAll = () => setConsent({ analytics: false, marketing: false }, { action: 'reject' });

// Re-open the cookie preferences panel (e.g. from a footer "Cookie settings" link).
export function openCookieSettings() {
  try { window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT)); } catch {}
}

// Live consent for React components — re-renders when the choice changes.
export function useConsent() {
  const [c, setC] = useState(() => getConsent());
  useEffect(() => {
    const sync = () => setC(getConsent());
    window.addEventListener(CONSENT_EVENT, sync);
    window.addEventListener('storage', sync);
    sync(); // pick up any value written before hydration
    return () => {
      window.removeEventListener(CONSENT_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return c;
}
