import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useSmartFormSync } from '../../../application/hooks/instances/useSmartFormSync';
import { logger } from '@/utils/logger';
import type { CustomerLevelDiscount } from '@/types/database';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';
import { invalidateQueryKeys, refetchQueryKeys } from '@/lib/queryInvalidation';
import { itemDataService } from '../../../infrastructure/itemData.service';
import { areDBPackageConversionValuesEqual } from '@/lib/packageConversions';
import {
  itemRealtimeService,
  type RealtimeChannel,
} from '../../../infrastructure/itemRealtime.service';

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
  const subscriptionVersionRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  const onSmartUpdateRef = useRef(onSmartUpdate);
  const onItemUpdatedRef = useRef(onItemUpdated);
  const onItemDeletedRef = useRef(onItemDeleted);

  onSmartUpdateRef.current = onSmartUpdate;
  onItemUpdatedRef.current = onItemUpdated;
  onItemDeletedRef.current = onItemDeleted;

  const handleDataUpdate = useCallback((updates: Record<string, unknown>) => {
    onSmartUpdateRef.current?.(updates);
  }, []);

  // Smart form sync for handling field conflicts
  const smartFormSync = useSmartFormSync({
    onDataUpdate: handleDataUpdate,
    showConflictNotification: true,
  });
  const { handleRealtimeUpdate } = smartFormSync;

  useEffect(() => {
    // Don't setup if no itemId or disabled
    if (!enabled || !itemId) {
      return;
    }

    const subscriptionVersion = subscriptionVersionRef.current + 1;
    subscriptionVersionRef.current = subscriptionVersion;
    lastUpdateRef.current = '';
    const channelName = `item-modal-${itemId}`;
    let activeChannel: RealtimeChannel | null = null;
    const isCurrentSubscription = () =>
      channelRef.current === activeChannel &&
      subscriptionVersionRef.current === subscriptionVersion;

    logger.debug('Realtime subscription starting', {
      component: 'useItemModalRealtime',
      itemId,
      channel: channelName,
    });

    const channel = itemRealtimeService.createChannel(channelName);
    activeChannel = channel;
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'items',
          event: 'UPDATE',
          filter: `id=eq.${itemId}`,
        },
        payload => {
          if (!isCurrentSubscription()) {
            return;
          }

          // Prevent processing same update multiple times
          const currentTimestamp = payload.commit_timestamp || '';
          if (currentTimestamp === lastUpdateRef.current) return;
          lastUpdateRef.current = currentTimestamp;

          // Use smart form sync to handle updates intelligently
          if (payload.new && payload.old) {
            // Extract only the changed fields
            const changedFields: Record<string, unknown> = {};

            Object.keys(payload.new).forEach(key => {
              const nextValue = payload.new[key];
              const prevValue = payload.old?.[key];

              if (
                key === 'package_conversions' &&
                areDBPackageConversionValuesEqual(nextValue, prevValue)
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
            handleRealtimeUpdate(changedFields);
          }

          // Invalidate item queries for fresh data (list + detail)
          const keysToInvalidate = getInvalidationKeys.items.related();
          void invalidateQueryKeys(queryClient, keysToInvalidate);
          void refetchQueryKeys(queryClient, keysToInvalidate);
          void queryClient.invalidateQueries({
            queryKey: QueryKeys.items.detail(itemId),
          });

          // Call custom handler
          onItemUpdatedRef.current?.(payload);
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
          if (!isCurrentSubscription()) {
            return;
          }

          logger.debug('Realtime update received', {
            component: 'useItemModalRealtime',
            itemId,
            table: 'customer_level_discounts',
            event: 'CHANGE',
            action: 'refetch',
          });

          const { data, error } =
            await itemDataService.getCustomerLevelDiscounts(itemId);

          if (!isCurrentSubscription()) {
            return;
          }

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

          handleRealtimeUpdate({
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
          if (!isCurrentSubscription()) {
            return;
          }

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
          onItemDeletedRef.current?.();
        }
      )
      .subscribe(status => {
        if (!isCurrentSubscription()) {
          return;
        }

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

    return () => {
      if (channelRef.current === channel) {
        logger.debug('Realtime subscription closing', {
          component: 'useItemModalRealtime',
          itemId,
          channel: channelName,
        });
        subscriptionVersionRef.current += 1;
        void channel.unsubscribe();
        void itemRealtimeService.removeChannel(channel);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [itemId, enabled, queryClient, handleRealtimeUpdate]);

  return {
    isConnected, // Use state instead of accessing ref during render
    smartFormSync, // Export smart form sync for field handlers
  };
};
