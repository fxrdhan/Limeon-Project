import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useItemModalRealtime } from './useItemModalRealtime';
import { QueryKeys } from '@/constants/queryKeys';

type Status = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';

type Registration = {
  config: {
    schema: string;
    table: string;
    event: string;
    filter?: string;
  };
  handler: (payload: Record<string, unknown>) => void | Promise<void>;
};

type MockChannel = {
  registrations: Registration[];
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  emit: (index: number, payload: Record<string, unknown>) => Promise<void>;
  emitStatus: (status: Status) => void;
};

const useQueryClientMock = vi.hoisted(() => vi.fn());
const createChannelMock = vi.hoisted(() => vi.fn());
const removeChannelMock = vi.hoisted(() => vi.fn());
const getCustomerLevelDiscountsMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const loggerDebugMock = vi.hoisted(() => vi.fn());
const loggerInfoMock = vi.hoisted(() => vi.fn());
const loggerWarnMock = vi.hoisted(() => vi.fn());
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

vi.mock('@/features/item-management/infrastructure/itemData.service', () => ({
  itemDataService: {
    getCustomerLevelDiscounts: getCustomerLevelDiscountsMock,
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: loggerDebugMock,
    info: loggerInfoMock,
    warn: loggerWarnMock,
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
    emit: async (index, payload) => {
      await registrations[index].handler(payload);
    },
    emitStatus: status => {
      statusHandler?.(status);
    },
  };

  return channel;
};

describe('useItemModalRealtime', () => {
  beforeEach(() => {
    useQueryClientMock.mockReset();
    createChannelMock.mockReset();
    removeChannelMock.mockReset();
    getCustomerLevelDiscountsMock.mockReset();
    toastErrorMock.mockReset();
    loggerDebugMock.mockReset();
    loggerInfoMock.mockReset();
    loggerWarnMock.mockReset();
    useSmartFormSyncMock.mockReset();

    const invalidateQueries = vi.fn();
    const refetchQueries = vi.fn();

    useQueryClientMock.mockReturnValue({
      invalidateQueries,
      refetchQueries,
    });

    createChannelMock.mockImplementation(() => createMockChannel());

    useSmartFormSyncMock.mockReturnValue({
      handleRealtimeUpdate: vi.fn(),
    });

    getCustomerLevelDiscountsMock.mockResolvedValue({
      data: [
        {
          customer_level_id: 'level-1',
          discount_percentage: '12.5',
        },
      ],
      error: null,
    });
  });

  it('subscribes, handles update/discount/delete events, and cleans up channel', async () => {
    const onItemUpdated = vi.fn();
    const onItemDeleted = vi.fn();
    const onSmartUpdate = vi.fn();

    const { result, unmount } = renderHook(() =>
      useItemModalRealtime({
        itemId: 'item-1',
        onItemUpdated,
        onItemDeleted,
        onSmartUpdate,
      })
    );

    expect(createChannelMock).toHaveBeenCalledWith('item-modal-item-1');

    const channel = createChannelMock.mock.results[0].value as MockChannel;
    const smartFormSync = useSmartFormSyncMock.mock.results[0].value as {
      handleRealtimeUpdate: ReturnType<typeof vi.fn>;
    };
    const queryClient = useQueryClientMock.mock.results[0].value as {
      invalidateQueries: ReturnType<typeof vi.fn>;
      refetchQueries: ReturnType<typeof vi.fn>;
    };

    act(() => {
      channel.emitStatus('SUBSCRIBED');
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    await act(async () => {
      await channel.emit(0, {
        commit_timestamp: 'ts-1',
        new: {
          id: 'item-1',
          name: 'Nama Baru',
          package_conversions: { box: 10 },
        },
        old: {
          id: 'item-1',
          name: 'Nama Lama',
          package_conversions: '{"box":10}',
        },
      });
    });

    expect(smartFormSync.handleRealtimeUpdate).toHaveBeenCalledWith({
      name: 'Nama Baru',
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['items'],
    });
    expect(queryClient.refetchQueries).toHaveBeenCalledWith({
      queryKey: ['items'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: QueryKeys.items.detail('item-1'),
    });
    expect(onItemUpdated).toHaveBeenCalledTimes(1);

    await act(async () => {
      await channel.emit(0, {
        commit_timestamp: 'ts-1',
        new: { id: 'item-1', name: 'Duplikat' },
        old: { id: 'item-1', name: 'Nama Baru' },
      });
    });

    expect(smartFormSync.handleRealtimeUpdate).toHaveBeenCalledTimes(1);

    await act(async () => {
      await channel.emit(1, {
        commit_timestamp: 'ts-2',
        new: {},
        old: {},
      });
    });

    expect(getCustomerLevelDiscountsMock).toHaveBeenCalledWith('item-1');
    expect(smartFormSync.handleRealtimeUpdate).toHaveBeenCalledWith({
      customer_level_discounts: [
        {
          customer_level_id: 'level-1',
          discount_percentage: 12.5,
        },
      ],
    });

    await act(async () => {
      await channel.emit(2, {
        commit_timestamp: 'ts-3',
      });
    });

    expect(toastErrorMock).toHaveBeenCalledWith(
      'Item telah dihapus dari sumber lain',
      expect.objectContaining({ icon: '⚠️' })
    );
    expect(onItemDeleted).toHaveBeenCalled();

    act(() => {
      channel.emitStatus('CHANNEL_ERROR');
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });

    unmount();

    expect(channel.unsubscribe).toHaveBeenCalled();
    expect(removeChannelMock).toHaveBeenCalledWith(channel);
  });

  it('handles customer-level discount fetch errors and disabled state', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    getCustomerLevelDiscountsMock.mockResolvedValue({
      data: null,
      error: new Error('sync failed'),
    });

    const { unmount } = renderHook(() =>
      useItemModalRealtime({
        itemId: 'item-2',
        enabled: true,
      })
    );

    const channel = createChannelMock.mock.results[0].value as MockChannel;
    await act(async () => {
      await channel.emit(1, {
        commit_timestamp: 'ts-error',
      });
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error syncing customer level discounts:',
      expect.any(Error)
    );

    unmount();

    renderHook(() =>
      useItemModalRealtime({
        itemId: 'item-3',
        enabled: false,
      })
    );
    renderHook(() => useItemModalRealtime({ enabled: true }));

    expect(createChannelMock).toHaveBeenCalledTimes(1);

    consoleErrorSpy.mockRestore();
  });
});
