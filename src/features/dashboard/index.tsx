import React from 'react';
import PageTitle from '@/components/page-title';
import { Line, Doughnut } from '@/components/charts/LazyCharts';
import {
  TbAlertTriangle,
  TbArrowDown,
  TbArrowUp,
  TbBoxMultiple,
  TbRefresh,
  TbShoppingBag,
  TbShoppingCart,
} from 'react-icons/tb';
import { Card } from '@/components/card';
import Button from '@/components/button';

// Import our new dashboard hooks
import {
  useDashboardStats,
  useSalesAnalytics,
  useTopSellingMedicines,
  useLowStockItems,
  useRecentTransactions,
  useMonthlyRevenueComparison,
} from '@/hooks/queries/useDashboard';

// Utility function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(amount);
};

// Utility function to format percentage
const formatPercentage = (percentage: number) => {
  return `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`;
};

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  isLoading?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  color,
  isLoading,
}) => (
  <Card className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-600 mb-1">{title}</p>
        {isLoading ? (
          <div className="h-8 w-20 bg-slate-200 animate-pulse rounded"></div>
        ) : (
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        )}
      </div>
      <div className={`p-3 rounded-full ${color}`}>{icon}</div>
    </div>
  </Card>
);

// Chart Card Component
interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  children,
  isLoading,
  onRefresh,
}) => (
  <Card className="p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {onRefresh && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          className="p-2"
        >
          <TbRefresh className="h-4 w-4" />
        </Button>
      )}
    </div>
    {isLoading ? (
      <div className="h-64 bg-slate-200 animate-pulse rounded"></div>
    ) : (
      children
    )}
  </Card>
);

const DashboardNew = () => {
  // Fetch dashboard data using our new hooks
  const statsQuery = useDashboardStats();
  const salesQuery = useSalesAnalytics(7);
  const topMedicinesQuery = useTopSellingMedicines(5);
  const lowStockQuery = useLowStockItems(10);
  const recentTransactionsQuery = useRecentTransactions(10);
  const monthlyRevenueQuery = useMonthlyRevenueComparison();

  // Prepare chart data
  const salesChartData = React.useMemo(() => {
    if (!salesQuery.data) return { labels: [], datasets: [] };

    return {
      labels: salesQuery.data.labels,
      datasets: [
        {
          label: 'Penjualan Harian',
          data: salesQuery.data.values,
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          tension: 0.4,
        },
      ],
    };
  }, [salesQuery.data]);

  const topMedicinesChartData = React.useMemo(() => {
    if (!topMedicinesQuery.data) return { labels: [], datasets: [] };

    const colors = [
      'rgba(255, 99, 132, 0.6)',
      'rgba(54, 162, 235, 0.6)',
      'rgba(255, 205, 86, 0.6)',
      'rgba(75, 192, 192, 0.6)',
      'rgba(153, 102, 255, 0.6)',
    ];

    const borderColors = [
      'rgba(255, 99, 132, 1)',
      'rgba(54, 162, 235, 1)',
      'rgba(255, 205, 86, 1)',
      'rgba(75, 192, 192, 1)',
      'rgba(153, 102, 255, 1)',
    ];

    return {
      labels: topMedicinesQuery.data.map(item => item.name),
      datasets: [
        {
          label: 'Obat Terlaris',
          data: topMedicinesQuery.data.map(item => item.total_quantity),
          backgroundColor: colors,
          borderColor: borderColors,
          borderWidth: 2,
        },
      ],
    };
  }, [topMedicinesQuery.data]);

  // Handle manual refresh

  const handleRefreshSales = () => {
    salesQuery.refetch();
  };

  const handleRefreshMedicines = () => {
    topMedicinesQuery.refetch();
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <PageTitle title="Dashboard (New Architecture)" />
        <Button
          variant="secondary"
          onClick={() => {
            statsQuery.refetch();
            salesQuery.refetch();
            topMedicinesQuery.refetch();
            lowStockQuery.refetch();
            recentTransactionsQuery.refetch();
            monthlyRevenueQuery.refetch();
          }}
          className="flex items-center gap-2"
        >
          <TbRefresh className="h-4 w-4" />
          Refresh All
        </Button>
      </div>

      {/* Monthly Revenue Comparison */}
      {monthlyRevenueQuery.data && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Revenue Perbandingan
              </h3>
              <p className="text-3xl font-bold text-slate-900">
                {formatCurrency(monthlyRevenueQuery.data.currentMonth)}
              </p>
              <p className="text-sm text-slate-600">Bulan ini</p>
            </div>
            <div className="text-right">
              <div
                className={`flex items-center gap-2 ${
                  monthlyRevenueQuery.data.isIncrease
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {monthlyRevenueQuery.data.isIncrease ? (
                  <TbArrowUp />
                ) : (
                  <TbArrowDown />
                )}
                <span className="font-semibold">
                  {formatPercentage(monthlyRevenueQuery.data.percentageChange)}
                </span>
              </div>
              <p className="text-sm text-slate-600">vs bulan lalu</p>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Penjualan"
          value={
            statsQuery.data ? formatCurrency(statsQuery.data.totalSales) : 0
          }
          icon={<TbShoppingBag className="h-6 w-6 text-white" />}
          color="bg-blue-500"
          isLoading={statsQuery.isLoading}
        />
        <StatsCard
          title="Total Pembelian"
          value={
            statsQuery.data ? formatCurrency(statsQuery.data.totalPurchases) : 0
          }
          icon={<TbShoppingCart className="h-6 w-6 text-white" />}
          color="bg-green-500"
          isLoading={statsQuery.isLoading}
        />
        <StatsCard
          title="Total Obat"
          value={statsQuery.data ? statsQuery.data.totalMedicines : 0}
          icon={<TbBoxMultiple className="h-6 w-6 text-white" />}
          color="bg-purple-500"
          isLoading={statsQuery.isLoading}
        />
        <StatsCard
          title="Stok Menipis"
          value={statsQuery.data ? statsQuery.data.lowStockCount : 0}
          icon={<TbAlertTriangle className="h-6 w-6 text-white" />}
          color="bg-red-500"
          isLoading={statsQuery.isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <ChartCard
          title="Penjualan 7 Hari Terakhir"
          isLoading={salesQuery.isLoading}
          onRefresh={handleRefreshSales}
        >
          {salesQuery.error ? (
            <div className="h-64 flex items-center justify-center text-red-500">
              Error: {salesQuery.error.message}
            </div>
          ) : (
            <div className="h-64">
              <Line
                data={salesChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function (value) {
                          return formatCurrency(Number(value));
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          )}
        </ChartCard>

        {/* Top Medicines Chart */}
        <ChartCard
          title="5 Obat Terlaris"
          isLoading={topMedicinesQuery.isLoading}
          onRefresh={handleRefreshMedicines}
        >
          {topMedicinesQuery.error ? (
            <div className="h-64 flex items-center justify-center text-red-500">
              Error: {topMedicinesQuery.error.message}
            </div>
          ) : (
            <div className="h-64">
              <Doughnut
                data={topMedicinesChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom' as const,
                    },
                  },
                }}
              />
            </div>
          )}
        </ChartCard>
      </div>

      {/* Low Stock Items Alert */}
      {lowStockQuery.data && lowStockQuery.data.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <TbAlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold text-slate-900">
              Peringatan Stok Menipis
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockQuery.data
              .slice(0, 6)
              .map(
                (item: {
                  id: string;
                  name: string;
                  stock: number;
                  item_categories?: { name: string }[];
                  item_packages?: { name: string }[];
                }) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="text-sm text-slate-600">
                        {item.item_categories?.[0]?.name} •{' '}
                        {item.item_packages?.[0]?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">
                        {item.stock}
                      </p>
                      <p className="text-xs text-slate-500">tersisa</p>
                    </div>
                  </div>
                )
              )}
          </div>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Transaksi Terbaru
        </h3>
        {recentTransactionsQuery.isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-12 bg-slate-200 animate-pulse rounded"
              ></div>
            ))}
          </div>
        ) : recentTransactionsQuery.error ? (
          <div className="text-red-500 text-center py-4">
            Error: {recentTransactionsQuery.error.message}
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactionsQuery.data
              ?.slice(0, 8)
              .map(
                (transaction: {
                  id: string;
                  type: 'sale' | 'purchase';
                  invoice_number?: string;
                  counterparty: string;
                  date: string;
                  total: number;
                }) => (
                  <div
                    key={`${transaction.type}-${transaction.id}`}
                    className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          transaction.type === 'sale'
                            ? 'bg-green-100'
                            : 'bg-blue-100'
                        }`}
                      >
                        {transaction.type === 'sale' ? (
                          <TbShoppingBag
                            className={`h-4 w-4 ${
                              transaction.type === 'sale'
                                ? 'text-green-600'
                                : 'text-blue-600'
                            }`}
                          />
                        ) : (
                          <TbShoppingCart className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {transaction.invoice_number ||
                            `${transaction.type === 'sale' ? 'Sale' : 'Purchase'} #${transaction.id.slice(0, 8)}`}
                        </p>
                        <p className="text-sm text-slate-600">
                          {transaction.counterparty} •{' '}
                          {new Date(transaction.date).toLocaleDateString(
                            'id-ID'
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          transaction.type === 'sale'
                            ? 'text-green-600'
                            : 'text-blue-600'
                        }`}
                      >
                        {formatCurrency(transaction.total)}
                      </p>
                      <p className="text-xs text-slate-500 capitalize">
                        {transaction.type}
                      </p>
                    </div>
                  </div>
                )
              )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default DashboardNew;
