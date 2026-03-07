import type { OnlineUser } from '@/types';

export const mergePresenceUsers = (
  onlineUsersList: OnlineUser[],
  allUsersList: OnlineUser[]
) => {
  if (allUsersList.length === 0) {
    return onlineUsersList;
  }

  const onlineUserIds = new Set(onlineUsersList.map(user => user.id));
  const offlineUsers = allUsersList.filter(user => !onlineUserIds.has(user.id));

  return [...onlineUsersList, ...offlineUsers];
};

export const moveCurrentUserToEdge = (
  users: OnlineUser[],
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
