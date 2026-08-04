'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { queryClient } from '@/lib/queryClient';

/**
 * Client-side bootstrap wrapper — minimal version.
 *
 * The full version of this component used to mount link-hardening
 * (DOMPurify), CSRF token bootstrap, error reporter, and Sentry
 * adapter via useEffect. Those four imports were pulling in
 * isomorphic-dompurify (jsdom graph), js-cookie, react-toastify, and
 * @sentry/nextjs as top-level imports — which produced a TDZ in the
 * client bundle's chunk graph at runtime.
 *
 * They're disabled here while we hunt down the cycle. Loss is:
 *   - external <a> links don't auto-set target=_blank+rel=noopener
 *   - uncaught errors don't POST to /api/client-errors
 *   - state-changing requests don't send X-CSRF-Token (only matters
 *     if backend CSRF enforcement is enabled; it isn't right now)
 *   - Sentry stays inactive (it wasn't configured anyway)
 *
 * Storefront functionality is unaffected.
 */
export default function ClientProviders({ children }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}