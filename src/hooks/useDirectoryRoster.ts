import { useCallback, useEffect, useMemo } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';
import { useAuthStore } from '@/store/authStore';
import { usePresenceStore } from '@/store/presenceStore';
import type { OnlineUser } from '@/types';
import type {
  DirectoryStoreState,
  DirectoryUser,
} from '@/store/createDirectoryStore';

const DIRECTORY_CACHE_MAX_AGE_MS = 60_000;
const EMPTY_DIRECTORY_USERS: DirectoryUser[] = [];

interface UseDirectoryRosterOptions<TUser extends DirectoryUser> {
  shouldLoadDirectory?: boolean;
  useDirectoryStore: UseBoundStore<StoreApi<DirectoryStoreState<TUser>>>;
  mergeUsers: (
    onlineUsersList: OnlineUser[],
    directoryUsers: TUser[]
  ) => DirectoryUser[];
  moveCurrentUserToEdge: <TRosterUser extends { id: string }>(
    users: TRosterUser[],
    currentUserId: string | undefined,
    placement: 'start' | 'end'
  ) => TRosterUser[];
}

export const useDirectoryRoster = <TUser extends DirectoryUser>({
  shouldLoadDirectory = false,
  useDirectoryStore,
  mergeUsers,
  moveCurrentUserToEdge,
}: UseDirectoryRosterOptions<TUser>) => {
  const { user } = useAuthStore();
  const { onlineUsers, onlineUsersList } = usePresenceStore();
  const activeDirectoryOwnerUserId = user?.id ?? null;
  const directoryOwnerUserId = useDirectoryStore(state => state.ownerUserId);
  const directoryUsers = useDirectoryStore(state => state.directoryUsers);
  const isDirectoryLoading = useDirectoryStore(
    state => state.isDirectoryLoading
  );
  const directoryError = useDirectoryStore(state => state.directoryError);
  const hasMoreDirectoryUsers = useDirectoryStore(
    state => state.hasMoreDirectoryUsers
  );
  const lastDirectoryLoadedAt = useDirectoryStore(
    state => state.lastDirectoryLoadedAt
  );
  const hasAttemptedDirectoryLoad = useDirectoryStore(
    state => state.hasAttemptedDirectoryLoad
  );
  const resetDirectoryState = useDirectoryStore(
    state => state.resetDirectoryState
  );
  const loadDirectoryPage = useDirectoryStore(state => state.loadDirectoryPage);
  const isActiveDirectoryOwner =
    directoryOwnerUserId === activeDirectoryOwnerUserId;
  const resolvedDirectoryUsers = isActiveDirectoryOwner
    ? directoryUsers
    : (EMPTY_DIRECTORY_USERS as TUser[]);
  const resolvedIsDirectoryLoading = isActiveDirectoryOwner
    ? isDirectoryLoading
    : false;
  const resolvedDirectoryError = isActiveDirectoryOwner ? directoryError : null;
  const resolvedHasMoreDirectoryUsers = isActiveDirectoryOwner
    ? hasMoreDirectoryUsers
    : true;
  const resolvedLastDirectoryLoadedAt = isActiveDirectoryOwner
    ? lastDirectoryLoadedAt
    : null;
  const resolvedHasAttemptedDirectoryLoad = isActiveDirectoryOwner
    ? hasAttemptedDirectoryLoad
    : false;

  useEffect(() => {
    if (directoryOwnerUserId !== activeDirectoryOwnerUserId) {
      resetDirectoryState(activeDirectoryOwnerUserId);
    }
  }, [activeDirectoryOwnerUserId, directoryOwnerUserId, resetDirectoryState]);

  useEffect(() => {
    if (
      !shouldLoadDirectory ||
      !activeDirectoryOwnerUserId ||
      resolvedIsDirectoryLoading
    ) {
      return;
    }

    const isDirectoryStale =
      resolvedLastDirectoryLoadedAt !== null &&
      Date.now() - resolvedLastDirectoryLoadedAt > DIRECTORY_CACHE_MAX_AGE_MS;

    if (
      resolvedHasAttemptedDirectoryLoad &&
      (resolvedLastDirectoryLoadedAt === null || !isDirectoryStale)
    ) {
      return;
    }

    void loadDirectoryPage(activeDirectoryOwnerUserId, true);
  }, [
    activeDirectoryOwnerUserId,
    loadDirectoryPage,
    resolvedHasAttemptedDirectoryLoad,
    resolvedIsDirectoryLoading,
    resolvedLastDirectoryLoadedAt,
    shouldLoadDirectory,
  ]);

  const displayOnlineUsers = user ? Math.max(1, onlineUsers) : onlineUsers;

  const rawOnlineUserIds = useMemo(
    () => new Set(onlineUsersList.map(onlineUser => onlineUser.id)),
    [onlineUsersList]
  );

  const onlineUserIds = useMemo(() => {
    const ids = new Set(rawOnlineUserIds);
    if (user?.id) {
      ids.add(user.id);
    }
    return ids;
  }, [rawOnlineUserIds, user?.id]);

  const reorderedOnlineUsers = useMemo(
    () => moveCurrentUserToEdge(onlineUsersList, user?.id, 'end'),
    [moveCurrentUserToEdge, onlineUsersList, user?.id]
  );

  const portalOrderedUsers = useMemo(
    () =>
      moveCurrentUserToEdge(
        mergeUsers(onlineUsersList, resolvedDirectoryUsers),
        activeDirectoryOwnerUserId ?? undefined,
        'start'
      ),
    [
      activeDirectoryOwnerUserId,
      mergeUsers,
      moveCurrentUserToEdge,
      onlineUsersList,
      resolvedDirectoryUsers,
    ]
  );

  const retryLoadDirectory = useCallback(() => {
    resetDirectoryState(activeDirectoryOwnerUserId);
  }, [activeDirectoryOwnerUserId, resetDirectoryState]);

  const loadMoreDirectoryUsers = useCallback(() => {
    if (!activeDirectoryOwnerUserId) {
      return;
    }

    void loadDirectoryPage(activeDirectoryOwnerUserId, false);
  }, [activeDirectoryOwnerUserId, loadDirectoryPage]);

  return {
    displayOnlineUsers,
    onlineUserIds,
    onlineUsersList,
    reorderedOnlineUsers,
    portalOrderedUsers,
    isDirectoryLoading: resolvedIsDirectoryLoading,
    directoryError: resolvedDirectoryError,
    hasMoreDirectoryUsers: resolvedHasMoreDirectoryUsers,
    retryLoadDirectory,
    loadMoreDirectoryUsers,
  };
};
