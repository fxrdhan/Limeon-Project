import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ItemsService, itemsService } from './items.service';

const getItemsMock = vi.hoisted(() => vi.fn());
const getItemByIdMock = vi.hoisted(() => vi.fn());
const searchItemsMock = vi.hoisted(() => vi.fn());
const getLowStockItemsMock = vi.hoisted(() => vi.fn());
const isCodeUniqueMock = vi.hoisted(() => vi.fn());
const isBarcodeUniqueMock = vi.hoisted(() => vi.fn());

const transformItemsMock = vi.hoisted(() => vi.fn());
const transformItemMock = vi.hoisted(() => vi.fn());
const validateItemDataMock = vi.hoisted(() => vi.fn());
const transformToDbMock = vi.hoisted(() => vi.fn());
const transformUpdateMock = vi.hoisted(() => vi.fn());
const formatStockMock = vi.hoisted(() => vi.fn());
const createEmptyItemMock = vi.hoisted(() => vi.fn());

vi.mock('../repositories/ItemRepository', () => ({
  itemRepository: {
    getItems: getItemsMock,
    getItemById: getItemByIdMock,
    searchItems: searchItemsMock,
    getLowStockItems: getLowStockItemsMock,
    isCodeUnique: isCodeUniqueMock,
    isBarcodeUnique: isBarcodeUniqueMock,
  },
}));

vi.mock('../transformers/ItemTransformer', () => ({
  ItemTransformer: {
    transformDBItemsToItems: transformItemsMock,
    transformDBItemToItem: transformItemMock,
    validateItemData: validateItemDataMock,
    transformItemToDBItem: transformToDbMock,
    transformItemUpdateToDBItem: transformUpdateMock,
    formatStockDisplay: formatStockMock,
    createEmptyItem: createEmptyItemMock,
  },
}));

describe('ItemsService', () => {
  beforeEach(() => {
    getItemsMock.mockReset();
    getItemByIdMock.mockReset();
    searchItemsMock.mockReset();
    getLowStockItemsMock.mockReset();
    isCodeUniqueMock.mockReset();
    isBarcodeUniqueMock.mockReset();
    transformItemsMock.mockReset();
    transformItemMock.mockReset();
    validateItemDataMock.mockReset();
    transformToDbMock.mockReset();
    transformUpdateMock.mockReset();
    formatStockMock.mockReset();
    createEmptyItemMock.mockReset();
  });

  it('gets all items with transformed data', async () => {
    getItemsMock.mockResolvedValue({ data: [{ id: '1' }], error: null });
    transformItemsMock.mockReturnValue([{ id: '1', name: 'Item' }]);

    const result = await itemsService.getAll();
    expect(result.data?.[0].id).toBe('1');
  });

  it('returns null when repository fails', async () => {
    getItemsMock.mockResolvedValue({ data: null, error: new Error('fail') });
    const result = await itemsService.getAll();
    expect(result.data).toBeNull();
  });

  it('handles repository exceptions for getAll', async () => {
    getItemsMock.mockRejectedValue(new Error('boom'));
    const result = await itemsService.getAll();
    expect(result.data).toBeNull();
  });

  it('gets item details', async () => {
    getItemByIdMock.mockResolvedValue({ data: { id: '1' }, error: null });
    transformItemMock.mockReturnValue({ id: '1', name: 'Item' });

    const result = await itemsService.getItemWithDetails('1');
    expect(result.data?.id).toBe('1');
  });

  it('returns null when item details missing', async () => {
    getItemByIdMock.mockResolvedValue({ data: null, error: new Error('fail') });
    const result = await itemsService.getItemWithDetails('1');
    expect(result.data).toBeNull();
  });

  it('handles get item details exceptions', async () => {
    getItemByIdMock.mockRejectedValue(new Error('boom'));
    const result = await itemsService.getItemWithDetails('1');
    expect(result.data).toBeNull();
  });

  it('searches items', async () => {
    searchItemsMock.mockResolvedValue({ data: [{ id: '1' }], error: null });
    transformItemsMock.mockReturnValue([{ id: '1' }]);

    const result = await itemsService.searchItems('item');
    expect(result.data?.[0].id).toBe('1');
  });

  it('returns null when search fails', async () => {
    searchItemsMock.mockResolvedValue({ data: null, error: new Error('fail') });
    const result = await itemsService.searchItems('item');
    expect(result.data).toBeNull();
  });

  it('handles search exceptions', async () => {
    searchItemsMock.mockRejectedValue(new Error('boom'));
    const result = await itemsService.searchItems('item');
    expect(result.data).toBeNull();
  });

  it('delegates category and type filters to getAll', async () => {
    const service = new ItemsService();
    const getAllSpy = vi
      .spyOn(service, 'getAll')
      .mockResolvedValue({ data: [], error: null });

    await service.getItemsByCategory('cat1');
    await service.getItemsByType('type1');

    expect(getAllSpy).toHaveBeenCalledWith({
      filters: { category_id: 'cat1' },
      orderBy: { column: 'name', ascending: true },
    });
    expect(getAllSpy).toHaveBeenCalledWith({
      filters: { type_id: 'type1' },
      orderBy: { column: 'name', ascending: true },
    });
  });

  it('gets low stock items', async () => {
    getLowStockItemsMock.mockResolvedValue({
      data: [{ id: '1' }],
      error: null,
    });
    transformItemsMock.mockReturnValue([{ id: '1' }]);

    const result = await itemsService.getLowStockItems(5);
    expect(result.data?.[0].id).toBe('1');
  });

  it('returns null when low stock fetch fails', async () => {
    getLowStockItemsMock.mockResolvedValue({
      data: null,
      error: new Error('fail'),
    });
    const result = await itemsService.getLowStockItems(5);
    expect(result.data).toBeNull();
  });

  it('handles low stock exceptions', async () => {
    getLowStockItemsMock.mockRejectedValue(new Error('boom'));
    const result = await itemsService.getLowStockItems(5);
    expect(result.data).toBeNull();
  });

  it('validates create/update conversions', async () => {
    validateItemDataMock.mockReturnValue({ isValid: false, errors: ['bad'] });

    const createResult = await itemsService.createItemWithConversions({
      name: '',
      code: '',
      stock: 1,
      base_price: 0,
      sell_price: 0,
      category_id: 'c',
      type_id: 't',
      package_id: 'p',
      unit_id: 'u',
      dosage_id: 'd',
      manufacturer_id: 'm',
      is_level_pricing_active: true,
      customer_level_discounts: [],
    });

    expect(createResult.data).toBeNull();

    validateItemDataMock.mockReturnValue({ isValid: true, errors: [] });
    transformToDbMock.mockReturnValue({ name: 'Ok' });
    const createSpy = vi
      .spyOn(ItemsService.prototype, 'create')
      .mockResolvedValue({ data: { id: '1' } as never, error: null });

    const validCreate = await itemsService.createItemWithConversions({
      name: 'Item',
      code: 'C',
      stock: 1,
      base_price: 1,
      sell_price: 2,
      category_id: 'c',
      type_id: 't',
      package_id: 'p',
      unit_id: 'u',
      dosage_id: 'd',
      manufacturer_id: 'm',
      is_level_pricing_active: true,
      customer_level_discounts: [],
    });

    expect(validCreate.data?.id).toBe('1');
    createSpy.mockRestore();
  });

  it('updates item conversions and skips empty validation', async () => {
    const updateSpy = vi
      .spyOn(ItemsService.prototype, 'update')
      .mockResolvedValue({ data: { id: '1' } as never, error: null });

    transformUpdateMock.mockReturnValue({});

    const result = await itemsService.updateItemWithConversions('1', {}, []);
    expect(result.data?.id).toBe('1');
    expect(validateItemDataMock).not.toHaveBeenCalled();

    updateSpy.mockRestore();
  });

  it('handles validation failures on update conversions', async () => {
    validateItemDataMock.mockReturnValue({ isValid: false, errors: ['bad'] });

    const result = await itemsService.updateItemWithConversions(
      '1',
      { name: 'X' },
      []
    );
    expect(result.data).toBeNull();
  });

  it('handles update conversion exceptions', async () => {
    validateItemDataMock.mockReturnValue({ isValid: true, errors: [] });
    transformUpdateMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await itemsService.updateItemWithConversions(
      '1',
      { name: 'X' },
      []
    );
    expect(result.data).toBeNull();
  });

  it('validates stock updates', async () => {
    const negative = await itemsService.updateStock('1', -1);
    expect(negative.error).toBeTruthy();

    const updateSpy = vi
      .spyOn(ItemsService.prototype, 'update')
      .mockResolvedValue({ data: { id: '1' } as never, error: null });

    const positive = await itemsService.updateStock('1', 5);
    expect(positive.data?.id).toBe('1');

    updateSpy.mockRestore();
  });

  it('validates bulk stock updates', async () => {
    const negative = await itemsService.bulkUpdateStock([
      { id: '1', stock: -1 },
    ]);
    expect(negative.error).toBeTruthy();

    const bulkSpy = vi
      .spyOn(ItemsService.prototype, 'bulkUpdate')
      .mockResolvedValue({ data: [{ id: '1' }] as never, error: null });

    const positive = await itemsService.bulkUpdateStock([
      { id: '1', stock: 2 },
    ]);
    expect(positive.data?.[0].id).toBe('1');

    bulkSpy.mockRestore();
  });

  it('delegates uniqueness checks', async () => {
    isCodeUniqueMock.mockResolvedValue(true);
    isBarcodeUniqueMock.mockResolvedValue(false);

    expect(await itemsService.isCodeUnique('C')).toBe(true);
    expect(await itemsService.isBarcodeUnique('B')).toBe(false);
  });

  it('formats stock display', async () => {
    const service = new ItemsService();
    const getItemSpy = vi
      .spyOn(service, 'getItemWithDetails')
      .mockResolvedValue({
        data: { stock: 2, package_conversions: [], base_unit: 'pcs' } as never,
        error: null,
      });

    formatStockMock.mockReturnValue('2 pcs');
    const result = await service.getFormattedStock('1');
    expect(result).toBe('2 pcs');

    getItemSpy.mockRestore();

    const errorService = new ItemsService();
    vi.spyOn(errorService, 'getItemWithDetails').mockResolvedValue({
      data: null,
      error: new Error('fail') as never,
    });
    const errorResult = await errorService.getFormattedStock('1');
    expect(errorResult).toBe('0');

    const throwService = new ItemsService();
    vi.spyOn(throwService, 'getItemWithDetails').mockRejectedValue(
      new Error('boom')
    );
    const throwResult = await throwService.getFormattedStock('1');
    expect(throwResult).toBe('0');
  });

  it('formats stock display with defaults', async () => {
    const service = new ItemsService();
    const getItemSpy = vi
      .spyOn(service, 'getItemWithDetails')
      .mockResolvedValue({
        data: {
          stock: undefined,
          package_conversions: undefined,
          base_unit: undefined,
        } as never,
        error: null,
      });

    formatStockMock.mockReturnValue('0');
    const result = await service.getFormattedStock('1');
    expect(result).toBe('0');

    getItemSpy.mockRestore();
  });

  it('creates empty item template', () => {
    createEmptyItemMock.mockReturnValue({ name: '' });
    const result = itemsService.createEmptyItem();
    expect(result.name).toBe('');
  });
});
