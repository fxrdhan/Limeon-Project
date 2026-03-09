import { usePresenceStore } from '@/store/presenceStore';
import { useRealtimeChannelRecovery } from '@/hooks/realtime/useRealtimeChannelRecovery';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef } from 'react';
import { realtimeService } from '@/services/realtime/realtime.service';
import type { OnlineUser } from '@/types';

interface PresenceRosterUser {
  id: string;
  name: string;
  email: string;
  profilephoto?: string | null;
}

interface BrowserActivePresencePayload {
  user_id: string;
  name: string;
  email: string;
  profilephoto: string | null;
  online_at: string;
}

const sortOnlineUsers = (users: OnlineUser[]) =>
  [...users].sort((leftUser, rightUser) =>
    (leftUser.name || leftUser.email || leftUser.id).localeCompare(
      rightUser.name || rightUser.email || rightUser.id
    )
  );

const getPresenceTimestamp = (
  presence: Partial<BrowserActivePresencePayload>
) => new Date(presence.online_at ?? new Date().toISOString()).getTime();

const selectLatestPresence = (
  presences: BrowserActivePresencePayload[]
): BrowserActivePresencePayload | null => {
  if (presences.length === 0) {
    return null;
  }

  return presences.reduce((latestPresence, currentPresence) =>
    getPresenceTimestamp(currentPresence) >=
    getPresenceTimestamp(latestPresence)
      ? currentPresence
      : latestPresence
  );
};

export const usePresenceRosterSync = ({
  user,
}: {
  user: PresenceRosterUser | null;
}) => {
  const { setChannel, setOnlineUsers, setOnlineUsersList } = usePresenceStore();
  const rosterChannelRef = useRef<RealtimeChannel | null>(null);
  const { recoveryTick, scheduleRecovery, markRecoverySuccess } =
    useRealtimeChannelRecovery();

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
      const sortedUsers = sortOnlineUsers(nextUsers);
      setOnlineUsers(sortedUsers.length);
      setOnlineUsersList(sortedUsers);
    },
    [setOnlineUsers, setOnlineUsersList]
  );

  const hydrateRosterFromPresenceState = useCallback(
    (channel: RealtimeChannel) => {
      const currentUser = buildCurrentOnlineUser();
      const presenceState =
        channel.presenceState<BrowserActivePresencePayload>();

      const nextUsers = Object.values(presenceState)
        .map(selectLatestPresence)
        .filter((presence): presence is BrowserActivePresencePayload =>
          Boolean(presence)
        )
        .map<OnlineUser>(presence => ({
          id: presence.user_id,
          name: presence.name,
          email: presence.email,
          profilephoto: presence.profilephoto ?? null,
          online_at: presence.online_at,
        }));

      if (
        currentUser &&
        !nextUsers.some(onlineUser => onlineUser.id === user?.id)
      ) {
        nextUsers.push(currentUser);
      }

      applyOnlineRoster(nextUsers);
    },
    [applyOnlineRoster, buildCurrentOnlineUser, user?.id]
  );

  const cleanupRosterChannel = useCallback(async () => {
    const currentChannel = rosterChannelRef.current;

    if (!currentChannel) {
      return;
    }

    rosterChannelRef.current = null;

    try {
      void currentChannel.untrack();
      void currentChannel.unsubscribe();
      await realtimeService.removeChannel(currentChannel);
    } catch (cleanupError) {
      console.warn('Presence roster channel cleanup warning:', cleanupError);
    }
  }, []);

  const resetPresenceState = useCallback(async () => {
    await cleanupRosterChannel();
    markRecoverySuccess();
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

  const trackCurrentUserPresence = useCallback(
    async (channel: RealtimeChannel) => {
      const currentUser = buildCurrentOnlineUser();
      if (!currentUser) {
        return;
      }

      const trackStatus = await channel.track({
        user_id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        profilephoto: currentUser.profilephoto ?? null,
        online_at: currentUser.online_at,
      });

      if (trackStatus !== 'ok') {
        throw new Error(`Failed to track browser presence: ${trackStatus}`);
      }

      hydrateRosterFromPresenceState(channel);
    },
    [buildCurrentOnlineUser, hydrateRosterFromPresenceState]
  );

  const setupPresenceRosterSubscription = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    await cleanupRosterChannel();

    const newChannel = realtimeService
      .createChannel('browser-active', {
        config: {
          presence: {
            key: user.id,
          },
        },
      })
      .on('presence', { event: 'sync' }, () => {
        hydrateRosterFromPresenceState(newChannel);
      })
      .on('presence', { event: 'join' }, () => {
        hydrateRosterFromPresenceState(newChannel);
      })
      .on('presence', { event: 'leave' }, () => {
        hydrateRosterFromPresenceState(newChannel);
      });

    rosterChannelRef.current = newChannel;
    setChannel(newChannel);

    newChannel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        markRecoverySuccess();
        void trackCurrentUserPresence(newChannel);
        return;
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(
          'Failed to subscribe browser active presence channel:',
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
    hydrateRosterFromPresenceState,
    markRecoverySuccess,
    scheduleRecovery,
    setChannel,
    trackCurrentUserPresence,
    user?.id,
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
    user?.email,
    user?.id,
    user?.name,
    user?.profilephoto,
  ]);
};
