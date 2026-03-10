import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockRetryChatCleanupFailures,
  mockUseChatIncomingDeliveries,
  authState,
  mockToast,
} = vi.hoisted(() => ({
  mockRetryChatCleanupFailures: vi.fn(),
  mockUseChatIncomingDeliveries: vi.fn(),
  authState: {
    user: null as { id: string } | null,
  },
  mockToast: {
    dismiss: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => authState,
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarGateway: {
    retryChatCleanupFailures: mockRetryChatCleanupFailures,
  },
}));

vi.mock('../hooks/useChatIncomingDeliveries', () => ({
  useChatIncomingDeliveries: mockUseChatIncomingDeliveries,
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

describe('useChatRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    authState.user = null;
    mockRetryChatCleanupFailures.mockResolvedValue({
      data: {
        resolvedCount: 0,
        remainingCount: 0,
      },
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('boots incoming delivery sync immediately and retries cleanup when a user is available', async () => {
    const { useChatRuntime } = await import('../hooks/useChatRuntime');
    const { rerender } = renderHook(() => useChatRuntime());

    expect(mockUseChatIncomingDeliveries).toHaveBeenCalledTimes(1);
    expect(mockRetryChatCleanupFailures).not.toHaveBeenCalled();

    authState.user = {
      id: 'user-a',
    };
    rerender();

    expect(mockUseChatIncomingDeliveries).toHaveBeenCalledTimes(2);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockRetryChatCleanupFailures).toHaveBeenCalledTimes(1);
  });

  it('surfaces unresolved cleanup failures and retries them automatically', async () => {
    mockRetryChatCleanupFailures
      .mockResolvedValueOnce({
        data: {
          resolvedCount: 0,
          remainingCount: 2,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          resolvedCount: 2,
          remainingCount: 0,
        },
        error: null,
      });

    authState.user = {
      id: 'user-a',
    };

    const { useChatRuntime } = await import('../hooks/useChatRuntime');
    renderHook(() => useChatRuntime());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      '2 cleanup lampiran chat masih tertunda. Akan dicoba lagi otomatis.',
      {
        id: 'chat-cleanup-runtime-warning',
      }
    );

    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockRetryChatCleanupFailures).toHaveBeenCalledTimes(2);
    expect(mockToast.success).toHaveBeenCalledWith(
      'Cleanup lampiran chat yang tertunda berhasil diselesaikan.',
      {
        id: 'chat-cleanup-runtime-warning',
      }
    );
  });
});
