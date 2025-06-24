import { useEffect, useRef, useCallback } from "react";
import { useQueryClient, QueryKey } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  RealtimePostgresChangesPayload,
  RealtimeChannel,
} from "@supabase/supabase-js";
import { useAlert } from "@/components/alert/hooks";

interface RealtimeSubscriptionOptions {
  enabled?: boolean;
  onRealtimeEvent?: (
    payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>,
  ) => void;
  debounceMs?: number;
  retryAttempts?: number;
  silentMode?: boolean;
}

// Global registry to prevent duplicate subscriptions
const subscriptionRegistry = new Map<
  string,
  {
    channel: RealtimeChannel;
    subscribers: number;
    lastActivity: number;
    isActive: boolean;
  }
>();

// Cleanup inactive subscriptions periodically
setInterval(() => {
  const now = Date.now();
  const staleThreshold = 30000; // 30 seconds

  for (const [key, subscription] of subscriptionRegistry.entries()) {
    if (
      subscription.subscribers <= 0 &&
      now - subscription.lastActivity > staleThreshold
    ) {
      console.log(`Cleaning up stale subscription: ${key}`);
      try {
        supabase.removeChannel(subscription.channel);
      } catch (error) {
        console.warn(`Error removing stale channel ${key}:`, error);
      } finally {
        subscriptionRegistry.delete(key);
      }
    }
  }
}, 30000); // Check every 30 seconds

export const useRealtimeSubscription = (
  tableName: string,
  queryKeyToInvalidate: QueryKey | null,
  options: RealtimeSubscriptionOptions = {},
) => {
  const {
    enabled = true,
    onRealtimeEvent,
    debounceMs = 1000,
    retryAttempts = 3,
    silentMode = false,
  } = options;

  const queryClient = useQueryClient();
  const alert = useAlert();
  const isSubscribedRef = useRef(false);
  const retryCountRef = useRef(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Create unique subscription key
  const subscriptionKey = `${tableName}:${
    queryKeyToInvalidate
      ? Array.isArray(queryKeyToInvalidate)
        ? queryKeyToInvalidate.join("-")
        : String(queryKeyToInvalidate)
      : "callback"
  }`;

  const handleRealtimeEvent = useCallback(
    (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
      // Update last activity
      const subscription = subscriptionRegistry.get(subscriptionKey);
      if (subscription) {
        subscription.lastActivity = Date.now();
      }

      // Clear any existing debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Debounce the event handling
      debounceTimeoutRef.current = setTimeout(() => {
        try {
          if (onRealtimeEvent) {
            onRealtimeEvent(payload);
          } else if (queryKeyToInvalidate) {
            if (!silentMode) {
              const tableNameFormatted = tableName
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase());
              alert.info(`Data ${tableNameFormatted} telah diperbarui.`);
            }

            queryClient.invalidateQueries({
              queryKey: Array.isArray(queryKeyToInvalidate)
                ? queryKeyToInvalidate
                : [queryKeyToInvalidate],
            });
          }
        } catch (error) {
          console.error(
            `Error processing realtime event for ${tableName}:`,
            error,
          );
        }
      }, debounceMs);
    },
    [
      tableName,
      queryKeyToInvalidate,
      onRealtimeEvent,
      queryClient,
      alert,
      debounceMs,
      silentMode,
      subscriptionKey,
    ],
  );

  const createSubscription = useCallback(() => {
    if (!enabled || isSubscribedRef.current) {
      return;
    }

    // Check if subscription already exists
    const existingSubscription = subscriptionRegistry.get(subscriptionKey);

    if (existingSubscription && existingSubscription.isActive) {
      // Increment subscriber count
      existingSubscription.subscribers++;
      existingSubscription.lastActivity = Date.now();
      isSubscribedRef.current = true;
      console.log(`Reusing existing subscription for ${subscriptionKey}`);
      return;
    }

    // Prevent multiple simultaneous subscription attempts
    if (existingSubscription && !existingSubscription.isActive) {
      console.log(`Subscription already in progress for ${subscriptionKey}`);
      return;
    }

    // Create new subscription
    const channelName = `realtime_${subscriptionKey}_${Date.now()}`;
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: {
            self: true,
          },
          presence: { key: subscriptionKey },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tableName,
        },
        handleRealtimeEvent,
      );

    // Reserve the subscription slot to prevent duplicates
    subscriptionRegistry.set(subscriptionKey, {
      channel,
      subscribers: 1,
      lastActivity: Date.now(),
      isActive: false,
    });

    // Subscribe with retry logic
    const subscribe = () => {
      channel.subscribe((status, err) => {
        const subscription = subscriptionRegistry.get(subscriptionKey);

        if (status === "SUBSCRIBED") {
          console.log(
            `Successfully subscribed to ${tableName} realtime updates`,
          );
          isSubscribedRef.current = true;
          retryCountRef.current = 0;

          // Mark subscription as active
          if (subscription) {
            subscription.isActive = true;
          }
        } else if (status === "CHANNEL_ERROR") {
          console.error(`Subscription error for ${tableName}:`, err);
          isSubscribedRef.current = false;

          // Retry logic
          if (retryCountRef.current < retryAttempts) {
            retryCountRef.current++;
            console.log(
              `Retrying subscription for ${tableName} (attempt ${retryCountRef.current})`,
            );
            setTimeout(subscribe, Math.pow(2, retryCountRef.current) * 1000); // Exponential backoff
          } else {
            console.error(
              `Max retry attempts reached for ${tableName} subscription`,
            );
            // Remove failed subscription
            subscriptionRegistry.delete(subscriptionKey);
          }
        } else if (status === "TIMED_OUT") {
          console.warn(`Subscription timed out for ${tableName}`);
          isSubscribedRef.current = false;
          if (subscription) {
            subscription.isActive = false;
          }
        } else if (status === "CLOSED") {
          console.log(`Subscription closed for ${tableName}`);
          isSubscribedRef.current = false;
          subscriptionRegistry.delete(subscriptionKey);
        }
      });
    };

    subscribe();
  }, [enabled, subscriptionKey, tableName, handleRealtimeEvent, retryAttempts]);

  const cleanup = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const subscription = subscriptionRegistry.get(subscriptionKey);
    if (subscription && isSubscribedRef.current) {
      subscription.subscribers--;

      // If no more subscribers, remove the channel
      if (subscription.subscribers <= 0) {
        setTimeout(() => {
          const currentSubscription = subscriptionRegistry.get(subscriptionKey);
          if (currentSubscription && currentSubscription.subscribers <= 0) {
            try {
              supabase.removeChannel(currentSubscription.channel);
              subscriptionRegistry.delete(subscriptionKey);
              console.log(`Removed subscription for ${subscriptionKey}`);
            } catch (error) {
              console.warn(
                `Error removing subscription for ${subscriptionKey}:`,
                error,
              );
            }
          }
        }, 1000); // Small delay to prevent race conditions
      }
    }

    isSubscribedRef.current = false;
  }, [subscriptionKey]);

  useEffect(() => {
    if (enabled) {
      createSubscription();
    }

    return cleanup;
  }, [enabled, createSubscription, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isSubscribed: isSubscribedRef.current,
    retryCount: retryCountRef.current,
  };
};

// Export cleanup function for manual cleanup if needed
export const cleanupAllRealtimeSubscriptions = () => {
  console.log("Cleaning up all realtime subscriptions...");

  for (const [key, subscription] of subscriptionRegistry.entries()) {
    try {
      supabase.removeChannel(subscription.channel);
    } catch (error) {
      console.warn(`Error removing channel ${key}:`, error);
    }
  }

  subscriptionRegistry.clear();
};

// Auto-cleanup on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", cleanupAllRealtimeSubscriptions);
}
