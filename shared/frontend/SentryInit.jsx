'use client';

import { useEffect } from 'react';

/**
 * Sentry bootstrap — SAFE BY DESIGN.
 *
 * Loads @sentry/browser via a dynamic import on the shopper's first
 * interaction, the first error, or 30 s after load (then when the browser is
 * idle), so it can NEVER block the build, the first paint or hydration; errors
 * before that are queued and sent once it is ready, and every failure path is
 * swallowed. A previous attempt wired
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
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || '__BRAND__';

// Errors that happen before the SDK is loaded are kept here and sent once it
// is ready, so delaying the SDK loses nothing.
const EARLY_MAX = 20;

export default function SentryInit() {
  useEffect(() => {
    if (!DSN) return;
    if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_SENTRY_FORCE !== 'true') return;
    if (typeof window === 'undefined' || window.__sentryInited) return;
    window.__sentryInited = true;

    const early = [];
    let idleId = null;
    let timer = null;
    let started = false;
    let cancelled = false;
    const TRIGGERS = ['pointerdown', 'keydown', 'touchstart', 'scroll'];

    const load = () => {
      if (cancelled) return;
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
            window.removeEventListener('error', onError);
            window.removeEventListener('unhandledrejection', onRejection);
            early.splice(0).forEach((err) => {
              try { Sentry.captureException(err instanceof Error ? err : new Error(String(err))); } catch (_) { /* ignore */ }
            });
          } catch (_) { /* never break the storefront */ }
        })
        .catch(() => { /* SDK failed to load — storefront unaffected */ });
    };
    // The SDK is ~450 KB of JavaScript. It loads when the shopper first
    // interacts (tap, key, scroll), when an error happens, or 30 s after the
    // page has loaded — whichever comes first — and then at the next idle
    // moment, so its parsing never lands on the first paint, on hydration or
    // on the tap itself. (Loaded on a timer a few seconds after load it still
    // showed up in page-speed tests as one long task — their simulated
    // timeline ignores timers.) Errors before it loads are kept and sent.
    const start = () => {
      if (started || cancelled) return;
      started = true;
      clearTimeout(timer);
      TRIGGERS.forEach((t) => window.removeEventListener(t, start, true));
      if (typeof window.requestIdleCallback === 'function') idleId = window.requestIdleCallback(load, { timeout: 3000 });
      else setTimeout(load, 1);
    };
    const onError = (e) => { if (early.length < EARLY_MAX) early.push(e?.error || e?.message || e); start(); };
    const onRejection = (e) => { if (early.length < EARLY_MAX) early.push(e?.reason ?? e); start(); };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    TRIGGERS.forEach((t) => window.addEventListener(t, start, { capture: true, passive: true, once: true }));
    const schedule = () => { timer = setTimeout(start, 30000); };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (idleId != null && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
      TRIGGERS.forEach((t) => window.removeEventListener(t, start, true));
      window.removeEventListener('load', schedule);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
