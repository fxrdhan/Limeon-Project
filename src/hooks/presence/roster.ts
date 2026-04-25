import type { DirectoryUser } from '@/store/createDirectoryStore';
import type { OnlineUser } from '@/types';

export const mergePresenceUsers = (
  onlineUsersList: OnlineUser[],
  allUsersList: DirectoryUser[]
) => {
  if (allUsersList.length === 0) {
    return onlineUsersList;
  }

  const directoryUsersById = new Map(allUsersList.map(user => [user.id, user]));
  const onlineUserIds = new Set(onlineUsersList.map(user => user.id));
  const onlineUsers = onlineUsersList.map(user => ({
    ...directoryUsersById.get(user.id),
    ...user,
  }));
  const offlineUsers = allUsersList.filter(user => !onlineUserIds.has(user.id));

  return [...onlineUsers, ...offlineUsers];
};

export const moveCurrentUserToEdge = <TUser extends { id: string }>(
  users: TUser[],
  currentUserId: string | undefined,
  placement: 'start' | 'end'
) => {
  if (!currentUserId || users.length === 0) {
    return users;
  }

  const currentUser = users.find(user => user.id === currentUserId);
  if (!currentUser) {
    return users;
  }

  const otherUsers = users.filter(user => user.id !== currentUserId);
  return placement === 'start'
    ? [currentUser, ...otherUsers]
    : [...otherUsers, currentUser];
};
