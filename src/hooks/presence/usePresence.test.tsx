import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePresence } from './usePresence';
import { usePresenceStore } from '../../store/presenceStore';

const {
  mockAuthState,
  mockUsersService,
  mockChatService,
  mockRealtimeService,
} = vi.hoisted(() => ({
  mockAuthState: {
    user: {
      id: 'user-a',
      name: 'Admin',
      email: 'admin@example.com',
      profilephoto: 'https://example.com/admin.png',
    },
    session: {
      access_token: 'presence-access-token',
    },
  },
  mockUsersService: {
    getAllUsers: vi.fn(),
    getUsersByIds: vi.fn(),
  },
  mockChatService: {
    listActivePresenceSince: vi.fn(),
    updateUserPresence: vi.fn(),
    insertUserPresence: vi.fn(),
    sendUserPresenceUpdateKeepalive: vi.fn(),
  },
  mockRealtimeService: {
    createChannel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => mockAuthState,
}));

vi.mock('@/services/api/users.service', () => ({
  usersService: mockUsersService,
}));

vi.mock('@/services/api/chat.service', () => ({
  chatService: mockChatService,
}));

vi.mock('@/services/realtime/realtime.service', () => ({
  realtimeService: mockRealtimeService,
}));

const flushPresenceEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('usePresence', () => {
  let postgresChangeHandler: (() => void) | null;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.useFakeTimers();
    postgresChangeHandler = null;

    usePresenceStore.setState({
      channel: null,
      onlineUsers: 0,
      onlineUsersList: [],
      allUsersList: [],
      portalImageUrls: {},
    });

    mockAuthState.user = {
      id: 'user-a',
      name: 'Admin',
      email: 'admin@example.com',
      profilephoto: 'https://example.com/admin.png',
    };
    mockAuthState.session = {
      access_token: 'presence-access-token',
    };

    mockChatService.updateUserPresence.mockResolvedValue({
      data: [
        {
          user_id: 'user-a',
          is_online: true,
          last_seen: '2026-03-09T09:00:00.000Z',
          updated_at: '2026-03-09T09:00:00.000Z',
        },
      ],
      error: null,
    });
    mockChatService.insertUserPresence.mockResolvedValue({
      data: [],
      error: null,
    });
    mockChatService.listActivePresenceSince.mockResolvedValue({
      data: [
        {
          user_id: 'user-a',
          is_online: true,
          last_seen: '2099-03-09T09:00:00.000Z',
          updated_at: '2099-03-09T09:00:00.000Z',
        },
        {
          user_id: 'user-b',
          is_online: true,
          last_seen: '2099-03-09T09:00:05.000Z',
          updated_at: '2099-03-09T09:00:05.000Z',
        },
      ],
      error: null,
    });
    mockChatService.sendUserPresenceUpdateKeepalive.mockReturnValue(true);

    mockUsersService.getAllUsers.mockResolvedValue({
      data: [
        {
          id: 'user-a',
          name: 'Admin',
          email: 'admin@example.com',
          profilephoto: 'https://example.com/admin.png',
          online_at: '2099-03-09T09:00:00.000Z',
        },
        {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: 'https://example.com/gudang.png',
          online_at: '2099-03-09T09:00:05.000Z',
        },
      ],
      error: null,
    });
    mockUsersService.getUsersByIds.mockResolvedValue({
      data: [
        {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: 'https://example.com/gudang.png',
          online_at: '2099-03-09T09:00:05.000Z',
        },
      ],
      error: null,
    });

    const mockChannel = {
      on: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    };

    mockChannel.on.mockImplementation(
      (
        event: string,
        _filter: Record<string, string>,
        callback: () => void
      ) => {
        if (event === 'postgres_changes') {
          postgresChangeHandler = callback;
        }

        return mockChannel;
      }
    );
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

  it('hydrates the navbar roster from active user_presence rows', async () => {
    const { unmount } = renderHook(() => usePresence());

    await flushPresenceEffects();

    expect(mockRealtimeService.createChannel).toHaveBeenCalledWith(
      'user_presence_roster_changes'
    );
    expect(mockChatService.listActivePresenceSince).toHaveBeenCalled();
    expect(usePresenceStore.getState().onlineUsers).toBe(2);
    expect(usePresenceStore.getState().onlineUsersList).toEqual([
      {
        id: 'user-a',
        name: 'Admin',
        email: 'admin@example.com',
        profilephoto: 'https://example.com/admin.png',
        online_at: '2099-03-09T09:00:00.000Z',
      },
      {
        id: 'user-b',
        name: 'Gudang',
        email: 'gudang@example.com',
        profilephoto: 'https://example.com/gudang.png',
        online_at: '2099-03-09T09:00:05.000Z',
      },
    ]);

    unmount();
  });

  it('does not eagerly load the full user directory when presence initializes', async () => {
    const { unmount } = renderHook(() => usePresence());

    await flushPresenceEffects();

    expect(mockUsersService.getAllUsers).not.toHaveBeenCalled();
    expect(mockUsersService.getUsersByIds).toHaveBeenCalledWith(['user-b']);

    unmount();
  });

  it('falls back to the current user when active presence rows are unavailable', async () => {
    mockChatService.listActivePresenceSince.mockResolvedValue({
      data: [],
      error: null,
    });

    const { unmount } = renderHook(() => usePresence());

    await flushPresenceEffects();

    expect(usePresenceStore.getState().onlineUsers).toBe(1);
    expect(usePresenceStore.getState().onlineUsersList).toEqual([
      {
        id: 'user-a',
        name: 'Admin',
        email: 'admin@example.com',
        profilephoto: 'https://example.com/admin.png',
        online_at: expect.any(String),
      },
    ]);

    unmount();
  });

  it('refreshes the counter when user_presence changes arrive', async () => {
    const { unmount } = renderHook(() => usePresence());

    await flushPresenceEffects();

    expect(usePresenceStore.getState().onlineUsers).toBe(2);

    mockChatService.listActivePresenceSince.mockResolvedValueOnce({
      data: [
        {
          user_id: 'user-a',
          is_online: true,
          last_seen: '2099-03-09T09:00:10.000Z',
          updated_at: '2099-03-09T09:00:10.000Z',
        },
      ],
      error: null,
    });

    await act(async () => {
      postgresChangeHandler?.();
      await Promise.resolve();
    });

    expect(usePresenceStore.getState().onlineUsers).toBe(1);
    expect(usePresenceStore.getState().onlineUsersList).toEqual([
      {
        id: 'user-a',
        name: 'Admin',
        email: 'admin@example.com',
        profilephoto: 'https://example.com/admin.png',
        online_at: '2099-03-09T09:00:10.000Z',
      },
    ]);

    unmount();
  });
});
