import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useDashboardStats,
  useSalesAnalytics,
  useTopSellingMedicines,
  useLowStockItems,
  useRecentTransactions,
  useMonthlyRevenueComparison,
  useDashboardData,
} from './useDashboard';
import { QueryKeys } from '@/constants/queryKeys';

const useQueryMock = vi.hoisted(() => vi.fn());
const dashboardServiceMock = vi.hoisted(() => ({
  getDashboardStats: vi.fn(),
  getSalesAnalytics: vi.fn(),
  getTopSellingMedicines: vi.fn(),
  getLowStockItems: vi.fn(),
  getRecentTransactions: vi.fn(),
  getMonthlyRevenueComparison: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
}));

vi.mock('@/services/api/dashboard.service', () => ({
  dashboardService: dashboardServiceMock,
}));

describe('useDashboard hooks', () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    Object.values(dashboardServiceMock).forEach(fn => fn.mockReset());

    useQueryMock.mockImplementation(
      (config: {
        queryKey: readonly unknown[];
        queryFn: () => Promise<unknown>;
        enabled?: boolean;
        refetchInterval?: number;
        staleTime?: number;
      }) => ({
        queryKey: config.queryKey,
        queryFn: config.queryFn,
        enabled: config.enabled,
        refetchInterval: config.refetchInterval,
        staleTime: config.staleTime,
        data: null,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
      })
    );
  });

  it('wires dashboard query hooks to service functions and schedules', async () => {
    dashboardServiceMock.getDashboardStats.mockResolvedValueOnce({
      data: { total_sales: 10 },
      error: null,
    });
    dashboardServiceMock.getSalesAnalytics.mockResolvedValueOnce({
      data: [{ day: 'Mon', sales: 5 }],
      error: null,
    });
    dashboardServiceMock.getTopSellingMedicines.mockResolvedValueOnce({
      data: [{ id: 'item-1' }],
      error: null,
    });
    dashboardServiceMock.getLowStockItems.mockResolvedValueOnce({
      data: [{ id: 'item-2' }],
      error: null,
    });
    dashboardServiceMock.getRecentTransactions.mockResolvedValueOnce({
      data: [{ id: 'trx-1' }],
      error: null,
    });
    dashboardServiceMock.getMonthlyRevenueComparison.mockResolvedValueOnce({
      data: { current: 100, previous: 80 },
      error: null,
    });

    const { result: stats } = renderHook(() =>
      useDashboardStats({ enabled: false })
    );
    expect(stats.current.queryKey).toEqual(QueryKeys.dashboard.stats);
    expect(stats.current.enabled).toBe(false);
    expect(stats.current.refetchInterval).toBe(5 * 60 * 1000);
    expect(stats.current.staleTime).toBe(2 * 60 * 1000);
    await expect(stats.current.queryFn()).resolves.toEqual({ total_sales: 10 });

    const { result: sales } = renderHook(() => useSalesAnalytics(30));
    expect(sales.current.queryKey).toEqual(
      QueryKeys.dashboard.salesAnalytics('30')
    );
    expect(sales.current.refetchInterval).toBe(10 * 60 * 1000);
    expect(sales.current.staleTime).toBe(5 * 60 * 1000);
    await expect(sales.current.queryFn()).resolves.toEqual([
      { day: 'Mon', sales: 5 },
    ]);

    const { result: top } = renderHook(() => useTopSellingMedicines(8));
    expect(top.current.queryKey).toEqual(
      QueryKeys.dashboard.topSellingMedicines
    );
    expect(top.current.refetchInterval).toBe(15 * 60 * 1000);
    expect(top.current.staleTime).toBe(10 * 60 * 1000);
    await expect(top.current.queryFn()).resolves.toEqual([{ id: 'item-1' }]);

    const { result: lowStock } = renderHook(() => useLowStockItems(4));
    expect(lowStock.current.queryKey).toEqual(QueryKeys.dashboard.stockAlerts);
    expect(lowStock.current.refetchInterval).toBe(3 * 60 * 1000);
    expect(lowStock.current.staleTime).toBe(1 * 60 * 1000);
    await expect(lowStock.current.queryFn()).resolves.toEqual([
      { id: 'item-2' },
    ]);

    const { result: recent } = renderHook(() => useRecentTransactions(12));
    expect(recent.current.queryKey).toEqual(
      QueryKeys.dashboard.recentTransactions(12)
    );
    expect(recent.current.refetchInterval).toBe(5 * 60 * 1000);
    expect(recent.current.staleTime).toBe(2 * 60 * 1000);
    await expect(recent.current.queryFn()).resolves.toEqual([{ id: 'trx-1' }]);

    const { result: monthly } = renderHook(() => useMonthlyRevenueComparison());
    expect(monthly.current.queryKey).toEqual(
      QueryKeys.dashboard.monthlyRevenue
    );
    expect(monthly.current.refetchInterval).toBe(60 * 60 * 1000);
    expect(monthly.current.staleTime).toBe(30 * 60 * 1000);
    await expect(monthly.current.queryFn()).resolves.toEqual({
      current: 100,
      previous: 80,
    });

    expect(dashboardServiceMock.getSalesAnalytics).toHaveBeenCalledWith(30);
    expect(dashboardServiceMock.getTopSellingMedicines).toHaveBeenCalledWith(8);
    expect(dashboardServiceMock.getLowStockItems).toHaveBeenCalledWith(4);
    expect(dashboardServiceMock.getRecentTransactions).toHaveBeenCalledWith(12);
  });

  it('propagates dashboard query errors', async () => {
    const error = new Error('dashboard failed');
    dashboardServiceMock.getDashboardStats.mockResolvedValueOnce({
      data: null,
      error,
    });

    const { result } = renderHook(() => useDashboardStats());
    await expect(result.current.queryFn()).rejects.toBe(error);
  });

  it('aggregates dashboard data/loading/errors and refetches all sources', async () => {
    const refetchMocks = Array.from({ length: 6 }, () =>
      vi.fn().mockResolvedValue(undefined)
    );

    const queryStateMap = new Map<string, unknown>([
      [
        JSON.stringify(QueryKeys.dashboard.stats),
        {
          data: { totalSales: 1 },
          isLoading: false,
          isError: false,
          error: null,
          refetch: refetchMocks[0],
        },
      ],
      [
        JSON.stringify(QueryKeys.dashboard.salesAnalytics('7')),
        {
          data: [{ day: 'Mon' }],
          isLoading: true,
          isError: false,
          error: null,
          refetch: refetchMocks[1],
        },
      ],
      [
        JSON.stringify(QueryKeys.dashboard.topSellingMedicines),
        {
          data: [{ id: 'item-1' }],
          isLoading: false,
          isError: false,
          error: null,
          refetch: refetchMocks[2],
        },
      ],
      [
        JSON.stringify(QueryKeys.dashboard.stockAlerts),
        {
          data: [{ id: 'low-1' }],
          isLoading: false,
          isError: true,
          error: new Error('low stock failed'),
          refetch: refetchMocks[3],
        },
      ],
      [
        JSON.stringify(QueryKeys.dashboard.recentTransactions(10)),
        {
          data: [{ id: 'trx-1' }],
          isLoading: false,
          isError: false,
          error: null,
          refetch: refetchMocks[4],
        },
      ],
      [
        JSON.stringify(QueryKeys.dashboard.monthlyRevenue),
        {
          data: { current: 10, previous: 9 },
          isLoading: false,
          isError: false,
          error: null,
          refetch: refetchMocks[5],
        },
      ],
    ]);

    useQueryMock.mockImplementation(
      (config: { queryKey: readonly unknown[] }) => {
        return (
          queryStateMap.get(JSON.stringify(config.queryKey)) ?? {
            data: null,
            isLoading: false,
            isError: false,
            error: null,
            refetch: vi.fn().mockResolvedValue(undefined),
          }
        );
      }
    );

    const { result } = renderHook(() => useDashboardData());

    expect(result.current.stats).toEqual({ totalSales: 1 });
    expect(result.current.salesAnalytics).toEqual([{ day: 'Mon' }]);
    expect(result.current.topMedicines).toEqual([{ id: 'item-1' }]);
    expect(result.current.lowStockItems).toEqual([{ id: 'low-1' }]);
    expect(result.current.recentTransactions).toEqual([{ id: 'trx-1' }]);
    expect(result.current.monthlyRevenue).toEqual({ current: 10, previous: 9 });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(true);

    expect(result.current.errors.lowStock).toBeInstanceOf(Error);

    await act(async () => {
      await result.current.refetch();
    });

    refetchMocks.forEach(refetch => {
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });
});
