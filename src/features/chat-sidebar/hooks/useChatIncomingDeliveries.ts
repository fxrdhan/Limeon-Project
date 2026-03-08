import { useAuthStore } from '@/store/authStore';
import { useCallback, useEffect, useRef } from 'react';
import {
  chatSidebarGateway,
  type ChatMessage,
  type RealtimeChannel,
} from '../data/chatSidebarGateway';

const DELIVERY_BATCH_WINDOW_MS = 90;

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
      }
    } catch (error) {
      console.error(
        'Caught error marking incoming messages as delivered:',
        error
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
        if (pendingDeliveryMessageIdsRef.current.has(incomingMessage.id))
          return;

        pendingDeliveryMessageIdsRef.current.add(incomingMessage.id);
        queuedDeliveryMessageIdsRef.current.add(incomingMessage.id);
        scheduleQueuedDeliveryFlush();
      }
    );

    incomingMessagesChannel.subscribe(status => {
      if (status === 'CHANNEL_ERROR') {
        console.error('Failed to connect to incoming chat delivery channel');
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
  }, [scheduleQueuedDeliveryFlush, user?.id]);
};
