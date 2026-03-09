import { useAuthStore } from '@/store/authStore';
import { useRealtimeChannelRecovery } from '@/hooks/realtime/useRealtimeChannelRecovery';
import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  chatSidebarGateway,
  type ChatMessage,
  type RealtimeChannel,
} from '../data/chatSidebarGateway';

const DELIVERY_BATCH_WINDOW_MS = 90;
const DELIVERY_RETRY_WINDOW_MS = 1_200;
const CHAT_DELIVERY_SYNC_TOAST_ID = 'chat-delivery-sync-warning';

export const useChatIncomingDeliveries = () => {
  const { user } = useAuthStore();
  const incomingMessagesChannelRef = useRef<RealtimeChannel | null>(null);
  const pendingDeliveryMessageIdsRef = useRef<Set<string>>(new Set());
  const queuedDeliveryMessageIdsRef = useRef<Set<string>>(new Set());
  const flushDeliveryTimeoutRef = useRef<number | null>(null);
  const flushQueuedDeliveryMessageIdsRef = useRef<() => Promise<void>>(
    async () => {}
  );
  const { recoveryTick, scheduleRecovery, markRecoverySuccess } =
    useRealtimeChannelRecovery();

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

  const requeueDeliveryMessageIds = useCallback(
    (messageIds: string[]) => {
      messageIds.forEach(messageId => {
        if (!messageId) {
          return;
        }

        pendingDeliveryMessageIdsRef.current.delete(messageId);
        queuedDeliveryMessageIdsRef.current.add(messageId);
      });

      if (queuedDeliveryMessageIdsRef.current.size > 0) {
        scheduleQueuedDeliveryFlush(DELIVERY_RETRY_WINDOW_MS);
      }
    },
    [scheduleQueuedDeliveryFlush]
  );

  const flushQueuedDeliveryMessageIds = useCallback(async () => {
    if (flushDeliveryTimeoutRef.current !== null) {
      window.clearTimeout(flushDeliveryTimeoutRef.current);
      flushDeliveryTimeoutRef.current = null;
    }

    const queuedMessageIds = [...queuedDeliveryMessageIdsRef.current];
    if (queuedMessageIds.length === 0) {
      return;
    }

    queuedDeliveryMessageIdsRef.current.clear();
    let shouldRetry = false;

    try {
      const { error } =
        await chatSidebarGateway.markMessageIdsAsDelivered(queuedMessageIds);
      if (error) {
        shouldRetry = true;
        console.error('Error marking incoming messages as delivered:', error);
        toast.error(
          'Sinkronisasi status chat tertunda. Status delivered bisa terlambat diperbarui.',
          {
            id: CHAT_DELIVERY_SYNC_TOAST_ID,
          }
        );
      }
    } catch (error) {
      shouldRetry = true;
      console.error(
        'Caught error marking incoming messages as delivered:',
        error
      );
      toast.error(
        'Sinkronisasi status chat tertunda. Status delivered bisa terlambat diperbarui.',
        {
          id: CHAT_DELIVERY_SYNC_TOAST_ID,
        }
      );
    } finally {
      queuedMessageIds.forEach(messageId => {
        pendingDeliveryMessageIdsRef.current.delete(messageId);
      });
    }

    if (shouldRetry) {
      requeueDeliveryMessageIds(queuedMessageIds);
      return;
    }

    if (queuedDeliveryMessageIdsRef.current.size > 0) {
      scheduleQueuedDeliveryFlush();
    }
  }, [requeueDeliveryMessageIds, scheduleQueuedDeliveryFlush]);
  flushQueuedDeliveryMessageIdsRef.current = flushQueuedDeliveryMessageIds;

  const queueDeliveryMessageIds = useCallback(
    (messageIds: string[]) => {
      const nextMessageIds = messageIds.filter(messageId => {
        if (!messageId) {
          return false;
        }

        if (pendingDeliveryMessageIdsRef.current.has(messageId)) {
          return false;
        }

        pendingDeliveryMessageIdsRef.current.add(messageId);
        queuedDeliveryMessageIdsRef.current.add(messageId);
        return true;
      });

      if (nextMessageIds.length > 0) {
        scheduleQueuedDeliveryFlush();
      }
    },
    [scheduleQueuedDeliveryFlush]
  );

  useEffect(() => {
    if (!user?.id) {
      markRecoverySuccess();
      return;
    }

    const pendingDeliveryMessageIds = pendingDeliveryMessageIdsRef.current;
    const queuedDeliveryMessageIds = queuedDeliveryMessageIdsRef.current;

    if (incomingMessagesChannelRef.current) {
      void chatSidebarGateway.removeRealtimeChannel(
        incomingMessagesChannelRef.current
      );
      incomingMessagesChannelRef.current = null;
    }

    const incomingMessagesChannel = chatSidebarGateway.createRealtimeChannel(
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
        void (async () => {
          try {
            const { data: undeliveredMessageIds, error } =
              await chatSidebarGateway.listUndeliveredIncomingMessageIds(
                user.id
              );
            if (error) {
              console.error(
                'Error backfilling undelivered incoming messages:',
                error
              );
              toast.error(
                'Riwayat delivered chat belum tersinkron penuh. Coba buka ulang chat jika status belum sesuai.',
                {
                  id: CHAT_DELIVERY_SYNC_TOAST_ID,
                }
              );
              return;
            }

            queueDeliveryMessageIds(undeliveredMessageIds || []);
          } catch (error) {
            console.error(
              'Caught error backfilling undelivered incoming messages:',
              error
            );
            toast.error(
              'Riwayat delivered chat belum tersinkron penuh. Coba buka ulang chat jika status belum sesuai.',
              {
                id: CHAT_DELIVERY_SYNC_TOAST_ID,
              }
            );
          }
        })();
      }

      if (status === 'CHANNEL_ERROR') {
        console.error('Failed to connect to incoming chat delivery channel');
        if (incomingMessagesChannelRef.current === incomingMessagesChannel) {
          incomingMessagesChannelRef.current = null;
          void chatSidebarGateway.removeRealtimeChannel(
            incomingMessagesChannel
          );
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
        if (incomingMessagesChannelRef.current === incomingMessagesChannel) {
          incomingMessagesChannelRef.current = null;
          void chatSidebarGateway.removeRealtimeChannel(
            incomingMessagesChannel
          );
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
      if (flushDeliveryTimeoutRef.current !== null) {
        window.clearTimeout(flushDeliveryTimeoutRef.current);
        flushDeliveryTimeoutRef.current = null;
      }
      pendingDeliveryMessageIds.clear();
      queuedDeliveryMessageIds.clear();
      void chatSidebarGateway.removeRealtimeChannel(activeChannel);
      if (incomingMessagesChannelRef.current === activeChannel) {
        incomingMessagesChannelRef.current = null;
      }
    };
  }, [
    markRecoverySuccess,
    queueDeliveryMessageIds,
    recoveryTick,
    scheduleRecovery,
    user?.id,
  ]);
};
