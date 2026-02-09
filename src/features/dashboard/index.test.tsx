import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardNew from './index';

const useDashboardStatsMock = vi.hoisted(() => vi.fn());
const useSalesAnalyticsMock = vi.hoisted(() => vi.fn());
const useTopSellingMedicinesMock = vi.hoisted(() => vi.fn());
const useLowStockItemsMock = vi.hoisted(() => vi.fn());
const useRecentTransactionsMock = vi.hoisted(() => vi.fn());
const useMonthlyRevenueComparisonMock = vi.hoisted(() => vi.fn());

const capturedCharts = vi.hoisted(() => ({
  lineProps: null as Record<string, unknown> | null,
  doughnutProps: null as Record<string, unknown> | null,
}));

vi.mock('@/components/page-title', () => ({
  default: ({ title }: { title: string }) => (
    <h1 data-testid="page-title">{title}</h1>
  ),
}));

vi.mock('@/components/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
}));

vi.mock('@/components/button', () => ({
  default: ({
    children,
    className,
    ...props
  }: React.ComponentPropsWithoutRef<'button'>) => (
    <button
      data-testid={className?.includes('p-2') ? 'chart-refresh-btn' : undefined}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/charts/LazyCharts', () => ({
  Line: (props: Record<string, unknown>) => {
    capturedCharts.lineProps = props;
    return <div data-testid="line-chart" />;
  },
  Doughnut: (props: Record<string, unknown>) => {
    capturedCharts.doughnutProps = props;
    return <div data-testid="doughnut-chart" />;
  },
}));

vi.mock('@/hooks/queries/useDashboard', () => ({
  useDashboardStats: useDashboardStatsMock,
  useSalesAnalytics: useSalesAnalyticsMock,
  useTopSellingMedicines: useTopSellingMedicinesMock,
  useLowStockItems: useLowStockItemsMock,
  useRecentTransactions: useRecentTransactionsMock,
  useMonthlyRevenueComparison: useMonthlyRevenueComparisonMock,
}));

type QueryStub<T> = {
  data: T;
  isLoading: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
};

const makeQuery = <T,>(partial?: Partial<QueryStub<T>>): QueryStub<T> => ({
  data: undefined as unknown as T,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  ...partial,
});

describe('DashboardNew', () => {
  beforeEach(() => {
    capturedCharts.lineProps = null;
    capturedCharts.doughnutProps = null;

    useDashboardStatsMock.mockReset();
    useSalesAnalyticsMock.mockReset();
    useTopSellingMedicinesMock.mockReset();
    useLowStockItemsMock.mockReset();
    useRecentTransactionsMock.mockReset();
    useMonthlyRevenueComparisonMock.mockReset();

    useDashboardStatsMock.mockReturnValue(
      makeQuery({
        data: {
          totalSales: 1_500_000,
          totalPurchases: 800_000,
          totalMedicines: 120,
          lowStockCount: 3,
        },
      })
    );

    useSalesAnalyticsMock.mockReturnValue(
      makeQuery({
        data: {
          labels: ['Mon', 'Tue'],
          values: [100000, 120000],
        },
      })
    );

    useTopSellingMedicinesMock.mockReturnValue(
      makeQuery({
        data: [
          { name: 'Paracetamol', total_quantity: 40 },
          { name: 'Amoxicillin', total_quantity: 20 },
        ],
      })
    );

    useLowStockItemsMock.mockReturnValue(
      makeQuery({
        data: [
          {
            id: 'item-1',
            name: 'Vitamin C',
            stock: 2,
            item_categories: [{ name: 'Suplemen' }],
            item_packages: [{ name: 'Botol' }],
          },
        ],
      })
    );

    useRecentTransactionsMock.mockReturnValue(
      makeQuery({
        data: [
          {
            id: 'sale-123456789',
            type: 'sale',
            invoice_number: 'INV-001',
            counterparty: 'Pelanggan A',
            date: '2026-02-08T00:00:00Z',
            total: 100000,
          },
          {
            id: 'pur-abcdefghi',
            type: 'purchase',
            counterparty: 'Supplier B',
            date: '2026-02-07T00:00:00Z',
            total: 55000,
          },
        ],
      })
    );

    useMonthlyRevenueComparisonMock.mockReturnValue(
      makeQuery({
        data: {
          currentMonth: 2_300_000,
          isIncrease: true,
          percentageChange: 12.5,
        },
      })
    );
  });

  it('renders dashboard data and wires refresh actions', () => {
    render(<DashboardNew />);

    expect(screen.getByTestId('page-title')).toHaveTextContent(
      'Dashboard (New Architecture)'
    );

    expect(screen.getByText(/Total Penjualan/i)).toBeInTheDocument();
    expect(screen.getByText(/Peringatan Stok Menipis/i)).toBeInTheDocument();
    expect(screen.getByText('Vitamin C')).toBeInTheDocument();
    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.getByText(/Purchase #pur-abcd/i)).toBeInTheDocument();

    const allRefetches = [
      useDashboardStatsMock.mock.results[0].value.refetch,
      useSalesAnalyticsMock.mock.results[0].value.refetch,
      useTopSellingMedicinesMock.mock.results[0].value.refetch,
      useLowStockItemsMock.mock.results[0].value.refetch,
      useRecentTransactionsMock.mock.results[0].value.refetch,
      useMonthlyRevenueComparisonMock.mock.results[0].value.refetch,
    ];

    fireEvent.click(screen.getByRole('button', { name: /Refresh All/i }));
    allRefetches.forEach(refetch => {
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    const refreshButtons = screen.getAllByTestId('chart-refresh-btn');
    fireEvent.click(refreshButtons[0]);
    fireEvent.click(refreshButtons[1]);

    expect(
      useSalesAnalyticsMock.mock.results[0].value.refetch.mock.calls.length
    ).toBeGreaterThanOrEqual(2);
    expect(
      useTopSellingMedicinesMock.mock.results[0].value.refetch.mock.calls.length
    ).toBeGreaterThanOrEqual(2);

    expect(capturedCharts.lineProps).toMatchObject({
      data: expect.objectContaining({ labels: ['Mon', 'Tue'] }),
    });
    expect(capturedCharts.doughnutProps).toMatchObject({
      data: expect.objectContaining({ labels: ['Paracetamol', 'Amoxicillin'] }),
    });
  });

  it('renders loading placeholders and hides optional sections when no data', () => {
    useDashboardStatsMock.mockReturnValue(
      makeQuery({ isLoading: true, data: null })
    );
    useSalesAnalyticsMock.mockReturnValue(
      makeQuery({ isLoading: true, data: null })
    );
    useTopSellingMedicinesMock.mockReturnValue(
      makeQuery({ isLoading: true, data: null })
    );
    useLowStockItemsMock.mockReturnValue(makeQuery({ data: [] }));
    useRecentTransactionsMock.mockReturnValue(
      makeQuery({ isLoading: true, data: null })
    );
    useMonthlyRevenueComparisonMock.mockReturnValue(makeQuery({ data: null }));

    render(<DashboardNew />);

    expect(screen.queryByText(/Revenue Perbandingan/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Peringatan Stok Menipis/i)
    ).not.toBeInTheDocument();
    expect(screen.getAllByTestId('card').length).toBeGreaterThanOrEqual(4);
  });

  it('renders error states and negative revenue branch', () => {
    useSalesAnalyticsMock.mockReturnValue(
      makeQuery({
        data: null,
        error: new Error('sales-down'),
      })
    );
    useTopSellingMedicinesMock.mockReturnValue(
      makeQuery({
        data: null,
        error: new Error('medicine-down'),
      })
    );
    useRecentTransactionsMock.mockReturnValue(
      makeQuery({
        data: null,
        error: new Error('txn-down'),
      })
    );
    useMonthlyRevenueComparisonMock.mockReturnValue(
      makeQuery({
        data: {
          currentMonth: 950000,
          isIncrease: false,
          percentageChange: -7.2,
        },
      })
    );

    render(<DashboardNew />);

    expect(screen.getByText(/Error: sales-down/i)).toBeInTheDocument();
    expect(screen.getByText(/Error: medicine-down/i)).toBeInTheDocument();
    expect(screen.getByText(/Error: txn-down/i)).toBeInTheDocument();
    expect(screen.getByText('-7.2%')).toBeInTheDocument();
  });
});
