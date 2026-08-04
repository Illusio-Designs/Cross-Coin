// @generated — DO NOT EDIT. Source: shared/frontend/SentryInit.jsx
// Edit that file then run: node scripts/sync-frontend-shared.mjs
'use client';

import { useEffect } from 'react';

/**
 * Sentry bootstrap — SAFE BY DESIGN.
 *
 * Loads @sentry/browser via a dynamic import inside a post-mount useEffect, so
 * it can NEVER block the build or hydration: it runs after the page is
 * interactive, and every failure path is swallowed. A previous attempt wired
 * @sentry/nextjs as a top-level client import and caused a runtime TDZ crash —
 * this deliberately avoids that by code-splitting the SDK and deferring init.
 *
 * All 7 storefronts share one Sentry project; the `brand` tag separates them.
 * No-op unless NODE_ENV=production (or NEXT_PUBLIC_SENTRY_FORCE=true). The DSN
 * is a send-only public key; env var overrides the baked default.
 */
const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  'https://01cffa04db09960ab1d2d58f5ad3c08b@o4511839897387008.ingest.us.sentry.io/4511839922618368';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'soxbae';

export default function SentryInit() {
  useEffect(() => {
    if (!DSN) return;
    if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_SENTRY_FORCE !== 'true') return;
    if (typeof window === 'undefined' || window.__sentryInited) return;
    window.__sentryInited = true;

    let cancelled = false;
    import('@sentry/browser')
      .then((Sentry) => {
        if (cancelled) return;
        try {
          Sentry.init({
            dsn: DSN,
            environment: process.env.NODE_ENV,
            tracesSampleRate: 0,
            initialScope: { tags: { brand: BRAND } },
          });
        } catch (_) { /* never break the storefront */ }
      })
      .catch(() => { /* SDK failed to load — storefront unaffected */ });

    return () => { cancelled = true; };
  }, []);

  return null;
}
