import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePresenceStore } from '@/store/presenceStore';
import { mergePresenceUsers, moveCurrentUserToEdge } from './roster';

export const usePresenceRoster = () => {
  const { user } = useAuthStore();
  const { onlineUsers, onlineUsersList, allUsersList, portalImageUrls } =
    usePresenceStore();

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

  const mergedPresenceUsers = useMemo(
    () => mergePresenceUsers(onlineUsersList, allUsersList),
    [allUsersList, onlineUsersList]
  );

  const reorderedOnlineUsers = useMemo(
    () => moveCurrentUserToEdge(mergedPresenceUsers, user?.id, 'end'),
    [mergedPresenceUsers, user?.id]
  );

  const portalOrderedUsers = useMemo(
    () => moveCurrentUserToEdge(mergedPresenceUsers, user?.id, 'start'),
    [mergedPresenceUsers, user?.id]
  );

  return {
    displayOnlineUsers,
    onlineUserIds,
    reorderedOnlineUsers,
    portalOrderedUsers,
    portalImageUrls,
  };
};
