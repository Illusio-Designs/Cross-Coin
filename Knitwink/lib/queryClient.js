import { QueryClient } from '@tanstack/react-query';

/**
 * Shared React Query client for client-side data fetching.
 *
 * Server-side data (product detail, collection pages, journal posts)
 * uses Next's built-in `fetch` cache via App Router server components.
 * React Query handles CLIENT mutations + cache: wishlist, cart,
 * account profile, order history, etc.
 *
 * Defaults match the Crosscoin client:
 *   - 5 min stale time (most lists rarely change faster than that)
 *   - 30 min garbage collection
 *   - 1 retry (the API client already does retry+backoff for 5xx via
 *     the queue worker; the frontend just needs to survive a single
 *     transient blip)
 *   - No refetch on window focus (annoying on storefronts)
 */
export const queryClient = new QueryClient({
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
