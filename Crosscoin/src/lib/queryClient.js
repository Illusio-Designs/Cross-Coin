import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutes before data is considered stale
      gcTime: 30 * 60 * 1000,          // 30 minutes garbage collection (was cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

// ── Query key factories ──────────────────────────────────────────────────
// Centralised keys make invalidation predictable and easy.
export const queryKeys = {
  // Public
  categories:       ['categories'],
  products:         (params) => ['products', params],
  productBySlug:    (slug) => ['product', slug],
  categoryProducts: (name) => ['categoryProducts', name],
  sliders:          ['sliders'],
  seo:              (page) => ['seo', page],
  shippingAddresses:['shippingAddresses'],
  couponsPublic:    ['couponsPublic'],

  // Admin / Dashboard
  dashboard:        ['dashboard'],
  shippingFees:     ['shippingFees'],
  shippingFee:      (type) => ['shippingFee', type],
  categoriesAdmin:  ['categoriesAdmin'],
  couponsAdmin:     ['couponsAdmin'],
  consumersAdmin:   ['consumersAdmin'],
  brandsAdmin:      ['brandsAdmin'],
};
