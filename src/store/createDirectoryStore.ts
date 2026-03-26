import { create } from 'zustand';

const DEFAULT_DIRECTORY_PAGE_SIZE = 30;

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  profilephoto: string | null;
  profilephoto_thumb?: string | null;
}

const EMPTY_USERS: DirectoryUser[] = [];

export interface DirectoryPageData<
  TUser extends DirectoryUser = DirectoryUser,
> {
  users: TUser[];
  hasMore: boolean;
}

export interface DirectoryPageResponse<
  TUser extends DirectoryUser = DirectoryUser,
> {
  data: DirectoryPageData<TUser> | null;
  error: unknown;
}

export interface DirectoryStoreState<
  TUser extends DirectoryUser = DirectoryUser,
> {
  ownerUserId: string | null;
  directoryUsers: TUser[];
  isDirectoryLoading: boolean;
  directoryError: string | null;
  hasMoreDirectoryUsers: boolean;
  lastDirectoryLoadedAt: number | null;
  hasAttemptedDirectoryLoad: boolean;
  directoryRequestToken: number;
  resetDirectoryState: (ownerUserId?: string | null) => void;
  loadDirectoryPage: (ownerUserId: string, reset?: boolean) => Promise<void>;
}

interface CreateDirectoryStoreOptions<TUser extends DirectoryUser> {
  getUsersPage: (
    pageSize: number,
    offset: number
  ) => Promise<DirectoryPageResponse<TUser>>;
  pageSize?: number;
  errorMessage?: string;
  onLoadError?: (error: unknown) => void;
}

const mergeDirectoryUsers = <TUser extends DirectoryUser>(
  previousUsers: TUser[],
  nextUsers: TUser[]
) => {
  const mergedUsersById = new Map(previousUsers.map(user => [user.id, user]));
  nextUsers.forEach(user => {
    mergedUsersById.set(user.id, user);
  });

  return [...mergedUsersById.values()] as TUser[];
};

export const createDirectoryStore = <TUser extends DirectoryUser>({
  getUsersPage,
  pageSize = DEFAULT_DIRECTORY_PAGE_SIZE,
  errorMessage = 'Gagal memuat daftar pengguna',
  onLoadError = error => {
    console.error('Error loading directory users:', error);
  },
}: CreateDirectoryStoreOptions<TUser>) =>
  create<DirectoryStoreState<TUser>>((set, get) => ({
    ownerUserId: null,
    directoryUsers: EMPTY_USERS as TUser[],
    isDirectoryLoading: false,
    directoryError: null,
    hasMoreDirectoryUsers: true,
    lastDirectoryLoadedAt: null,
    hasAttemptedDirectoryLoad: false,
    directoryRequestToken: 0,
    resetDirectoryState: (ownerUserId = null) => {
      set(state => ({
        ownerUserId,
        directoryUsers: EMPTY_USERS as TUser[],
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
        ? (EMPTY_USERS as TUser[])
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
