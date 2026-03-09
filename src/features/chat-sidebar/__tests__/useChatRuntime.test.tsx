import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockRetryChatCleanupFailures,
  mockUseChatIncomingDeliveries,
  authState,
} = vi.hoisted(() => ({
  mockRetryChatCleanupFailures: vi.fn(),
  mockUseChatIncomingDeliveries: vi.fn(),
  authState: {
    user: null as { id: string } | null,
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

describe('useChatRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
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
    expect(mockRetryChatCleanupFailures).toHaveBeenCalledTimes(1);
  });
});
