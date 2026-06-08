'use client';

import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { getQueryClient } from '@/lib/queryClient';

/**
 * Client-side bootstrap wrapper.
 *
 * Mounted once near the root of `app/layout.jsx`. Wires:
 *   - ErrorBoundary around every client subtree
 *   - React Query provider for client-side data fetching (per-tab client
 *     created via lib/queryClient's lazy factory — SSR-safe)
 *   - DOMPurify link-hardening hook (external <a> → target=_blank + rel=noopener)
 *   - Global error reporter → Sentry if SDK installed + DSN set, else
 *     POST to /api/client-errors
 *   - One-shot CSRF cookie bootstrap so subsequent state-changing
 *     requests already carry X-CSRF-Token
 *
 * All side-effect modules (sentryAdapter, sanitizeHtml link-hardening,
 * api/client csrf bootstrap) are loaded via dynamic import inside the
 * effect rather than top-of-file. That keeps them out of the SSR chunk
 * which previously triggered a TDZ during static prerender on Next 16
 * + Turbopack.
 *
 * Idempotent — safe to remount during HMR.
 */
export default function ClientProviders({ children }) {
  // Stable per-tab QueryClient: useState's initializer runs once per
  // mount, so we don't churn a new client on every render.
  const [queryClient] = useState(() => getQueryClient());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [{ installLinkHardening }, { installErrorReporter }, { tryInitSentry }, { fetchCsrfToken }] =
          await Promise.all([
            import('@/lib/sanitizeHtml'),
            import('@/lib/errorReporter'),
            import('@/lib/sentryAdapter'),
            import('@/lib/api/client'),
          ]);
        if (cancelled) return;
        installLinkHardening();
        installErrorReporter(tryInitSentry() || undefined);
        fetchCsrfToken();
      } catch {
        // Bootstrap failures shouldn't crash the app — we just lose
        // link-hardening, Sentry, and CSRF. The app still functions.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}