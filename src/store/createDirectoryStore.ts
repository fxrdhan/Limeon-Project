import { create } from 'zustand';
import type { OnlineUser } from '@/types';

const DEFAULT_DIRECTORY_PAGE_SIZE = 30;
const EMPTY_USERS: OnlineUser[] = [];

export interface DirectoryPageData {
  users: OnlineUser[];
  hasMore: boolean;
}

export interface DirectoryPageResponse {
  data: DirectoryPageData | null;
  error: unknown;
}

export interface DirectoryStoreState {
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

interface CreateDirectoryStoreOptions {
  getUsersPage: (
    pageSize: number,
    offset: number
  ) => Promise<DirectoryPageResponse>;
  pageSize?: number;
  errorMessage?: string;
  onLoadError?: (error: unknown) => void;
}

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

export const createDirectoryStore = ({
  getUsersPage,
  pageSize = DEFAULT_DIRECTORY_PAGE_SIZE,
  errorMessage = 'Gagal memuat daftar pengguna',
  onLoadError = error => {
    console.error('Error loading directory users:', error);
  },
}: CreateDirectoryStoreOptions) =>
  create<DirectoryStoreState>((set, get) => ({
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
        const { data, error } = await getUsersPage(
          pageSize,
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
            directoryError: errorMessage,
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
        onLoadError(error);

        const latestState = get();
        if (
          latestState.ownerUserId !== ownerUserId ||
          latestState.directoryRequestToken !== requestToken
        ) {
          return;
        }

        set({
          isDirectoryLoading: false,
          directoryError: errorMessage,
        });
      }
    },
  }));
