import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePresenceStore } from '@/store/presenceStore';
import { usersService } from '@/services/api/users.service';
import type { OnlineUser } from '@/types';
import { mergePresenceUsers, moveCurrentUserToEdge } from './roster';

const DIRECTORY_PAGE_SIZE = 30;
const DIRECTORY_CACHE_MAX_AGE_MS = 60_000;

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

export const usePresenceRoster = (shouldLoadDirectory = false) => {
  const { user } = useAuthStore();
  const { onlineUsers, onlineUsersList } = usePresenceStore();
  const [directoryUsers, setDirectoryUsers] = useState(EMPTY_USERS);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [hasMoreDirectoryUsers, setHasMoreDirectoryUsers] = useState(true);
  const lastDirectoryLoadedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user?.id) {
      lastDirectoryLoadedAtRef.current = null;
      setDirectoryUsers(EMPTY_USERS);
      setDirectoryError(null);
      setIsDirectoryLoading(false);
      setHasMoreDirectoryUsers(true);
    }
  }, [user?.id]);

  const loadDirectoryPage = useCallback(
    async (reset = false) => {
      if (!user?.id || isDirectoryLoading) {
        return;
      }

      if (!reset && !hasMoreDirectoryUsers) {
        return;
      }

      setIsDirectoryLoading(true);
      setDirectoryError(null);
      try {
        const { data, error } = await usersService.getUsersPage(
          DIRECTORY_PAGE_SIZE,
          reset ? 0 : directoryUsers.length
        );

        if (error || !data) {
          setDirectoryError('Gagal memuat daftar pengguna');
          return;
        }

        lastDirectoryLoadedAtRef.current = Date.now();
        setDirectoryError(null);
        setHasMoreDirectoryUsers(data.hasMore);
        setDirectoryUsers(previousUsers =>
          reset ? data.users : mergeDirectoryUsers(previousUsers, data.users)
        );
      } catch (error) {
        console.error('Error loading chat user directory:', error);
        setDirectoryError('Gagal memuat daftar pengguna');
      } finally {
        setIsDirectoryLoading(false);
      }
    },
    [directoryUsers.length, hasMoreDirectoryUsers, isDirectoryLoading, user?.id]
  );

  useEffect(() => {
    if (!shouldLoadDirectory || !user?.id || isDirectoryLoading) {
      return;
    }

    const isDirectoryStale =
      lastDirectoryLoadedAtRef.current === null ||
      Date.now() - lastDirectoryLoadedAtRef.current >
        DIRECTORY_CACHE_MAX_AGE_MS;
    if (!isDirectoryStale && directoryUsers.length > 0) {
      return;
    }

    void loadDirectoryPage(true);
  }, [
    directoryUsers.length,
    isDirectoryLoading,
    loadDirectoryPage,
    shouldLoadDirectory,
    user?.id,
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
    [onlineUsersList, user?.id]
  );

  const portalOrderedUsers = useMemo(
    () =>
      moveCurrentUserToEdge(
        mergePresenceUsers(onlineUsersList, directoryUsers),
        user?.id,
        'start'
      ),
    [directoryUsers, onlineUsersList, user?.id]
  );

  const retryLoadDirectory = useCallback(() => {
    lastDirectoryLoadedAtRef.current = null;
    setDirectoryError(null);
    setHasMoreDirectoryUsers(true);
    setDirectoryUsers(EMPTY_USERS);
  }, []);

  const loadMoreDirectoryUsers = useCallback(() => {
    void loadDirectoryPage(false);
  }, [loadDirectoryPage]);

  return {
    displayOnlineUsers,
    onlineUserIds,
    onlineUsersList,
    reorderedOnlineUsers,
    portalOrderedUsers,
    isDirectoryLoading,
    directoryError,
    hasMoreDirectoryUsers,
    retryLoadDirectory,
    loadMoreDirectoryUsers,
  };
};
