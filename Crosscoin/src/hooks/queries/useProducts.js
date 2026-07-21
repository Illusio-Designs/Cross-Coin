import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import {
  getAllPublicProducts,
  getPublicCategories,
  getPublicCategoryByName,
  getPublicSliders,
  getSeoByPageName,
} from '../../services/publicApi';

/** Public categories — 1 hour stale */
export const useCategories = (options = {}) =>
  useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const data = await getPublicCategories();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60 * 60 * 1000,
    ...options,
  });

/** All public products (catalog) — 30 min stale */
export const usePublicProducts = (params = {}) =>
  useQuery({
    queryKey: queryKeys.products(params),
    queryFn: () => getAllPublicProducts(params),
    staleTime: 30 * 60 * 1000,
  });

/** Products by category name — 30 min stale */
export const useCategoryProducts = (categoryName) =>
  useQuery({
    queryKey: queryKeys.categoryProducts(categoryName),
    queryFn: () => getPublicCategoryByName(categoryName),
    staleTime: 30 * 60 * 1000,
    enabled: !!categoryName,
  });

/** Public sliders — 10 min stale */
export const useSliders = () =>
  useQuery({
    queryKey: queryKeys.sliders,
    queryFn: getPublicSliders,
    staleTime: 10 * 60 * 1000,
  });

/** SEO metadata by page name — 1 hour stale */
export const useSeo = (pageName) =>
  useQuery({
    queryKey: queryKeys.seo(pageName),
    queryFn: () => getSeoByPageName(pageName),
    staleTime: 60 * 60 * 1000,
    enabled: !!pageName,
  });
