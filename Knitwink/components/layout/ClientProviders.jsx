'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { queryClient } from '@/lib/queryClient';

/**
 * Client-side bootstrap wrapper — minimal version.
 *
 * Sentry / sanitiser link-hardening / error reporter / CSRF bootstrap
 * have been temporarily removed while we diagnose a runtime TDZ
 * ("Cannot access 'e1' before initialization") in the production
 * client chunk. Those features will come back once the cycle is
 * identified.
 *
 * Idempotent — safe to remount during HMR.
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