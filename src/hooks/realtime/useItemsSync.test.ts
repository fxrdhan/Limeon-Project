import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useQueryClientMock = vi.hoisted(() => vi.fn());
const invalidateQueriesMock = vi.hoisted(() => vi.fn());

const createChannelMock = vi.hoisted(() => vi.fn());
const removeChannelMock = vi.hoisted(() => vi.fn());
const onMock = vi.hoisted(() => vi.fn());
const subscribeMock = vi.hoisted(() => vi.fn());
const unsubscribeMock = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: useQueryClientMock,
}));

vi.mock('@/services/realtime/realtime.service', () => ({
  realtimeService: {
    createChannel: createChannelMock,
    removeChannel: removeChannelMock,
  },
}));

describe('useItemsSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();

    useQueryClientMock.mockReset();
    invalidateQueriesMock.mockReset();
    createChannelMock.mockReset();
    removeChannelMock.mockReset();
    onMock.mockReset();
    subscribeMock.mockReset();
    unsubscribeMock.mockReset();

    useQueryClientMock.mockReturnValue({
      invalidateQueries: invalidateQueriesMock,
    });

    const channel = {
      on: onMock,
      subscribe: subscribeMock,
      unsubscribe: unsubscribeMock,
    };
    onMock.mockImplementation(() => channel);
    subscribeMock.mockImplementation((callback?: (status: string) => void) => {
      callback?.('SUBSCRIBED');
      callback?.('CHANNEL_ERROR');
      return channel;
    });
    createChannelMock.mockImplementation(() => channel);

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'complete',
    });
  });

  it('does nothing when disabled', async () => {
    const { useItemsSync } = await import('./useItemsSync');

    renderHook(() => useItemsSync({ enabled: false }));
    vi.advanceTimersByTime(4000);

    expect(createChannelMock).not.toHaveBeenCalled();
  });

  it('sets up realtime connection and invalidates all relevant queries', async () => {
    const callbacks: Array<(payload: Record<string, unknown>) => void> = [];
    onMock.mockImplementation(
      (
        _event: string,
        _filter: Record<string, unknown>,
        callback: (payload: Record<string, unknown>) => void
      ) => {
        callbacks.push(callback);
        return {
          on: onMock,
          subscribe: subscribeMock,
          unsubscribe: unsubscribeMock,
        };
      }
    );

    const { useItemsSync } = await import('./useItemsSync');
    const { unmount } = renderHook(() => useItemsSync());

    vi.advanceTimersByTime(2000);

    expect(createChannelMock).toHaveBeenCalledWith('item-master-realtime');
    expect(callbacks).toHaveLength(7);

    callbacks.forEach(callback => callback({ eventType: 'UPDATE' }));

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['items'],
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['masterData', 'categories'],
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['masterData', 'manufacturers'],
    });

    unmount();

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
    expect(removeChannelMock).toHaveBeenCalledTimes(1);
  });

  it('retries setup when network/document is not ready', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'loading',
    });

    const { useItemsSync } = await import('./useItemsSync');
    renderHook(() => useItemsSync());

    vi.advanceTimersByTime(2000);
    expect(createChannelMock).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'complete',
    });

    vi.advanceTimersByTime(1000);
    expect(createChannelMock).toHaveBeenCalledTimes(1);
  });
});
