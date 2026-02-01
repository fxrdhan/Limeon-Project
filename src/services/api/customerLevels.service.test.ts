import { describe, it, expect, vi, beforeEach } from 'vitest';
import { customerLevelsService } from './customerLevels.service';
import { createThenableQuery } from '@/test/utils/supabaseMock';

const fromMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

describe('CustomerLevelsService', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('gets all levels', async () => {
    const query = createThenableQuery({ data: [{ id: '1' }], error: null });
    fromMock.mockReturnValue(query);

    const result = await customerLevelsService.getAll();
    expect(result.data?.[0].id).toBe('1');
  });

  it('returns empty list when no levels', async () => {
    const query = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(query);

    const result = await customerLevelsService.getAll();
    expect(result.data).toEqual([]);
  });

  it('handles getAll errors', async () => {
    const query = createThenableQuery({ data: null, error: new Error('fail') });
    fromMock.mockReturnValue(query);

    const result = await customerLevelsService.getAll();
    expect(result.data).toBeNull();
  });

  it('handles getAll exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await customerLevelsService.getAll();
    expect(result.data).toBeNull();
  });

  it('creates, updates, deletes levels', async () => {
    const createQuery = createThenableQuery({ data: { id: '1' }, error: null });
    const updateQuery = createThenableQuery({ data: null, error: null });
    const deleteQuery = createThenableQuery({ data: null, error: null });

    fromMock
      .mockReturnValueOnce(createQuery)
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce(deleteQuery);

    const createResult = await customerLevelsService.create({
      level_name: 'Gold',
      price_percentage: 90,
      description: null,
    });
    const updateResult = await customerLevelsService.update('1', {
      description: 'Updated',
    });
    const deleteResult = await customerLevelsService.delete('1');

    expect(createResult.data?.id).toBe('1');
    expect(updateResult.error).toBeNull();
    expect(deleteResult.error).toBeNull();
  });

  it('returns error when create fails', async () => {
    const createQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    fromMock.mockReturnValue(createQuery);

    const result = await customerLevelsService.create({
      level_name: 'Bronze',
      price_percentage: 100,
      description: null,
    });

    expect(result.data).toBeNull();
  });

  it('handles create/update/delete exceptions', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const createResult = await customerLevelsService.create({
      level_name: 'Silver',
      price_percentage: 95,
      description: null,
    });
    const updateResult = await customerLevelsService.update('1', {
      description: 'x',
    });
    const deleteResult = await customerLevelsService.delete('1');

    expect(createResult.data).toBeNull();
    expect(updateResult.data).toBeNull();
    expect(deleteResult.data).toBeNull();
  });

  it('seeds default levels', async () => {
    const query = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(query);

    const result = await customerLevelsService.seedDefaults([
      { level_name: 'Gold', price_percentage: 90 },
    ]);

    expect(result.error).toBeNull();
    expect(query.upsert).toHaveBeenCalled();
  });

  it('handles seed defaults exception', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });
    const result = await customerLevelsService.seedDefaults([
      { level_name: 'Gold', price_percentage: 90 },
    ]);
    expect(result.data).toBeNull();
  });
});
