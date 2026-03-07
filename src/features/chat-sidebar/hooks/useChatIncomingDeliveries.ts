import { useAuthStore } from '@/store/authStore';
import { useEffect, useRef } from 'react';
import {
  chatSidebarGateway,
  type ChatMessage,
  type RealtimeChannel,
} from '../data/chatSidebarGateway';

export const useChatIncomingDeliveries = () => {
  const { user } = useAuthStore();
  const incomingMessagesChannelRef = useRef<RealtimeChannel | null>(null);
  const pendingDeliveryMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const pendingDeliveryMessageIds = pendingDeliveryMessageIdsRef.current;

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

        void (async () => {
          try {
            const { error } =
              await chatSidebarGateway.markMessageIdsAsDelivered([
                incomingMessage.id,
              ]);
            if (error) {
              console.error(
                'Error marking incoming message as delivered:',
                error
              );
            }
          } catch (error) {
            console.error(
              'Caught error marking incoming message as delivered:',
              error
            );
          } finally {
            pendingDeliveryMessageIdsRef.current.delete(incomingMessage.id);
          }
        })();
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
      pendingDeliveryMessageIds.clear();
      void chatSidebarGateway.removeRealtimeChannel(activeChannel);
      if (incomingMessagesChannelRef.current === activeChannel) {
        incomingMessagesChannelRef.current = null;
      }
    };
  }, [user?.id]);
};
