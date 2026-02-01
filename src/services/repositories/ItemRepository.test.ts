import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ItemRepository } from './ItemRepository';
import { createThenableQuery } from '@/test/utils/supabaseMock';

const fromMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

describe('ItemRepository', () => {
  const repo = new ItemRepository();

  beforeEach(() => {
    fromMock.mockReset();
  });

  it('gets items with filters and ordering', async () => {
    const query = createThenableQuery({ data: [{ id: '1' }], error: null });
    fromMock.mockReturnValue(query);

    const result = await repo.getItems({
      filters: { category_id: 'c1' },
      orderBy: { column: 'name', ascending: false },
    });

    expect(result.data?.[0].id).toBe('1');
    expect(query.eq).toHaveBeenCalledWith('category_id', 'c1');
    expect(query.order).toHaveBeenCalledWith('name', { ascending: false });
  });

  it('defaults ordering direction when not provided', async () => {
    const query = createThenableQuery({ data: [{ id: '1' }], error: null });
    fromMock.mockReturnValue(query);

    const result = await repo.getItems({
      orderBy: { column: 'name' },
    });

    expect(result.data?.[0].id).toBe('1');
    expect(query.order).toHaveBeenCalledWith('name', { ascending: true });
  });

  it('handles getItems exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await repo.getItems();
    expect(result.data).toBeNull();
  });

  it('skips ordering when not provided', async () => {
    const query = createThenableQuery({ data: [{ id: '1' }], error: null });
    fromMock.mockReturnValue(query);

    const result = await repo.getItems();
    expect(result.data?.[0].id).toBe('1');
    expect(query.order).not.toHaveBeenCalled();
  });

  it('gets item by id', async () => {
    const query = createThenableQuery({ data: { id: '1' }, error: null });
    fromMock.mockReturnValue(query);

    const result = await repo.getItemById('1');
    expect(result.data?.id).toBe('1');
  });

  it('handles getItemById exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await repo.getItemById('1');
    expect(result.data).toBeNull();
  });

  it('searches items with or conditions', async () => {
    const query = createThenableQuery({ data: [{ id: '1' }], error: null });
    fromMock.mockReturnValue(query);

    const result = await repo.searchItems('alpha', ['name', 'code']);
    expect(result.data?.[0].id).toBe('1');
    expect(query.or).toHaveBeenCalledWith(
      'name.ilike.%alpha%,code.ilike.%alpha%'
    );
  });

  it('applies filters and ordering in search', async () => {
    const query = createThenableQuery({ data: [{ id: '1' }], error: null });
    fromMock.mockReturnValue(query);

    const result = await repo.searchItems('alpha', ['name'], {
      filters: { category_id: 'c1' },
      orderBy: { column: 'name', ascending: false },
    });

    expect(result.data?.[0].id).toBe('1');
    expect(query.eq).toHaveBeenCalledWith('category_id', 'c1');
    expect(query.order).toHaveBeenCalledWith('name', { ascending: false });
  });

  it('defaults search ordering direction when not provided', async () => {
    const query = createThenableQuery({ data: [{ id: '1' }], error: null });
    fromMock.mockReturnValue(query);

    const result = await repo.searchItems('alpha', ['name'], {
      orderBy: { column: 'name' },
    });

    expect(result.data?.[0].id).toBe('1');
    expect(query.order).toHaveBeenCalledWith('name', { ascending: true });
  });

  it('handles search exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await repo.searchItems('alpha');
    expect(result.data).toBeNull();
  });

  it('gets low stock items', async () => {
    const query = createThenableQuery({ data: [{ id: '1' }], error: null });
    fromMock.mockReturnValue(query);

    const result = await repo.getLowStockItems(5);
    expect(result.data?.[0].id).toBe('1');
    expect(query.lte).toHaveBeenCalled();
  });

  it('handles low stock exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await repo.getLowStockItems(5);
    expect(result.data).toBeNull();
  });

  it('checks code uniqueness', async () => {
    const query = createThenableQuery({ data: [], error: null });
    fromMock.mockReturnValue(query);

    expect(await repo.isCodeUnique('C1')).toBe(true);

    const excludeQuery = createThenableQuery({ data: [], error: null });
    fromMock.mockReturnValue(excludeQuery);
    await repo.isCodeUnique('C1', 'exclude');
    expect(excludeQuery.neq).toHaveBeenCalledWith('id', 'exclude');

    const errorQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    fromMock.mockReturnValue(errorQuery);
    expect(await repo.isCodeUnique('C1')).toBe(false);

    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(await repo.isCodeUnique('C1')).toBe(false);
  });

  it('checks barcode uniqueness with exclusion', async () => {
    const query = createThenableQuery({ data: [], error: null });
    fromMock.mockReturnValue(query);

    expect(await repo.isBarcodeUnique('B1', 'exclude')).toBe(true);
    expect(query.neq).toHaveBeenCalledWith('id', 'exclude');

    const errorQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    fromMock.mockReturnValue(errorQuery);
    expect(await repo.isBarcodeUnique('B1')).toBe(false);

    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(await repo.isBarcodeUnique('B1')).toBe(false);
  });
});
