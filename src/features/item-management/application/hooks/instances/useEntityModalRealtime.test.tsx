import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { useEntityModalRealtime } from './useEntityModalRealtime';

type RealtimePayload = {
  commit_timestamp?: string;
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
};

type RealtimeHandler = (payload: RealtimePayload) => void;

type TestRealtimeChannel = {
  handlers: RealtimeHandler[];
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
};

const { createChannelMock, mockToast, removeChannelMock } = vi.hoisted(() => ({
  createChannelMock: vi.fn(),
  mockToast: {
    error: vi.fn(),
  },
  removeChannelMock: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
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

describe('useEntityModalRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    removeChannelMock.mockResolvedValue(undefined);
    createChannelMock.mockImplementation(createRealtimeChannel);
  });

  it('ignores stale delete events after the entity subscription changes', () => {
    const deletedCallback = vi.fn();
    const { rerender } = renderHook(
      ({ entityId }: { entityId: string }) =>
        useEntityModalRealtime({
          enabled: true,
          entityId,
          entityTable: 'items',
          onEntityDeleted: deletedCallback,
        }),
      {
        initialProps: { entityId: 'item-1' },
        wrapper: createWrapper(),
      }
    );

    const staleChannel = createChannelMock.mock.results[0]
      ?.value as TestRealtimeChannel;

    rerender({ entityId: 'item-2' });

    staleChannel.handlers[1]?.({});

    expect(deletedCallback).not.toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it('routes current delete events to the latest delete callback without duplicate fallback toast', () => {
    const deletedCallback = vi.fn();
    renderHook(
      () =>
        useEntityModalRealtime({
          enabled: true,
          entityId: 'item-1',
          entityTable: 'items',
          onEntityDeleted: deletedCallback,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    const activeChannel = createChannelMock.mock.results[0]
      ?.value as TestRealtimeChannel;

    activeChannel.handlers[1]?.({});

    expect(deletedCallback).toHaveBeenCalledOnce();
    expect(mockToast.error).not.toHaveBeenCalled();
  });
});
