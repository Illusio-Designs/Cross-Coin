import { QueryClient } from '@tanstack/react-query';

/**
 * Shared React Query client factory for client-side data fetching.
 *
 * IMPORTANT — lazy factory pattern, NOT a top-level singleton.
 *
 * The previous version exported `export const queryClient = new
 * QueryClient(...)` at module top level. That tripped two problems:
 *
 *   1. SSR anti-pattern. Every request would share one QueryClient
 *      across users — a user-A invalidation could leak cached results
 *      to user-B because the module instance is cached by Node.
 *   2. TDZ during static prerender. Top-level `new QueryClient()` side
 *      effect runs at module load time, and Next 16 + Turbopack's
 *      SSR chunk bundling occasionally hits a 'Cannot access X before
 *      initialization' error when a heavy provider stack initializes
 *      out of order during static page generation.
 *
 * The factory pattern below sidesteps both: on the server we make a
 * fresh QueryClient per request, on the browser we memoize one per
 * tab. This matches the official React Query SSR guidance.
 *
 * Defaults match the Crosscoin client:
 *   - 5 min stale time (most lists rarely change faster than that)
 *   - 30 min garbage collection
 *   - 1 retry (the API client already does retry+backoff for 5xx via
 *     the queue worker; the frontend just needs to survive a single
 *     transient blip)
 *   - No refetch on window focus (annoying on storefronts)
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
  });
}

let browserQueryClient;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

// Centralised query keys make invalidation predictable.
export const queryKeys = {
  // Account / authenticated user
  me:               ['me'],
  orders:           ['orders'],
  order:            (id) => ['order', id],
  shippingAddresses:['shippingAddresses'],

  // Wishlist
  wishlist:         ['wishlist'],

  // Public
  cart:             ['cart'],
  sliders:          ['sliders'],
  categories:       ['categories'],
  category:         (handle) => ['category', handle],
};