import { usePresenceStore } from "@/store/presenceStore";
import { useRealtimeChannelRecovery } from "@/hooks/realtime/useRealtimeChannelRecovery";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef } from "react";
import { realtimeService } from "@/services/realtime/realtime.service";
import type { OnlineUser } from "@/types";

interface PresenceRosterUser {
  id: string;
  name: string;
  email: string;
  profilephoto?: string | null;
  profilephoto_thumb?: string | null;
}

interface BrowserActivePresencePayload {
  user_id: string;
  name: string;
  email: string;
  profilephoto: string | null;
  profilephoto_thumb?: string | null;
  online_at: string;
}

const BROWSER_ACTIVE_PRESENCE_CHANNEL = "browser-active";

const sortOnlineUsers = (users: OnlineUser[]) =>
  [...users].sort((leftUser, rightUser) =>
    (leftUser.name || leftUser.email || leftUser.id).localeCompare(
      rightUser.name || rightUser.email || rightUser.id,
    ),
  );

const getPresenceTimestamp = (presence: Partial<BrowserActivePresencePayload>) =>
  new Date(presence.online_at ?? new Date().toISOString()).getTime();

const selectLatestPresence = (
  presences: BrowserActivePresencePayload[],
): BrowserActivePresencePayload | null => {
  if (presences.length === 0) {
    return null;
  }

  return presences.reduce((latestPresence, currentPresence) =>
    getPresenceTimestamp(currentPresence) >= getPresenceTimestamp(latestPresence)
      ? currentPresence
      : latestPresence,
  );
};

export const usePresenceRosterSync = ({ user }: { user: PresenceRosterUser | null }) => {
  const { setHasRosterChannel, setOnlineUsers, setOnlineUsersList } = usePresenceStore();
  const rosterChannelRef = useRef<RealtimeChannel | null>(null);
  const setupGenerationRef = useRef(0);
  const { recoveryTick, scheduleRecovery, markRecoverySuccess } = useRealtimeChannelRecovery();

  const buildCurrentOnlineUser = useCallback((): OnlineUser | null => {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      profilephoto: user.profilephoto ?? null,
      profilephoto_thumb: user.profilephoto_thumb ?? null,
      online_at: new Date().toISOString(),
    };
  }, [user]);

  const applyOnlineRoster = useCallback(
    (nextUsers: OnlineUser[]) => {
      const sortedUsers = sortOnlineUsers(nextUsers);
      setOnlineUsers(sortedUsers.length);
      setOnlineUsersList(sortedUsers);
    },
    [setOnlineUsers, setOnlineUsersList],
  );

  const hydrateRosterFromPresenceState = useCallback(
    (channel: RealtimeChannel) => {
      const currentUser = buildCurrentOnlineUser();
      const presenceState = channel.presenceState<BrowserActivePresencePayload>();

      const nextUsers = Object.entries(presenceState)
        .map(([presenceKey, presences]) => {
          const latestPresence = selectLatestPresence(presences);
          return latestPresence?.user_id === presenceKey ? latestPresence : null;
        })
        .filter((presence): presence is BrowserActivePresencePayload => Boolean(presence))
        .map<OnlineUser>((presence) => ({
          id: presence.user_id,
          name: presence.name,
          email: presence.email,
          profilephoto: presence.profilephoto ?? null,
          profilephoto_thumb: presence.profilephoto_thumb ?? null,
          online_at: presence.online_at,
        }));

      if (currentUser && !nextUsers.some((onlineUser) => onlineUser.id === user?.id)) {
        nextUsers.push(currentUser);
      }

      applyOnlineRoster(nextUsers);
    },
    [applyOnlineRoster, buildCurrentOnlineUser, user?.id],
  );

  const cleanupRosterChannel = useCallback(async () => {
    const currentChannel = rosterChannelRef.current;

    if (!currentChannel) {
      return;
    }

    rosterChannelRef.current = null;

    try {
      void currentChannel.untrack();
      await realtimeService.removeChannel(currentChannel);
    } catch (cleanupError) {
      console.warn("Presence roster channel cleanup warning:", cleanupError);
    }
  }, []);

  const resetPresenceState = useCallback(async () => {
    setupGenerationRef.current += 1;
    await cleanupRosterChannel();
    markRecoverySuccess();
    setHasRosterChannel(false);
    setOnlineUsers(0);
    setOnlineUsersList([]);
  }, [
    cleanupRosterChannel,
    markRecoverySuccess,
    setHasRosterChannel,
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
        profilephoto_thumb: currentUser.profilephoto_thumb ?? null,
        online_at: currentUser.online_at,
      });

      if (trackStatus !== "ok") {
        throw new Error(`Failed to track browser presence: ${trackStatus}`);
      }

      hydrateRosterFromPresenceState(channel);
    },
    [buildCurrentOnlineUser, hydrateRosterFromPresenceState],
  );

  const setupPresenceRosterSubscription = useCallback(
    async (setupGeneration: number) => {
      if (!user?.id) {
        return;
      }

      try {
        await cleanupRosterChannel();

        if (setupGenerationRef.current !== setupGeneration) {
          return;
        }

        const newChannel = await realtimeService.replaceChannel(BROWSER_ACTIVE_PRESENCE_CHANNEL, {
          config: {
            presence: {
              key: user.id,
            },
          },
        });

        if (setupGenerationRef.current !== setupGeneration) {
          return;
        }

        newChannel
          .on("presence", { event: "sync" }, () => {
            hydrateRosterFromPresenceState(newChannel);
          })
          .on("presence", { event: "join" }, () => {
            hydrateRosterFromPresenceState(newChannel);
          })
          .on("presence", { event: "leave" }, () => {
            hydrateRosterFromPresenceState(newChannel);
          });

        rosterChannelRef.current = newChannel;
        setHasRosterChannel(true);

        newChannel.subscribe((status) => {
          if (setupGenerationRef.current !== setupGeneration) {
            return;
          }

          if (status === "SUBSCRIBED") {
            void (async () => {
              try {
                await trackCurrentUserPresence(newChannel);
                markRecoverySuccess();
              } catch (trackingError) {
                console.error(
                  "Failed to track browser active presence after subscribe:",
                  trackingError,
                );
                if (rosterChannelRef.current === newChannel) {
                  rosterChannelRef.current = null;
                  setHasRosterChannel(false);
                  applyOnlineRoster([]);
                  void realtimeService.removeChannel(newChannel);
                }
                void scheduleRecovery();
              }
            })();
            return;
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error("Failed to subscribe browser active presence channel:", status);
            if (rosterChannelRef.current === newChannel) {
              rosterChannelRef.current = null;
              setHasRosterChannel(false);
              applyOnlineRoster([]);
              void realtimeService.removeChannel(newChannel);
            }
            void scheduleRecovery();
          }
        });
      } catch (setupError) {
        if (setupGenerationRef.current !== setupGeneration) {
          return;
        }

        console.error("Failed to setup browser active presence channel:", setupError);
        rosterChannelRef.current = null;
        setHasRosterChannel(false);
        applyOnlineRoster([]);
        void scheduleRecovery();
      }
    },
    [
      applyOnlineRoster,
      cleanupRosterChannel,
      hydrateRosterFromPresenceState,
      markRecoverySuccess,
      scheduleRecovery,
      setHasRosterChannel,
      trackCurrentUserPresence,
      user?.id,
    ],
  );

  useEffect(() => {
    if (!user) {
      void resetPresenceState();
    }
  }, [resetPresenceState, user]);

  useEffect(
    () => () => {
      void resetPresenceState();
    },
    [resetPresenceState],
  );

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const setupGeneration = ++setupGenerationRef.current;
    void setupPresenceRosterSubscription(setupGeneration);

    return () => {
      setupGenerationRef.current += 1;
      void cleanupRosterChannel();
      setHasRosterChannel(false);
    };
  }, [
    cleanupRosterChannel,
    recoveryTick,
    setHasRosterChannel,
    setupPresenceRosterSubscription,
    user?.email,
    user?.id,
    user?.name,
    user?.profilephoto,
    user?.profilephoto_thumb,
  ]);
};
