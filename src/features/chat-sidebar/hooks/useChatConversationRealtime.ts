import type { MutableRefObject } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect } from 'react';
import type { UserDetails } from '@/types/database';
import {
  chatSidebarGateway,
  type ChatMessage,
  type RealtimeChannel,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import {
  isConversationMessageForPair,
  reconcileInsertedConversationMessage,
} from '../utils/conversation-sync';

export type PendingConversationRealtimeEvent =
  | {
      type: 'insert';
      message: ChatMessage;
    }
  | {
      type: 'update';
      message: Partial<ChatMessage> & { id: string };
    }
  | {
      type: 'delete';
      messageId: string;
    };

export const replayPendingConversationRealtimeEvents = ({
  previousMessages,
  pendingEvents,
  currentChannelId,
}: {
  previousMessages: ChatMessage[];
  pendingEvents: PendingConversationRealtimeEvent[];
  currentChannelId: string | null;
}) =>
  pendingEvents.reduce<ChatMessage[]>((nextMessages, pendingEvent) => {
    if (pendingEvent.type === 'insert') {
      return reconcileInsertedConversationMessage({
        previousMessages: nextMessages,
        insertedMessage: pendingEvent.message,
        currentChannelId,
      });
    }

    if (pendingEvent.type === 'update') {
      return nextMessages.map(previousMessage =>
        previousMessage.id === pendingEvent.message.id
          ? {
              ...previousMessage,
              ...pendingEvent.message,
              stableKey: previousMessage.stableKey,
            }
          : previousMessage
      );
    }

    return nextMessages.filter(
      messageItem => messageItem.id !== pendingEvent.messageId
    );
  }, previousMessages);

interface UseChatConversationRealtimeProps {
  isOpen: boolean;
  user: UserDetails | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  recoveryTick: number;
  conversationChannelRef: MutableRefObject<RealtimeChannel | null>;
  isInitialConversationLoadPendingRef: MutableRefObject<boolean>;
  pendingConversationRealtimeEventsRef: MutableRefObject<
    PendingConversationRealtimeEvent[]
  >;
  mapMessageForActiveConversation: (messageItem: ChatMessage) => ChatMessage;
  applyMessageUpdate: (
    updatedMessage: Partial<ChatMessage> & { id: string }
  ) => void;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setLoadError: Dispatch<SetStateAction<string | null>>;
  markConversationRecoverySuccess: () => void;
  scheduleConversationRecovery: () => boolean;
}

export const useChatConversationRealtime = ({
  isOpen,
  user,
  targetUser,
  currentChannelId,
  recoveryTick,
  conversationChannelRef,
  isInitialConversationLoadPendingRef,
  pendingConversationRealtimeEventsRef,
  mapMessageForActiveConversation,
  applyMessageUpdate,
  setMessages,
  setLoadError,
  markConversationRecoverySuccess,
  scheduleConversationRecovery,
}: UseChatConversationRealtimeProps) => {
  useEffect(() => {
    if (!isOpen || !user || !targetUser || !currentChannelId) {
      if (conversationChannelRef.current) {
        void chatSidebarGateway.removeRealtimeChannel(
          conversationChannelRef.current
        );
        conversationChannelRef.current = null;
      }
      markConversationRecoverySuccess();
      return;
    }

    if (conversationChannelRef.current) {
      void chatSidebarGateway.removeRealtimeChannel(
        conversationChannelRef.current
      );
      conversationChannelRef.current = null;
    }

    const channel = chatSidebarGateway.createRealtimeChannel(
      `chat_${currentChannelId}`
    );

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${currentChannelId}`,
      },
      payload => {
        const insertedMessage = payload.new as ChatMessage;
        if (!insertedMessage?.id) {
          return;
        }

        if (
          !isConversationMessageForPair(insertedMessage, user.id, targetUser.id)
        ) {
          return;
        }

        const mappedInsertedMessage =
          mapMessageForActiveConversation(insertedMessage);

        if (isInitialConversationLoadPendingRef.current) {
          pendingConversationRealtimeEventsRef.current.push({
            type: 'insert',
            message: mappedInsertedMessage,
          });
        }

        setMessages(previousMessages =>
          reconcileInsertedConversationMessage({
            previousMessages,
            insertedMessage: mappedInsertedMessage,
            currentChannelId,
          })
        );
      }
    );

    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${currentChannelId}`,
      },
      payload => {
        const updatedMessage = payload.new as ChatMessage;
        if (!updatedMessage?.id) return;
        const mappedUpdatedMessage =
          mapMessageForActiveConversation(updatedMessage);

        if (isInitialConversationLoadPendingRef.current) {
          pendingConversationRealtimeEventsRef.current.push({
            type: 'update',
            message: mappedUpdatedMessage,
          });
        }

        applyMessageUpdate(mappedUpdatedMessage);
      }
    );

    channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${currentChannelId}`,
      },
      payload => {
        const deletedMessage = payload.old as Partial<ChatMessage> | undefined;
        const deletedMessageId = deletedMessage?.id;
        if (!deletedMessageId) return;

        if (isInitialConversationLoadPendingRef.current) {
          pendingConversationRealtimeEventsRef.current.push({
            type: 'delete',
            messageId: deletedMessageId,
          });
        }

        setMessages(previousMessages => {
          if (
            !previousMessages.some(
              messageItem => messageItem.id === deletedMessageId
            )
          ) {
            return previousMessages;
          }

          return previousMessages.filter(
            messageItem => messageItem.id !== deletedMessageId
          );
        });
      }
    );

    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        markConversationRecoverySuccess();
        return;
      }

      if (status === 'CHANNEL_ERROR') {
        console.error('Failed to connect to chat channel');
        if (conversationChannelRef.current === channel) {
          conversationChannelRef.current = null;
          void chatSidebarGateway.removeRealtimeChannel(channel);
        }
        if (scheduleConversationRecovery()) {
          setLoadError('Realtime chat terputus. Mencoba menyambungkan ulang');
        }
        return;
      }

      if (status === 'TIMED_OUT') {
        console.error('Timed out while connecting to chat channel');
        if (conversationChannelRef.current === channel) {
          conversationChannelRef.current = null;
          void chatSidebarGateway.removeRealtimeChannel(channel);
        }
        if (scheduleConversationRecovery()) {
          setLoadError('Realtime chat terputus. Mencoba menyambungkan ulang');
        }
      }
    });

    conversationChannelRef.current = channel;

    return () => {
      if (conversationChannelRef.current === channel) {
        void chatSidebarGateway.removeRealtimeChannel(channel);
        conversationChannelRef.current = null;
      }
    };
  }, [
    applyMessageUpdate,
    conversationChannelRef,
    currentChannelId,
    isInitialConversationLoadPendingRef,
    isOpen,
    mapMessageForActiveConversation,
    markConversationRecoverySuccess,
    pendingConversationRealtimeEventsRef,
    recoveryTick,
    scheduleConversationRecovery,
    setLoadError,
    setMessages,
    targetUser,
    user,
  ]);
};
