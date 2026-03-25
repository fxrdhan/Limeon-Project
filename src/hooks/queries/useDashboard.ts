import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/constants/queryKeys';
import { dashboardService } from '@/services/api/dashboard.service';

// Dashboard Stats Hook
export const useDashboardStats = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.dashboard.stats,
    queryFn: async () => {
      const result = await dashboardService.getDashboardStats();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

// Sales Analytics Hook
export const useSalesAnalytics = (
  days: number = 7,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.dashboard.salesAnalytics(days.toString()),
    queryFn: async () => {
      const result = await dashboardService.getSalesAnalytics(days);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

// Top Selling Medicines Hook
export const useTopSellingMedicines = (
  limit: number = 5,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.dashboard.topSellingMedicines,
    queryFn: async () => {
      const result = await dashboardService.getTopSellingMedicines(limit);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

// Low Stock Items Hook
export const useLowStockItems = (
  threshold: number = 10,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.dashboard.stockAlerts,
    queryFn: async () => {
      const result = await dashboardService.getLowStockItems(threshold);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

// Recent Transactions Hook
export const useRecentTransactions = (
  limit: number = 10,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: QueryKeys.dashboard.recentTransactions(limit),
    queryFn: async () => {
      const result = await dashboardService.getRecentTransactions(limit);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

// Monthly Revenue Comparison Hook
export const useMonthlyRevenueComparison = (options?: {
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: QueryKeys.dashboard.monthlyRevenue,
    queryFn: async () => {
      const result = await dashboardService.getMonthlyRevenueComparison();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

// Combined dashboard data hook for when you need everything
export const useDashboardData = (options?: { enabled?: boolean }) => {
  const statsQuery = useDashboardStats(options);
  const salesQuery = useSalesAnalytics(7, options);
  const topMedicinesQuery = useTopSellingMedicines(5, options);
  const lowStockQuery = useLowStockItems(10, options);
  const recentTransactionsQuery = useRecentTransactions(10, options);
  const monthlyRevenueQuery = useMonthlyRevenueComparison(options);

  return {
    stats: statsQuery.data,
    salesAnalytics: salesQuery.data,
    topMedicines: topMedicinesQuery.data,
    lowStockItems: lowStockQuery.data,
    recentTransactions: recentTransactionsQuery.data,
    monthlyRevenue: monthlyRevenueQuery.data,
    isLoading:
      statsQuery.isLoading ||
      salesQuery.isLoading ||
      topMedicinesQuery.isLoading ||
      lowStockQuery.isLoading ||
      recentTransactionsQuery.isLoading ||
      monthlyRevenueQuery.isLoading,
    isError:
      statsQuery.isError ||
      salesQuery.isError ||
      topMedicinesQuery.isError ||
      lowStockQuery.isError ||
      recentTransactionsQuery.isError ||
      monthlyRevenueQuery.isError,
    errors: {
      stats: statsQuery.error,
      salesAnalytics: salesQuery.error,
      topMedicines: topMedicinesQuery.error,
      lowStock: lowStockQuery.error,
      recentTransactions: recentTransactionsQuery.error,
      monthlyRevenue: monthlyRevenueQuery.error,
    },
    refetch: async () => {
      await Promise.all([
        statsQuery.refetch(),
        salesQuery.refetch(),
        topMedicinesQuery.refetch(),
        lowStockQuery.refetch(),
        recentTransactionsQuery.refetch(),
        monthlyRevenueQuery.refetch(),
      ]);
    },
  };
};
