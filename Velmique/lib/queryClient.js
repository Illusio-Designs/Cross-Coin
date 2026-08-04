import { QueryClient } from '@tanstack/react-query';

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

export const queryKeys = {
  me: ['me'],
  orders: ['orders'],
  order: (id) => ['order', id],
  shippingAddresses: ['shippingAddresses'],
  wishlist: ['wishlist'],
  cart: ['cart'],
  sliders: ['sliders'],
  categories: ['categories'],
  category: (handle) => ['category', handle],
  products: ['products'],
  product: (handle) => ['product', handle],
  bestsellers: ['bestsellers'],
};
