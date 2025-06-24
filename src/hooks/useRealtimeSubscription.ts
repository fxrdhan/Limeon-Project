import { useEffect, useRef, useCallback } from "react";
import { useQueryClient, QueryKey } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  RealtimePostgresChangesPayload,
  RealtimeChannel,
} from "@supabase/supabase-js";
import { useAlert } from "@/components/alert/hooks";
import { DeepDiffChange } from "@/types/realtime";

// Utility function untuk membuat diff seperti git
const createDetailedDiff = (
  oldRecord: Record<string, unknown> | null,
  newRecord: Record<string, unknown> | null,
  eventType: string,
): DeepDiffChange[] => {
  const changes: DeepDiffChange[] = [];

  // Handle incomplete old record (only has ID)
  const isIncompleteOldRecord =
    oldRecord &&
    Object.keys(oldRecord).length === 1 &&
    Object.prototype.hasOwnProperty.call(oldRecord, "id");

  if (eventType === "INSERT") {
    Object.entries(newRecord || {}).forEach(([key, value]) => {
      changes.push({
        type: "added",
        path: [key],
        value,
        oldValue: null,
      });
    });
  } else if (eventType === "DELETE") {
    Object.entries(oldRecord || {}).forEach(([key, value]) => {
      changes.push({
        type: "removed",
        path: [key],
        value: null,
        oldValue: value,
      });
    });
  } else if (eventType === "UPDATE") {
    if (isIncompleteOldRecord) {
      // Old record is incomplete, treat as partial update
      Object.entries(newRecord || {}).forEach(([key, value]) => {
        if (key !== "id") {
          changes.push({
            type: "modified",
            path: [key],
            value,
            oldValue: "🔒 [Hidden by RLS]",
          });
        }
      });
    } else {
      // Normal update with complete old record
      const allKeys = new Set([
        ...Object.keys(oldRecord || {}),
        ...Object.keys(newRecord || {}),
      ]);

      allKeys.forEach((key) => {
        const oldValue = oldRecord?.[key];
        const newValue = newRecord?.[key];

        if (oldValue !== newValue) {
          changes.push({
            type: "modified",
            path: [key],
            value: newValue,
            oldValue,
          });
        }
      });
    }
  }

  return changes;
};

// Format diff untuk display (seperti git diff)
const formatDiffForDisplay = (
  changes: DeepDiffChange[],
  eventType: string,
  tableName: string,
): string => {
  const lines = [
    `🔄 ${eventType} on table: ${tableName}`,
    `📅 ${new Date().toISOString()}`,
    "---",
  ];

  changes.forEach((change) => {
    const field = change.path.join(".");
    switch (change.type) {
      case "added":
        lines.push(`+ ${field}: ${JSON.stringify(change.value)}`);
        break;
      case "removed":
        lines.push(`- ${field}: ${JSON.stringify(change.oldValue)}`);
        break;
      case "modified":
        lines.push(`~ ${field}:`);
        lines.push(`  - ${JSON.stringify(change.oldValue)}`);
        lines.push(`  + ${JSON.stringify(change.value)}`);
        break;
    }
  });

  return lines.join("\n");
};

interface RealtimeSubscriptionOptions {
  enabled?: boolean;
  onRealtimeEvent?: (
    payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>,
    detailedDiff?: {
      changes: DeepDiffChange[];
      formatted: string;
      summary: string;
    },
  ) => void;
  debounceMs?: number;
  retryAttempts?: number;
  silentMode?: boolean;
  detailedLogging?: boolean;
  showDiffInConsole?: boolean;
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

export const useRealtimeSubscription = (
  tableName: string,
  queryKeyToInvalidate: QueryKey | null,
  options: RealtimeSubscriptionOptions = {},
) => {
  const {
    enabled = true,
    onRealtimeEvent,
    debounceMs = 300,
    retryAttempts = 3,
    silentMode = false,
  } = options;

  const queryClient = useQueryClient();
  const alert = useAlert();
  const isSubscribedRef = useRef(false);
  const retryCountRef = useRef(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const connectionReadyRef = useRef(false);

  // Unique hook instance ID
  const hookInstanceId = useRef(
    `${Math.random().toString(36).substr(2, 9)}_${Date.now()}`,
  );

  // Per instance event handled set
  const eventHandledRef = useRef<Set<string>>(new Set());

  // Create unique subscription key (include instance ID)
  const subscriptionKey = `${tableName}:${
    queryKeyToInvalidate
      ? Array.isArray(queryKeyToInvalidate)
        ? queryKeyToInvalidate.join("-")
        : String(queryKeyToInvalidate)
      : "callback"
  }:${hookInstanceId.current}`;

  const handleRealtimeEvent = useCallback(
    (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
      // Create unique event ID to prevent duplicates
      const eventId = `${payload.eventType}_${payload.commit_timestamp}_${JSON.stringify((payload.new as { id?: unknown })?.id || (payload.old as { id?: unknown })?.id)}`;

      // Skip if this exact event was already handled
      if (eventHandledRef.current.has(eventId)) {
        console.log(`🔄 Skipping duplicate event: ${eventId}`);
        return;
      }

      // Mark event as handled
      eventHandledRef.current.add(eventId);

      // Clean up old events (keep only last 10)
      if (eventHandledRef.current.size > 10) {
        const eventsArray = Array.from(eventHandledRef.current);
        eventHandledRef.current = new Set(eventsArray.slice(-10));
      }

      // Update last activity
      const subscription = subscriptionRegistry.get(subscriptionKey);
      if (subscription) {
        subscription.lastActivity = Date.now();
      }

      // Create detailed diff
      const changes = createDetailedDiff(
        payload.old,
        payload.new,
        payload.eventType,
      );

      const formattedDiff = formatDiffForDisplay(
        changes,
        payload.eventType,
        tableName,
      );

      const summary = `${payload.eventType}: ${changes.length} field(s) changed (Instance: ${hookInstanceId.current.substr(0, 6)})`;

      const detailedDiff = {
        changes,
        formatted: formattedDiff,
        summary,
      };

      // Console logging if enabled
      if (options.showDiffInConsole) {
        console.group(
          `📊 Database Change: ${tableName} (${hookInstanceId.current.substr(
            0,
            6,
          )})`,
        );
        console.log("Event Type:", payload.eventType);
        console.log("Event ID:", eventId);
        console.log("Table:", payload.table);
        console.log("Schema:", payload.schema);
        console.log("Timestamp:", payload.commit_timestamp);
        console.log(
          "Old Record Complete:",
          payload.old && Object.keys(payload.old).length > 1,
        );
        console.log("\n" + formattedDiff);
        if (payload.old) console.log("Old Record:", payload.old);
        if (payload.new) console.log("New Record:", payload.new);
        console.log("Changes Array:", changes);
        console.groupEnd();
      }

      // Detailed logging to file/service if enabled
      if (options.detailedLogging) {
        const logEntry = {
          timestamp: new Date().toISOString(),
          table: tableName,
          eventType: payload.eventType,
          changes,
          oldRecord: payload.old,
          newRecord: payload.new,
          commitTimestamp: payload.commit_timestamp,
        };

        // You can send this to logging service
        console.log("📝 Detailed Log Entry:", logEntry);
      }

      // Clear any existing debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Debounce the event handling
      debounceTimeoutRef.current = setTimeout(() => {
        try {
          if (onRealtimeEvent) {
            onRealtimeEvent(payload, detailedDiff);
          } else if (queryKeyToInvalidate) {
            if (!silentMode) {
              const tableNameFormatted = tableName
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase());
              alert.info(
                `${summary} - Data ${tableNameFormatted} telah diperbarui.`,
              );
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
      options.showDiffInConsole,
      options.detailedLogging,
    ],
  );

  const createSubscription = useCallback(() => {
    if (!enabled || isSubscribedRef.current) {
      console.log(
        `⏭️ Skipping subscription creation for ${subscriptionKey} - already subscribed or disabled`,
      );
      return;
    }

    // Check if subscription already exists
    const existingSubscription = subscriptionRegistry.get(subscriptionKey);

    if (existingSubscription && existingSubscription.isActive) {
      // Increment subscriber count
      existingSubscription.subscribers++;
      existingSubscription.lastActivity = Date.now();
      isSubscribedRef.current = true;
      connectionReadyRef.current = true;
      console.log(`♻️ Reusing existing subscription for ${subscriptionKey}`);
      return;
    }

    // Prevent duplicate creation attempts
    if (existingSubscription && !existingSubscription.isActive) {
      console.log(
        `⏳ Subscription creation already in progress for ${subscriptionKey}`,
      );
      return;
    }

    // Create new subscription
    const channelName = `realtime_${tableName}_${hookInstanceId.current}`;
    console.log(`🆕 Creating new subscription: ${channelName}`);

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: {
            self: false,
          },
          presence: {
            key: subscriptionKey,
          },
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
        console.log(
          `📡 Subscription status for ${tableName} (${hookInstanceId.current.substr(
            0,
            6,
          )}):`,
          status,
        );

        if (status === "SUBSCRIBED") {
          console.log(
            `✅ Successfully subscribed to ${tableName} realtime updates (${hookInstanceId.current.substr(
              0,
              6,
            )})`,
          );
          retryCountRef.current = 0;

          // Mark subscription as active
          if (subscription) {
            subscription.isActive = true;
            // Wait for channel to be fully ready before marking as subscribed
            setTimeout(() => {
              isSubscribedRef.current = true;
              connectionReadyRef.current = true;
              console.log(
                `🎯 ${tableName} subscription fully ready (${hookInstanceId.current.substr(
                  0,
                  6,
                )})`,
              );
            }, 100);
          }
        } else if (status === "CHANNEL_ERROR") {
          console.error(`Subscription error for ${tableName}:`, err);
          isSubscribedRef.current = false;
          connectionReadyRef.current = false;

          // Retry logic
          if (retryCountRef.current < retryAttempts) {
            retryCountRef.current++;
            console.log(
              `Retrying subscription for ${tableName} (attempt ${retryCountRef.current})`,
            );
            setTimeout(subscribe, 1000 + retryCountRef.current * 500);
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
          connectionReadyRef.current = false;
          if (subscription) {
            subscription.isActive = false;
          }
        } else if (status === "CLOSED") {
          console.log(`Subscription closed for ${tableName}`);
          isSubscribedRef.current = false;
          connectionReadyRef.current = false;
          subscriptionRegistry.delete(subscriptionKey);
        }
      });
    };

    subscribe();
  }, [
    enabled,
    subscriptionKey,
    tableName,
    handleRealtimeEvent,
    retryAttempts,
  ]);

  const cleanup = useCallback(() => {
    console.log(`🧹 Cleaning up subscription for ${subscriptionKey}`);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Clear event history
    eventHandledRef.current.clear();

    const subscription = subscriptionRegistry.get(subscriptionKey);
    if (subscription && isSubscribedRef.current) {
      subscription.subscribers--;
      console.log(
        `👥 Subscribers count for ${subscriptionKey}: ${subscription.subscribers}`,
      );

      // If no more subscribers, remove the channel
      if (subscription.subscribers <= 0) {
        try {
          supabase.removeChannel(subscription.channel);
          subscriptionRegistry.delete(subscriptionKey);
          console.log(`🗑️ Removed subscription for ${subscriptionKey}`);
        } catch (error) {
          console.warn(
            `Error removing subscription for ${subscriptionKey}:`,
            error,
          );
        }
      }
    }

    isSubscribedRef.current = false;
    connectionReadyRef.current = false;
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
    isConnectionReady: connectionReadyRef.current,
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
