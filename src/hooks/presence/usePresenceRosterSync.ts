import { usePresenceStore } from '@/store/presenceStore';
import { useRealtimeChannelRecovery } from '@/hooks/realtime/useRealtimeChannelRecovery';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef } from 'react';
import { chatService, type UserPresence } from '@/services/api/chat.service';
import { usersService } from '@/services/api/users.service';
import { realtimeService } from '@/services/realtime/realtime.service';
import type { OnlineUser } from '@/types';
import {
  PRESENCE_ROSTER_REFRESH_MS,
  getPresenceFreshnessCutoff,
  isPresenceFresh,
} from './presenceStatus';

interface PresenceRosterUser {
  id: string;
  name: string;
  email: string;
  profilephoto?: string | null;
}

type PresenceRealtimePayload = {
  eventType?: string;
  new?: Partial<UserPresence>;
  old?: Partial<UserPresence>;
};

const areOnlineUserListsEqual = (
  previousUsers: OnlineUser[],
  nextUsers: OnlineUser[]
) =>
  previousUsers.length === nextUsers.length &&
  previousUsers.every((previousUser, index) => {
    const nextUser = nextUsers[index];
    return (
      previousUser.id === nextUser?.id &&
      previousUser.name === nextUser?.name &&
      previousUser.email === nextUser?.email &&
      previousUser.profilephoto === nextUser?.profilephoto &&
      Boolean(nextUser)
    );
  });

const getPresenceTimestamp = (presence: Partial<UserPresence>) =>
  new Date(
    presence.last_seen ?? presence.updated_at ?? new Date().toISOString()
  ).getTime();

const sortOnlineUsers = (users: OnlineUser[]) =>
  [...users].sort((leftUser, rightUser) =>
    (leftUser.name || leftUser.email || leftUser.id).localeCompare(
      rightUser.name || rightUser.email || rightUser.id
    )
  );

const buildPresenceTimestamp = (presence?: Partial<UserPresence>) =>
  presence?.last_seen ?? presence?.updated_at ?? new Date().toISOString();

const isRealtimePresenceOnline = (presence?: Partial<UserPresence>) => {
  if (!presence?.user_id || presence.is_online !== true) {
    return false;
  }

  return isPresenceFresh(buildPresenceTimestamp(presence));
};

export const usePresenceRosterSync = ({
  user,
}: {
  user: PresenceRosterUser | null;
}) => {
  const { onlineUsersList, setChannel, setOnlineUsers, setOnlineUsersList } =
    usePresenceStore();
  const rosterChannelRef = useRef<RealtimeChannel | null>(null);
  const onlineUsersListRef = useRef(onlineUsersList);
  const knownUsersByIdRef = useRef<Map<string, OnlineUser>>(new Map());
  const { recoveryTick, scheduleRecovery, markRecoverySuccess } =
    useRealtimeChannelRecovery();

  useEffect(() => {
    onlineUsersListRef.current = onlineUsersList;
  }, [onlineUsersList]);

  useEffect(() => {
    if (!user) {
      knownUsersByIdRef.current.clear();
      return;
    }

    knownUsersByIdRef.current.set(user.id, {
      id: user.id,
      name: user.name,
      email: user.email,
      profilephoto: user.profilephoto ?? null,
      online_at: new Date().toISOString(),
    });
  }, [user]);

  const buildCurrentOnlineUser = useCallback((): OnlineUser | null => {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      profilephoto: user.profilephoto ?? null,
      online_at: new Date().toISOString(),
    };
  }, [user]);

  const applyOnlineRoster = useCallback(
    (nextUsers: OnlineUser[]) => {
      setOnlineUsers(nextUsers.length);

      if (!areOnlineUserListsEqual(onlineUsersListRef.current, nextUsers)) {
        setOnlineUsersList(nextUsers);
      }
    },
    [setOnlineUsers, setOnlineUsersList]
  );

  const hydratePresenceRoster = useCallback(
    async (presenceRows: UserPresence[]) => {
      const currentUser = buildCurrentOnlineUser();
      const activePresenceByUserId = new Map<string, UserPresence>();

      presenceRows.forEach(presence => {
        if (!presence.user_id || !presence.is_online) {
          return;
        }

        if (!isPresenceFresh(presence.last_seen)) {
          return;
        }

        const existingPresence = activePresenceByUserId.get(presence.user_id);
        if (
          !existingPresence ||
          getPresenceTimestamp(presence) >
            getPresenceTimestamp(existingPresence)
        ) {
          activePresenceByUserId.set(presence.user_id, presence);
        }
      });

      if (currentUser && !activePresenceByUserId.has(currentUser.id)) {
        activePresenceByUserId.set(currentUser.id, {
          user_id: currentUser.id,
          is_online: true,
          last_seen: currentUser.online_at,
          updated_at: currentUser.online_at,
        });
      }

      const otherUserIds = [...activePresenceByUserId.keys()].filter(
        presenceUserId => presenceUserId !== currentUser?.id
      );
      const missingUserIds = otherUserIds.filter(
        otherUserId => !knownUsersByIdRef.current.has(otherUserId)
      );

      if (missingUserIds.length > 0) {
        const { data: otherUsersData, error: otherUsersError } =
          await usersService.getUsersByIds(missingUserIds);

        if (otherUsersError) {
          console.error(
            'Failed to hydrate online presence roster:',
            otherUsersError
          );
        }

        (otherUsersData || []).forEach(otherUser => {
          knownUsersByIdRef.current.set(otherUser.id, otherUser);
        });
      }

      const nextOnlineUsers = sortOnlineUsers(
        [...activePresenceByUserId.values()].map<OnlineUser>(presence => {
          if (presence.user_id === currentUser?.id && currentUser) {
            return {
              ...currentUser,
              online_at: presence.last_seen ?? currentUser.online_at,
            };
          }

          const matchedUser = knownUsersByIdRef.current.get(presence.user_id);
          return {
            id: presence.user_id,
            name: matchedUser?.name || matchedUser?.email || 'Unknown',
            email: matchedUser?.email || '',
            profilephoto: matchedUser?.profilephoto ?? null,
            online_at: presence.last_seen ?? new Date().toISOString(),
          };
        })
      );

      applyOnlineRoster(nextOnlineUsers);
    },
    [applyOnlineRoster, buildCurrentOnlineUser]
  );

  const refreshPresenceRoster = useCallback(async () => {
    const currentUser = buildCurrentOnlineUser();

    if (!currentUser) {
      setOnlineUsers(0);
      setOnlineUsersList([]);
      return;
    }

    try {
      const { data, error } = await chatService.listActivePresenceSince(
        getPresenceFreshnessCutoff()
      );

      if (error) {
        console.error('Failed to load active presence roster:', error);

        if (onlineUsersListRef.current.length === 0) {
          applyOnlineRoster([currentUser]);
        }

        return;
      }

      await hydratePresenceRoster(data || []);
    } catch (error) {
      console.error('Caught error loading active presence roster:', error);

      if (onlineUsersListRef.current.length === 0) {
        applyOnlineRoster([currentUser]);
      }
    }
  }, [
    applyOnlineRoster,
    buildCurrentOnlineUser,
    hydratePresenceRoster,
    setOnlineUsers,
    setOnlineUsersList,
  ]);

  const upsertOnlineUser = useCallback(
    async (presence: Partial<UserPresence>) => {
      const userId = presence.user_id;
      const currentUser = buildCurrentOnlineUser();

      if (!userId) {
        return;
      }

      if (userId === currentUser?.id && currentUser) {
        const nextUsers = sortOnlineUsers([
          ...onlineUsersListRef.current.filter(
            onlineUser => onlineUser.id !== userId
          ),
          {
            ...currentUser,
            online_at: buildPresenceTimestamp(presence),
          },
        ]);
        applyOnlineRoster(nextUsers);
        return;
      }

      let matchedUser = knownUsersByIdRef.current.get(userId);
      if (!matchedUser) {
        const { data: otherUsersData, error: otherUsersError } =
          await usersService.getUsersByIds([userId]);

        if (otherUsersError || !otherUsersData?.[0]) {
          console.error(
            'Failed to hydrate realtime presence user:',
            otherUsersError
          );
          void refreshPresenceRoster();
          return;
        }

        matchedUser = otherUsersData[0];
        knownUsersByIdRef.current.set(userId, matchedUser);
      }

      const nextUsers = sortOnlineUsers([
        ...onlineUsersListRef.current.filter(
          onlineUser => onlineUser.id !== userId
        ),
        {
          ...matchedUser,
          online_at: buildPresenceTimestamp(presence),
        },
      ]);

      applyOnlineRoster(nextUsers);
    },
    [applyOnlineRoster, buildCurrentOnlineUser, refreshPresenceRoster]
  );

  const removeOnlineUser = useCallback(
    (userId?: string) => {
      if (!userId) {
        void refreshPresenceRoster();
        return;
      }

      const currentUser = buildCurrentOnlineUser();
      const nextUsers = onlineUsersListRef.current.filter(
        onlineUser => onlineUser.id !== userId
      );

      if (currentUser && userId === currentUser.id) {
        applyOnlineRoster(sortOnlineUsers([currentUser, ...nextUsers]));
        return;
      }

      applyOnlineRoster(nextUsers);
    },
    [applyOnlineRoster, buildCurrentOnlineUser, refreshPresenceRoster]
  );

  const handlePresenceChange = useCallback(
    (payload?: PresenceRealtimePayload) => {
      if (!payload?.eventType) {
        void refreshPresenceRoster();
        return;
      }

      if (payload.eventType === 'DELETE') {
        removeOnlineUser(payload.old?.user_id);
        return;
      }

      const nextPresence = payload.new;
      const previousPresence = payload.old;
      const isKnownOnlineUser = onlineUsersListRef.current.some(
        onlineUser => onlineUser.id === nextPresence?.user_id
      );

      if (
        payload.eventType === 'UPDATE' &&
        nextPresence?.user_id &&
        isKnownOnlineUser &&
        nextPresence.is_online === previousPresence?.is_online
      ) {
        return;
      }

      if (isRealtimePresenceOnline(nextPresence)) {
        void upsertOnlineUser(nextPresence || {});
        return;
      }

      removeOnlineUser(nextPresence?.user_id);
    },
    [refreshPresenceRoster, removeOnlineUser, upsertOnlineUser]
  );

  const cleanupRosterChannel = useCallback(async () => {
    const currentChannel = rosterChannelRef.current;

    if (!currentChannel) {
      return;
    }

    rosterChannelRef.current = null;

    try {
      void currentChannel.unsubscribe();
      await realtimeService.removeChannel(currentChannel);
    } catch (cleanupError) {
      console.warn('Presence roster channel cleanup warning:', cleanupError);
    }
  }, []);

  const setupPresenceRosterSubscription = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    await cleanupRosterChannel();

    const newChannel = realtimeService
      .createChannel('user_presence_roster_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        payload => {
          handlePresenceChange(payload as PresenceRealtimePayload);
        }
      );

    rosterChannelRef.current = newChannel;
    setChannel(newChannel);

    newChannel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        markRecoverySuccess();
        void refreshPresenceRoster();
        return;
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(
          'Failed to subscribe user presence roster channel:',
          status
        );
        if (rosterChannelRef.current === newChannel) {
          rosterChannelRef.current = null;
          setChannel(null);
          void realtimeService.removeChannel(newChannel);
        }
        void scheduleRecovery();
      }
    });
  }, [
    cleanupRosterChannel,
    handlePresenceChange,
    markRecoverySuccess,
    refreshPresenceRoster,
    scheduleRecovery,
    setChannel,
    user?.id,
  ]);

  const resetPresenceState = useCallback(async () => {
    await cleanupRosterChannel();
    markRecoverySuccess();
    knownUsersByIdRef.current.clear();
    setChannel(null);
    setOnlineUsers(0);
    setOnlineUsersList([]);
  }, [
    cleanupRosterChannel,
    markRecoverySuccess,
    setChannel,
    setOnlineUsers,
    setOnlineUsersList,
  ]);

  useEffect(() => {
    if (!user) {
      void resetPresenceState();
    }
  }, [resetPresenceState, user]);

  useEffect(
    () => () => {
      void resetPresenceState();
    },
    [resetPresenceState]
  );

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void setupPresenceRosterSubscription();

    return () => {
      void cleanupRosterChannel();
      setChannel(null);
    };
  }, [
    cleanupRosterChannel,
    recoveryTick,
    setChannel,
    setupPresenceRosterSubscription,
    user?.id,
  ]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const rosterRefresh = setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      void refreshPresenceRoster();
    }, PRESENCE_ROSTER_REFRESH_MS);

    return () => clearInterval(rosterRefresh);
  }, [refreshPresenceRoster, user]);
};
