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

export function setConsent({ analytics, marketing }) {
  const val = {
    essential: true,
    analytics: !!analytics,
    marketing: !!marketing,
    v: POLICY_VERSION,
    ts: new Date().toISOString(),
  };
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(val)); } catch {}
  try { window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: val })); } catch {}
  return val;
}

export const acceptAll = () => setConsent({ analytics: true, marketing: true });
export const rejectAll = () => setConsent({ analytics: false, marketing: false });

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
