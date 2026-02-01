import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PurchasesService, purchasesService } from './purchases.service';
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

describe('PurchasesService', () => {
  beforeEach(() => {
    fromMock.mockReset();
    rpcMock.mockReset();
  });

  it('paginates purchases with search', async () => {
    const listQuery = createThenableQuery({
      data: [
        {
          id: '1',
          invoice_number: 'INV-1',
          supplier: [{ name: 'Sup' }],
        },
      ],
      error: null,
    });
    const countQuery = createThenableQuery({ count: 1, error: null });

    fromMock.mockReturnValueOnce(listQuery).mockReturnValueOnce(countQuery);

    const result = await purchasesService.getPaginatedPurchases({
      page: 1,
      limit: 10,
      searchTerm: 'INV',
    });

    expect(result.data?.purchases[0].supplier?.name).toBe('Sup');
    expect(result.data?.totalItems).toBe(1);
    expect(listQuery.ilike).toHaveBeenCalled();
  });

  it('returns error when count fails', async () => {
    const listQuery = createThenableQuery({ data: [], error: null });
    const countQuery = createThenableQuery({
      count: null,
      error: new Error('fail'),
    });

    fromMock.mockReturnValueOnce(listQuery).mockReturnValueOnce(countQuery);

    const result = await purchasesService.getPaginatedPurchases({
      page: 1,
      limit: 10,
    });
    expect(result.data).toBeNull();
  });

  it('returns error when list query fails', async () => {
    const listQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    const countQuery = createThenableQuery({ count: 1, error: null });

    fromMock.mockReturnValueOnce(listQuery).mockReturnValueOnce(countQuery);

    const result = await purchasesService.getPaginatedPurchases({
      page: 1,
      limit: 10,
    });
    expect(result.data).toBeNull();
  });

  it('returns empty list when paginated data is null', async () => {
    const listQuery = createThenableQuery({ data: null, error: null });
    const countQuery = createThenableQuery({ count: null, error: null });

    fromMock.mockReturnValueOnce(listQuery).mockReturnValueOnce(countQuery);

    const result = await purchasesService.getPaginatedPurchases({
      page: 1,
      limit: 10,
    });
    expect(result.data?.purchases).toEqual([]);
    expect(result.data?.totalItems).toBe(0);
  });

  it('maps supplier objects directly', async () => {
    const listQuery = createThenableQuery({
      data: [
        {
          id: '1',
          invoice_number: 'INV-1',
          supplier: { name: 'Sup' },
        },
      ],
      error: null,
    });
    const countQuery = createThenableQuery({ count: 1, error: null });

    fromMock.mockReturnValueOnce(listQuery).mockReturnValueOnce(countQuery);

    const result = await purchasesService.getPaginatedPurchases({
      page: 1,
      limit: 10,
    });

    expect(result.data?.purchases[0].supplier?.name).toBe('Sup');
    expect(result.data?.totalItems).toBe(1);
  });

  it('defaults totalItems to zero when count missing', async () => {
    const listQuery = createThenableQuery({
      data: [
        {
          id: '1',
          invoice_number: 'INV-1',
          supplier: [{ name: 'Sup' }],
        },
      ],
      error: null,
    });
    const countQuery = createThenableQuery({ count: null, error: null });

    fromMock.mockReturnValueOnce(listQuery).mockReturnValueOnce(countQuery);

    const result = await purchasesService.getPaginatedPurchases({
      page: 1,
      limit: 10,
    });

    expect(result.data?.totalItems).toBe(0);
  });

  it('handles paginated purchase exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await purchasesService.getPaginatedPurchases({
      page: 1,
      limit: 10,
    });
    expect(result.data).toBeNull();
  });

  it('uses default select for getAllWithSuppliers', async () => {
    const service = new PurchasesService();
    const getAllSpy = vi
      .spyOn(BaseService.prototype, 'getAll')
      .mockResolvedValue({ data: [], error: null });

    await service.getAllWithSuppliers();
    expect(getAllSpy).toHaveBeenCalledWith(
      expect.objectContaining({ select: expect.stringContaining('suppliers') })
    );

    getAllSpy.mockRestore();
  });

  it('gets purchase with details', async () => {
    const query = createThenableQuery({
      data: { id: '1', suppliers: { name: 'Sup' } },
      error: null,
    });
    fromMock.mockReturnValue(query);

    const result = await purchasesService.getPurchaseWithDetails('1');
    expect(result.data?.supplier.name).toBe('Sup');
  });

  it('falls back when supplier details missing', async () => {
    const query = createThenableQuery({
      data: { id: '1', suppliers: null },
      error: null,
    });
    fromMock.mockReturnValue(query);

    const result = await purchasesService.getPurchaseWithDetails('1');
    expect(result.data?.supplier.name).toBe('');
  });

  it('returns null when purchase details missing', async () => {
    const query = createThenableQuery({ data: null, error: new Error('fail') });
    fromMock.mockReturnValue(query);

    const result = await purchasesService.getPurchaseWithDetails('1');
    expect(result.data).toBeNull();
  });

  it('handles purchase detail exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await purchasesService.getPurchaseWithDetails('1');
    expect(result.data).toBeNull();
  });

  it('gets purchase items', async () => {
    const query = createThenableQuery({
      data: [{ id: 'i1', items: { name: 'Item', code: 'I1' } }],
      error: null,
    });
    fromMock.mockReturnValue(query);

    const result = await purchasesService.getPurchaseItems('1');
    expect(result.data?.[0].item_name).toBe('Item');
  });

  it('handles purchase item exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await purchasesService.getPurchaseItems('1');
    expect(result.data).toBeNull();
  });

  it('returns error when purchase items missing', async () => {
    const query = createThenableQuery({ data: null, error: new Error('fail') });
    fromMock.mockReturnValue(query);

    const result = await purchasesService.getPurchaseItems('1');
    expect(result.data).toBeNull();
  });

  it('maps purchase items without item data', async () => {
    const query = createThenableQuery({
      data: [{ id: 'i1', items: null }],
      error: null,
    });
    fromMock.mockReturnValue(query);

    const result = await purchasesService.getPurchaseItems('1');
    expect(result.data?.[0].item_name).toBe('');
    expect(result.data?.[0].item?.code).toBe('');
  });

  it('creates purchase with items', async () => {
    rpcMock.mockResolvedValue({ data: 'p1', error: null });

    const purchaseQuery = createThenableQuery({
      data: { id: 'p1' },
      error: null,
    });
    const itemsQuery = createThenableQuery({
      data: [{ id: 'i1' }],
      error: null,
    });

    fromMock.mockReturnValueOnce(purchaseQuery).mockReturnValueOnce(itemsQuery);

    const result = await purchasesService.createPurchaseWithItems(
      {
        invoice_number: 'INV-1',
        supplier_id: 's1',
        date: '2024-01-01',
        due_date: null,
        total: 100,
        payment_status: 'paid',
        payment_method: 'cash',
        vat_percentage: 0,
        is_vat_included: false,
        vat_amount: 0,
        notes: null,
      },
      [
        {
          item_id: 'i1',
          quantity: 1,
          price: 100,
          discount: 0,
          subtotal: 100,
          unit: 'pcs',
          vat_percentage: 0,
          batch_no: null,
          expiry_date: null,
        },
      ]
    );

    expect(result.data?.purchase.id).toBe('p1');
    expect(result.data?.items[0].id).toBe('i1');
  });

  it('creates purchase when supplier id is missing', async () => {
    rpcMock.mockResolvedValue({ data: 'p1', error: null });

    const purchaseQuery = createThenableQuery({
      data: { id: 'p1' },
      error: null,
    });
    const itemsQuery = createThenableQuery({
      data: [{ id: 'i1' }],
      error: null,
    });

    fromMock.mockReturnValueOnce(purchaseQuery).mockReturnValueOnce(itemsQuery);

    const result = await purchasesService.createPurchaseWithItems(
      {
        invoice_number: 'INV-1',
        supplier_id: undefined as never,
        date: '2024-01-01',
        due_date: null,
        total: 100,
        payment_status: 'paid',
        payment_method: 'cash',
        vat_percentage: 0,
        is_vat_included: false,
        vat_amount: 0,
        notes: null,
      },
      []
    );

    expect(result.data?.purchase.id).toBe('p1');
  });

  it('returns empty items when inserted items missing', async () => {
    rpcMock.mockResolvedValue({ data: 'p1', error: null });

    const purchaseQuery = createThenableQuery({
      data: { id: 'p1' },
      error: null,
    });
    const itemsQuery = createThenableQuery({ data: null, error: null });

    fromMock.mockReturnValueOnce(purchaseQuery).mockReturnValueOnce(itemsQuery);

    const result = await purchasesService.createPurchaseWithItems(
      {
        invoice_number: 'INV-1',
        supplier_id: 's1',
        date: '2024-01-01',
        due_date: null,
        total: 100,
        payment_status: 'paid',
        payment_method: 'cash',
        vat_percentage: 0,
        is_vat_included: false,
        vat_amount: 0,
        notes: null,
      },
      []
    );

    expect(result.data?.items).toEqual([]);
  });

  it('returns error when create purchase fails', async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error('fail') });

    const result = await purchasesService.createPurchaseWithItems(
      {
        invoice_number: 'INV-1',
        supplier_id: 's1',
        date: '2024-01-01',
        due_date: null,
        total: 100,
        payment_status: 'paid',
        payment_method: 'cash',
        vat_percentage: 0,
        is_vat_included: false,
        vat_amount: 0,
        notes: null,
      },
      []
    );

    expect(result.data).toBeNull();
  });

  it('returns error when fetched purchase is missing', async () => {
    rpcMock.mockResolvedValue({ data: 'p1', error: null });

    const purchaseQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    fromMock.mockReturnValueOnce(purchaseQuery);

    const result = await purchasesService.createPurchaseWithItems(
      {
        invoice_number: 'INV-1',
        supplier_id: 's1',
        date: '2024-01-01',
        due_date: null,
        total: 100,
        payment_status: 'paid',
        payment_method: 'cash',
        vat_percentage: 0,
        is_vat_included: false,
        vat_amount: 0,
        notes: null,
      },
      []
    );

    expect(result.data).toBeNull();
  });

  it('returns error when inserting items fails', async () => {
    rpcMock.mockResolvedValue({ data: 'p1', error: null });

    const purchaseQuery = createThenableQuery({
      data: { id: 'p1' },
      error: null,
    });
    const itemsQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });

    fromMock.mockReturnValueOnce(purchaseQuery).mockReturnValueOnce(itemsQuery);

    const result = await purchasesService.createPurchaseWithItems(
      {
        invoice_number: 'INV-1',
        supplier_id: 's1',
        date: '2024-01-01',
        due_date: null,
        total: 100,
        payment_status: 'paid',
        payment_method: 'cash',
        vat_percentage: 0,
        is_vat_included: false,
        vat_amount: 0,
        notes: null,
      },
      []
    );

    expect(result.data).toBeNull();
  });

  it('handles create purchase exceptions', async () => {
    rpcMock.mockRejectedValue(new Error('boom'));

    const result = await purchasesService.createPurchaseWithItems(
      {
        invoice_number: 'INV-1',
        supplier_id: 's1',
        date: '2024-01-01',
        due_date: null,
        total: 100,
        payment_status: 'paid',
        payment_method: 'cash',
        vat_percentage: 0,
        is_vat_included: false,
        vat_amount: 0,
        notes: null,
      },
      []
    );

    expect(result.data).toBeNull();
  });

  it('updates purchase without items', async () => {
    const service = new PurchasesService();
    const updateSpy = vi
      .spyOn(BaseService.prototype, 'update')
      .mockResolvedValue({ data: { id: 'p1' }, error: null });

    const result = await service.updatePurchaseWithItems('p1', { notes: 'x' });
    expect(result.data?.purchase.id).toBe('p1');

    updateSpy.mockRestore();
  });

  it('returns error when update purchase fails', async () => {
    const service = new PurchasesService();
    vi.spyOn(BaseService.prototype, 'update').mockResolvedValue({
      data: null,
      error: new Error('fail'),
    });

    const result = await service.updatePurchaseWithItems('p1', { notes: 'x' });
    expect(result.data).toBeNull();
  });

  it('updates purchase items and recalculates stock differences', async () => {
    const service = new PurchasesService();
    vi.spyOn(BaseService.prototype, 'update').mockResolvedValue({
      data: { id: 'p1' },
      error: null,
    });
    vi.spyOn(service, 'getPurchaseItems').mockResolvedValue({
      data: [
        { item_id: 'i1', quantity: 1, unit_conversion_rate: 2 } as never,
        { item_id: 'i2', quantity: 1, unit_conversion_rate: 1 } as never,
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

    const result = await service.updatePurchaseWithItems('p1', { notes: 'x' }, [
      {
        item_id: 'i1',
        quantity: 2,
        price: 10,
        discount: 0,
        subtotal: 20,
        unit: 'pcs',
        vat_percentage: 0,
        batch_no: null,
        expiry_date: null,
        unit_conversion_rate: 1,
      },
    ]);

    expect(result.data?.items?.[0].id).toBe('i1');
  });

  it('recalculates stock when existing items missing', async () => {
    const service = new PurchasesService();
    vi.spyOn(BaseService.prototype, 'update').mockResolvedValue({
      data: { id: 'p1' },
      error: null,
    });
    vi.spyOn(service, 'getPurchaseItems').mockResolvedValue({
      data: null,
      error: null,
    });

    const deleteQuery = createThenableQuery({ data: null, error: null });
    const insertQuery = createThenableQuery({
      data: [{ id: 'i1' }],
      error: null,
    });

    fromMock.mockReturnValueOnce(deleteQuery).mockReturnValueOnce(insertQuery);

    const result = await service.updatePurchaseWithItems('p1', { notes: 'x' }, [
      {
        item_id: 'i1',
        quantity: 1,
        price: 10,
        discount: 0,
        subtotal: 10,
        unit: 'pcs',
        vat_percentage: 0,
        batch_no: null,
        expiry_date: null,
        unit_conversion_rate: 1,
      },
    ]);

    expect(result.data?.items?.[0].id).toBe('i1');
  });

  it('returns error when update items insert fails', async () => {
    const service = new PurchasesService();
    vi.spyOn(BaseService.prototype, 'update').mockResolvedValue({
      data: { id: 'p1' },
      error: null,
    });
    vi.spyOn(service, 'getPurchaseItems').mockResolvedValue({
      data: [],
      error: null,
    });

    const deleteQuery = createThenableQuery({ data: null, error: null });
    const insertQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });

    fromMock.mockReturnValueOnce(deleteQuery).mockReturnValueOnce(insertQuery);

    const result = await service.updatePurchaseWithItems(
      'p1',
      { notes: 'x' },
      []
    );
    expect(result.data).toBeNull();
  });

  it('defaults inserted items to empty array', async () => {
    const service = new PurchasesService();
    vi.spyOn(BaseService.prototype, 'update').mockResolvedValue({
      data: { id: 'p1' },
      error: null,
    });
    vi.spyOn(service, 'getPurchaseItems').mockResolvedValue({
      data: [],
      error: null,
    });

    const deleteQuery = createThenableQuery({ data: null, error: null });
    const insertQuery = createThenableQuery({ data: null, error: null });

    fromMock.mockReturnValueOnce(deleteQuery).mockReturnValueOnce(insertQuery);

    const result = await service.updatePurchaseWithItems('p1', { notes: 'x' }, [
      {
        item_id: 'i1',
        quantity: 1,
        price: 10,
        discount: 0,
        subtotal: 10,
        unit: 'pcs',
        vat_percentage: 0,
        batch_no: null,
        expiry_date: null,
        unit_conversion_rate: 1,
      },
    ]);

    expect(result.data?.items).toEqual([]);
  });

  it('defaults unit conversion rate when missing', async () => {
    const service = new PurchasesService();
    vi.spyOn(BaseService.prototype, 'update').mockResolvedValue({
      data: { id: 'p1' },
      error: null,
    });
    vi.spyOn(service, 'getPurchaseItems').mockResolvedValue({
      data: [],
      error: null,
    });

    const updateStocksSpy = vi
      .spyOn(
        service as unknown as {
          updateItemStocks: (
            updates: { id: string; increment: number }[]
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

    await service.updatePurchaseWithItems('p1', { notes: 'x' }, [
      {
        item_id: 'i1',
        quantity: 2,
        price: 10,
        discount: 0,
        subtotal: 20,
        unit: 'pcs',
        vat_percentage: 0,
        batch_no: null,
        expiry_date: null,
        unit_conversion_rate: undefined,
      },
    ]);

    expect(updateStocksSpy).toHaveBeenCalledWith([{ id: 'i1', increment: 2 }]);
  });

  it('handles update purchase exceptions', async () => {
    const service = new PurchasesService();
    vi.spyOn(BaseService.prototype, 'update').mockRejectedValue(
      new Error('boom')
    );

    const result = await service.updatePurchaseWithItems('p1', { notes: 'x' });
    expect(result.data).toBeNull();
  });

  it('deletes purchase with stock restore', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    const result = await purchasesService.deletePurchaseWithStockRestore('p1');
    expect(result.error).toBeNull();
  });

  it('handles delete purchase exceptions', async () => {
    rpcMock.mockRejectedValue(new Error('boom'));
    const result = await purchasesService.deletePurchaseWithStockRestore('p1');
    expect(result.data).toBeNull();
  });

  it('filters purchases by supplier and status', async () => {
    const getAllSpy = vi
      .spyOn(PurchasesService.prototype, 'getAllWithSuppliers')
      .mockResolvedValue({ data: [], error: null });

    await purchasesService.getPurchasesBySupplier('s1');
    await purchasesService.getPurchasesByPaymentStatus('paid');

    expect(getAllSpy).toHaveBeenCalled();
  });

  it('gets purchases by date range', async () => {
    const query = createThenableQuery({ data: [{ id: 'p1' }], error: null });
    fromMock.mockReturnValue(query);

    const result = await purchasesService.getPurchasesByDateRange(
      '2024-01-01',
      '2024-01-31'
    );

    expect(result.data?.[0].id).toBe('p1');
  });

  it('handles date range errors', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });
    const result = await purchasesService.getPurchasesByDateRange(
      '2024-01-01',
      '2024-01-31'
    );
    expect(result.data).toBeNull();
  });

  it('checks invoice number uniqueness', async () => {
    const query = createThenableQuery({ data: [], error: null });
    fromMock.mockReturnValue(query);

    expect(await purchasesService.isInvoiceNumberUnique('INV')).toBe(true);

    const excludeQuery = createThenableQuery({ data: [], error: null });
    fromMock.mockReturnValue(excludeQuery);
    await purchasesService.isInvoiceNumberUnique('INV', 'exclude');
    expect(excludeQuery.neq).toHaveBeenCalledWith('id', 'exclude');

    const errorQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    fromMock.mockReturnValue(errorQuery);

    expect(await purchasesService.isInvoiceNumberUnique('INV')).toBe(false);

    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(await purchasesService.isInvoiceNumberUnique('INV')).toBe(false);
  });

  it('updates item stocks when item exists', async () => {
    const service = new PurchasesService();
    const selectQuery = createThenableQuery(
      { data: { stock: 5 }, error: null },
      { singleResult: { data: { stock: 5 }, error: null } }
    );
    const updateQuery = createThenableQuery({ data: null, error: null });

    fromMock.mockReturnValueOnce(selectQuery).mockReturnValueOnce(updateQuery);

    await (
      service as unknown as {
        updateItemStocks: (
          updates: { id: string; increment: number }[]
        ) => Promise<void>;
      }
    ).updateItemStocks([{ id: 'i1', increment: 2 }]);

    expect(updateQuery.update).toHaveBeenCalledWith({ stock: 7 });
  });

  it('skips stock updates when item missing', async () => {
    const service = new PurchasesService();
    const selectQuery = createThenableQuery(
      { data: null, error: null },
      { singleResult: { data: null, error: null } }
    );

    fromMock.mockReturnValueOnce(selectQuery);

    await (
      service as unknown as {
        updateItemStocks: (
          updates: { id: string; increment: number }[]
        ) => Promise<void>;
      }
    ).updateItemStocks([{ id: 'i1', increment: 2 }]);

    expect(selectQuery.update).not.toHaveBeenCalled();
  });

  it('swallows stock update errors', async () => {
    const service = new PurchasesService();
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });
    await (
      service as unknown as {
        updateItemStocks: (
          updates: { id: string; increment: number }[]
        ) => Promise<void>;
      }
    ).updateItemStocks([{ id: 'i1', increment: 1 }]);
    expect(true).toBe(true);
  });
});
