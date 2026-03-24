import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { DirectoryUser } from '../../../store/createDirectoryStore';
import type { UserDetails } from '../../../types/database';
import { useAuthStore } from '../../../store/authStore';
import { usePresenceStore } from '../../../store/presenceStore';
import { useChatDirectoryRoster } from '../hooks/useChatDirectoryRoster';
import { useChatSidebarDirectoryStore } from '../store/chatSidebarDirectoryStore';

const { mockDirectoryGateway } = vi.hoisted(() => ({
  mockDirectoryGateway: {
    getUsersPage: vi.fn(),
  },
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarDirectoryGateway: mockDirectoryGateway,
}));

const currentUser: UserDetails = {
  id: 'user-a',
  name: 'Admin',
  email: 'admin@example.com',
  profilephoto: null,
  role: 'admin',
};

const buildDirectoryUser = (id: string, name: string) => ({
  id,
  name,
  email: `${id}@example.com`,
  profilephoto: null,
});

describe('useChatDirectoryRoster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: currentUser,
      loading: false,
      error: null,
    });
    usePresenceStore.setState({
      channel: null,
      onlineUsers: 1,
      onlineUsersList: [
        {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          profilephoto: currentUser.profilephoto,
          online_at: '2026-03-24T10:00:00.000Z',
        },
      ],
      presenceSyncHealth: {
        status: 'idle',
        errorMessage: null,
        lastSyncedAt: null,
      },
    });
    useChatSidebarDirectoryStore.getState().resetDirectoryState(null);
  });

  it('shares directory cache and pagination state across chat consumers', async () => {
    mockDirectoryGateway.getUsersPage
      .mockResolvedValueOnce({
        data: {
          users: [
            buildDirectoryUser('user-b', 'Gudang'),
            buildDirectoryUser('user-c', 'Kasir'),
          ],
          hasMore: true,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          users: [buildDirectoryUser('user-d', 'Apoteker')],
          hasMore: false,
        },
        error: null,
      });

    const firstRoster = renderHook(() => useChatDirectoryRoster(true));
    const secondRoster = renderHook(() => useChatDirectoryRoster(true));

    await waitFor(() => {
      expect(mockDirectoryGateway.getUsersPage).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(
        firstRoster.result.current.portalOrderedUsers.map(
          (user: DirectoryUser) => user.id
        )
      ).toEqual(['user-a', 'user-b', 'user-c']);
    });

    expect(
      secondRoster.result.current.portalOrderedUsers.map(
        (user: DirectoryUser) => user.id
      )
    ).toEqual(['user-a', 'user-b', 'user-c']);

    await act(async () => {
      firstRoster.result.current.loadMoreDirectoryUsers();
    });

    await waitFor(() => {
      expect(mockDirectoryGateway.getUsersPage).toHaveBeenCalledTimes(2);
    });

    expect(mockDirectoryGateway.getUsersPage).toHaveBeenNthCalledWith(2, 30, 2);

    await waitFor(() => {
      expect(
        secondRoster.result.current.portalOrderedUsers.map(
          (user: DirectoryUser) => user.id
        )
      ).toEqual(['user-a', 'user-b', 'user-c', 'user-d']);
    });
  });
});
