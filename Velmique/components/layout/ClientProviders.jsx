'use client';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { installLinkHardening } from '@/lib/sanitizeHtml';
import { installErrorReporter } from '@/lib/errorReporter';
import { tryInitSentry } from '@/lib/sentryAdapter';
import { fetchCsrfToken } from '@/lib/api/client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

/**
 * Single client-side bootstrap shim.
 *
 *   - DOMPurify link-hardening hook (external links → target=_blank rel=noopener noreferrer)
 *   - Window error / unhandled-rejection / velmique:error → reporter sink
 *   - Sentry auto-init if installed + DSN set, otherwise default /api/client-errors sink
 *   - CSRF token mirror on the API client cookie
 *   - Whole-app ErrorBoundary so a single bad component never blanks the page
 *   - React Query for caching of server-derived data
 */
export default function ClientProviders({ children }) {
  useEffect(() => {
    installLinkHardening();
    installErrorReporter(tryInitSentry() || undefined);
    fetchCsrfToken().catch(() => { /* server may not be reachable in dev */ });
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
