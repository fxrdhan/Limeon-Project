import { useAuthStore } from '@/store/authStore';
import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  chatSidebarGateway,
  type ChatMessage,
  type RealtimeChannel,
} from '../data/chatSidebarGateway';

const DELIVERY_BATCH_WINDOW_MS = 90;
const CHAT_DELIVERY_SYNC_TOAST_ID = 'chat-delivery-sync-warning';

export const useChatIncomingDeliveries = () => {
  const { user } = useAuthStore();
  const incomingMessagesChannelRef = useRef<RealtimeChannel | null>(null);
  const pendingDeliveryMessageIdsRef = useRef<Set<string>>(new Set());
  const queuedDeliveryMessageIdsRef = useRef<Set<string>>(new Set());
  const flushDeliveryTimeoutRef = useRef<number | null>(null);

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

    try {
      const { error } =
        await chatSidebarGateway.markMessageIdsAsDelivered(queuedMessageIds);
      if (error) {
        console.error('Error marking incoming messages as delivered:', error);
        toast.error(
          'Sinkronisasi status chat tertunda. Status delivered bisa terlambat diperbarui.',
          {
            id: CHAT_DELIVERY_SYNC_TOAST_ID,
          }
        );
      }
    } catch (error) {
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

      if (queuedDeliveryMessageIdsRef.current.size > 0) {
        flushDeliveryTimeoutRef.current = window.setTimeout(() => {
          void flushQueuedDeliveryMessageIds();
        }, DELIVERY_BATCH_WINDOW_MS);
      }
    }
  }, []);

  const scheduleQueuedDeliveryFlush = useCallback(() => {
    if (flushDeliveryTimeoutRef.current !== null) {
      return;
    }

    flushDeliveryTimeoutRef.current = window.setTimeout(() => {
      void flushQueuedDeliveryMessageIds();
    }, DELIVERY_BATCH_WINDOW_MS);
  }, [flushQueuedDeliveryMessageIds]);

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
        toast.error(
          'Realtime chat terputus. Status delivered bisa terlambat diperbarui.',
          {
            id: CHAT_DELIVERY_SYNC_TOAST_ID,
          }
        );
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
  }, [queueDeliveryMessageIds, user?.id]);
};
