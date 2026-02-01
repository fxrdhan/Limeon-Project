import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SalesService, salesService } from './sales.service';
import { BaseService } from './base.service';
import { createThenableQuery } from '@/test/utils/supabaseMock';

const fromMock = vi.hoisted(() => vi.fn());
const rpcMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock,
  },
}));

describe('SalesService', () => {
  beforeEach(() => {
    fromMock.mockReset();
    rpcMock.mockReset();
  });

  it('gets all sales with details', async () => {
    const getAllSpy = vi
      .spyOn(BaseService.prototype, 'getAll')
      .mockResolvedValue({
        data: [
          {
            id: '1',
            patients: { id: 'p1', name: 'Pat' },
            doctors: { id: 'd1', name: 'Doc' },
            users: { id: 'u1', name: 'User' },
          },
        ],
        error: null,
        count: 1,
      });

    const result = await salesService.getAllWithDetails();
    expect(result.data?.[0].patient?.id).toBe('p1');
    expect(result.data?.[0].created_by_user?.id).toBe('u1');
    getAllSpy.mockRestore();
  });

  it('returns error when getAllWithDetails fails', async () => {
    vi.spyOn(BaseService.prototype, 'getAll').mockResolvedValue({
      data: null,
      error: new Error('fail'),
    });

    const result = await salesService.getAllWithDetails();
    expect(result.data).toBeNull();
  });

  it('handles getAllWithDetails exceptions', async () => {
    vi.spyOn(BaseService.prototype, 'getAll').mockRejectedValue(
      new Error('boom')
    );

    const result = await salesService.getAllWithDetails();
    expect(result.data).toBeNull();
  });

  it('gets sale with details', async () => {
    const query = createThenableQuery({
      data: { id: '1', patients: {}, doctors: {}, users: {} },
      error: null,
    });
    fromMock.mockReturnValue(query);

    const result = await salesService.getSaleWithDetails('1');
    expect(result.data?.id).toBe('1');
  });

  it('returns null when sale details missing', async () => {
    const query = createThenableQuery({ data: null, error: new Error('fail') });
    fromMock.mockReturnValue(query);

    const result = await salesService.getSaleWithDetails('1');
    expect(result.data).toBeNull();
  });

  it('handles sale detail exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await salesService.getSaleWithDetails('1');
    expect(result.data).toBeNull();
  });

  it('gets sale items', async () => {
    const query = createThenableQuery({
      data: [{ id: 'i1', items: { id: 'item1', name: 'Item' } }],
      error: null,
    });
    fromMock.mockReturnValue(query);

    const result = await salesService.getSaleItems('1');
    expect(result.data?.[0].item.name).toBe('Item');
  });

  it('returns error when sale items fail', async () => {
    const query = createThenableQuery({ data: null, error: new Error('fail') });
    fromMock.mockReturnValue(query);

    const result = await salesService.getSaleItems('1');
    expect(result.data).toBeNull();
  });

  it('maps sale items without item data', async () => {
    const query = createThenableQuery({
      data: [{ id: 'i1', items: null }],
      error: null,
    });
    fromMock.mockReturnValue(query);

    const result = await salesService.getSaleItems('1');
    expect(result.data?.[0].item.name).toBe('');
  });

  it('handles sale item exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await salesService.getSaleItems('1');
    expect(result.data).toBeNull();
  });

  it('creates sale with items', async () => {
    rpcMock.mockResolvedValue({ data: 's1', error: null });

    const saleQuery = createThenableQuery({ data: { id: 's1' }, error: null });
    const itemsQuery = createThenableQuery({
      data: [{ id: 'i1' }],
      error: null,
    });
    fromMock.mockReturnValueOnce(saleQuery).mockReturnValueOnce(itemsQuery);

    const result = await salesService.createSaleWithItems(
      {
        date: '2024-01-01',
        total: 100,
        payment_method: 'cash',
      },
      [
        {
          item_id: 'i1',
          quantity: 1,
          price: 100,
          subtotal: 100,
        },
      ]
    );

    expect(result.data?.sale.id).toBe('s1');
    expect(result.data?.items[0].id).toBe('i1');
  });

  it('returns error when create sale fails', async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error('fail') });

    const result = await salesService.createSaleWithItems(
      { date: '2024-01-01', total: 100, payment_method: 'cash' },
      []
    );

    expect(result.data).toBeNull();
  });

  it('returns error when fetched sale is missing', async () => {
    rpcMock.mockResolvedValue({ data: 's1', error: null });
    const saleQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    fromMock.mockReturnValueOnce(saleQuery);

    const result = await salesService.createSaleWithItems(
      { date: '2024-01-01', total: 100, payment_method: 'cash' },
      []
    );
    expect(result.data).toBeNull();
  });

  it('returns error when sale items fetch fails', async () => {
    rpcMock.mockResolvedValue({ data: 's1', error: null });
    const saleQuery = createThenableQuery({ data: { id: 's1' }, error: null });
    const itemsQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    fromMock.mockReturnValueOnce(saleQuery).mockReturnValueOnce(itemsQuery);

    const result = await salesService.createSaleWithItems(
      { date: '2024-01-01', total: 100, payment_method: 'cash' },
      []
    );
    expect(result.data).toBeNull();
  });

  it('returns empty items when inserted items missing', async () => {
    rpcMock.mockResolvedValue({ data: 's1', error: null });
    const saleQuery = createThenableQuery({ data: { id: 's1' }, error: null });
    const itemsQuery = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValueOnce(saleQuery).mockReturnValueOnce(itemsQuery);

    const result = await salesService.createSaleWithItems(
      { date: '2024-01-01', total: 100, payment_method: 'cash' },
      []
    );
    expect(result.data?.items).toEqual([]);
  });

  it('handles create sale exceptions', async () => {
    rpcMock.mockRejectedValue(new Error('boom'));
    const result = await salesService.createSaleWithItems(
      { date: '2024-01-01', total: 100, payment_method: 'cash' },
      []
    );
    expect(result.data).toBeNull();
  });

  it('updates sale without items', async () => {
    const service = new SalesService();
    const updateSpy = vi
      .spyOn(BaseService.prototype, 'update')
      .mockResolvedValue({ data: { id: 's1' }, error: null });

    const result = await service.updateSaleWithItems('s1', { total: 200 });
    expect(result.data?.sale.id).toBe('s1');

    updateSpy.mockRestore();
  });

  it('returns error when update sale fails', async () => {
    const service = new SalesService();
    vi.spyOn(BaseService.prototype, 'update').mockResolvedValue({
      data: null,
      error: new Error('fail'),
    });

    const result = await service.updateSaleWithItems('s1', { total: 200 });
    expect(result.data).toBeNull();
  });

  it('updates sale items and recalculates stock', async () => {
    const service = new SalesService();
    vi.spyOn(BaseService.prototype, 'update').mockResolvedValue({
      data: { id: 's1' },
      error: null,
    });

    vi.spyOn(service, 'getSaleItems').mockResolvedValue({
      data: [
        { item_id: 'i1', quantity: 1 } as never,
        { item_id: 'i2', quantity: 2 } as never,
      ],
      error: null,
    });

    const deleteQuery = createThenableQuery({ data: null, error: null });
    const insertQuery = createThenableQuery({
      data: [{ id: 'i1' }],
      error: null,
    });

    const selectQuery1 = createThenableQuery(
      { data: null, error: null },
      { singleResult: { data: { stock: 5 }, error: null } }
    );
    const updateQuery1 = createThenableQuery({ data: null, error: null });
    const selectQuery2 = createThenableQuery(
      { data: null, error: null },
      { singleResult: { data: null, error: null } }
    );

    fromMock
      .mockReturnValueOnce(deleteQuery)
      .mockReturnValueOnce(insertQuery)
      .mockReturnValueOnce(selectQuery1)
      .mockReturnValueOnce(updateQuery1)
      .mockReturnValueOnce(selectQuery2);

    const result = await service.updateSaleWithItems('s1', { total: 100 }, [
      {
        item_id: 'i1',
        quantity: 1,
        price: 10,
        subtotal: 10,
      },
    ]);

    expect(result.data?.items?.[0].id).toBe('i1');
  });

  it('returns error when update items insert fails', async () => {
    const service = new SalesService();
    vi.spyOn(BaseService.prototype, 'update').mockResolvedValue({
      data: { id: 's1' },
      error: null,
    });
    vi.spyOn(service, 'getSaleItems').mockResolvedValue({
      data: [],
      error: null,
    });

    const deleteQuery = createThenableQuery({ data: null, error: null });
    const insertQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    fromMock.mockReturnValueOnce(deleteQuery).mockReturnValueOnce(insertQuery);

    const result = await service.updateSaleWithItems('s1', { total: 100 }, []);
    expect(result.data).toBeNull();
  });

  it('defaults inserted items to empty array', async () => {
    const service = new SalesService();
    vi.spyOn(BaseService.prototype, 'update').mockResolvedValue({
      data: { id: 's1' },
      error: null,
    });
    vi.spyOn(service, 'getSaleItems').mockResolvedValue({
      data: [],
      error: null,
    });

    const deleteQuery = createThenableQuery({ data: null, error: null });
    const insertQuery = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValueOnce(deleteQuery).mockReturnValueOnce(insertQuery);

    const result = await service.updateSaleWithItems('s1', { total: 100 }, [
      { item_id: 'i1', quantity: 1, price: 10, subtotal: 10 },
    ]);

    expect(result.data?.items).toEqual([]);
  });

  it('recalculates stock when existing items missing', async () => {
    const service = new SalesService();
    vi.spyOn(BaseService.prototype, 'update').mockResolvedValue({
      data: { id: 's1' },
      error: null,
    });
    vi.spyOn(service, 'getSaleItems').mockResolvedValue({
      data: null,
      error: null,
    });

    const deleteQuery = createThenableQuery({ data: null, error: null });
    const insertQuery = createThenableQuery({
      data: [{ id: 'i1' }],
      error: null,
    });
    fromMock.mockReturnValueOnce(deleteQuery).mockReturnValueOnce(insertQuery);

    const result = await service.updateSaleWithItems('s1', { total: 100 }, [
      { item_id: 'i1', quantity: 1, price: 10, subtotal: 10 },
    ]);

    expect(result.data?.items?.[0].id).toBe('i1');
  });

  it('handles update sale exceptions', async () => {
    const service = new SalesService();
    vi.spyOn(BaseService.prototype, 'update').mockRejectedValue(
      new Error('boom')
    );
    const result = await service.updateSaleWithItems('s1', { total: 100 });
    expect(result.data).toBeNull();
  });

  it('deletes sale with stock restore', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    const result = await salesService.deleteSaleWithStockRestore('s1');
    expect(result.error).toBeNull();
  });

  it('handles delete sale exceptions', async () => {
    rpcMock.mockRejectedValue(new Error('boom'));
    const result = await salesService.deleteSaleWithStockRestore('s1');
    expect(result.data).toBeNull();
  });

  it('filters sales by related fields', async () => {
    const spy = vi
      .spyOn(SalesService.prototype, 'getAllWithDetails')
      .mockResolvedValue({ data: [], error: null });

    await salesService.getSalesByPatient('p1');
    await salesService.getSalesByDoctor('d1');
    await salesService.getSalesByPaymentMethod('cash');

    expect(spy).toHaveBeenCalled();
  });

  it('gets sales by date range', async () => {
    const query = createThenableQuery({ data: [{ id: 's1' }], error: null });
    fromMock.mockReturnValue(query);

    const result = await salesService.getSalesByDateRange(
      '2024-01-01',
      '2024-01-31'
    );
    expect(result.data?.[0].id).toBe('s1');
  });

  it('handles sales by date range errors', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });
    const result = await salesService.getSalesByDateRange(
      '2024-01-01',
      '2024-01-31'
    );
    expect(result.data).toBeNull();
  });

  it('computes sales analytics', async () => {
    const query = createThenableQuery({
      data: [
        { date: '2024-01-01', total: 10, payment_method: 'cash' },
        { date: '2024-01-02', total: 20, payment_method: 'card' },
      ],
      error: null,
    });
    fromMock.mockReturnValue(query);

    const result = await salesService.getSalesAnalytics();
    expect(result.data?.totalRevenue).toBe(30);
    expect(result.data?.paymentMethods.cash).toBe(10);
  });

  it('filters sales analytics by date range', async () => {
    const query = createThenableQuery({
      data: [{ date: '2024-01-01', total: 10, payment_method: 'cash' }],
      error: null,
    });
    fromMock.mockReturnValue(query);

    const result = await salesService.getSalesAnalytics(
      '2024-01-01',
      '2024-01-02'
    );
    expect(result.data?.totalSales).toBe(1);
  });

  it('returns error when analytics query fails', async () => {
    const query = createThenableQuery({ data: null, error: new Error('fail') });
    fromMock.mockReturnValue(query);

    const result = await salesService.getSalesAnalytics();
    expect(result.data).toBeNull();
  });

  it('handles analytics exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });
    const result = await salesService.getSalesAnalytics();
    expect(result.data).toBeNull();
  });

  it('returns zero average when no sales data', async () => {
    const query = createThenableQuery({ data: [], error: null });
    fromMock.mockReturnValue(query);

    const result = await salesService.getSalesAnalytics();
    expect(result.data?.averageSale).toBe(0);
  });

  it('checks invoice number uniqueness', async () => {
    const query = createThenableQuery({ data: [], error: null });
    fromMock.mockReturnValue(query);
    expect(await salesService.isInvoiceNumberUnique('INV')).toBe(true);

    const excludeQuery = createThenableQuery({ data: [], error: null });
    fromMock.mockReturnValue(excludeQuery);
    await salesService.isInvoiceNumberUnique('INV', 'exclude');
    expect(excludeQuery.neq).toHaveBeenCalledWith('id', 'exclude');

    const errorQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    fromMock.mockReturnValue(errorQuery);
    expect(await salesService.isInvoiceNumberUnique('INV')).toBe(false);

    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(await salesService.isInvoiceNumberUnique('INV')).toBe(false);
  });

  it('updates stock without increment when only decrement provided', async () => {
    const service = new SalesService();
    const selectQuery = createThenableQuery(
      { data: { stock: 5 }, error: null },
      { singleResult: { data: { stock: 5 }, error: null } }
    );
    const updateQuery = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValueOnce(selectQuery).mockReturnValueOnce(updateQuery);

    await (
      service as unknown as {
        updateItemStocks: (
          updates: { id: string; increment?: number; decrement?: number }[]
        ) => Promise<void>;
      }
    ).updateItemStocks([{ id: 'i1', decrement: 2 }]);

    expect(updateQuery.update).toHaveBeenCalledWith({ stock: 3 });
  });

  it('skips stock updates when item missing', async () => {
    const service = new SalesService();
    const selectQuery = createThenableQuery(
      { data: null, error: null },
      { singleResult: { data: null, error: null } }
    );
    fromMock.mockReturnValueOnce(selectQuery);

    await (
      service as unknown as {
        updateItemStocks: (
          updates: { id: string; increment?: number; decrement?: number }[]
        ) => Promise<void>;
      }
    ).updateItemStocks([{ id: 'i1', increment: 2 }]);

    expect(selectQuery.update).not.toHaveBeenCalled();
  });

  it('swallows stock update errors', async () => {
    const service = new SalesService();
    const selectQuery = createThenableQuery(
      { data: null, error: null },
      { singleResult: { data: { stock: 5 }, error: null } }
    );
    const updateQuery = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValueOnce(selectQuery).mockReturnValueOnce(updateQuery);

    await (
      service as unknown as {
        updateItemStocks: (
          updates: { id: string; increment?: number; decrement?: number }[]
        ) => Promise<void>;
      }
    ).updateItemStocks([{ id: 'i1', increment: 2, decrement: 1 }]);

    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });
    await (
      service as unknown as {
        updateItemStocks: (
          updates: { id: string; increment?: number; decrement?: number }[]
        ) => Promise<void>;
      }
    ).updateItemStocks([{ id: 'i1', increment: 2 }]);
    expect(true).toBe(true);
  });

  it('applies stock differences with decrements', async () => {
    const service = new SalesService();
    vi.spyOn(BaseService.prototype, 'update').mockResolvedValue({
      data: { id: 's1' },
      error: null,
    });
    vi.spyOn(service, 'getSaleItems').mockResolvedValue({
      data: [],
      error: null,
    });

    const updateStocksSpy = vi
      .spyOn(
        service as unknown as {
          updateItemStocks: (
            updates: { id: string; increment?: number; decrement?: number }[]
          ) => Promise<void>;
        },
        'updateItemStocks'
      )
      .mockResolvedValue(undefined);

    const deleteQuery = createThenableQuery({ data: null, error: null });
    const insertQuery = createThenableQuery({
      data: [{ id: 'i1' }],
      error: null,
    });
    fromMock.mockReturnValueOnce(deleteQuery).mockReturnValueOnce(insertQuery);

    await service.updateSaleWithItems('s1', { total: 100 }, [
      {
        item_id: 'i1',
        quantity: 2,
        price: 10,
        subtotal: 20,
      },
    ]);

    expect(updateStocksSpy).toHaveBeenCalledWith([
      { id: 'i1', increment: undefined, decrement: 2 },
    ]);
  });
});
