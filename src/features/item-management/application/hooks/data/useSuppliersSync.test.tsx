import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { useSuppliersSync } from './useSuppliersSync';

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

describe('useSuppliersSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createChannelMock.mockImplementation(createRealtimeChannel);
    removeChannelMock.mockResolvedValue(undefined);
  });

  it('does not subscribe when disabled', () => {
    renderHook(() => useSuppliersSync({ enabled: false }), {
      wrapper: createWrapper(),
    });

    expect(createChannelMock).not.toHaveBeenCalled();
  });

  it('keeps the global realtime channel active until the last subscriber unmounts', () => {
    const firstQueryClient = new QueryClient();
    const secondQueryClient = new QueryClient();
    const firstHook = renderHook(() => useSuppliersSync(), {
      wrapper: createWrapper(firstQueryClient),
    });
    const secondHook = renderHook(() => useSuppliersSync(), {
      wrapper: createWrapper(secondQueryClient),
    });
    const channel = createChannelMock.mock.results[0]
      ?.value as TestRealtimeChannel;

    expect(createChannelMock).toHaveBeenCalledOnce();

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
