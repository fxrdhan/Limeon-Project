import { describe, it, expect, vi, beforeEach } from 'vitest';
import { itemHistoryService } from './itemHistory.service';
import { createThenableQuery } from '@/test/utils/supabaseMock';

const rpcMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: rpcMock,
    from: fromMock,
  },
}));

describe('itemHistoryService', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
  });

  it('rolls back entity via rpc', async () => {
    rpcMock.mockResolvedValue({ data: { deleted_count: 2 }, error: null });

    const result = await itemHistoryService.hardRollbackEntity({
      entityTable: 'items',
      entityId: '1',
      targetVersion: 2,
    });

    expect(result.data?.deleted_count).toBe(2);
    expect(rpcMock).toHaveBeenCalled();
  });

  it('returns error when rpc fails', async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error('fail') });

    const result = await itemHistoryService.hardRollbackEntity({
      entityTable: 'items',
      entityId: '1',
      targetVersion: 2,
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('handles rpc exception', async () => {
    rpcMock.mockRejectedValue(new Error('boom'));
    const result = await itemHistoryService.hardRollbackEntity({
      entityTable: 'items',
      entityId: '1',
      targetVersion: 2,
    });
    expect(result.data).toBeNull();
  });

  it('restores entity with updated timestamp', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const query = createThenableQuery({ data: null, error: null });
    fromMock.mockReturnValue(query);

    const result = await itemHistoryService.softRestoreEntity({
      entityTable: 'items',
      entityId: '1',
      restoreData: { name: 'Item' },
    });

    expect(result.error).toBeNull();
    expect(query.update).toHaveBeenCalledWith({
      name: 'Item',
      updated_at: new Date('2024-01-01T00:00:00.000Z').toISOString(),
    });

    vi.useRealTimers();
  });

  it('handles restore errors', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = await itemHistoryService.softRestoreEntity({
      entityTable: 'items',
      entityId: '1',
      restoreData: {},
    });

    expect(result.data).toBeNull();
  });
});
