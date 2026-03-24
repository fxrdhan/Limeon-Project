import { useCallback, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePresenceStore } from '@/store/presenceStore';
import type { OnlineUser } from '@/types';
import { useChatSidebarDirectoryStore } from '../store/chatSidebarDirectoryStore';
import {
  mergeChatDirectoryUsers,
  moveCurrentChatUserToEdge,
} from '../utils/chatDirectoryRoster';

const DIRECTORY_CACHE_MAX_AGE_MS = 60_000;
const EMPTY_DIRECTORY_USERS: OnlineUser[] = [];

export const useChatDirectoryRoster = (shouldLoadDirectory = false) => {
  const { user } = useAuthStore();
  const { onlineUsers, onlineUsersList } = usePresenceStore();
  const activeDirectoryOwnerUserId = user?.id ?? null;
  const directoryOwnerUserId = useChatSidebarDirectoryStore(
    state => state.ownerUserId
  );
  const directoryUsers = useChatSidebarDirectoryStore(
    state => state.directoryUsers
  );
  const isDirectoryLoading = useChatSidebarDirectoryStore(
    state => state.isDirectoryLoading
  );
  const directoryError = useChatSidebarDirectoryStore(
    state => state.directoryError
  );
  const hasMoreDirectoryUsers = useChatSidebarDirectoryStore(
    state => state.hasMoreDirectoryUsers
  );
  const lastDirectoryLoadedAt = useChatSidebarDirectoryStore(
    state => state.lastDirectoryLoadedAt
  );
  const hasAttemptedDirectoryLoad = useChatSidebarDirectoryStore(
    state => state.hasAttemptedDirectoryLoad
  );
  const resetDirectoryState = useChatSidebarDirectoryStore(
    state => state.resetDirectoryState
  );
  const loadDirectoryPage = useChatSidebarDirectoryStore(
    state => state.loadDirectoryPage
  );
  const isActiveDirectoryOwner =
    directoryOwnerUserId === activeDirectoryOwnerUserId;
  const resolvedDirectoryUsers = isActiveDirectoryOwner
    ? directoryUsers
    : EMPTY_DIRECTORY_USERS;
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
    () => moveCurrentChatUserToEdge(onlineUsersList, user?.id, 'end'),
    [onlineUsersList, user?.id]
  );

  const portalOrderedUsers = useMemo(
    () =>
      moveCurrentChatUserToEdge(
        mergeChatDirectoryUsers(onlineUsersList, resolvedDirectoryUsers),
        activeDirectoryOwnerUserId ?? undefined,
        'start'
      ),
    [activeDirectoryOwnerUserId, onlineUsersList, resolvedDirectoryUsers]
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
