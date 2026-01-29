import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useSmartFormSync } from './useSmartFormSync';
import { logger } from '@/utils/logger';
import type { CustomerLevelDiscount } from '@/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { realtimeService } from '@/services/realtime/realtime.service';
import { itemDataService } from '@/features/item-management/infrastructure/itemData.service';
import { QueryKeys } from '@/constants/queryKeys';

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
  const channelRef = useRef<RealtimeChannel | null>(null);
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

    const channelName = `item-modal-${itemId}`;
    logger.debug('Realtime subscription starting', {
      component: 'useItemModalRealtime',
      itemId,
      channel: channelName,
    });

    const channel = realtimeService
      .createChannel(channelName)
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'items',
          event: 'UPDATE',
          filter: `id=eq.${itemId}`,
        },
        payload => {
          // Prevent processing same update multiple times
          const currentTimestamp = payload.commit_timestamp || '';
          if (currentTimestamp === lastUpdateRef.current) return;
          lastUpdateRef.current = currentTimestamp;

          // Use smart form sync to handle updates intelligently
          if (payload.new && payload.old) {
            // Extract only the changed fields
            const changedFields: Record<string, unknown> = {};
            const isJsonEqual = (nextValue: unknown, prevValue: unknown) => {
              if (nextValue === prevValue) return true;
              if (!nextValue || !prevValue) return false;

              const normalizeJson = (value: unknown) => {
                if (typeof value !== 'string') return value;
                try {
                  return JSON.parse(value) as unknown;
                } catch {
                  return value;
                }
              };

              const normalizedNext = normalizeJson(nextValue);
              const normalizedPrev = normalizeJson(prevValue);
              if (normalizedNext === normalizedPrev) return true;
              if (
                typeof normalizedNext !== 'object' ||
                typeof normalizedPrev !== 'object'
              ) {
                return false;
              }

              try {
                return (
                  JSON.stringify(normalizedNext) ===
                  JSON.stringify(normalizedPrev)
                );
              } catch {
                return false;
              }
            };

            Object.keys(payload.new).forEach(key => {
              const nextValue = payload.new[key];
              const prevValue = payload.old?.[key];

              if (
                key === 'package_conversions' &&
                isJsonEqual(nextValue, prevValue)
              ) {
                return;
              }

              if (nextValue !== prevValue) {
                changedFields[key] = nextValue;
              }
            });

            logger.debug('Realtime update received', {
              component: 'useItemModalRealtime',
              itemId,
              table: 'items',
              event: 'UPDATE',
              changedFields: Object.keys(changedFields),
              commitTimestamp: currentTimestamp,
            });

            // Apply smart updates
            smartFormSync.handleRealtimeUpdate(changedFields);
          }

          // Invalidate item queries for fresh data
          queryClient.invalidateQueries({
            queryKey: QueryKeys.items.detail(itemId),
          });

          // Call custom handler
          onItemUpdated?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'customer_level_discounts',
          event: '*',
          filter: `item_id=eq.${itemId}`,
        },
        async () => {
          logger.debug('Realtime update received', {
            component: 'useItemModalRealtime',
            itemId,
            table: 'customer_level_discounts',
            event: 'CHANGE',
            action: 'refetch',
          });

          const { data, error } =
            await itemDataService.getCustomerLevelDiscounts(itemId);

          if (error) {
            console.error('Error syncing customer level discounts:', error);
            return;
          }

          const normalized = (data || []).map(
            (discount: CustomerLevelDiscount) => ({
              customer_level_id: discount.customer_level_id,
              discount_percentage: Number(discount.discount_percentage) || 0,
            })
          );

          logger.debug('Customer level discounts synced from Supabase', {
            component: 'useItemModalRealtime',
            itemId,
            table: 'customer_level_discounts',
            count: normalized.length,
          });

          smartFormSync.handleRealtimeUpdate({
            customer_level_discounts: normalized,
          });
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
        () => {
          logger.warn('Realtime delete received for item', {
            component: 'useItemModalRealtime',
            itemId,
            table: 'items',
            event: 'DELETE',
          });

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
          setIsConnected(true);
          logger.info('Realtime channel subscribed', {
            component: 'useItemModalRealtime',
            itemId,
            channel: channelName,
          });
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          logger.warn('Realtime channel error', {
            component: 'useItemModalRealtime',
            itemId,
            channel: channelName,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        logger.debug('Realtime subscription closing', {
          component: 'useItemModalRealtime',
          itemId,
          channel: channelName,
        });
        channelRef.current.unsubscribe();
        realtimeService.removeChannel(channelRef.current);
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
