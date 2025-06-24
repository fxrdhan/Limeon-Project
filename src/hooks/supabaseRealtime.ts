import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { QueryKey } from "@tanstack/react-query";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { DeepDiffChange } from "@/types/realtime";

interface SupabaseRealtimeOptions {
  enabled?: boolean;
  onRealtimeEvent?: (
    payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>,
    detailedDiff?: {
      changes: DeepDiffChange[];
      formatted: string;
      summary: string;
    },
  ) => void;
  detailedLogging?: boolean;
  showDiffInConsole?: boolean;
}

export const useSupabaseRealtime = (
  tableName: string,
  queryKeyToInvalidate: QueryKey | null,
  options: SupabaseRealtimeOptions = {},
) => {
  const {
    enabled = true,
    onRealtimeEvent,
    detailedLogging = false,
    showDiffInConsole = true,
  } = options;

  // Use the improved realtime subscription hook
  const { isSubscribed, isConnectionReady, retryCount } =
    useRealtimeSubscription(tableName, queryKeyToInvalidate, {
      enabled,
      onRealtimeEvent,
      debounceMs: 300, // Even shorter debounce for immediate updates
      retryAttempts: 3,
      silentMode: false, // Keep showing notifications
      detailedLogging,
      showDiffInConsole,
    });

  return {
    isSubscribed,
    isConnectionReady,
    retryCount,
  };
};

// Export the cleanup function for compatibility
export { cleanupAllRealtimeSubscriptions } from "./useRealtimeSubscription";
