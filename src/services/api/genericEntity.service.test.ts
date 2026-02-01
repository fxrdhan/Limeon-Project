import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenericEntityService } from './genericEntity.service';
import { createThenableQuery } from '@/test/utils/supabaseMock';

const fromMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

describe('GenericEntityService', () => {
  const service = new GenericEntityService<{ id: string }>('items');

  beforeEach(() => {
    fromMock.mockReset();
  });

  it('lists entities with filters and ordering', async () => {
    const query = createThenableQuery({ data: [{ id: '1' }], error: null });
    fromMock.mockReturnValue(query);

    const result = await service.list({
      select: '*',
      filters: { status: 'active', empty: '', nil: null },
      orderBy: { column: 'name' },
    });

    expect(result.data?.[0].id).toBe('1');
    expect(query.eq).toHaveBeenCalledWith('status', 'active');
    expect(query.order).toHaveBeenCalledWith('name', { ascending: true });
  });

  it('returns empty list when no entities', async () => {
    const query = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(query);

    const result = await service.list({ select: '*' });
    expect(result.data).toEqual([]);
  });

  it('handles list errors and exceptions', async () => {
    const query = createThenableQuery({ data: null, error: new Error('fail') });
    fromMock.mockReturnValue(query);

    const result = await service.list({ select: '*' });
    expect(result.data).toBeNull();

    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const catchResult = await service.list({ select: '*' });
    expect(catchResult.data).toBeNull();
  });

  it('creates, updates, and deletes entities', async () => {
    const createQuery = createThenableQuery({ data: { id: '1' }, error: null });
    const updateQuery = createThenableQuery({ data: { id: '1' }, error: null });
    const deleteQuery = createThenableQuery({ data: null, error: null });

    fromMock
      .mockReturnValueOnce(createQuery)
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce(deleteQuery);

    const created = await service.create({ name: 'Item' }, '*');
    const updated = await service.update('1', { name: 'New' }, '*');
    const deleted = await service.delete('1');

    expect(created.data?.id).toBe('1');
    expect(updated.data?.id).toBe('1');
    expect(deleted.error).toBeNull();
  });

  it('returns error on create/update failures', async () => {
    const createQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    const updateQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });

    fromMock.mockReturnValueOnce(createQuery).mockReturnValueOnce(updateQuery);

    const created = await service.create({ name: 'Item' }, '*');
    const updated = await service.update('1', { name: 'New' }, '*');

    expect(created.data).toBeNull();
    expect(updated.data).toBeNull();
  });

  it('handles create/update/delete exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const created = await service.create({ name: 'Item' }, '*');
    const updated = await service.update('1', { name: 'New' }, '*');
    const deleted = await service.delete('1');

    expect(created.data).toBeNull();
    expect(updated.data).toBeNull();
    expect(deleted.data).toBeNull();
  });
});
