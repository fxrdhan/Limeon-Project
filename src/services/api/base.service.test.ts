import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PostgrestError } from '@supabase/supabase-js';
import { BaseService } from './base.service';

const fromMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

type TestEntity = {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string | null;
};

type ThenableQuery = {
  select: (...args: unknown[]) => ThenableQuery;
  eq: (...args: unknown[]) => ThenableQuery;
  order: (...args: unknown[]) => ThenableQuery;
  limit: (...args: unknown[]) => ThenableQuery;
  range: (...args: unknown[]) => ThenableQuery;
  insert: (...args: unknown[]) => ThenableQuery;
  update: (...args: unknown[]) => ThenableQuery;
  delete: (...args: unknown[]) => ThenableQuery;
  or: (...args: unknown[]) => ThenableQuery;
  single: () => Promise<unknown>;
  then: (
    resolve: (value: unknown) => unknown,
    reject: (reason?: unknown) => unknown
  ) => Promise<unknown>;
};

const createThenableQuery = (
  result: unknown,
  options: { reject?: Error; rejectSingle?: Error } = {}
) => {
  const query: ThenableQuery = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    range: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    or: vi.fn(() => query),
    single: vi.fn(() =>
      options.rejectSingle
        ? Promise.reject(options.rejectSingle)
        : Promise.resolve(result)
    ),
    then: (resolve, reject) =>
      (options.reject
        ? Promise.reject(options.reject)
        : Promise.resolve(result)
      ).then(resolve, reject),
  };
  return query;
};

describe('BaseService', () => {
  const service = new BaseService<TestEntity>('test_table');

  beforeEach(() => {
    fromMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAll', () => {
    it('applies filters, ordering, pagination, and select', async () => {
      const data = [{ id: '1', name: 'Alpha' }];
      const query = createThenableQuery({ data, error: null, count: 1 });
      fromMock.mockReturnValue(query);

      const result = await service.getAll({
        select: 'id, name',
        filters: { status: 'active', archived: null },
        orderBy: { column: 'name' },
        limit: 5,
        offset: 10,
      });

      expect(result.data).toEqual(data);
      expect(query.eq).toHaveBeenCalledWith('status', 'active');
      expect(query.order).toHaveBeenCalledWith('name', { ascending: true });
      expect(query.limit).toHaveBeenCalledWith(5);
      expect(query.range).toHaveBeenCalledWith(10, 14);
    });

    it('uses default limit when only offset is provided', async () => {
      const query = createThenableQuery({ data: null, error: null, count: 0 });
      fromMock.mockReturnValue(query);

      const result = await service.getAll({ offset: 3 });

      expect(result.data).toEqual([]);
      expect(query.range).toHaveBeenCalledWith(3, 12);
    });

    it('returns error when supabase throws', async () => {
      const error = new Error('getAll failed');
      fromMock.mockImplementation(() => {
        throw error;
      });

      const result = await service.getAll();

      expect(result.data).toBeNull();
      expect(result.error).toBe(error);
    });
  });

  describe('getById', () => {
    it('returns data when found and select is provided', async () => {
      const data = { id: '1', name: 'Alpha' };
      const query = createThenableQuery({ data, error: null });
      query.single = vi.fn(() => Promise.resolve({ data, error: null }));
      fromMock.mockReturnValue(query);

      const result = await service.getById('1', 'id, name');

      expect(result.data).toEqual(data);
      expect(query.select).toHaveBeenCalledWith('id, name');
    });

    it('returns null when data is missing', async () => {
      const query = createThenableQuery({ data: null, error: null });
      query.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
      fromMock.mockReturnValue(query);

      const result = await service.getById('1');

      expect(result.data).toBeNull();
      expect(query.select).toHaveBeenCalledWith('*');
    });

    it('returns error when supabase throws', async () => {
      const error = new Error('getById failed');
      const query = createThenableQuery(null, { rejectSingle: error });
      fromMock.mockReturnValue(query);

      const result = await service.getById('1');

      expect(result.data).toBeNull();
      expect(result.error).toBe(error);
    });
  });

  describe('create', () => {
    it('creates and returns data', async () => {
      const data = { id: '1', name: 'Alpha' };
      const query = createThenableQuery({ data, error: null });
      query.single = vi.fn(() => Promise.resolve({ data, error: null }));
      fromMock.mockReturnValue(query);

      const result = await service.create({ name: 'Alpha' } as TestEntity);

      expect(result.data).toEqual(data);
      expect(query.insert).toHaveBeenCalled();
    });

    it('returns null when created data is missing', async () => {
      const query = createThenableQuery({ data: null, error: null });
      query.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
      fromMock.mockReturnValue(query);

      const result = await service.create({ name: 'Alpha' } as TestEntity);

      expect(result.data).toBeNull();
    });

    it('returns error when supabase throws', async () => {
      const error = new Error('create failed');
      const query = createThenableQuery(null, { rejectSingle: error });
      fromMock.mockReturnValue(query);

      const result = await service.create({ name: 'Alpha' } as TestEntity);

      expect(result.data).toBeNull();
      expect(result.error).toBe(error);
    });
  });

  describe('update', () => {
    it('updates and returns data', async () => {
      const data = { id: '1', name: 'Updated' };
      const query = createThenableQuery({ data, error: null });
      query.single = vi.fn(() => Promise.resolve({ data, error: null }));
      fromMock.mockReturnValue(query);

      const result = await service.update('1', { name: 'Updated' });

      expect(result.data).toEqual(data);
      expect(query.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated',
          updated_at: expect.any(String),
        })
      );
    });

    it('returns null when updated data is missing', async () => {
      const query = createThenableQuery({ data: null, error: null });
      query.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
      fromMock.mockReturnValue(query);

      const result = await service.update('1', { name: 'Updated' });

      expect(result.data).toBeNull();
    });

    it('returns error when supabase throws', async () => {
      const error = new Error('update failed');
      const query = createThenableQuery(null, { rejectSingle: error });
      fromMock.mockReturnValue(query);

      const result = await service.update('1', { name: 'Updated' });

      expect(result.data).toBeNull();
      expect(result.error).toBe(error);
    });
  });

  describe('delete', () => {
    it('deletes and returns error state', async () => {
      const query = createThenableQuery({ data: null, error: null });
      fromMock.mockReturnValue(query);

      const result = await service.delete('1');

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it('returns error when supabase throws', async () => {
      const error = new Error('delete failed');
      fromMock.mockImplementation(() => {
        throw error;
      });

      const result = await service.delete('1');

      expect(result.data).toBeNull();
      expect(result.error).toBe(error);
    });
  });

  describe('search', () => {
    it('builds search filter and applies options', async () => {
      const data = [{ id: '1', name: 'Alpha' }];
      const query = createThenableQuery({ data, error: null, count: 1 });
      fromMock.mockReturnValue(query);

      const result = await service.search('alpha', ['name', 'code'], {
        select: 'id, name',
        filters: { status: 'active', archived: undefined },
        orderBy: { column: 'name', ascending: false },
        limit: 3,
      });

      expect(result.data).toEqual(data);
      expect(query.or).toHaveBeenCalledWith(
        'name.ilike.%alpha%,code.ilike.%alpha%'
      );
      expect(query.eq).toHaveBeenCalledWith('status', 'active');
      expect(query.order).toHaveBeenCalledWith('name', { ascending: false });
      expect(query.limit).toHaveBeenCalledWith(3);
    });

    it('uses default select when query is empty', async () => {
      const query = createThenableQuery({ data: null, error: null, count: 0 });
      fromMock.mockReturnValue(query);

      const result = await service.search('', [], undefined);

      expect(result.data).toEqual([]);
      expect(query.or).not.toHaveBeenCalled();
    });

    it('applies default ascending when orderBy has no direction', async () => {
      const query = createThenableQuery({ data: [], error: null, count: 0 });
      fromMock.mockReturnValue(query);

      await service.search('beta', ['name'], {
        orderBy: { column: 'name' },
      });

      expect(query.order).toHaveBeenCalledWith('name', { ascending: true });
    });

    it('returns error when supabase throws', async () => {
      const error = new Error('search failed');
      fromMock.mockImplementation(() => {
        throw error;
      });

      const result = await service.search('alpha', ['name']);

      expect(result.data).toBeNull();
      expect(result.error).toBe(error);
    });
  });

  describe('bulkCreate', () => {
    it('returns created data when available', async () => {
      const data = [{ id: '1', name: 'Alpha' }];
      const query = createThenableQuery({ data, error: null });
      fromMock.mockReturnValue(query);

      const result = await service.bulkCreate([
        { name: 'Alpha' } as TestEntity,
      ]);

      expect(result.data).toEqual(data);
    });

    it('returns empty array when data is missing', async () => {
      const query = createThenableQuery({ data: null, error: null });
      fromMock.mockReturnValue(query);

      const result = await service.bulkCreate([
        { name: 'Alpha' } as TestEntity,
      ]);

      expect(result.data).toEqual([]);
    });

    it('returns error when supabase throws', async () => {
      const error = new Error('bulkCreate failed');
      fromMock.mockImplementation(() => {
        throw error;
      });

      const result = await service.bulkCreate([
        { name: 'Alpha' } as TestEntity,
      ]);

      expect(result.data).toBeNull();
      expect(result.error).toBe(error);
    });
  });

  describe('bulkUpdate', () => {
    it('returns first error when any update fails', async () => {
      const updateSpy = vi
        .spyOn(service, 'update')
        .mockResolvedValueOnce({
          data: null,
          error: {
            message: 'failed',
            details: '',
            hint: '',
            code: '',
          } as PostgrestError,
        })
        .mockResolvedValueOnce({
          data: { id: '2', name: 'Beta' },
          error: null,
        });

      const result = await service.bulkUpdate([
        { id: '1', data: { name: 'Alpha' } },
        { id: '2', data: { name: 'Beta' } },
      ]);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(
        expect.objectContaining({ message: 'failed' })
      );
      updateSpy.mockRestore();
    });

    it('returns data when all updates succeed', async () => {
      const updateSpy = vi
        .spyOn(service, 'update')
        .mockResolvedValue({ data: { id: '1', name: 'Alpha' }, error: null });

      const result = await service.bulkUpdate([
        { id: '1', data: { name: 'Alpha' } },
      ]);

      expect(result.data).toEqual([{ id: '1', name: 'Alpha' }]);
      expect(result.error).toBeNull();
      updateSpy.mockRestore();
    });

    it('returns error when updates throw', async () => {
      const updateSpy = vi
        .spyOn(service, 'update')
        .mockRejectedValue(new Error('bulkUpdate failed'));

      const result = await service.bulkUpdate([
        { id: '1', data: { name: 'Alpha' } },
      ]);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      updateSpy.mockRestore();
    });
  });

  describe('exists', () => {
    it('returns true when record exists', async () => {
      const query = createThenableQuery({ data: { id: '1' }, error: null });
      query.single = vi.fn(() =>
        Promise.resolve({ data: { id: '1' }, error: null })
      );
      fromMock.mockReturnValue(query);

      const result = await service.exists('1');

      expect(result).toBe(true);
    });

    it('returns false when record is missing', async () => {
      const query = createThenableQuery({ data: null, error: null });
      query.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
      fromMock.mockReturnValue(query);

      const result = await service.exists('1');

      expect(result).toBe(false);
    });

    it('returns false when supabase returns error', async () => {
      const query = createThenableQuery({
        data: null,
        error: { message: 'err' },
      });
      query.single = vi.fn(() =>
        Promise.resolve({ data: null, error: { message: 'err' } })
      );
      fromMock.mockReturnValue(query);

      const result = await service.exists('1');

      expect(result).toBe(false);
    });

    it('returns false when supabase throws', async () => {
      const error = new Error('exists failed');
      fromMock.mockImplementation(() => {
        throw error;
      });

      const result = await service.exists('1');

      expect(result).toBe(false);
    });
  });
});
