import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { usePresenceStore } from "@/store/presenceStore";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Helper function to count unique users from presence state
const countUniqueUsers = (presenceState: Record<string, unknown>) => {
  const uniqueUsers = new Set<string>();
  Object.values(presenceState).forEach((presence: unknown) => {
    if (Array.isArray(presence)) {
      presence.forEach((p: unknown) => {
        if (
          p &&
          typeof p === "object" &&
          "user_id" in p &&
          typeof p.user_id === "string"
        ) {
          uniqueUsers.add(p.user_id);
        }
      });
    }
  });
  const count = uniqueUsers.size;
  return count;
};

export const usePresence = () => {
  const { user } = useAuthStore();
  const { setChannel, setOnlineUsers } = usePresenceStore();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSetupRef = useRef(false);
  const isConnectedRef = useRef(false);
  const isSubscribedRef = useRef(false);
  const setupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLoggedCount = useRef<number>(-1);
  const lastEventType = useRef<string>("");

  const logPresenceUpdate = (
    eventType: string,
    userCount: number,
    userIds: string[],
  ) => {
    // Only log if count changed or event type is different
    if (
      userCount !== lastLoggedCount.current ||
      eventType !== lastEventType.current
    ) {
      console.log(
        `🟢 Presence ${eventType}: ${userCount} users online`,
        userIds.length <= 3 ? userIds : `[${userIds.length} users]`,
      );
      lastLoggedCount.current = userCount;
      lastEventType.current = eventType;
    }
  };

  const cleanupChannel = useCallback(async () => {
    const currentChannel = channelRef.current;
    const wasConnected = isConnectedRef.current;

    if (currentChannel) {
      // Set to null immediately to prevent double cleanup
      channelRef.current = null;
      isConnectedRef.current = false;
      isSubscribedRef.current = false;

      try {
        // Only unsubscribe if channel was connected
        if (wasConnected) {
          currentChannel.unsubscribe();
        }
        // Add a small delay to allow WebSocket to close properly
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Additional null check before removing channel
        if (currentChannel && supabase) {
          await supabase.removeChannel(currentChannel);
        }
      } catch (cleanupError) {
        // Silently handle cleanup errors - they're expected during rapid cleanup cycles
        if (
          (cleanupError as Error)?.message?.includes("channel is null") ||
          (cleanupError as Error)?.message?.includes(
            "Cannot read properties of null",
          ) ||
          (cleanupError as Error)?.message?.includes(
            "tried to subscribe multiple times",
          )
        ) {
          // Expected error during React Strict Mode - ignore it
          return;
        }
        console.warn("Channel cleanup warning:", cleanupError);
      }
    }
  }, []);

  const setupPresence = useCallback(async () => {
    if (!user || isSetupRef.current || isSubscribedRef.current) return;

    // Clear any pending setup timeout
    if (setupTimeoutRef.current) {
      clearTimeout(setupTimeoutRef.current);
      setupTimeoutRef.current = null;
    }

    try {
      // Cleanup any existing channel first
      await cleanupChannel();

      const presenceKey = `${user.id}:${Date.now()}`;

      const newChannel = supabase.channel("browser-active", {
        config: {
          presence: {
            key: presenceKey,
          },
        },
      });

      // Set up event handlers before subscribing
      newChannel
        .on("presence", { event: "sync" }, () => {
          if (!isConnectedRef.current) return;
          const presenceState = newChannel.presenceState();
          const userCount = countUniqueUsers(presenceState);
          const userIds = Array.from(
            new Set(
              Object.values(presenceState)
                .flat()
                .map((p: unknown) => (p as { user_id?: string })?.user_id)
                .filter((id): id is string => Boolean(id)),
            ),
          );
          logPresenceUpdate("sync", userCount, userIds);
          setOnlineUsers(userCount);
        })
        .on("presence", { event: "join" }, () => {
          if (!isConnectedRef.current) return;
          const presenceState = newChannel.presenceState();
          const userCount = countUniqueUsers(presenceState);
          const userIds = Array.from(
            new Set(
              Object.values(presenceState)
                .flat()
                .map((p: unknown) => (p as { user_id?: string })?.user_id)
                .filter((id): id is string => Boolean(id)),
            ),
          );
          logPresenceUpdate("join", userCount, userIds);
          setOnlineUsers(userCount);
        })
        .on("presence", { event: "leave" }, () => {
          if (!isConnectedRef.current) return;
          const presenceState = newChannel.presenceState();
          const userCount = countUniqueUsers(presenceState);
          const userIds = Array.from(
            new Set(
              Object.values(presenceState)
                .flat()
                .map((p: unknown) => (p as { user_id?: string })?.user_id)
                .filter((id): id is string => Boolean(id)),
            ),
          );
          logPresenceUpdate("leave", userCount, userIds);
          setOnlineUsers(userCount);
        });

      // Mark as subscribed before calling subscribe to prevent multiple calls
      isSubscribedRef.current = true;
      channelRef.current = newChannel;
      setChannel(newChannel);

      newChannel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          isConnectedRef.current = true;
          try {
            console.log(
              "🔵 Connected to presence channel, tracking user:",
              user.id,
            );
            await newChannel.track({
              online_at: new Date().toISOString(),
              user_id: user.id,
            });

            // Set initial count to 1 (current user) if no presence state yet
            setTimeout(() => {
              if (!isConnectedRef.current) return;
              const presenceState = newChannel.presenceState();
              const userCount = countUniqueUsers(presenceState);
              if (userCount === 0) {
                setOnlineUsers(1);
                console.log("🟡 No presence state detected, setting to 1 user");
              } else {
                setOnlineUsers(userCount);
              }
            }, 100);
          } catch (trackError) {
            console.error("Failed to track presence:", trackError);
            setOnlineUsers(1);
          }
        } else if (status === "CHANNEL_ERROR") {
          console.error("🔴 Presence channel error");
          isConnectedRef.current = false;
          isSubscribedRef.current = false;
          setOnlineUsers(1);
        } else if (status === "TIMED_OUT") {
          console.error("🔴 Presence channel timed out");
          isConnectedRef.current = false;
          isSubscribedRef.current = false;
          setOnlineUsers(1);
        } else if (status === "CLOSED") {
          console.log("🔴 Presence channel closed");
          isConnectedRef.current = false;
          isSubscribedRef.current = false;
        }
      });

      isSetupRef.current = true;
    } catch (error) {
      console.error("Failed to setup presence:", error);
      isConnectedRef.current = false;
      isSubscribedRef.current = false;
      // Set to 1 as fallback (current user)
      setOnlineUsers(1);
    }
  }, [user, setChannel, setOnlineUsers, cleanupChannel]);

  const cleanup = useCallback(async () => {
    await cleanupChannel();
    setChannel(null);
    setOnlineUsers(0);
    isSetupRef.current = false;
    isSubscribedRef.current = false;
  }, [cleanupChannel, setChannel, setOnlineUsers]);

  useEffect(() => {
    if (user) {
      // Debounce setup to prevent rapid calls
      if (setupTimeoutRef.current) {
        clearTimeout(setupTimeoutRef.current);
      }
      setupTimeoutRef.current = setTimeout(() => {
        setupPresence();
      }, 100);
    } else {
      cleanup();
    }

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user) {
        // Always try to re-establish presence when page becomes visible
        if (!isConnectedRef.current) {
          console.log("🔄 Page became visible, re-establishing presence");
          isSetupRef.current = false;
          setupPresence();
        } else if (channelRef.current) {
          // Re-track presence immediately when page becomes visible
          try {
            channelRef.current.track({
              online_at: new Date().toISOString(),
              user_id: user.id,
            });
          } catch (error) {
            console.warn("Failed to re-track presence on visibility change:", error);
          }
        }
      }
    };

    // Handle beforeunload to ensure cleanup
    const handleBeforeUnload = () => {
      const currentChannel = channelRef.current;
      if (currentChannel && isConnectedRef.current) {
        try {
          currentChannel.unsubscribe();
          isConnectedRef.current = false;
          isSubscribedRef.current = false;
        } catch {
          // Ignore errors during unload - expected in some scenarios
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Clear any pending setup timeout
      if (setupTimeoutRef.current) {
        clearTimeout(setupTimeoutRef.current);
        setupTimeoutRef.current = null;
      }

      // Use a timeout to prevent cleanup conflicts in React Strict Mode
      setTimeout(() => {
        cleanup();
      }, 0);
    };
  }, [user, setupPresence, cleanup]);

  // Heartbeat to maintain presence
  useEffect(() => {
    if (!user || !channelRef.current || !isConnectedRef.current) return;

    const heartbeat = setInterval(() => {
      if (channelRef.current && isConnectedRef.current) {
        try {
          channelRef.current.track({
            online_at: new Date().toISOString(),
            user_id: user.id,
          });
        } catch (heartbeatError) {
          console.warn("Failed to update presence heartbeat:", heartbeatError);
        }
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(heartbeat);
  }, [user]);
};
