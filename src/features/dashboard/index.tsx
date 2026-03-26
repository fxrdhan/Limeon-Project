import { useDashboardRealtime } from '@/hooks/realtime';
import {
  useDashboardStats,
  useLowStockItems,
  useMonthlyRevenueComparison,
  useRecentTransactions,
  useSalesAnalytics,
  useTopSellingMedicines,
} from '@/hooks/queries/useDashboard';
import HeroSection from './components/HeroSection';
import OperationsSection from './components/OperationsSection';
import PerformanceSection from './components/PerformanceSection';
import type { LowStockItem, RecentTransaction } from './types';

const DashboardNew = () => {
  useDashboardRealtime();

  const statsQuery = useDashboardStats();
  const salesQuery = useSalesAnalytics(7);
  const topMedicinesQuery = useTopSellingMedicines(5);
  const lowStockQuery = useLowStockItems(10);
  const recentTransactionsQuery = useRecentTransactions(10);
  const monthlyRevenueQuery = useMonthlyRevenueComparison();

  const isStatsLoading = statsQuery.isLoading && !statsQuery.data;
  const isSalesLoading = salesQuery.isLoading && !salesQuery.data;
  const isTopMedicinesLoading =
    topMedicinesQuery.isLoading && !topMedicinesQuery.data;
  const isLowStockLoading = lowStockQuery.isLoading && !lowStockQuery.data;
  const isRecentTransactionsLoading =
    recentTransactionsQuery.isLoading && !recentTransactionsQuery.data;
  const isMonthlyRevenueLoading =
    monthlyRevenueQuery.isLoading && !monthlyRevenueQuery.data;

  const lowStockItems = (lowStockQuery.data || []) as LowStockItem[];
  const recentTransactions = (recentTransactionsQuery.data ||
    []) as RecentTransaction[];

  return (
    <div className="w-full px-1 pb-6 pt-2 sm:px-2 lg:px-4">
      <HeroSection
        stats={statsQuery.data}
        monthlyRevenue={monthlyRevenueQuery.data}
        recentTransactionsCount={recentTransactions.length}
        salesTotalRevenue={salesQuery.data?.totalRevenue || 0}
        salesAverageDaily={salesQuery.data?.averageDaily || 0}
        isStatsLoading={isStatsLoading}
        isSalesLoading={isSalesLoading}
        isRecentTransactionsLoading={isRecentTransactionsLoading}
        isMonthlyRevenueLoading={isMonthlyRevenueLoading}
      />

      <PerformanceSection
        salesData={salesQuery.data}
        topMedicines={topMedicinesQuery.data || []}
        isSalesLoading={isSalesLoading}
        isTopMedicinesLoading={isTopMedicinesLoading}
        salesErrorMessage={salesQuery.error?.message}
        topMedicinesErrorMessage={topMedicinesQuery.error?.message}
      />

      <OperationsSection
        recentTransactions={recentTransactions}
        lowStockItems={lowStockItems}
        isRecentTransactionsLoading={isRecentTransactionsLoading}
        isLowStockLoading={isLowStockLoading}
        recentTransactionsErrorMessage={recentTransactionsQuery.error?.message}
        lowStockErrorMessage={lowStockQuery.error?.message}
      />
    </div>
  );
};

export default DashboardNew;
