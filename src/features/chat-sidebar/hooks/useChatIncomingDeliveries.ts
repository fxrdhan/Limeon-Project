import { useAuthStore } from '@/store/authStore';
import { useRealtimeChannelRecovery } from '@/hooks/realtime/useRealtimeChannelRecovery';
import { realtimeService } from '@/services/realtime/realtime.service';
import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import { useChatReceiptMutationQueue } from './useChatReceiptMutationQueue';

const DELIVERY_BATCH_WINDOW_MS = 90;
const DELIVERY_BACKFILL_PAGE_SIZE = 200;
const DELIVERY_FLUSH_BATCH_SIZE = 200;
const CHAT_DELIVERY_SYNC_TOAST_ID = 'chat-delivery-sync-warning';
const DELIVERY_RETRY_WINDOW_MS = 1_200;

export const useChatIncomingDeliveries = () => {
  const { user } = useAuthStore();
  const incomingMessagesChannelRef = useRef<RealtimeChannel | null>(null);
  const queuedDeliveryMessageIdsRef = useRef<Set<string>>(new Set());
  const flushDeliveryTimeoutRef = useRef<number | null>(null);
  const backfillRetryTimeoutRef = useRef<number | null>(null);
  const isBackfillInFlightRef = useRef(false);
  const deliveryScopeVersionRef = useRef(0);
  const flushQueuedDeliveryMessageIdsRef = useRef<() => Promise<void>>(
    async () => {}
  );
  const backfillUndeliveredIncomingMessageIdsRef = useRef<() => Promise<void>>(
    async () => {}
  );
  const { recoveryTick, scheduleRecovery, markRecoverySuccess } =
    useRealtimeChannelRecovery();
  const runDeliveredMutation = useCallback(
    (messageIds: string[]) =>
      chatSidebarMessagesGateway.markMessageIdsAsDelivered(messageIds),
    []
  );
  const handleDeliveryMutationError = useCallback((error: unknown) => {
    console.error('Error marking incoming messages as delivered:', error);
    toast.error(
      'Sinkronisasi status chat tertunda. Status delivered bisa terlambat diperbarui.',
      {
        id: CHAT_DELIVERY_SYNC_TOAST_ID,
      }
    );
  }, []);
  const deliveryMutation = useChatReceiptMutationQueue<ChatMessage>({
    scopeResetKey: user?.id ?? null,
    retryDelayMs: DELIVERY_RETRY_WINDOW_MS,
    runMutation: runDeliveredMutation,
    onMutationError: handleDeliveryMutationError,
  });

  const scheduleQueuedDeliveryFlush = useCallback(
    (delayMs = DELIVERY_BATCH_WINDOW_MS) => {
      if (flushDeliveryTimeoutRef.current !== null) {
        return;
      }

      flushDeliveryTimeoutRef.current = window.setTimeout(() => {
        void flushQueuedDeliveryMessageIdsRef.current();
      }, delayMs);
    },
    []
  );

  const clearBackfillRetryTimer = useCallback(() => {
    if (backfillRetryTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(backfillRetryTimeoutRef.current);
    backfillRetryTimeoutRef.current = null;
  }, []);

  const flushQueuedDeliveryMessageIds = useCallback(async () => {
    if (flushDeliveryTimeoutRef.current !== null) {
      window.clearTimeout(flushDeliveryTimeoutRef.current);
      flushDeliveryTimeoutRef.current = null;
    }

    const queuedMessageIds = [...queuedDeliveryMessageIdsRef.current].slice(
      0,
      DELIVERY_FLUSH_BATCH_SIZE
    );
    if (queuedMessageIds.length === 0) {
      return;
    }

    queuedMessageIds.forEach(messageId => {
      queuedDeliveryMessageIdsRef.current.delete(messageId);
    });
    await deliveryMutation.submitMessageIds(queuedMessageIds);

    if (queuedDeliveryMessageIdsRef.current.size > 0) {
      scheduleQueuedDeliveryFlush();
    }
  }, [deliveryMutation, scheduleQueuedDeliveryFlush]);
  flushQueuedDeliveryMessageIdsRef.current = flushQueuedDeliveryMessageIds;

  const queueDeliveryMessageIds = useCallback(
    (messageIds: string[]) => {
      const nextMessageIds = messageIds.filter(messageId => {
        if (!messageId) {
          return false;
        }

        if (queuedDeliveryMessageIdsRef.current.has(messageId)) {
          return false;
        }

        queuedDeliveryMessageIdsRef.current.add(messageId);
        return true;
      });

      if (nextMessageIds.length > 0) {
        scheduleQueuedDeliveryFlush();
      }
    },
    [scheduleQueuedDeliveryFlush]
  );

  const scheduleBackfillRetry = useCallback(() => {
    if (backfillRetryTimeoutRef.current !== null || !user?.id) {
      return;
    }

    backfillRetryTimeoutRef.current = window.setTimeout(() => {
      backfillRetryTimeoutRef.current = null;
      void backfillUndeliveredIncomingMessageIdsRef.current();
    }, DELIVERY_RETRY_WINDOW_MS);
  }, [user?.id]);

  const backfillUndeliveredIncomingMessageIds = useCallback(async () => {
    if (!user?.id || isBackfillInFlightRef.current) {
      return;
    }

    const scopeVersion = deliveryScopeVersionRef.current;
    isBackfillInFlightRef.current = true;
    clearBackfillRetryTimer();

    try {
      const backfillMessageIds: string[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: undeliveredPage, error } =
          await chatSidebarMessagesGateway.listUndeliveredIncomingMessageIds({
            limit: DELIVERY_BACKFILL_PAGE_SIZE,
            offset,
          });

        if (scopeVersion !== deliveryScopeVersionRef.current) {
          return;
        }

        if (error || !undeliveredPage) {
          throw error ?? new Error('Missing undelivered incoming message page');
        }

        const nextMessageIds = undeliveredPage.messageIds || [];
        if (nextMessageIds.length === 0) {
          break;
        }

        backfillMessageIds.push(...nextMessageIds);
        hasMore = undeliveredPage.hasMore ?? false;
        offset += nextMessageIds.length;
      }

      if (scopeVersion !== deliveryScopeVersionRef.current) {
        return;
      }

      queueDeliveryMessageIds(backfillMessageIds);
    } catch (error) {
      if (scopeVersion !== deliveryScopeVersionRef.current) {
        return;
      }

      console.error('Error backfilling undelivered incoming messages:', error);
      toast.error(
        'Riwayat delivered chat belum tersinkron penuh. Akan dicoba lagi otomatis.',
        {
          id: CHAT_DELIVERY_SYNC_TOAST_ID,
        }
      );
      scheduleBackfillRetry();
    } finally {
      if (scopeVersion === deliveryScopeVersionRef.current) {
        isBackfillInFlightRef.current = false;
      }
    }
  }, [
    clearBackfillRetryTimer,
    queueDeliveryMessageIds,
    scheduleBackfillRetry,
    user?.id,
  ]);
  backfillUndeliveredIncomingMessageIdsRef.current =
    backfillUndeliveredIncomingMessageIds;

  useEffect(() => {
    deliveryScopeVersionRef.current += 1;

    if (!user?.id) {
      clearBackfillRetryTimer();
      isBackfillInFlightRef.current = false;
      markRecoverySuccess();
      return;
    }

    const queuedDeliveryMessageIds = queuedDeliveryMessageIdsRef.current;

    if (incomingMessagesChannelRef.current) {
      void realtimeService.removeChannel(incomingMessagesChannelRef.current);
      incomingMessagesChannelRef.current = null;
    }

    const incomingMessagesChannel = realtimeService.createChannel(
      `incoming_messages_${user.id}`
    );

    incomingMessagesChannel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `receiver_id=eq.${user.id}`,
      },
      payload => {
        const incomingMessage = payload.new as ChatMessage | undefined;
        if (!incomingMessage?.id || incomingMessage.is_delivered) return;
        queueDeliveryMessageIds([incomingMessage.id]);
      }
    );

    incomingMessagesChannel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        markRecoverySuccess();
        void backfillUndeliveredIncomingMessageIdsRef.current();
      }

      if (status === 'CHANNEL_ERROR') {
        console.error('Failed to connect to incoming chat delivery channel');
        clearBackfillRetryTimer();
        if (incomingMessagesChannelRef.current === incomingMessagesChannel) {
          incomingMessagesChannelRef.current = null;
          void realtimeService.removeChannel(incomingMessagesChannel);
        }
        toast.error(
          'Realtime chat terputus. Status delivered bisa terlambat diperbarui.',
          {
            id: CHAT_DELIVERY_SYNC_TOAST_ID,
          }
        );
        void scheduleRecovery();
        return;
      }

      if (status === 'TIMED_OUT') {
        console.error('Timed out while connecting to chat delivery channel');
        clearBackfillRetryTimer();
        if (incomingMessagesChannelRef.current === incomingMessagesChannel) {
          incomingMessagesChannelRef.current = null;
          void realtimeService.removeChannel(incomingMessagesChannel);
        }
        toast.error(
          'Realtime chat terputus. Status delivered bisa terlambat diperbarui.',
          {
            id: CHAT_DELIVERY_SYNC_TOAST_ID,
          }
        );
        void scheduleRecovery();
      }
    });
    incomingMessagesChannelRef.current = incomingMessagesChannel;
    const activeChannel = incomingMessagesChannel;

    return () => {
      deliveryScopeVersionRef.current += 1;
      if (flushDeliveryTimeoutRef.current !== null) {
        window.clearTimeout(flushDeliveryTimeoutRef.current);
        flushDeliveryTimeoutRef.current = null;
      }
      clearBackfillRetryTimer();
      isBackfillInFlightRef.current = false;
      queuedDeliveryMessageIds.clear();
      void realtimeService.removeChannel(activeChannel);
      if (incomingMessagesChannelRef.current === activeChannel) {
        incomingMessagesChannelRef.current = null;
      }
    };
  }, [
    clearBackfillRetryTimer,
    queueDeliveryMessageIds,
    markRecoverySuccess,
    recoveryTick,
    scheduleRecovery,
    user?.id,
  ]);
};
