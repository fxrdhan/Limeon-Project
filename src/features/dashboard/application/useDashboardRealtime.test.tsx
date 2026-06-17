import type React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { useDashboardRealtime } from './useDashboardRealtime';

const {
  changeHandlers,
  createChannelMock,
  removeChannelMock,
  unsubscribeMock,
} = vi.hoisted(() => ({
  changeHandlers: [] as Array<() => void>,
  createChannelMock: vi.fn(),
  removeChannelMock: vi.fn(),
  unsubscribeMock: vi.fn(),
}));

vi.mock('../infrastructure/dashboardRealtime', () => ({
  createDashboardRealtimeChannel: createChannelMock.mockImplementation(
    (onChange: () => void) => {
      changeHandlers.push(onChange);

      return {
        unsubscribe: unsubscribeMock,
      };
    }
  ),
  removeDashboardRealtimeChannel: removeChannelMock,
}));

const createWrapper =
  (queryClient: QueryClient) =>
  ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

describe('useDashboardRealtime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    changeHandlers.length = 0;
    createChannelMock.mockClear();
    removeChannelMock.mockClear();
    unsubscribeMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ignores realtime events from a stale channel after unmount', () => {
    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue();
    const { unmount } = renderHook(() => useDashboardRealtime(), {
      wrapper: createWrapper(queryClient),
    });

    expect(createChannelMock).toHaveBeenCalledOnce();
    const staleChangeHandler = changeHandlers[0];
    expect(staleChangeHandler).toBeDefined();

    unmount();

    act(() => {
      staleChangeHandler?.();
      vi.advanceTimersByTime(1_000);
    });

    expect(unsubscribeMock).toHaveBeenCalledOnce();
    expect(removeChannelMock).toHaveBeenCalledOnce();
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
