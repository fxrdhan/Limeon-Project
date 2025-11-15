import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useSmartFormSync } from './useSmartFormSync';

interface UseItemModalRealtimeProps {
  itemId?: string;
  enabled?: boolean;
  onItemUpdated?: (payload: unknown) => void;
  onItemDeleted?: () => void;
  onSmartUpdate?: (updates: Record<string, unknown>) => void;
}

/**
 * Realtime hook for specific item in modal
 * Listens to changes on the currently opened item
 */
export const useItemModalRealtime = ({
  itemId,
  enabled = true,
  onItemUpdated,
  onItemDeleted,
  onSmartUpdate,
}: UseItemModalRealtimeProps) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastUpdateRef = useRef<string>('');
  const [isConnected, setIsConnected] = useState(false);

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
    // Don't setup if no itemId or disabled
    if (!enabled || !itemId) {
      return;
    }

    console.log(`🔗 Setting up realtime for item: ${itemId}`);

    const channelName = `item-modal-${itemId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'items',
          event: 'UPDATE',
          filter: `id=eq.${itemId}`,
        },
        payload => {
          console.log('📝 Item updated:', payload);

          // Prevent processing same update multiple times
          const currentTimestamp = payload.commit_timestamp || '';
          if (currentTimestamp === lastUpdateRef.current) return;
          lastUpdateRef.current = currentTimestamp;

          // Use smart form sync to handle updates intelligently
          if (payload.new && payload.old) {
            // Extract only the changed fields
            const changedFields: Record<string, unknown> = {};
            Object.keys(payload.new).forEach(key => {
              if (payload.new[key] !== payload.old?.[key]) {
                changedFields[key] = payload.new[key];
              }
            });

            // Apply smart updates
            const result = smartFormSync.handleRealtimeUpdate(changedFields);

            console.log('🧠 Smart sync result:', {
              appliedImmediately: result.appliedImmediately,
              pendingConflicts: result.pendingConflicts,
            });
          }

          // Invalidate item queries for fresh data
          queryClient.invalidateQueries({
            queryKey: ['item', itemId],
          });

          // Call custom handler
          onItemUpdated?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'items',
          event: 'DELETE',
          filter: `id=eq.${itemId}`,
        },
        payload => {
          console.log('🗑️ Item deleted:', payload);

          toast.error('Item telah dihapus dari sumber lain', {
            duration: 5000,
            icon: '⚠️',
          });

          // Call custom handler (usually to close modal)
          onItemDeleted?.();
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Item realtime connected for: ${itemId}`);
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          console.log(`❌ Item realtime error for: ${itemId}`);
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log(`🔌 Disconnecting realtime for item: ${itemId}`);
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [
    itemId,
    enabled,
    queryClient,
    onItemUpdated,
    onItemDeleted,
    smartFormSync,
  ]);

  return {
    isConnected, // Use state instead of accessing ref during render
    smartFormSync, // Export smart form sync for field handlers
  };
};
