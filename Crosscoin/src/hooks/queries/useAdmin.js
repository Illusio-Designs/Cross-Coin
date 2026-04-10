import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { shippingFeeService, categoryService, couponService } from '../../services';

// ── Shipping Fees ─────────────────────────────────────────────────────────
export const useShippingFees = () =>
  useQuery({
    queryKey: queryKeys.shippingFees,
    queryFn: shippingFeeService.getAllShippingFees,
    staleTime: 30 * 60 * 1000,
  });

export const useShippingFee = (type) =>
  useQuery({
    queryKey: queryKeys.shippingFee(type),
    queryFn: () => shippingFeeService.getShippingFeeByType(type),
    staleTime: 30 * 60 * 1000,
    enabled: !!type,
  });

export const useCreateShippingFee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: shippingFeeService.createShippingFee,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shippingFees }),
  });
};

export const useUpdateShippingFee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => shippingFeeService.updateShippingFee(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shippingFees }),
  });
};

export const useDeleteShippingFee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: shippingFeeService.deleteShippingFee,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shippingFees }),
  });
};

// ── Categories (Admin) ────────────────────────────────────────────────────
export const useAdminCategories = () =>
  useQuery({
    queryKey: queryKeys.categoriesAdmin,
    queryFn: categoryService.getAllCategories,
    staleTime: 5 * 60 * 1000,
  });

// ── Coupons (Admin) ───────────────────────────────────────────────────────
export const useAdminCoupons = () =>
  useQuery({
    queryKey: queryKeys.couponsAdmin,
    queryFn: couponService.getAllCoupons,
    staleTime: 30 * 60 * 1000,
  });

export const useCreateCoupon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: couponService.createCoupon,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.couponsAdmin }),
  });
};

export const useDeleteCoupon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: couponService.deleteCoupon,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.couponsAdmin }),
  });
};
