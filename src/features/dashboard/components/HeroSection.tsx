import React from 'react';
import Button from '@/components/button';
import {
  TbAlertTriangle,
  TbArrowDown,
  TbArrowUp,
  TbBoxMultiple,
  TbRefresh,
  TbShoppingBag,
  TbShoppingCart,
} from 'react-icons/tb';
import { formatCurrency, formatPercentage } from '../constants';
import type { DashboardStatsSummary, MonthlyRevenueSummary } from '../types';
import { InfoChip, MetricRailItem } from './DashboardPrimitives';

interface HeroSectionProps {
  stats: DashboardStatsSummary | null | undefined;
  monthlyRevenue: MonthlyRevenueSummary | null | undefined;
  recentTransactionsCount: number;
  salesTotalRevenue: number;
  salesAverageDaily: number;
  isStatsLoading: boolean;
  isSalesLoading: boolean;
  isRecentTransactionsLoading: boolean;
  isMonthlyRevenueLoading: boolean;
  isAnyFetching: boolean;
  onRefreshAll: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  stats,
  monthlyRevenue,
  recentTransactionsCount,
  salesTotalRevenue,
  salesAverageDaily,
  isStatsLoading,
  isSalesLoading,
  isRecentTransactionsLoading,
  isMonthlyRevenueLoading,
  isAnyFetching,
  onRefreshAll,
}) => {
  return (
    <section className="border-b border-slate-200 pb-10">
      <div className="grid gap-10 xl:grid-cols-12">
        <div className="space-y-8 pt-2 xl:col-span-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-600">
                Operations Board
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.2rem]">
                Dashboard Apotek
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Ikhtisar operasional harian untuk memantau ritme penjualan,
                pembelian, inventori, dan transaksi yang butuh perhatian.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-700">
                Auto refresh aktif
              </span>

              <Button
                variant="secondary"
                size="sm"
                onClick={onRefreshAll}
                className="!gap-2 !rounded-full !bg-slate-900 !px-4 !py-2 !text-white shadow-none"
              >
                <TbRefresh
                  className={`h-4 w-4 ${isAnyFetching ? 'animate-spin' : ''}`}
                />
                Refresh All
              </Button>
            </div>
          </div>

          <div className="grid gap-8 border-t border-slate-200 pt-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-end">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Pendapatan bulan ini
                </p>

                {isMonthlyRevenueLoading ? (
                  <div className="mt-4 h-12 w-64 animate-pulse rounded-2xl bg-slate-200" />
                ) : (
                  <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                    {formatCurrency(monthlyRevenue?.currentMonth || 0)}
                  </p>
                )}
              </div>

              {monthlyRevenue ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <div
                    className={`inline-flex items-center gap-2 font-semibold ${
                      monthlyRevenue.isIncrease
                        ? 'text-emerald-700'
                        : 'text-rose-600'
                    }`}
                  >
                    {monthlyRevenue.isIncrease ? (
                      <TbArrowUp className="h-4 w-4" />
                    ) : (
                      <TbArrowDown className="h-4 w-4" />
                    )}
                    {formatPercentage(monthlyRevenue.percentageChange)}
                  </div>

                  <span className="text-slate-500">
                    dibanding {formatCurrency(monthlyRevenue.previousMonth)}{' '}
                    bulan lalu
                  </span>
                </div>
              ) : null}
            </div>

            <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
              <InfoChip
                label="7 Hari Terakhir"
                value={formatCurrency(salesTotalRevenue)}
                tone="sky"
                isLoading={isSalesLoading}
              />
              <InfoChip
                label="Rata-rata / Hari"
                value={formatCurrency(salesAverageDaily)}
                tone="emerald"
                isLoading={isSalesLoading}
              />
              <InfoChip
                label="Feed Aktivitas"
                value={`${recentTransactionsCount} transaksi`}
                tone="amber"
                isLoading={isRecentTransactionsLoading}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-8 xl:col-span-5 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-2">
          <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
            <MetricRailItem
              title="Total Penjualan"
              value={formatCurrency(stats?.totalSales || 0)}
              meta="Akumulasi seluruh invoice penjualan yang sudah tercatat."
              icon={<TbShoppingBag className="h-6 w-6" />}
              accentClass="border-emerald-500"
              iconClass="text-emerald-700"
              isLoading={isStatsLoading}
            />
            <MetricRailItem
              title="Total Pembelian"
              value={formatCurrency(stats?.totalPurchases || 0)}
              meta="Total nilai pembelian untuk menjaga suplai inventori."
              icon={<TbShoppingCart className="h-6 w-6" />}
              accentClass="border-sky-500"
              iconClass="text-sky-700"
              isLoading={isStatsLoading}
            />
            <MetricRailItem
              title="Total Obat"
              value={stats?.totalMedicines || 0}
              meta="Jumlah SKU aktif yang saat ini tersedia di sistem."
              icon={<TbBoxMultiple className="h-6 w-6" />}
              accentClass="border-amber-500"
              iconClass="text-amber-700"
              isLoading={isStatsLoading}
            />
            <MetricRailItem
              title="Stok Menipis"
              value={stats?.lowStockCount || 0}
              meta="Item yang sudah masuk ambang restock dan perlu perhatian."
              icon={<TbAlertTriangle className="h-6 w-6" />}
              accentClass="border-rose-500"
              iconClass="text-rose-700"
              isLoading={isStatsLoading}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
