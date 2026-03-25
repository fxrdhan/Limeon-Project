import React from 'react';
import { Line } from '@/components/charts/LazyCharts';
import { formatCurrency } from '../constants';
import type {
  SalesAnalyticsSummary,
  SalesPeakSummary,
  TopMedicineSummary,
} from '../types';
import {
  InlineRefreshButton,
  PanelMessage,
  SectionHeader,
} from './DashboardPrimitives';

interface PerformanceSectionProps {
  salesData: SalesAnalyticsSummary | null | undefined;
  topMedicines: TopMedicineSummary[];
  isSalesLoading: boolean;
  isTopMedicinesLoading: boolean;
  salesErrorMessage?: string | null;
  topMedicinesErrorMessage?: string | null;
  onRefreshSales: () => void;
  onRefreshTopMedicines: () => void;
}

const PerformanceSection: React.FC<PerformanceSectionProps> = ({
  salesData,
  topMedicines,
  isSalesLoading,
  isTopMedicinesLoading,
  salesErrorMessage,
  topMedicinesErrorMessage,
  onRefreshSales,
  onRefreshTopMedicines,
}) => {
  const salesChartData = React.useMemo(() => {
    if (!salesData) return { labels: [], datasets: [] };

    return {
      labels: salesData.labels,
      datasets: [
        {
          label: 'Penjualan Harian',
          data: salesData.values,
          borderColor: '#0f766e',
          backgroundColor: 'rgba(15, 118, 110, 0.14)',
          pointBackgroundColor: '#0f766e',
          pointBorderColor: '#f8fafc',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 3,
          fill: true,
          tension: 0.35,
        },
      ],
    };
  }, [salesData]);

  const salesPeak = React.useMemo<SalesPeakSummary | null>(() => {
    if (!salesData || salesData.values.length === 0) return null;

    const peakValue = Math.max(...salesData.values);
    const peakIndex = salesData.values.findIndex(value => value === peakValue);

    return {
      label: salesData.labels[peakIndex] || '-',
      value: peakValue,
    };
  }, [salesData]);

  const topMedicineLeader = topMedicines[0] || null;
  const topMedicineMaxQuantity = Math.max(
    1,
    ...topMedicines.map(item => Number(item.total_quantity))
  );

  return (
    <section className="grid gap-10 border-b border-slate-200 py-10 xl:grid-cols-12">
      <div className="space-y-8 xl:col-span-8 xl:border-r xl:border-slate-200 xl:pr-8">
        <SectionHeader
          eyebrow="Analytics"
          title="Penjualan 7 Hari Terakhir"
          description="Kurva pendapatan mingguan untuk melihat ritme harian dan momentum penjualan."
          action={
            <InlineRefreshButton
              label="Refresh penjualan 7 hari terakhir"
              onClick={onRefreshSales}
            />
          }
        />

        {isSalesLoading ? (
          <div className="space-y-6">
            <div className="h-[320px] animate-pulse rounded-[24px] bg-slate-100" />
            <div className="grid gap-6 border-t border-slate-200 pt-6 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index}>
                  <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
                  <div className="mt-3 h-6 w-20 animate-pulse rounded-2xl bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        ) : salesErrorMessage ? (
          <PanelMessage message={`Error: ${salesErrorMessage}`} tone="error" />
        ) : (
          <>
            <div className="h-[320px]">
              <Line
                data={salesChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      backgroundColor: '#0f172a',
                      padding: 12,
                      displayColors: false,
                      callbacks: {
                        label: function (context) {
                          return formatCurrency(Number(context.raw));
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: {
                        display: false,
                      },
                      border: {
                        display: false,
                      },
                      ticks: {
                        color: '#64748b',
                        font: {
                          size: 11,
                        },
                      },
                    },
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: 'rgba(148, 163, 184, 0.18)',
                        drawTicks: false,
                      },
                      border: {
                        display: false,
                      },
                      ticks: {
                        color: '#64748b',
                        padding: 12,
                        callback: function (value) {
                          return formatCurrency(Number(value));
                        },
                      },
                    },
                  },
                }}
              />
            </div>

            <div className="grid gap-6 border-t border-slate-200 pt-6 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Total 7 Hari
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-950">
                  {formatCurrency(salesData?.totalRevenue || 0)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Rata-rata / Hari
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-950">
                  {formatCurrency(salesData?.averageDaily || 0)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Puncak Tertinggi
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-950">
                  {salesPeak ? formatCurrency(salesPeak.value) : '-'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {salesPeak ? salesPeak.label : 'Belum ada penjualan'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="space-y-8 xl:col-span-4 xl:pl-8">
        <SectionHeader
          eyebrow="Ranking"
          title="5 Obat Terlaris"
          description="Daftar produk paling aktif bergerak agar fokus replenishment dan display lebih jelas."
          action={
            <InlineRefreshButton
              label="Refresh ranking obat terlaris"
              onClick={onRefreshTopMedicines}
            />
          }
        />

        {isTopMedicinesLoading ? (
          <div className="space-y-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="space-y-3 border-b border-slate-200 pb-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-5 w-12 animate-pulse rounded-full bg-slate-200" />
                </div>
                <div className="h-2 animate-pulse rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        ) : topMedicinesErrorMessage ? (
          <PanelMessage
            message={`Error: ${topMedicinesErrorMessage}`}
            tone="error"
          />
        ) : topMedicines.length > 0 ? (
          <div className="space-y-6">
            {topMedicineLeader ? (
              <div className="border-b border-slate-200 pb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Produk Memimpin
                </p>
                <p className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                  {topMedicineLeader.name}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Terjual {topMedicineLeader.total_quantity} unit pada periode
                  data terbaru.
                </p>
              </div>
            ) : null}

            <div className="space-y-5">
              {topMedicines.map((item, index) => {
                const quantity = Number(item.total_quantity);
                const barWidth = Math.max(
                  10,
                  Math.round((quantity / topMedicineMaxQuantity) * 100)
                );

                return (
                  <div
                    key={item.name}
                    className="space-y-3 border-b border-slate-200 pb-4 last:border-b-0 last:pb-0"
                  >
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4">
                      <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">
                        {String(index + 1).padStart(2, '0')}
                      </p>

                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {item.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          Distribusi penjualan tertinggi
                        </p>
                      </div>

                      <p className="text-sm font-semibold text-slate-700">
                        {quantity} unit
                      </p>
                    </div>

                    <div className="h-1.5 overflow-hidden bg-slate-200">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <PanelMessage message="Belum ada data obat terlaris untuk ditampilkan." />
        )}
      </div>
    </section>
  );
};

export default PerformanceSection;
