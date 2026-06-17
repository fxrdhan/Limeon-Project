import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  getEntityHistoryRealtimeEntityId,
  useEntityHistory,
} from './useEntityHistory';
import type { EntityHistoryItem } from '../../../infrastructure/entityHistory.service';

const {
  createChannelMock,
  fetchHistoryMock,
  getNextVersionNumberMock,
  insertHistoryEntryMock,
  removeChannelMock,
  softRestoreEntityMock,
} = vi.hoisted(() => ({
  createChannelMock: vi.fn(),
  fetchHistoryMock: vi.fn(),
  getNextVersionNumberMock: vi.fn(),
  insertHistoryEntryMock: vi.fn(),
  removeChannelMock: vi.fn(),
  softRestoreEntityMock: vi.fn(),
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

vi.mock('../../../infrastructure/itemRealtime.service', () => ({
  itemRealtimeService: {
    createChannel: createChannelMock,
    removeChannel: removeChannelMock,
  },
}));

type HistoryResponse = {
  data: EntityHistoryItem[] | null;
  error: { message: string } | null;
};

const createDeferred = <T>() => {
  let resolvePromise: ((value: T) => void) | null = null;
  const promise = new Promise<T>(resolve => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value: T) => {
      resolvePromise?.(value);
    },
  };
};

const createRealtimeChannel = () => {
  const channel = {
    on: vi.fn(() => channel),
    subscribe: vi.fn(() => channel),
    unsubscribe: vi.fn(),
  };

  return channel;
};

const createHistoryItem = (
  entityId: string,
  versionNumber: number
): EntityHistoryItem => ({
  id: `${entityId}-${versionNumber}`,
  entity_table: 'items',
  entity_id: entityId,
  version_number: versionNumber,
  action_type: 'UPDATE',
  changed_by: null,
  changed_at: '2024-01-01T00:00:00.000Z',
  entity_data: { name: entityId },
});

beforeEach(() => {
  vi.clearAllMocks();
  createChannelMock.mockImplementation(createRealtimeChannel);
  removeChannelMock.mockResolvedValue(undefined);
});

describe('entity history realtime payload helpers', () => {
  it('reads entity id from new payload records first', () => {
    expect(
      getEntityHistoryRealtimeEntityId({
        new: { entity_id: 'item-1' },
        old: { entity_id: 'item-2' },
      })
    ).toBe('item-1');
  });

  it('falls back to old payload records for delete events', () => {
    expect(
      getEntityHistoryRealtimeEntityId({
        new: {},
        old: { entity_id: 'item-2' },
      })
    ).toBe('item-2');
  });

  it('returns null for malformed realtime payload records', () => {
    expect(
      getEntityHistoryRealtimeEntityId({
        new: { entity_id: null },
        old: null,
      })
    ).toBeNull();
  });
});

describe('useEntityHistory', () => {
  it('ignores stale history results after the entity changes', async () => {
    const olderFetch = createDeferred<HistoryResponse>();
    const newerFetch = createDeferred<HistoryResponse>();
    fetchHistoryMock
      .mockReturnValueOnce(olderFetch.promise)
      .mockReturnValueOnce(newerFetch.promise);

    const { result, rerender } = renderHook(
      ({ entityId }: { entityId: string }) =>
        useEntityHistory('items', entityId),
      {
        initialProps: { entityId: 'old-item' },
      }
    );

    rerender({ entityId: 'new-item' });

    await act(async () => {
      olderFetch.resolve({
        data: [createHistoryItem('old-item', 1)],
        error: null,
      });
      await olderFetch.promise;
      await Promise.resolve();
    });

    expect(result.current.history).toEqual([]);

    await act(async () => {
      newerFetch.resolve({
        data: [createHistoryItem('new-item', 1)],
        error: null,
      });
      await newerFetch.promise;
      await Promise.resolve();
    });

    expect(result.current.history.map(item => item.entity_id)).toEqual([
      'new-item',
    ]);
    expect(result.current.isLoading).toBe(false);
  });

  it('keeps manual loading clearable when a silent refresh finishes first', async () => {
    const manualFetch = createDeferred<HistoryResponse>();
    const silentFetch = createDeferred<HistoryResponse>();
    fetchHistoryMock
      .mockReturnValueOnce(manualFetch.promise)
      .mockReturnValueOnce(silentFetch.promise);

    const { result } = renderHook(() => useEntityHistory('items', 'item-1'));

    expect(result.current.isLoading).toBe(true);

    let silentRefreshPromise: Promise<void> = Promise.resolve();
    act(() => {
      silentRefreshPromise = result.current.fetchHistory(true);
    });

    await act(async () => {
      silentFetch.resolve({
        data: [createHistoryItem('item-1', 2)],
        error: null,
      });
      await silentRefreshPromise;
      await Promise.resolve();
    });

    expect(result.current.history.map(item => item.version_number)).toEqual([
      2,
    ]);
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      manualFetch.resolve({
        data: [createHistoryItem('item-1', 1)],
        error: null,
      });
      await manualFetch.promise;
      await Promise.resolve();
    });

    expect(result.current.history.map(item => item.version_number)).toEqual([
      2,
    ]);
    expect(result.current.isLoading).toBe(false);
  });
});
