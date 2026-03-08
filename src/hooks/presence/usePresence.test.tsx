import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePresence } from './usePresence';
import { usePresenceStore } from '../../store/presenceStore';

const { mockAuthUser, mockUsersService, mockRealtimeService } = vi.hoisted(
  () => ({
    mockAuthUser: {
      id: 'user-a',
      name: 'Admin',
      email: 'admin@example.com',
      profilephoto: 'https://example.com/admin.png',
    },
    mockUsersService: {
      getAllUsers: vi.fn(),
    },
    mockRealtimeService: {
      createChannel: vi.fn(),
      removeChannel: vi.fn(),
    },
  })
);

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: mockAuthUser,
  }),
}));

vi.mock('@/services/api/users.service', () => ({
  usersService: mockUsersService,
}));

vi.mock('@/services/realtime/realtime.service', () => ({
  realtimeService: mockRealtimeService,
}));

describe('usePresence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    usePresenceStore.setState({
      channel: null,
      onlineUsers: 0,
      onlineUsersList: [],
      allUsersList: [],
      portalImageUrls: {},
    });

    mockUsersService.getAllUsers.mockResolvedValue({
      data: [
        {
          id: 'user-a',
          name: 'Admin',
          email: 'admin@example.com',
          profilephoto: 'https://example.com/admin.png',
          online_at: '2026-03-08T10:00:00.000Z',
        },
        {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: 'https://example.com/gudang.png',
          online_at: '2026-03-08T10:00:00.000Z',
        },
      ],
      error: null,
    });

    const mockChannel = {
      on: vi.fn(),
      subscribe: vi.fn(),
      track: vi.fn().mockResolvedValue(undefined),
      unsubscribe: vi.fn(),
      presenceState: vi.fn(() => ({
        'presence-user-a': [{ user_id: 'user-a' }],
      })),
    };

    mockChannel.on.mockReturnValue(mockChannel);
    mockChannel.subscribe.mockImplementation(
      (callback?: (status: string) => void) => {
        callback?.('SUBSCRIBED');
        return mockChannel;
      }
    );

    mockRealtimeService.createChannel.mockReturnValue(mockChannel);
    mockRealtimeService.removeChannel.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not recreate the presence channel when the directory data loads', async () => {
    renderHook(() => usePresence());

    expect(mockUsersService.getAllUsers).toHaveBeenCalledTimes(1);

    await act(async () => {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(150);
    });

    expect(mockRealtimeService.createChannel).toHaveBeenCalledTimes(1);
    expect(usePresenceStore.getState().allUsersList).toHaveLength(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });

    expect(mockRealtimeService.createChannel).toHaveBeenCalledTimes(1);
  });
});
