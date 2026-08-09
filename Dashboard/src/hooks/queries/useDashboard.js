import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { dashboardService } from '../../services';

/**
 * Dashboard stats — 5 min stale, supports date filter.
 * `enabled` gates the fetch so roles that never see the reporting home
 * (e.g. WhatsApp / product managers) don't pull store-wide financials.
 */
export const useDashboardStats = (dateFilter = {}, { enabled = true } = {}) =>
  useQuery({
    queryKey: [...queryKeys.dashboard, dateFilter.start_date || '', dateFilter.end_date || ''],
    queryFn: async () => {
      const params = {};
      if (dateFilter.start_date) params.start_date = dateFilter.start_date;
      if (dateFilter.end_date) params.end_date = dateFilter.end_date;
      const res = await dashboardService.getDashboardStats(params);
      if (res.success) return res.stats;
      throw new Error('Failed to load dashboard statistics');
    },
    // Keep the figures fresh: 60s stale (matches the backend cache TTL) and a
    // refetch when the admin returns to the tab, so the dashboard reflects new
    // orders / confirms quickly instead of showing 5-minute-old numbers.
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    enabled,
  });
