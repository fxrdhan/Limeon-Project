import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEntityModalRealtime } from './useEntityModalRealtime';

type Status = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';

type Registration = {
  config: {
    schema: string;
    table: string;
    event: string;
    filter?: string;
  };
  handler: (payload: Record<string, unknown>) => void;
};

type MockChannel = {
  registrations: Registration[];
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  emit: (index: number, payload: Record<string, unknown>) => void;
  emitStatus: (status: Status) => void;
};

const useQueryClientMock = vi.hoisted(() => vi.fn());
const createChannelMock = vi.hoisted(() => vi.fn());
const removeChannelMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const useSmartFormSyncMock = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: useQueryClientMock,
}));

vi.mock('@/services/realtime/realtime.service', () => ({
  realtimeService: {
    createChannel: createChannelMock,
    removeChannel: removeChannelMock,
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
  },
}));

vi.mock('./useSmartFormSync', () => ({
  useSmartFormSync: useSmartFormSyncMock,
}));

const createMockChannel = (): MockChannel => {
  const registrations: Registration[] = [];
  let statusHandler: ((status: Status) => void) | undefined;

  const channel: MockChannel = {
    registrations,
    on: vi.fn((_event, config, handler) => {
      registrations.push({ config, handler });
      return channel;
    }),
    subscribe: vi.fn(handler => {
      statusHandler = handler;
      return channel;
    }),
    unsubscribe: vi.fn(),
    emit: (index, payload) => {
      registrations[index].handler(payload);
    },
    emitStatus: status => {
      statusHandler?.(status);
    },
  };

  return channel;
};

describe('useEntityModalRealtime', () => {
  beforeEach(() => {
    useQueryClientMock.mockReset();
    createChannelMock.mockReset();
    removeChannelMock.mockReset();
    toastErrorMock.mockReset();
    useSmartFormSyncMock.mockReset();

    useQueryClientMock.mockReturnValue({
      invalidateQueries: vi.fn(),
    });

    createChannelMock.mockImplementation(() => createMockChannel());

    useSmartFormSyncMock.mockImplementation(
      ({
        onDataUpdate,
      }: {
        onDataUpdate: (updates: Record<string, unknown>) => void;
      }) => ({
        handleRealtimeUpdate: vi.fn(),
        _onDataUpdate: onDataUpdate,
      })
    );
  });

  it('subscribes to entity updates/deletes, deduplicates updates, and cleans up', () => {
    const onEntityUpdated = vi.fn();
    const onEntityDeleted = vi.fn();

    const { unmount } = renderHook(() =>
      useEntityModalRealtime({
        entityTable: 'item_categories',
        entityId: 'cat-1',
        onEntityUpdated,
        onEntityDeleted,
      })
    );

    expect(createChannelMock).toHaveBeenCalledWith(
      'entity-modal-item_categories-cat-1'
    );

    const channel = createChannelMock.mock.results[0].value as MockChannel;
    const queryClient = useQueryClientMock.mock.results[0].value as {
      invalidateQueries: ReturnType<typeof vi.fn>;
    };
    const smartFormSync = useSmartFormSyncMock.mock.results[0].value as {
      handleRealtimeUpdate: ReturnType<typeof vi.fn>;
    };

    act(() => {
      channel.emitStatus('SUBSCRIBED');
      channel.emitStatus('CHANNEL_ERROR');
    });

    act(() => {
      channel.emit(0, {
        commit_timestamp: 'ts-1',
        new: { id: 'cat-1', name: 'Kategori Baru' },
        old: { id: 'cat-1', name: 'Kategori Lama' },
      });
    });

    expect(smartFormSync.handleRealtimeUpdate).toHaveBeenCalledWith({
      name: 'Kategori Baru',
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['item_categories'],
    });
    expect(onEntityUpdated).toHaveBeenCalledTimes(1);

    act(() => {
      channel.emit(0, {
        commit_timestamp: 'ts-1',
        new: { id: 'cat-1', name: 'Duplikat' },
        old: { id: 'cat-1', name: 'Kategori Baru' },
      });
    });

    expect(smartFormSync.handleRealtimeUpdate).toHaveBeenCalledTimes(1);

    act(() => {
      channel.emit(0, {
        commit_timestamp: 'ts-2',
        new: { id: 'cat-1', name: 'Kategori Baru' },
        old: { id: 'cat-1', name: 'Kategori Baru' },
      });
    });

    expect(smartFormSync.handleRealtimeUpdate).toHaveBeenCalledTimes(1);

    act(() => {
      channel.emit(1, {
        commit_timestamp: 'ts-del',
      });
    });

    expect(toastErrorMock).toHaveBeenCalledWith(
      'Data telah dihapus dari sumber lain',
      expect.objectContaining({ icon: '⚠️' })
    );
    expect(onEntityDeleted).toHaveBeenCalled();

    unmount();

    expect(channel.unsubscribe).toHaveBeenCalled();
    expect(removeChannelMock).toHaveBeenCalledWith(channel);
  });

  it('uses latest onSmartUpdate callback via ref and skips setup when disabled/incomplete', () => {
    const onSmartUpdateA = vi.fn();
    const onSmartUpdateB = vi.fn();

    const { rerender } = renderHook(
      ({
        onSmartUpdate,
      }: {
        onSmartUpdate: (updates: Record<string, unknown>) => void;
      }) =>
        useEntityModalRealtime({
          entityTable: 'item_types',
          entityId: 'type-1',
          onSmartUpdate,
        }),
      {
        initialProps: { onSmartUpdate: onSmartUpdateA },
      }
    );

    const firstSmartFormSync = useSmartFormSyncMock.mock.results[0].value as {
      _onDataUpdate: (updates: Record<string, unknown>) => void;
    };

    act(() => {
      firstSmartFormSync._onDataUpdate({ name: 'from-a' });
    });
    expect(onSmartUpdateA).toHaveBeenCalledWith({ name: 'from-a' });

    rerender({ onSmartUpdate: onSmartUpdateB });

    act(() => {
      firstSmartFormSync._onDataUpdate({ name: 'from-b' });
    });
    expect(onSmartUpdateB).toHaveBeenCalledWith({ name: 'from-b' });

    renderHook(() =>
      useEntityModalRealtime({
        entityTable: '',
        entityId: 'x',
        enabled: true,
      })
    );

    renderHook(() =>
      useEntityModalRealtime({
        entityTable: 'item_types',
        entityId: undefined,
        enabled: true,
      })
    );

    renderHook(() =>
      useEntityModalRealtime({
        entityTable: 'item_types',
        entityId: 'x',
        enabled: false,
      })
    );

    expect(createChannelMock).toHaveBeenCalledTimes(1);
  });
});
