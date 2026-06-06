'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  initiateCheckout,
  initiateGuestCheckout,
  createOrder,
  createGuestOrder,
  cancelOrder,
} from '@/lib/api/orders';
import { queryKeys } from '@/lib/queryClient';

/**
 * React Query mutations for the checkout flow.
 *
 * The CartDrawer + cart page can adopt these incrementally as they
 * touch the checkout flow. Each mutation:
 *   - automatically retries 0 times (checkout is non-idempotent without
 *     an explicit idempotency_key, so the caller must supply one if
 *     retry is desired)
 *   - invalidates queryKeys.orders on success so /account shows the
 *     new order without a manual refetch
 *   - surfaces typed `error` state for the form to read instead of
 *     awaiting the raw promise
 *
 *   const checkout = useInitiateCheckout();
 *   await checkout.mutateAsync({ shipping_address_id, items, payment_type });
 *   if (checkout.error) ...
 */

export function useInitiateCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: initiateCheckout,
    retry: 0,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.orders }),
  });
}

export function useInitiateGuestCheckout() {
  return useMutation({
    mutationFn: initiateGuestCheckout,
    retry: 0,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    retry: 0,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.orders }),
  });
}

export function useCreateGuestOrder() {
  return useMutation({
    mutationFn: createGuestOrder,
    retry: 0,
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason }) => cancelOrder(orderId, reason),
    retry: 0,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.orders }),
  });
}
