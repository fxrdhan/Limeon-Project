import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useSmartFormSync } from './useSmartFormSync';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { realtimeService } from '@/services/realtime/realtime.service';

interface UseEntityModalRealtimeProps {
  entityTable: string;
  entityId?: string;
  enabled?: boolean;
  onEntityUpdated?: (payload: unknown) => void;
  onEntityDeleted?: () => void;
  onSmartUpdate?: (updates: Record<string, unknown>) => void;
}

/**
 * Realtime hook for specific entity in modal (kategori, jenis item, kemasan, etc)
 * Listens to changes on the currently opened entity
 *
 * Anti-loop mechanisms:
 * 1. Timestamp deduplication (commit_timestamp)
 * 2. Change detection (only update changed fields)
 * 3. Smart field protection (via useSmartFormSync)
 */
export const useEntityModalRealtime = ({
  entityTable,
  entityId,
  enabled = true,
  onEntityUpdated,
  onEntityDeleted,
  onSmartUpdate,
}: UseEntityModalRealtimeProps) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastUpdateRef = useRef<string>('');

  // Use refs to store latest callbacks without triggering effect re-runs
  const onSmartUpdateRef = useRef(onSmartUpdate);
  const onEntityUpdatedRef = useRef(onEntityUpdated);
  const onEntityDeletedRef = useRef(onEntityDeleted);

  // Update refs when callbacks change (no effect re-run, just ref update)
  onSmartUpdateRef.current = onSmartUpdate;
  onEntityUpdatedRef.current = onEntityUpdated;
  onEntityDeletedRef.current = onEntityDeleted;

  // Stable callback that uses ref internally - never recreates
  const handleDataUpdate = useCallback((updates: Record<string, unknown>) => {
    onSmartUpdateRef.current?.(updates);
  }, []); // Empty deps - uses ref which always has latest callback

  // Smart form sync for handling field conflicts
  const smartFormSync = useSmartFormSync({
    onDataUpdate: handleDataUpdate,
    showConflictNotification: true,
  });

  useEffect(() => {
    // Don't setup if no entityId, no table, or disabled
    if (!enabled || !entityId || !entityTable) {
      return;
    }

    const channelName = `entity-modal-${entityTable}-${entityId}`;

    const channel = realtimeService
      .createChannel(channelName)
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: entityTable,
          event: 'UPDATE',
          filter: `id=eq.${entityId}`,
        },
        payload => {
          // ANTI-LOOP #1: Prevent processing same update multiple times
          const currentTimestamp = payload.commit_timestamp || '';
          if (currentTimestamp === lastUpdateRef.current) {
            return;
          }
          lastUpdateRef.current = currentTimestamp;

          // ANTI-LOOP #2: Use smart form sync to handle updates intelligently
          if (payload.new && payload.old) {
            // Extract only the changed fields
            const changedFields: Record<string, unknown> = {};
            Object.keys(payload.new).forEach(key => {
              if (payload.new[key] !== payload.old?.[key]) {
                changedFields[key] = payload.new[key];
              }
            });

            // Skip if no actual changes (additional safety)
            if (Object.keys(changedFields).length === 0) {
              return;
            }

            // ANTI-LOOP #3: Apply smart updates (respects active fields)
            smartFormSync.handleRealtimeUpdate(changedFields);
          }

          // Invalidate queries for fresh data in lists
          queryClient.invalidateQueries({
            queryKey: [entityTable],
          });

          // Call custom handler using ref (always latest callback)
          onEntityUpdatedRef.current?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: entityTable,
          event: 'DELETE',
          filter: `id=eq.${entityId}`,
        },
        () => {
          toast.error('Data telah dihapus dari sumber lain', {
            duration: 5000,
            icon: '⚠️',
          });

          // Call custom handler using ref (always latest callback)
          onEntityDeletedRef.current?.();
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          // Connected
        } else if (status === 'CHANNEL_ERROR') {
          // Error
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        realtimeService.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // Effect only re-runs when these essential properties change:
    // - entityId, entityTable, enabled: Core subscription parameters
    // - queryClient: Stable singleton from React Query
    // Explicitly excluded to prevent reconnection cycles:
    // - smartFormSync: Stable object (methods are stable via useCallback)
    // - onEntityUpdated, onEntityDeleted, onSmartUpdate: Handled via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, entityTable, enabled, queryClient]);

  return {
    isConnected: !!channelRef.current,
    smartFormSync, // Export smart form sync for field handlers
  };
};
