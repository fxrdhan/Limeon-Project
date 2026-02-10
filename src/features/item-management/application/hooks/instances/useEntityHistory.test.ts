import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEntityHistory } from './useEntityHistory';

type Status = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';

type MockChannel = {
  name: string;
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  handlers: Array<(payload: unknown) => void>;
  emitStatus: (status: Status) => void;
  emit: (payload: unknown) => void;
};

const fetchHistoryMock = vi.hoisted(() => vi.fn());
const getNextVersionNumberMock = vi.hoisted(() => vi.fn());
const insertHistoryEntryMock = vi.hoisted(() => vi.fn());
const softRestoreEntityMock = vi.hoisted(() => vi.fn());
const createChannelMock = vi.hoisted(() => vi.fn());
const removeChannelMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/realtime/realtime.service', () => ({
  realtimeService: {
    createChannel: createChannelMock,
    removeChannel: removeChannelMock,
  },
}));

vi.mock('../../../infrastructure/entityHistory.service', () => ({
  entityHistoryService: {
    fetchHistory: fetchHistoryMock,
    getNextVersionNumber: getNextVersionNumberMock,
    insertHistoryEntry: insertHistoryEntryMock,
  },
}));

vi.mock('../../../infrastructure/itemHistory.service', () => ({
  itemHistoryService: {
    softRestoreEntity: softRestoreEntityMock,
  },
}));

const makeHistory = () => [
  {
    id: 'h-2',
    entity_table: 'item_categories',
    entity_id: 'cat-1',
    version_number: 2,
    action_type: 'UPDATE' as const,
    changed_by: null,
    changed_at: '2025-01-02',
    entity_data: {
      id: 'cat-1',
      name: 'Kategori Baru',
      description: 'Diperbarui',
      created_at: '2025-01-01',
      updated_at: '2025-01-02',
    },
    changed_fields: { name: { from: 'Kategori Lama', to: 'Kategori Baru' } },
  },
  {
    id: 'h-1',
    entity_table: 'item_categories',
    entity_id: 'cat-1',
    version_number: 1,
    action_type: 'INSERT' as const,
    changed_by: null,
    changed_at: '2025-01-01',
    entity_data: {
      id: 'cat-1',
      name: 'Kategori Lama',
      description: 'Awal',
    },
  },
];

const makeChannel = (name: string): MockChannel => {
  const handlers: Array<(payload: unknown) => void> = [];
  let statusHandler: ((status: Status) => void) | undefined;

  const channel: MockChannel = {
    name,
    handlers,
    on: vi.fn((_event, _config, handler: (payload: unknown) => void) => {
      handlers.push(handler);
      return channel;
    }),
    subscribe: vi.fn((handler: (status: Status) => void) => {
      statusHandler = handler;
      return channel;
    }),
    unsubscribe: vi.fn(),
    emitStatus: (status: Status) => {
      statusHandler?.(status);
    },
    emit: (payload: unknown) => {
      handlers.forEach(handler => handler(payload));
    },
  };

  return channel;
};

describe('useEntityHistory', () => {
  beforeEach(() => {
    fetchHistoryMock.mockReset();
    getNextVersionNumberMock.mockReset();
    insertHistoryEntryMock.mockReset();
    softRestoreEntityMock.mockReset();
    createChannelMock.mockReset();
    removeChannelMock.mockReset();

    fetchHistoryMock.mockResolvedValue({ data: makeHistory(), error: null });
    getNextVersionNumberMock.mockResolvedValue({ data: 3, error: null });
    insertHistoryEntryMock.mockResolvedValue({ data: null, error: null });
    softRestoreEntityMock.mockResolvedValue({ data: null, error: null });

    createChannelMock.mockImplementation((name: string) => makeChannel(name));
  });

  it('fetches history, computes diffs, restores versions, and creates new history entries', async () => {
    const { result } = renderHook(() =>
      useEntityHistory('item_categories', 'cat-1')
    );

    await waitFor(() => {
      expect(fetchHistoryMock).toHaveBeenCalledWith('item_categories', 'cat-1');
      expect(result.current.history).toHaveLength(2);
    });

    const diff = result.current.getVersionDiff(1, 2);
    expect(diff?.changes.name).toEqual({
      from: 'Kategori Lama',
      to: 'Kategori Baru',
    });

    await act(async () => {
      await result.current.restoreVersion(2);
    });

    expect(softRestoreEntityMock).toHaveBeenCalledWith({
      entityTable: 'item_categories',
      entityId: 'cat-1',
      restoreData: {
        name: 'Kategori Baru',
        description: 'Diperbarui',
      },
    });

    await act(async () => {
      await result.current.addHistoryEntry(
        'UPDATE',
        { id: 'cat-1', name: 'Kategori Uji' },
        { name: { from: 'Kategori Baru', to: 'Kategori Uji' } },
        'Perubahan manual'
      );
    });

    expect(getNextVersionNumberMock).toHaveBeenCalledWith(
      'item_categories',
      'cat-1'
    );
    expect(insertHistoryEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityTable: 'item_categories',
        entityId: 'cat-1',
        versionNumber: 3,
        actionType: 'UPDATE',
      })
    );
  });

  it('subscribes realtime channels, refetches silently on matching events, and cleans up', async () => {
    const { unmount } = renderHook(() =>
      useEntityHistory('item_categories', 'cat-1')
    );

    await waitFor(() => {
      expect(createChannelMock).toHaveBeenCalledTimes(2);
    });

    const historyChannel = createChannelMock.mock.results[0]
      .value as MockChannel;
    const entityChannel = createChannelMock.mock.results[1]
      .value as MockChannel;

    act(() => {
      historyChannel.emit({
        new: { entity_id: 'cat-1' },
        old: null,
      });
      historyChannel.emit({
        new: { entity_id: 'other' },
        old: null,
      });
      entityChannel.emit({});
      historyChannel.emitStatus('SUBSCRIBED');
      entityChannel.emitStatus('CHANNEL_ERROR');
    });

    await waitFor(() => {
      expect(fetchHistoryMock.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    unmount();

    expect(historyChannel.unsubscribe).toHaveBeenCalled();
    expect(entityChannel.unsubscribe).toHaveBeenCalled();
    expect(removeChannelMock).toHaveBeenCalledWith(historyChannel);
    expect(removeChannelMock).toHaveBeenCalledWith(entityChannel);
  });

  it('handles missing inputs and not-found restore versions safely', async () => {
    const { result } = renderHook(() => useEntityHistory('', ''));

    await act(async () => {
      await result.current.fetchHistory();
    });

    expect(fetchHistoryMock).not.toHaveBeenCalled();

    await expect(result.current.restoreVersion(99)).rejects.toThrow(
      'Version 99 not found'
    );
  });

  it('handles fetch and mutation errors in history workflows', async () => {
    fetchHistoryMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'fetch failed' },
    });
    const { result } = renderHook(() =>
      useEntityHistory('item_categories', 'cat-1')
    );

    await waitFor(() => {
      expect(result.current.error).toBe('fetch failed');
    });

    getNextVersionNumberMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'next version failed' },
    });

    await act(async () => {
      await result.current.addHistoryEntry('UPDATE', { id: 'cat-1' });
    });

    // Silent failure branch should not throw
    expect(insertHistoryEntryMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ versionNumber: expect.any(Number) })
    );

    fetchHistoryMock.mockResolvedValueOnce({
      data: makeHistory(),
      error: null,
    });
    await act(async () => {
      await result.current.fetchHistory();
    });

    softRestoreEntityMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'restore failed' },
    });

    await expect(result.current.restoreVersion(2)).rejects.toThrow(
      'restore failed'
    );
  });
});
