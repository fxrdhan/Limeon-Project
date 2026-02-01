import { describe, it, expect, vi, beforeEach } from 'vitest';
import { itemDataService } from './itemData.service';
import { createThenableQuery } from '@/test/utils/supabaseMock';

const fromMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

describe('itemDataService', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('fetches item data by id', async () => {
    const query = createThenableQuery({ data: { id: '1' }, error: null });
    fromMock.mockReturnValue(query);

    const result = await itemDataService.fetchItemDataById('1');
    expect(result.data).toEqual({ id: '1' });
  });

  it('handles fetch item exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await itemDataService.fetchItemDataById('1');
    expect(result.data).toBeNull();
  });

  it('returns null when item not found', async () => {
    const query = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(query);

    const result = await itemDataService.fetchItemDataById('1');
    expect(result.data).toBeNull();
  });

  it('updates item fields', async () => {
    const query = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(query);

    const result = await itemDataService.updateItemFields('1', { name: 'A' });
    expect(result.error).toBeNull();
    expect(query.update).toHaveBeenCalled();
  });

  it('handles update item exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await itemDataService.updateItemFields('1', { name: 'A' });
    expect(result.data).toBeNull();
  });

  it('creates item and returns id', async () => {
    const query = createThenableQuery({ data: { id: 'new-id' }, error: null });
    fromMock.mockReturnValue(query);

    const result = await itemDataService.createItem({ name: 'Item' });
    expect(result.data?.id).toBe('new-id');
  });

  it('returns null when create item fails', async () => {
    const query = createThenableQuery({ data: null, error: new Error('fail') });
    fromMock.mockReturnValue(query);

    const result = await itemDataService.createItem({ name: 'Item' });
    expect(result.data).toBeNull();
  });

  it('handles create item exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await itemDataService.createItem({ name: 'Item' });
    expect(result.data).toBeNull();
  });

  it('updates item images via updateItemFields', async () => {
    const spy = vi
      .spyOn(itemDataService, 'updateItemFields')
      .mockResolvedValue({ data: null, error: null });

    await itemDataService.updateItemImages('1', ['url']);

    expect(spy).toHaveBeenCalledWith('1', { image_urls: ['url'] });
  });

  it('gets customer level discounts', async () => {
    const query = createThenableQuery({
      data: [{ customer_level_id: 'lvl1', discount_percentage: 10 }],
      error: null,
    });
    fromMock.mockReturnValue(query);

    const result = await itemDataService.getCustomerLevelDiscounts('1');
    expect(result.data?.[0].customer_level_id).toBe('lvl1');
  });

  it('returns empty discounts when none found', async () => {
    const query = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(query);

    const result = await itemDataService.getCustomerLevelDiscounts('1');
    expect(result.data).toEqual([]);
  });

  it('returns error when customer level discounts query fails', async () => {
    const query = createThenableQuery({ data: null, error: new Error('fail') });
    fromMock.mockReturnValue(query);

    const result = await itemDataService.getCustomerLevelDiscounts('1');
    expect(result.data).toBeNull();
  });

  it('handles customer level discounts exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await itemDataService.getCustomerLevelDiscounts('1');
    expect(result.data).toBeNull();
  });

  it('replaces customer level discounts', async () => {
    const deleteQuery = createThenableQuery({ data: null, error: null });
    const insertQuery = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValueOnce(deleteQuery).mockReturnValueOnce(insertQuery);

    const result = await itemDataService.replaceCustomerLevelDiscounts('1', [
      { customer_level_id: 'lvl1', discount_percentage: 5 },
    ]);

    expect(result.error).toBeNull();
    expect(insertQuery.insert).toHaveBeenCalled();
  });

  it('handles replace discounts exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await itemDataService.replaceCustomerLevelDiscounts('1', [
      { customer_level_id: 'lvl1', discount_percentage: 5 },
    ]);
    expect(result.data).toBeNull();
  });

  it('returns error when delete discounts fails', async () => {
    const deleteQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    fromMock.mockReturnValue(deleteQuery);

    const result = await itemDataService.replaceCustomerLevelDiscounts('1', [
      { customer_level_id: 'lvl1', discount_percentage: 5 },
    ]);
    expect(result.data).toBeNull();
  });

  it('skips insert when discounts empty', async () => {
    const deleteQuery = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(deleteQuery);

    const result = await itemDataService.replaceCustomerLevelDiscounts('1', []);
    expect(result.error).toBeNull();
  });

  it('gets item codes like pattern', async () => {
    const query = createThenableQuery({ data: [{ code: 'A1' }], error: null });
    fromMock.mockReturnValue(query);

    const result = await itemDataService.getItemCodesLike('A%');
    expect(result.data?.[0].code).toBe('A1');
  });

  it('returns empty codes when none found', async () => {
    const query = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(query);

    const result = await itemDataService.getItemCodesLike('A%');
    expect(result.data).toEqual([]);
  });

  it('handles errors when getting item codes', async () => {
    const errorQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    fromMock.mockReturnValue(errorQuery);

    const result = await itemDataService.getItemCodesLike('A%');
    expect(result.data).toBeNull();

    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });
    const catchResult = await itemDataService.getItemCodesLike('A%');
    expect(catchResult.data).toBeNull();
  });
});
