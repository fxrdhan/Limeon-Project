import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { QueryKey } from "@tanstack/react-query";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface SupabaseRealtimeOptions {
  enabled?: boolean;
  onRealtimeEvent?: (
    payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>,
  ) => void;
}

export const useSupabaseRealtime = (
  tableName: string,
  queryKeyToInvalidate: QueryKey | null,
  options: SupabaseRealtimeOptions = {},
) => {
  const { enabled = true, onRealtimeEvent } = options;

  // Use the improved realtime subscription hook
  const { isSubscribed, isConnectionReady, retryCount } =
    useRealtimeSubscription(tableName, queryKeyToInvalidate, {
      enabled,
      onRealtimeEvent,
      debounceMs: 300, // Even shorter debounce for immediate updates
      retryAttempts: 3,
      silentMode: false, // Keep showing notifications
    });

  return {
    isSubscribed,
    isConnectionReady,
    retryCount,
  };
};

// Export the cleanup function for compatibility
export { cleanupAllRealtimeSubscriptions } from "./useRealtimeSubscription";
