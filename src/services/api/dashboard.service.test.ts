import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dashboardService } from './dashboard.service';
import { createThenableQuery } from '@/test/utils/supabaseMock';

const fromMock = vi.hoisted(() => vi.fn());
const rpcMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock,
  },
}));

describe('DashboardService', () => {
  beforeEach(() => {
    fromMock.mockReset();
    rpcMock.mockReset();
  });

  it('calculates dashboard stats', async () => {
    const salesQuery = createThenableQuery({
      data: [{ total: 10 }, { total: 5 }],
      error: null,
    });
    const purchasesQuery = createThenableQuery({
      data: [{ total: 4 }],
      error: null,
    });
    const medicinesQuery = createThenableQuery({
      data: [],
      error: null,
      count: 12,
    });
    const lowStockQuery = createThenableQuery({
      data: [],
      error: null,
      count: 2,
    });

    fromMock
      .mockReturnValueOnce(salesQuery)
      .mockReturnValueOnce(purchasesQuery)
      .mockReturnValueOnce(medicinesQuery)
      .mockReturnValueOnce(lowStockQuery);

    const result = await dashboardService.getDashboardStats();
    expect(result.data?.totalSales).toBe(15);
    expect(result.data?.totalPurchases).toBe(4);
    expect(result.data?.totalMedicines).toBe(12);
    expect(result.data?.lowStockCount).toBe(2);
  });

  it('returns error when stats query fails', async () => {
    const salesQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    fromMock.mockReturnValue(salesQuery);

    const result = await dashboardService.getDashboardStats();
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('returns error when purchases stats query fails', async () => {
    const salesQuery = createThenableQuery({ data: [], error: null });
    const purchasesQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    const medicinesQuery = createThenableQuery({
      data: [],
      error: null,
      count: 0,
    });
    const lowStockQuery = createThenableQuery({
      data: [],
      error: null,
      count: 0,
    });

    fromMock
      .mockReturnValueOnce(salesQuery)
      .mockReturnValueOnce(purchasesQuery)
      .mockReturnValueOnce(medicinesQuery)
      .mockReturnValueOnce(lowStockQuery);

    const result = await dashboardService.getDashboardStats();
    expect(result.data).toBeNull();
  });

  it('returns error when medicines stats query fails', async () => {
    const salesQuery = createThenableQuery({ data: [], error: null });
    const purchasesQuery = createThenableQuery({ data: [], error: null });
    const medicinesQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    const lowStockQuery = createThenableQuery({
      data: [],
      error: null,
      count: 0,
    });

    fromMock
      .mockReturnValueOnce(salesQuery)
      .mockReturnValueOnce(purchasesQuery)
      .mockReturnValueOnce(medicinesQuery)
      .mockReturnValueOnce(lowStockQuery);

    const result = await dashboardService.getDashboardStats();
    expect(result.data).toBeNull();
  });

  it('returns error when low stock stats query fails', async () => {
    const salesQuery = createThenableQuery({ data: [], error: null });
    const purchasesQuery = createThenableQuery({ data: [], error: null });
    const medicinesQuery = createThenableQuery({
      data: [],
      error: null,
      count: 0,
    });
    const lowStockQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });

    fromMock
      .mockReturnValueOnce(salesQuery)
      .mockReturnValueOnce(purchasesQuery)
      .mockReturnValueOnce(medicinesQuery)
      .mockReturnValueOnce(lowStockQuery);

    const result = await dashboardService.getDashboardStats();
    expect(result.data).toBeNull();
  });

  it('handles empty stats data', async () => {
    const salesQuery = createThenableQuery({ data: null, error: null });
    const purchasesQuery = createThenableQuery({ data: null, error: null });
    const medicinesQuery = createThenableQuery({
      data: [],
      error: null,
      count: null,
    });
    const lowStockQuery = createThenableQuery({
      data: [],
      error: null,
      count: null,
    });

    fromMock
      .mockReturnValueOnce(salesQuery)
      .mockReturnValueOnce(purchasesQuery)
      .mockReturnValueOnce(medicinesQuery)
      .mockReturnValueOnce(lowStockQuery);

    const result = await dashboardService.getDashboardStats();
    expect(result.data?.totalSales).toBe(0);
    expect(result.data?.totalPurchases).toBe(0);
    expect(result.data?.totalMedicines).toBe(0);
    expect(result.data?.lowStockCount).toBe(0);
  });

  it('builds sales analytics', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-03T00:00:00Z'));

    const query = createThenableQuery({
      data: [
        { date: '2024-01-02T00:00:00Z', total: 10 },
        { date: '2024-01-03T00:00:00Z', total: 20 },
      ],
      error: null,
    });
    fromMock.mockReturnValue(query);

    const result = await dashboardService.getSalesAnalytics(2);
    expect(result.data?.labels.length).toBe(2);
    expect(result.data?.totalRevenue).toBe(30);
    expect(result.data?.averageDaily).toBe(15);

    vi.useRealTimers();
  });

  it('fills missing sales dates with zeros', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-03T00:00:00Z'));

    const query = createThenableQuery({
      data: [{ date: '2024-01-03T00:00:00Z', total: 20 }],
      error: null,
    });
    fromMock.mockReturnValue(query);

    const result = await dashboardService.getSalesAnalytics(3);
    expect(result.data?.values).toContain(0);

    vi.useRealTimers();
  });

  it('aggregates sales on the same date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-03T00:00:00Z'));

    const query = createThenableQuery({
      data: [
        { date: '2024-01-03T00:00:00Z', total: 10 },
        { date: '2024-01-03T00:00:00Z', total: 15 },
      ],
      error: null,
    });
    fromMock.mockReturnValue(query);

    const result = await dashboardService.getSalesAnalytics(1);
    expect(result.data?.totalRevenue).toBe(25);

    vi.useRealTimers();
  });

  it('returns error when sales analytics has no data', async () => {
    const query = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(query);

    const result = await dashboardService.getSalesAnalytics(2);
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('returns error when sales analytics query fails', async () => {
    const query = createThenableQuery({ data: null, error: new Error('fail') });
    fromMock.mockReturnValue(query);

    const result = await dashboardService.getSalesAnalytics(2);
    expect(result.data).toBeNull();
  });

  it('gets top selling medicines', async () => {
    rpcMock.mockResolvedValue({
      data: [{ name: 'Med', total_quantity: 3 }],
      error: null,
    });

    const result = await dashboardService.getTopSellingMedicines(3);
    expect(result.data?.[0].name).toBe('Med');
  });

  it('returns empty list when top selling data is null', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    const result = await dashboardService.getTopSellingMedicines(3);
    expect(result.data).toEqual([]);
  });

  it('handles top selling medicines errors', async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error('fail') });
    const result = await dashboardService.getTopSellingMedicines(3);
    expect(result.data).toBeNull();
  });

  it('gets low stock items', async () => {
    const query = createThenableQuery({ data: [{ id: '1' }], error: null });
    fromMock.mockReturnValue(query);

    const result = await dashboardService.getLowStockItems(5);
    expect(result.data?.[0].id).toBe('1');
  });

  it('returns empty low stock list when none found', async () => {
    const query = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(query);

    const result = await dashboardService.getLowStockItems(5);
    expect(result.data).toEqual([]);
  });

  it('handles low stock errors', async () => {
    const query = createThenableQuery({ data: null, error: new Error('fail') });
    fromMock.mockReturnValue(query);

    const result = await dashboardService.getLowStockItems(5);
    expect(result.data).toBeNull();
  });

  it('gets recent transactions', async () => {
    const salesQuery = createThenableQuery({
      data: [{ id: 's1', date: '2024-01-03', patients: { name: 'Pat' } }],
      error: null,
    });
    const purchasesQuery = createThenableQuery({
      data: [{ id: 'p1', date: '2024-01-02', suppliers: { name: 'Sup' } }],
      error: null,
    });

    fromMock
      .mockReturnValueOnce(salesQuery)
      .mockReturnValueOnce(purchasesQuery);

    const result = await dashboardService.getRecentTransactions(5);
    expect(result.data?.[0].type).toBe('sale');
    expect(result.data?.[1].type).toBe('purchase');
  });

  it('uses default counterparties for missing names', async () => {
    const salesQuery = createThenableQuery({
      data: [{ id: 's1', date: '2024-01-03', patients: null }],
      error: null,
    });
    const purchasesQuery = createThenableQuery({
      data: [{ id: 'p1', date: '2024-01-02', suppliers: null }],
      error: null,
    });

    fromMock
      .mockReturnValueOnce(salesQuery)
      .mockReturnValueOnce(purchasesQuery);

    const result = await dashboardService.getRecentTransactions(5);
    expect(result.data?.[0].counterparty).toBe('Walk-in Customer');
    expect(result.data?.[1].counterparty).toBe('Unknown Supplier');
  });

  it('handles recent transaction errors', async () => {
    const salesQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    const purchasesQuery = createThenableQuery({ data: null, error: null });
    fromMock
      .mockReturnValueOnce(salesQuery)
      .mockReturnValueOnce(purchasesQuery);

    const result = await dashboardService.getRecentTransactions(5);
    expect(result.data).toBeNull();
  });

  it('handles purchase transaction errors', async () => {
    const salesQuery = createThenableQuery({ data: [], error: null });
    const purchasesQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    fromMock
      .mockReturnValueOnce(salesQuery)
      .mockReturnValueOnce(purchasesQuery);

    const result = await dashboardService.getRecentTransactions(5);
    expect(result.data).toBeNull();
  });

  it('handles missing sales data in recent transactions', async () => {
    const salesQuery = createThenableQuery({ data: null, error: null });
    const purchasesQuery = createThenableQuery({
      data: [{ id: 'p1', date: '2024-01-02', suppliers: { name: 'Sup' } }],
      error: null,
    });
    fromMock
      .mockReturnValueOnce(salesQuery)
      .mockReturnValueOnce(purchasesQuery);

    const result = await dashboardService.getRecentTransactions(5);
    expect(result.data?.[0].type).toBe('purchase');
  });

  it('handles missing purchase data in recent transactions', async () => {
    const salesQuery = createThenableQuery({
      data: [{ id: 's1', date: '2024-01-03', patients: { name: 'Pat' } }],
      error: null,
    });
    const purchasesQuery = createThenableQuery({ data: null, error: null });
    fromMock
      .mockReturnValueOnce(salesQuery)
      .mockReturnValueOnce(purchasesQuery);

    const result = await dashboardService.getRecentTransactions(5);
    expect(result.data?.[0].type).toBe('sale');
  });
  it('compares monthly revenue', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-15T00:00:00Z'));

    const currentQuery = createThenableQuery({
      data: [{ total: 100 }],
      error: null,
    });
    const prevQuery = createThenableQuery({
      data: [{ total: 50 }],
      error: null,
    });
    fromMock.mockReturnValueOnce(currentQuery).mockReturnValueOnce(prevQuery);

    const result = await dashboardService.getMonthlyRevenueComparison();
    expect(result.data?.currentMonth).toBe(100);
    expect(result.data?.previousMonth).toBe(50);
    expect(result.data?.isIncrease).toBe(true);

    vi.useRealTimers();
  });

  it('handles monthly revenue when previous month is zero', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-15T00:00:00Z'));

    const currentQuery = createThenableQuery({
      data: [{ total: 50 }],
      error: null,
    });
    const prevQuery = createThenableQuery({ data: [], error: null });
    fromMock.mockReturnValueOnce(currentQuery).mockReturnValueOnce(prevQuery);

    const result = await dashboardService.getMonthlyRevenueComparison();
    expect(result.data?.percentageChange).toBe(0);
    expect(result.data?.isIncrease).toBe(false);

    vi.useRealTimers();
  });
  it('handles monthly revenue errors', async () => {
    const currentQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    const prevQuery = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValueOnce(currentQuery).mockReturnValueOnce(prevQuery);

    const result = await dashboardService.getMonthlyRevenueComparison();
    expect(result.data).toBeNull();
  });

  it('handles previous month revenue errors', async () => {
    const currentQuery = createThenableQuery({ data: [], error: null });
    const prevQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    fromMock.mockReturnValueOnce(currentQuery).mockReturnValueOnce(prevQuery);

    const result = await dashboardService.getMonthlyRevenueComparison();
    expect(result.data).toBeNull();
  });

  it('handles missing monthly revenue data', async () => {
    const currentQuery = createThenableQuery({ data: null, error: null });
    const prevQuery = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValueOnce(currentQuery).mockReturnValueOnce(prevQuery);

    const result = await dashboardService.getMonthlyRevenueComparison();
    expect(result.data?.currentMonth).toBe(0);
    expect(result.data?.previousMonth).toBe(0);
  });
});
