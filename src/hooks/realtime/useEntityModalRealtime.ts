import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useSmartFormSync } from './useSmartFormSync';

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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastUpdateRef = useRef<string>('');

  // Memoize callback to prevent useSmartFormSync from recreating functions
  const handleDataUpdate = useCallback(
    (updates: Record<string, unknown>) => {
      onSmartUpdate?.(updates);
    },
    [onSmartUpdate]
  );

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

    console.log(
      `🔗 Setting up realtime for entity: ${entityTable}/${entityId}`
    );

    const channelName = `entity-modal-${entityTable}-${entityId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: entityTable,
          event: 'UPDATE',
          filter: `id=eq.${entityId}`,
        },
        payload => {
          console.log('📝 Entity updated:', payload);

          // ANTI-LOOP #1: Prevent processing same update multiple times
          const currentTimestamp = payload.commit_timestamp || '';
          if (currentTimestamp === lastUpdateRef.current) {
            console.log('⏭️ Skipping duplicate update (same timestamp)');
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
              console.log('⏭️ Skipping update (no changed fields)');
              return;
            }

            // ANTI-LOOP #3: Apply smart updates (respects active fields)
            const result = smartFormSync.handleRealtimeUpdate(changedFields);

            console.log('🧠 Smart sync result:', {
              appliedImmediately: result.appliedImmediately,
              pendingConflicts: result.pendingConflicts,
            });
          }

          // Invalidate queries for fresh data in lists
          queryClient.invalidateQueries({
            queryKey: [entityTable],
          });

          // Call custom handler
          onEntityUpdated?.(payload);
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
        payload => {
          console.log('🗑️ Entity deleted:', payload);

          toast.error('Data telah dihapus dari sumber lain', {
            duration: 5000,
            icon: '⚠️',
          });

          // Call custom handler (usually to close modal)
          onEntityDeleted?.();
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          console.log(
            `✅ Entity realtime connected for: ${entityTable}/${entityId}`
          );
        } else if (status === 'CHANNEL_ERROR') {
          console.log(
            `❌ Entity realtime error for: ${entityTable}/${entityId}`
          );
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log(
          `🔌 Disconnecting realtime for entity: ${entityTable}/${entityId}`
        );
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [
    entityId,
    entityTable,
    enabled,
    queryClient,
    onEntityUpdated,
    onEntityDeleted,
    smartFormSync,
  ]);

  return {
    isConnected: !!channelRef.current,
    smartFormSync, // Export smart form sync for field handlers
  };
};
