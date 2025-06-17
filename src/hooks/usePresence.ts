import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { usePresenceStore } from "@/store/presenceStore";
import type { RealtimeChannel } from "@supabase/supabase-js";

export const usePresence = () => {
  const { user } = useAuthStore();
  const { setChannel, setOnlineUsers } = usePresenceStore();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSetupRef = useRef(false);

  const setupPresence = useCallback(async () => {
    if (!user || isSetupRef.current) return;

    try {
      // Cleanup any existing channel first
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const presenceKey = `${user.id}:${Date.now()}`;

      const newChannel = supabase.channel("browser-active", {
        config: {
          presence: {
            key: presenceKey,
          },
        },
      });

      newChannel
        .on("presence", { event: "sync" }, () => {
          const presenceState = newChannel.presenceState();
          const userCount = Object.keys(presenceState).length;
          setOnlineUsers(userCount);
        })
        .on("presence", { event: "join" }, () => {
          const presenceState = newChannel.presenceState();
          const userCount = Object.keys(presenceState).length;
          setOnlineUsers(userCount);
        })
        .on("presence", { event: "leave" }, () => {
          const presenceState = newChannel.presenceState();
          const userCount = Object.keys(presenceState).length;
          setOnlineUsers(userCount);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await newChannel.track({
              online_at: new Date().toISOString(),
              user_id: user.id,
            });

            // Set initial count to 1 (current user) if no presence state yet
            setTimeout(() => {
              const presenceState = newChannel.presenceState();
              const userCount = Object.keys(presenceState).length;
              if (userCount === 0) {
                setOnlineUsers(1);
              } else {
                setOnlineUsers(userCount);
              }
            }, 100);
          }
        });

      channelRef.current = newChannel;
      setChannel(newChannel);
      isSetupRef.current = true;
    } catch (error) {
      console.error("Failed to setup presence:", error);
      // Set to 1 as fallback (current user)
      setOnlineUsers(1);
    }
  }, [user, setChannel, setOnlineUsers]);

  const cleanup = useCallback(async () => {
    if (channelRef.current) {
      try {
        await supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.error("Failed to cleanup presence channel:", error);
      }
      channelRef.current = null;
      setChannel(null);
      setOnlineUsers(0);
    }
    isSetupRef.current = false;
  }, [setChannel, setOnlineUsers]);

  useEffect(() => {
    if (user) {
      setupPresence();
    } else {
      cleanup();
    }

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        user &&
        !isSetupRef.current
      ) {
        setupPresence();
      }
    };

    // Handle beforeunload to ensure cleanup
    const handleBeforeUnload = () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      cleanup();
    };
  }, [user, setupPresence, cleanup]);

  // Heartbeat to maintain presence
  useEffect(() => {
    if (!user || !channelRef.current) return;

    const heartbeat = setInterval(() => {
      if (channelRef.current && document.visibilityState === "visible") {
        channelRef.current.track({
          online_at: new Date().toISOString(),
          user_id: user.id,
        });
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(heartbeat);
  }, [user]);
};
