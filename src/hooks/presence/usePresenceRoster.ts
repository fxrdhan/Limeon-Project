import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePresenceStore } from '@/store/presenceStore';
import { usersService } from '@/services/api/users.service';
import { mergePresenceUsers, moveCurrentUserToEdge } from './roster';

export const usePresenceRoster = (shouldLoadDirectory = false) => {
  const { user } = useAuthStore();
  const { onlineUsers, onlineUsersList } = usePresenceStore();
  const [directoryUsers, setDirectoryUsers] = useState(onlineUsersList);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [directoryReloadTick, setDirectoryReloadTick] = useState(0);
  const hasLoadedDirectoryRef = useRef(false);

  useEffect(() => {
    if (!user?.id) {
      hasLoadedDirectoryRef.current = false;
      setDirectoryUsers([]);
      setDirectoryError(null);
      setIsDirectoryLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (
      !shouldLoadDirectory ||
      !user?.id ||
      isDirectoryLoading ||
      hasLoadedDirectoryRef.current
    ) {
      return;
    }

    let isActive = true;
    setIsDirectoryLoading(true);
    setDirectoryError(null);

    const loadDirectory = async () => {
      try {
        const { data, error } = await usersService.getAllUsers();
        if (!isActive) {
          return;
        }

        if (error || !data) {
          setDirectoryError('Gagal memuat daftar pengguna');
          return;
        }

        hasLoadedDirectoryRef.current = true;
        setDirectoryUsers(data);
      } catch (error) {
        console.error('Error loading chat user directory:', error);
        if (isActive) {
          setDirectoryError('Gagal memuat daftar pengguna');
        }
      } finally {
        if (isActive) {
          setIsDirectoryLoading(false);
        }
      }
    };

    void loadDirectory();

    return () => {
      isActive = false;
    };
  }, [directoryReloadTick, isDirectoryLoading, shouldLoadDirectory, user?.id]);

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
    hasLoadedDirectoryRef.current = false;
    setDirectoryError(null);
    setDirectoryReloadTick(previousTick => previousTick + 1);
  }, []);

  return {
    displayOnlineUsers,
    onlineUserIds,
    onlineUsersList,
    reorderedOnlineUsers,
    portalOrderedUsers,
    isDirectoryLoading,
    directoryError,
    retryLoadDirectory,
  };
};
