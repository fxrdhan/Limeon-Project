import { describe, it, expect, vi, beforeEach } from 'vitest';
import { entityHistoryService } from './entityHistory.service';
import { createThenableQuery } from '@/test/utils/supabaseMock';

const fromMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

describe('entityHistoryService', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('fetches and transforms history', async () => {
    const data = [
      { id: '1', users: { name: 'User A', profilephoto: 'photo' } },
    ];
    const query = createThenableQuery({ data, error: null });
    fromMock.mockReturnValue(query);

    const result = await entityHistoryService.fetchHistory('items', '1');

    expect(result.data?.[0].user_name).toBe('User A');
    expect(result.data?.[0].user_photo).toBe('photo');
  });

  it('maps history entries without user info', async () => {
    const data = [{ id: '1', users: null }];
    const query = createThenableQuery({ data, error: null });
    fromMock.mockReturnValue(query);

    const result = await entityHistoryService.fetchHistory('items', '1');

    expect(result.data?.[0].user_name).toBeNull();
    expect(result.data?.[0].user_photo).toBeNull();
  });

  it('handles empty history data', async () => {
    const query = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(query);

    const result = await entityHistoryService.fetchHistory('items', '1');
    expect(result.data).toEqual([]);
  });

  it('returns error when supabase returns error', async () => {
    const query = createThenableQuery({ data: null, error: new Error('fail') });
    fromMock.mockReturnValue(query);

    const result = await entityHistoryService.fetchHistory('items', '1');
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('gets next version number', async () => {
    const query = createThenableQuery({
      data: [{ version_number: 2 }],
      error: null,
    });
    fromMock.mockReturnValue(query);

    const result = await entityHistoryService.getNextVersionNumber(
      'items',
      '1'
    );
    expect(result.data).toBe(3);
  });

  it('returns next version when history is empty', async () => {
    const query = createThenableQuery({ data: [], error: null });
    fromMock.mockReturnValue(query);

    const result = await entityHistoryService.getNextVersionNumber(
      'items',
      '1'
    );
    expect(result.data).toBe(1);
  });

  it('inserts history entries', async () => {
    const query = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(query);

    const result = await entityHistoryService.insertHistoryEntry({
      entityTable: 'items',
      entityId: '1',
      versionNumber: 1,
      actionType: 'UPDATE',
      entityData: { name: 'Item' },
    });

    expect(result.error).toBeNull();
    expect(query.insert).toHaveBeenCalled();
  });

  it('handles errors and exceptions', async () => {
    const errorQuery = createThenableQuery({
      data: null,
      error: new Error('fail'),
    });
    fromMock.mockReturnValue(errorQuery);

    const errorResult = await entityHistoryService.getNextVersionNumber(
      'items',
      '1'
    );
    expect(errorResult.data).toBeNull();

    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const catchResult = await entityHistoryService.fetchHistory('items', '1');
    expect(catchResult.data).toBeNull();

    const versionCatch = await entityHistoryService.getNextVersionNumber(
      'items',
      '1'
    );
    expect(versionCatch.data).toBeNull();

    const insertCatch = await entityHistoryService.insertHistoryEntry({
      entityTable: 'items',
      entityId: '1',
      versionNumber: 1,
      actionType: 'INSERT',
      entityData: {},
    });
    expect(insertCatch.data).toBeNull();
  });
});
