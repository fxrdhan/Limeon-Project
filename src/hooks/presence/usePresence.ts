import { useAuthStore } from '@/store/authStore';
import { usePresenceStore } from '@/store/presenceStore';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef } from 'react';
import { chatService, type UserPresence } from '@/services/api/chat.service';
import { usersService } from '@/services/api/users.service';
import { realtimeService } from '@/services/realtime/realtime.service';
import type { OnlineUser } from '@/types';

const ONLINE_PRESENCE_MAX_AGE_MS = 90_000;
const PRESENCE_HEARTBEAT_MS = 30_000;

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
      previousUser.online_at === nextUser?.online_at &&
      Boolean(nextUser)
    );
  });

const isPresenceFresh = (lastSeen?: string | null) => {
  if (!lastSeen) {
    return false;
  }

  const parsedLastSeen = new Date(lastSeen).getTime();
  if (Number.isNaN(parsedLastSeen)) {
    return false;
  }

  return Date.now() - parsedLastSeen <= ONLINE_PRESENCE_MAX_AGE_MS;
};

const getPresenceFreshnessCutoff = () =>
  new Date(Date.now() - ONLINE_PRESENCE_MAX_AGE_MS).toISOString();

const getPresenceTimestamp = (presence: UserPresence) =>
  new Date(
    presence.last_seen ?? presence.updated_at ?? new Date().toISOString()
  ).getTime();

export const usePresence = () => {
  const { user, session } = useAuthStore();
  const {
    onlineUsersList,
    setChannel,
    setOnlineUsers,
    setOnlineUsersList,
    setAllUsersList,
    setPortalImageUrls,
  } = usePresenceStore();
  const rosterChannelRef = useRef<RealtimeChannel | null>(null);
  const onlineUsersListRef = useRef(onlineUsersList);
  const sessionTokenRef = useRef<string | null>(session?.access_token ?? null);
  const hasHandledPageExitRef = useRef(false);

  useEffect(() => {
    onlineUsersListRef.current = onlineUsersList;
  }, [onlineUsersList]);

  useEffect(() => {
    sessionTokenRef.current = session?.access_token ?? null;
  }, [session?.access_token]);

  const syncUserPresenceState = useCallback(
    async (keepOnline: boolean, timestamp = new Date().toISOString()) => {
      if (!user?.id) {
        return false;
      }

      const payload = {
        is_online: keepOnline,
        last_seen: timestamp,
        updated_at: timestamp,
      };

      try {
        const { data: updateData, error: updateError } =
          await chatService.updateUserPresence(user.id, payload);

        if (!updateError && (updateData?.length ?? 0) > 0) {
          return true;
        }

        if (updateError) {
          console.error('Failed to update presence row:', updateError);
          return false;
        }

        const { error: insertError } = await chatService.insertUserPresence({
          user_id: user.id,
          ...payload,
        });

        if (insertError) {
          console.error('Failed to insert presence row:', insertError);
          return false;
        }

        return true;
      } catch (error) {
        console.error('Caught error syncing presence row:', error);
        return false;
      }
    },
    [user?.id]
  );

  const buildCurrentOnlineUser = useCallback((): OnlineUser | null => {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      profilephoto: user.profilephoto,
      online_at: new Date().toISOString(),
    };
  }, [user]);

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
      const { data: otherUsersData, error: otherUsersError } =
        await usersService.getUsersByIds(otherUserIds);

      if (otherUsersError) {
        console.error(
          'Failed to hydrate online presence roster:',
          otherUsersError
        );
      }

      const otherUsersById = new Map(
        (otherUsersData || []).map(otherUser => [otherUser.id, otherUser])
      );

      const nextOnlineUsers = [...activePresenceByUserId.values()]
        .map<OnlineUser>(presence => {
          if (presence.user_id === currentUser?.id && currentUser) {
            return {
              ...currentUser,
              online_at: presence.last_seen ?? currentUser.online_at,
            };
          }

          const matchedUser = otherUsersById.get(presence.user_id);
          return {
            id: presence.user_id,
            name: matchedUser?.name || matchedUser?.email || 'Unknown',
            email: matchedUser?.email || '',
            profilephoto: matchedUser?.profilephoto ?? null,
            online_at: presence.last_seen ?? new Date().toISOString(),
          };
        })
        .sort((leftUser, rightUser) =>
          (leftUser.name || leftUser.email || leftUser.id).localeCompare(
            rightUser.name || rightUser.email || rightUser.id
          )
        );

      setOnlineUsers(nextOnlineUsers.length);

      if (
        !areOnlineUserListsEqual(onlineUsersListRef.current, nextOnlineUsers)
      ) {
        setOnlineUsersList(nextOnlineUsers);
      }
    },
    [buildCurrentOnlineUser, setOnlineUsers, setOnlineUsersList]
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
          setOnlineUsers(1);
          setOnlineUsersList([currentUser]);
        }

        return;
      }

      await hydratePresenceRoster(data || []);
    } catch (error) {
      console.error('Caught error loading active presence roster:', error);

      if (onlineUsersListRef.current.length === 0) {
        setOnlineUsers(1);
        setOnlineUsersList([currentUser]);
      }
    }
  }, [
    buildCurrentOnlineUser,
    hydratePresenceRoster,
    setOnlineUsers,
    setOnlineUsersList,
  ]);

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
    if (!user?.id || rosterChannelRef.current) {
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
        () => {
          void refreshPresenceRoster();
        }
      );

    rosterChannelRef.current = newChannel;
    setChannel(newChannel);

    newChannel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        void refreshPresenceRoster();
        return;
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(
          'Failed to subscribe user presence roster channel:',
          status
        );
      }
    });
  }, [cleanupRosterChannel, refreshPresenceRoster, setChannel, user?.id]);

  const cleanup = useCallback(async () => {
    await cleanupRosterChannel();
    setChannel(null);
    setOnlineUsers(0);
    setOnlineUsersList([]);
    setAllUsersList([]);
    setPortalImageUrls({});
  }, [
    cleanupRosterChannel,
    setAllUsersList,
    setChannel,
    setOnlineUsers,
    setOnlineUsersList,
    setPortalImageUrls,
  ]);

  useEffect(() => {
    if (!user) {
      void cleanup();
      return;
    }

    hasHandledPageExitRef.current = false;

    void syncUserPresenceState(true).finally(() => {
      void refreshPresenceRoster();
    });
    void setupPresenceRosterSubscription();

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || !user) {
        return;
      }

      hasHandledPageExitRef.current = false;
      void syncUserPresenceState(true).finally(() => {
        void refreshPresenceRoster();
      });
    };

    const handlePageExit = () => {
      if (!user || hasHandledPageExitRef.current) {
        return;
      }

      hasHandledPageExitRef.current = true;
      const eventTimestamp = new Date().toISOString();

      chatService.sendUserPresenceUpdateKeepalive(
        user.id,
        {
          is_online: false,
          last_seen: eventTimestamp,
          updated_at: eventTimestamp,
        },
        sessionTokenRef.current
      );

      void syncUserPresenceState(false, eventTimestamp);
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        handlePageExit();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handlePageExit);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handlePageExit);
      window.removeEventListener('pagehide', handlePageHide);
      void cleanup();
    };
  }, [
    cleanup,
    refreshPresenceRoster,
    setupPresenceRosterSubscription,
    syncUserPresenceState,
    user,
  ]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const heartbeat = setInterval(() => {
      void syncUserPresenceState(true).finally(() => {
        void refreshPresenceRoster();
      });
    }, PRESENCE_HEARTBEAT_MS);

    return () => clearInterval(heartbeat);
  }, [refreshPresenceRoster, syncUserPresenceState, user]);
};
