'use client';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { installErrorReporter } from '@/lib/errorReporter';
import { tryInitSentry } from '@/lib/sentryAdapter';
import { installLinkHardening } from '@/lib/sanitizeHtml';
import { fetchCsrfToken } from '@/lib/api/client';
import { queryClient } from '@/lib/queryClient';

/**
 * Client-side bootstrap wrapper.
 *
 * Mounted once near the root of `app/layout.jsx`. Wires:
 *   - ErrorBoundary around every client subtree
 *   - React Query provider for client-side data fetching
 *   - DOMPurify link-hardening hook (external <a> → target=_blank + rel=noopener)
 *   - Global error reporter → Sentry if SDK installed + DSN set, else
 *     POST to /api/client-errors
 *   - One-shot CSRF cookie bootstrap so subsequent state-changing
 *     requests already carry X-CSRF-Token
 *
 * Idempotent — safe to remount during HMR.
 */
export default function ClientProviders({ children }) {
  useEffect(() => {
    installLinkHardening();
    installErrorReporter(tryInitSentry() || undefined);
    fetchCsrfToken();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
