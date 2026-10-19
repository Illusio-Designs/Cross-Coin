import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { categoryService, couponService } from '../../services';

// ── Categories (Admin) ────────────────────────────────────────────────────
export const useAdminCategories = () =>
  useQuery({
    queryKey: queryKeys.categoriesAdmin,
    queryFn: categoryService.getAllCategories,
    staleTime: 5 * 60 * 1000,
  });
