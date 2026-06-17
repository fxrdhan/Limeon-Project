import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { useItemsSync } from './useItemsSync';

type RealtimeHandler = () => void;

type TestRealtimeChannel = {
  handlers: RealtimeHandler[];
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
};

const { createChannelMock, invalidateQueryKeysMock, removeChannelMock } =
  vi.hoisted(() => ({
    createChannelMock: vi.fn(),
    invalidateQueryKeysMock: vi.fn(),
    removeChannelMock: vi.fn(),
  }));

vi.mock('@/lib/queryInvalidation', () => ({
  invalidateQueryKeys: invalidateQueryKeysMock,
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

const createWrapper = (queryClient = new QueryClient()) => {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useItemsSync', () => {
  const onlineDescriptor = Object.getOwnPropertyDescriptor(
    Navigator.prototype,
    'onLine'
  );
  const readyStateDescriptor = Object.getOwnPropertyDescriptor(
    Document.prototype,
    'readyState'
  );

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    createChannelMock.mockImplementation(createRealtimeChannel);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();

    if (onlineDescriptor) {
      Object.defineProperty(Navigator.prototype, 'onLine', onlineDescriptor);
    }
    if (readyStateDescriptor) {
      Object.defineProperty(
        Document.prototype,
        'readyState',
        readyStateDescriptor
      );
    }
  });

  it('does not create the delayed realtime channel after unmount', () => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      value: false,
    });
    Object.defineProperty(Document.prototype, 'readyState', {
      configurable: true,
      value: 'loading',
    });

    const { unmount } = renderHook(() => useItemsSync(), {
      wrapper: createWrapper(),
    });

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(createChannelMock).not.toHaveBeenCalled();

    unmount();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(createChannelMock).not.toHaveBeenCalled();
  });

  it('keeps the global realtime channel active until the last subscriber unmounts', () => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(Document.prototype, 'readyState', {
      configurable: true,
      value: 'complete',
    });
    const firstQueryClient = new QueryClient();
    const secondQueryClient = new QueryClient();
    const firstHook = renderHook(() => useItemsSync(), {
      wrapper: createWrapper(firstQueryClient),
    });
    const secondHook = renderHook(() => useItemsSync(), {
      wrapper: createWrapper(secondQueryClient),
    });

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(createChannelMock).toHaveBeenCalledOnce();
    const channel = createChannelMock.mock.results[0]
      ?.value as TestRealtimeChannel;

    firstHook.unmount();

    expect(channel.unsubscribe).not.toHaveBeenCalled();
    expect(removeChannelMock).not.toHaveBeenCalled();

    channel.handlers[0]?.();

    expect(invalidateQueryKeysMock).toHaveBeenCalledOnce();
    expect(invalidateQueryKeysMock.mock.calls[0]?.[0]).toBe(secondQueryClient);

    secondHook.unmount();

    expect(channel.unsubscribe).toHaveBeenCalledOnce();
    expect(removeChannelMock).toHaveBeenCalledOnce();
    expect(removeChannelMock).toHaveBeenCalledWith(channel);
  });
});
