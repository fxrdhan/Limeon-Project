import { create } from 'zustand';
import { usersService } from '@/services/api/users.service';
import type { OnlineUser } from '@/types';

const DIRECTORY_PAGE_SIZE = 30;

const EMPTY_USERS: OnlineUser[] = [];

const mergeDirectoryUsers = (
  previousUsers: OnlineUser[],
  nextUsers: OnlineUser[]
) => {
  const mergedUsersById = new Map(previousUsers.map(user => [user.id, user]));
  nextUsers.forEach(user => {
    mergedUsersById.set(user.id, user);
  });

  return [...mergedUsersById.values()];
};

interface PresenceDirectoryState {
  ownerUserId: string | null;
  directoryUsers: OnlineUser[];
  isDirectoryLoading: boolean;
  directoryError: string | null;
  hasMoreDirectoryUsers: boolean;
  lastDirectoryLoadedAt: number | null;
  hasAttemptedDirectoryLoad: boolean;
  directoryRequestToken: number;
  resetDirectoryState: (ownerUserId?: string | null) => void;
  loadDirectoryPage: (ownerUserId: string, reset?: boolean) => Promise<void>;
}

export const usePresenceDirectoryStore = create<PresenceDirectoryState>(
  (set, get) => ({
    ownerUserId: null,
    directoryUsers: EMPTY_USERS,
    isDirectoryLoading: false,
    directoryError: null,
    hasMoreDirectoryUsers: true,
    lastDirectoryLoadedAt: null,
    hasAttemptedDirectoryLoad: false,
    directoryRequestToken: 0,
    resetDirectoryState: (ownerUserId = null) => {
      set(state => ({
        ownerUserId,
        directoryUsers: EMPTY_USERS,
        isDirectoryLoading: false,
        directoryError: null,
        hasMoreDirectoryUsers: true,
        lastDirectoryLoadedAt: null,
        hasAttemptedDirectoryLoad: false,
        directoryRequestToken: state.directoryRequestToken + 1,
      }));
    },
    loadDirectoryPage: async (ownerUserId, reset = false) => {
      const currentState = get();
      if (!ownerUserId || currentState.isDirectoryLoading) {
        return;
      }

      const shouldResetState =
        reset || currentState.ownerUserId !== ownerUserId;
      const activeUsers = shouldResetState
        ? EMPTY_USERS
        : currentState.directoryUsers;

      if (!shouldResetState && !currentState.hasMoreDirectoryUsers) {
        return;
      }

      const requestToken = currentState.directoryRequestToken + 1;
      set({
        ownerUserId,
        isDirectoryLoading: true,
        directoryError: null,
        hasMoreDirectoryUsers: shouldResetState
          ? true
          : currentState.hasMoreDirectoryUsers,
        hasAttemptedDirectoryLoad: true,
        directoryRequestToken: requestToken,
      });

      try {
        const { data, error } = await usersService.getUsersPage(
          DIRECTORY_PAGE_SIZE,
          shouldResetState ? 0 : activeUsers.length
        );

        const latestState = get();
        if (
          latestState.ownerUserId !== ownerUserId ||
          latestState.directoryRequestToken !== requestToken
        ) {
          return;
        }

        if (error || !data) {
          set({
            isDirectoryLoading: false,
            directoryError: 'Gagal memuat daftar pengguna',
          });
          return;
        }

        set(state => ({
          isDirectoryLoading: false,
          directoryError: null,
          hasMoreDirectoryUsers: data.hasMore,
          lastDirectoryLoadedAt: Date.now(),
          directoryUsers: shouldResetState
            ? data.users
            : mergeDirectoryUsers(state.directoryUsers, data.users),
        }));
      } catch (error) {
        console.error('Error loading chat user directory:', error);

        const latestState = get();
        if (
          latestState.ownerUserId !== ownerUserId ||
          latestState.directoryRequestToken !== requestToken
        ) {
          return;
        }

        set({
          isDirectoryLoading: false,
          directoryError: 'Gagal memuat daftar pengguna',
        });
      }
    },
  })
);
