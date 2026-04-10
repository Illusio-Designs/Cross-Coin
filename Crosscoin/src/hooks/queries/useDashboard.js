import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { dashboardService } from '../../services';

/** Dashboard stats — 5 min stale */
export const useDashboardStats = () =>
  useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const res = await dashboardService.getDashboardStats();
      if (res.success) return res.stats;
      throw new Error('Failed to load dashboard statistics');
    },
    staleTime: 5 * 60 * 1000,
  });
