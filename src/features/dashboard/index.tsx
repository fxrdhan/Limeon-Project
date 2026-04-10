import { useDashboardRealtime } from '@/hooks/realtime/useDashboardRealtime';
import {
  useDashboardSummary,
  useLowStockItems,
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

  const summaryQuery = useDashboardSummary();
  const salesQuery = useSalesAnalytics(7);
  const topMedicinesQuery = useTopSellingMedicines(5);
  const lowStockQuery = useLowStockItems(10);
  const recentTransactionsQuery = useRecentTransactions(10);

  const isSummaryLoading = summaryQuery.isLoading && !summaryQuery.data;
  const isSalesLoading = salesQuery.isLoading && !salesQuery.data;
  const isTopMedicinesLoading =
    topMedicinesQuery.isLoading && !topMedicinesQuery.data;
  const isLowStockLoading = lowStockQuery.isLoading && !lowStockQuery.data;
  const isRecentTransactionsLoading =
    recentTransactionsQuery.isLoading && !recentTransactionsQuery.data;

  const lowStockItems = (lowStockQuery.data || []) as LowStockItem[];
  const recentTransactions = (recentTransactionsQuery.data ||
    []) as RecentTransaction[];

  return (
    <div className="w-full px-1 pb-6 pt-2 sm:px-2 lg:px-4">
      <HeroSection
        stats={summaryQuery.data?.stats}
        monthlyRevenue={summaryQuery.data?.monthlyRevenue}
        recentTransactionsCount={recentTransactions.length}
        salesTotalRevenue={salesQuery.data?.totalRevenue || 0}
        salesAverageDaily={salesQuery.data?.averageDaily || 0}
        isStatsLoading={isSummaryLoading}
        isSalesLoading={isSalesLoading}
        isRecentTransactionsLoading={isRecentTransactionsLoading}
        isMonthlyRevenueLoading={isSummaryLoading}
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
