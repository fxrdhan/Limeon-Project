import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { useItemModalRealtime } from './useItemModalRealtime';

type RealtimePayload = {
  commit_timestamp?: string;
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
};

type RealtimeHandler = (payload: RealtimePayload) => Promise<void> | void;

type TestRealtimeChannel = {
  handlers: RealtimeHandler[];
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
};

const {
  createChannelMock,
  getCustomerLevelDiscountsMock,
  mockToast,
  removeChannelMock,
} = vi.hoisted(() => ({
  createChannelMock: vi.fn(),
  getCustomerLevelDiscountsMock: vi.fn(),
  mockToast: {
    error: vi.fn(),
  },
  removeChannelMock: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

vi.mock('../../../infrastructure/itemData.service', () => ({
  itemDataService: {
    getCustomerLevelDiscounts: getCustomerLevelDiscountsMock,
  },
}));

vi.mock('../../../infrastructure/itemRealtime.service', () => ({
  itemRealtimeService: {
    createChannel: createChannelMock,
    removeChannel: removeChannelMock,
  },
}));

const createRealtimeChannel = (): TestRealtimeChannel => {
  const channel: TestRealtimeChannel = {
    handlers: [] as RealtimeHandler[],
    on: vi.fn(
      (
        _event: string,
        _filter: Record<string, unknown>,
        handler: RealtimeHandler
      ) => {
        channel.handlers.push(handler);
        return channel;
      }
    ),
    subscribe: vi.fn(() => channel),
    unsubscribe: vi.fn(),
  };

  return channel;
};

const createWrapper = () => {
  const queryClient = new QueryClient();

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(innerResolve => {
    resolve = innerResolve;
  });

  return { promise, resolve };
};

describe('useItemModalRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    removeChannelMock.mockResolvedValue(undefined);
    createChannelMock.mockImplementation(createRealtimeChannel);
    getCustomerLevelDiscountsMock.mockResolvedValue({ data: [], error: null });
  });

  it('ignores stale delete events after the item subscription changes', () => {
    const deletedCallback = vi.fn();
    const { rerender } = renderHook(
      ({ itemId }: { itemId: string }) =>
        useItemModalRealtime({
          enabled: true,
          itemId,
          onItemDeleted: deletedCallback,
        }),
      {
        initialProps: { itemId: 'item-1' },
        wrapper: createWrapper(),
      }
    );
    const staleChannel = createChannelMock.mock.results[0]
      ?.value as TestRealtimeChannel;

    rerender({ itemId: 'item-2' });

    void staleChannel.handlers[2]?.({});

    expect(deletedCallback).not.toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it('uses the latest delete callback for the current subscription', () => {
    const previousDeletedCallback = vi.fn();
    const currentDeletedCallback = vi.fn();
    const { rerender } = renderHook(
      ({ onItemDeleted }: { onItemDeleted: () => void }) =>
        useItemModalRealtime({
          enabled: true,
          itemId: 'item-1',
          onItemDeleted,
        }),
      {
        initialProps: { onItemDeleted: previousDeletedCallback },
        wrapper: createWrapper(),
      }
    );
    const activeChannel = createChannelMock.mock.results[0]
      ?.value as TestRealtimeChannel;

    rerender({ onItemDeleted: currentDeletedCallback });
    void activeChannel.handlers[2]?.({});

    expect(createChannelMock).toHaveBeenCalledOnce();
    expect(previousDeletedCallback).not.toHaveBeenCalled();
    expect(currentDeletedCallback).toHaveBeenCalledOnce();
    expect(mockToast.error).toHaveBeenCalledOnce();
  });

  it('ignores stale item update events after the item subscription changes', () => {
    const itemUpdatedCallback = vi.fn();
    const smartUpdateCallback = vi.fn();
    const { rerender } = renderHook(
      ({ itemId }: { itemId: string }) =>
        useItemModalRealtime({
          enabled: true,
          itemId,
          onItemUpdated: itemUpdatedCallback,
          onSmartUpdate: smartUpdateCallback,
        }),
      {
        initialProps: { itemId: 'item-1' },
        wrapper: createWrapper(),
      }
    );
    const staleChannel = createChannelMock.mock.results[0]
      ?.value as TestRealtimeChannel;

    rerender({ itemId: 'item-2' });
    void staleChannel.handlers[0]?.({
      commit_timestamp: '2026-06-17T00:00:00Z',
      new: { name: 'New item name' },
      old: { name: 'Old item name' },
    });

    expect(itemUpdatedCallback).not.toHaveBeenCalled();
    expect(smartUpdateCallback).not.toHaveBeenCalled();
  });

  it('ignores stale discount sync results that resolve after the item changes', async () => {
    const smartUpdateCallback = vi.fn();
    const deferred = createDeferred<{
      data: Record<string, unknown>[];
      error: null;
    }>();
    getCustomerLevelDiscountsMock.mockReturnValueOnce(deferred.promise);
    const { rerender } = renderHook(
      ({ itemId }: { itemId: string }) =>
        useItemModalRealtime({
          enabled: true,
          itemId,
          onSmartUpdate: smartUpdateCallback,
        }),
      {
        initialProps: { itemId: 'item-1' },
        wrapper: createWrapper(),
      }
    );
    const staleChannel = createChannelMock.mock.results[0]
      ?.value as TestRealtimeChannel;
    const staleSync = staleChannel.handlers[1]?.({});

    rerender({ itemId: 'item-2' });
    deferred.resolve({
      data: [{ customer_level_id: 'level-1', discount_percentage: '10' }],
      error: null,
    });
    await act(async () => {
      await staleSync;
    });

    expect(getCustomerLevelDiscountsMock).toHaveBeenCalledWith('item-1');
    expect(smartUpdateCallback).not.toHaveBeenCalled();
  });

  it('syncs current discount updates into smart form state', async () => {
    const smartUpdateCallback = vi.fn();
    getCustomerLevelDiscountsMock.mockResolvedValueOnce({
      data: [{ customer_level_id: 'level-1', discount_percentage: '10' }],
      error: null,
    });
    renderHook(
      () =>
        useItemModalRealtime({
          enabled: true,
          itemId: 'item-1',
          onSmartUpdate: smartUpdateCallback,
        }),
      {
        wrapper: createWrapper(),
      }
    );
    const activeChannel = createChannelMock.mock.results[0]
      ?.value as TestRealtimeChannel;

    await act(async () => {
      await activeChannel.handlers[1]?.({});
    });

    expect(smartUpdateCallback).toHaveBeenCalledWith({
      customer_level_discounts: [
        { customer_level_id: 'level-1', discount_percentage: 10 },
      ],
    });
  });
});
